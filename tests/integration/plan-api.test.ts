import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw/http';
import { server } from '../setup/msw';
import { handlePlanCompute } from '@/server/plan';
import { explainPlan } from '@/server/explain';
import type { ServerEnv } from '@/server/env';
import type { PlanResult } from '@/domain/plan';

const NOW = new Date('2026-10-27T10:00:00Z');
const duffelEnv: ServerEnv = {
  AUTH_MODE: 'guest',
  PROVIDER_MODE: 'duffel_test',
  DUFFEL_ACCESS_TOKEN: 'duffel_test_x',
  FX_LIVE: 'off',
  duffelEnabled: true,
};
const noProviderEnv: ServerEnv = {
  ...duffelEnv,
  PROVIDER_MODE: 'fixture',
  DUFFEL_ACCESS_TOKEN: undefined,
  duffelEnabled: false,
};

let ip = 0;
const post = (body: unknown) =>
  new Request('http://localhost/api/plan/compute', {
    method: 'POST',
    headers: { 'x-forwarded-for': `10.1.0.${++ip}` },
    body: JSON.stringify(body),
  });

const offer = (amount: string, dep: string) => ({
  id: `off_${dep.replaceAll('-', '')}`,
  live_mode: false,
  total_amount: amount,
  total_currency: 'EUR',
  expires_at: '2026-10-27T10:30:00Z',
  passengers: [{ id: 'pas_1' }],
  slices: [
    {
      origin: { iata_code: 'MAD' },
      destination: { iata_code: 'LHR' },
      duration: 'PT2H20M',
      segments: [
        {
          origin: { iata_code: 'MAD' },
          destination: { iata_code: 'LHR' },
          departing_at: `${dep}T08:00:00`,
          arriving_at: `${dep}T09:20:00`,
          marketing_carrier: { name: 'Duffel Airways', iata_code: 'ZZ' },
          marketing_carrier_flight_number: '1',
        },
      ],
    },
  ],
});

const request = (over: object = {}) => ({
  trip: {
    origin: 'MAD',
    destination: 'LHR',
    tripType: 'one_way',
    earliestDepart: '2026-12-01',
    latestDepart: '2026-12-07',
    adults: 1,
    cabin: 'economy',
    objective: 'B_ECONOMIC_COST',
  },
  profile: {
    cards: [],
    noCards: true,
    balances: [{ program: 'iberia_club', kind: 'exact', points: 20_000 }],
    noPoints: false,
    monthly: [],
    purchases: [],
    finance: { paysInFull: true },
    valuations: [],
  },
  award: { program: 'iberia_club', points: 9_000, taxesEur: 40, source: 'USER_ENTERED' },
  ...over,
});

describe('POST /api/plan/compute', () => {
  it('prices sampled dates with Duffel test offers and returns a validated plan', async () => {
    let calls = 0;
    server.use(
      http.post('https://api.duffel.com/air/offer_requests', async ({ request: r }) => {
        calls++;
        const body = (await r.json()) as { data: { slices: { departure_date: string }[] } };
        const dep = body.data.slices[0].departure_date;
        return HttpResponse.json({
          data: { live_mode: false, offers: [offer(dep.endsWith('04') ? '89.00' : '120.00', dep)] },
        });
      }),
    );
    const res = await handlePlanCompute(post(request()), { env: duffelEnv, now: NOW });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(calls).toBe(7);
    expect(body.data.flights).toMatchObject({
      status: 'ok',
      provider: 'duffel_test',
      searched: 7,
      failed: 0,
    });
    expect(body.data.flights.cheapest).toMatchObject({
      depart: '2026-12-04',
      totalMinor: 8900,
      provenance: 'LIVE_TEST_DUFFEL',
    });
    expect(body.data.verdict.outcome).toBe('CASH_BETTER'); // 9,000 × €0.010 + €40 = €130 > €89
  });

  it('timeouts and errors give an honest "unavailable" state, never a made-up fare', async () => {
    server.use(
      http.post('https://api.duffel.com/air/offer_requests', () =>
        HttpResponse.json({ errors: [] }, { status: 500 }),
      ),
    );
    const body = await (
      await handlePlanCompute(post(request()), { env: duffelEnv, now: NOW })
    ).json();
    expect(body.data.flights).toMatchObject({ status: 'unavailable', cheapest: null, failed: 7 });
    expect(body.data.comparison.cashFareMinor).toBeNull();
    expect(body.data.confidenceReasons.join(' ')).toMatch(/No live test fare/);
  });

  it('an empty Duffel answer is reported as no fares; malformed answers count as failures', async () => {
    let n = 0;
    server.use(
      http.post('https://api.duffel.com/air/offer_requests', () => {
        n++;
        return n % 2
          ? HttpResponse.json({ data: { live_mode: false, offers: [] } })
          : HttpResponse.json({ data: { live_mode: false } });
      }),
    );
    const body = await (
      await handlePlanCompute(post(request()), { env: duffelEnv, now: NOW })
    ).json();
    expect(body.data.flights.status).toBe('unavailable');
    expect(body.data.flights.failed).toBeGreaterThan(0);
  });

  it('example fares are used only when explicitly requested, and labelled', async () => {
    const plain = await (
      await handlePlanCompute(post(request()), { env: noProviderEnv, now: NOW })
    ).json();
    expect(plain.data.flights.status).toBe('unavailable');
    const ex = await (
      await handlePlanCompute(post(request({ useExample: true })), { env: noProviderEnv, now: NOW })
    ).json();
    expect(ex.data.flights).toMatchObject({ status: 'example', provider: 'example' });
    expect(ex.data.flights.note).toMatch(/not real/);
  });

  it('rejects an invalid profile (out-of-order range, 61-day range) with field paths', async () => {
    const bad = request({
      trip: { ...request().trip, earliestDepart: '2026-12-01', latestDepart: '2027-02-15' },
    });
    const res = await handlePlanCompute(post(bad), { env: noProviderEnv, now: NOW });
    expect(res.status).toBe(400);
    expect((await res.json()).error.details[0].path).toBe('trip.latestDepart');
  });
});

describe('Gemini explanation (mocked network)', () => {
  const getPlan = async () => {
    server.use(
      http.post('https://api.duffel.com/air/offer_requests', () =>
        HttpResponse.json({ data: { live_mode: false, offers: [offer('120.00', '2026-12-01')] } }),
      ),
    );
    const body = await (
      await handlePlanCompute(post(request()), { env: duffelEnv, now: NOW })
    ).json();
    return body.data as PlanResult;
  };
  const gemini = (paragraphs: unknown, status = 200) =>
    http.post('https://generativelanguage.googleapis.com/v1beta/models/:model', () =>
      status === 200
        ? HttpResponse.json({
            candidates: [{ content: { parts: [{ text: JSON.stringify({ paragraphs }) }] } }],
          })
        : HttpResponse.json({ error: {} }, { status }),
    );

  it('uses the AI text when it only states plan facts', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    const p = await getPlan();
    server.use(
      gemini([
        `The award needs 9,000 points and €40 in taxes, more than the €120 test fare once points are valued.`,
        'Prices are Duffel test data.',
      ]),
    );
    const e = await explainPlan(p);
    expect(e.source).toBe('ai');
    expect(e.model).toBe('gemini-3.5-flash-lite');
  });

  it('rejects invented numbers and falls back to the rules explanation with a reason', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    const p = await getPlan();
    server.use(gemini(['You will save €999 by using points.']));
    const e = await explainPlan(p);
    expect(e.source).toBe('rules');
    expect(e.rejectedReason).toMatch(/unsupported claim|unknown number/);
    expect(e.text[0]).toBe(p.verdict.reasons[0]);
  });

  it('falls back honestly when Gemini fails or is not configured', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    const p = await getPlan();
    server.use(gemini(null, 503));
    expect((await explainPlan(p)).rejectedReason).toBe('HTTP 503');
    vi.stubEnv('GEMINI_API_KEY', '');
    expect((await explainPlan(p)).rejectedReason).toBe('not configured');
  });
});
