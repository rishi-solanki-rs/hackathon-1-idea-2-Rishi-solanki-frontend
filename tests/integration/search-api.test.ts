import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw/http';
import { server } from '../setup/msw';
import { handlePlanSearch, handleQuickSearch } from '@/server/handlers';
import type { ServerEnv } from '@/server/env';
import { createDuffelCashProvider } from '@/providers/duffel';
import { FIXTURE_FX } from '@/providers/fx';

const NOW = new Date('2026-10-27T10:00:00Z');
const fixtureEnv: ServerEnv = {
  AUTH_MODE: 'guest',
  PROVIDER_MODE: 'fixture',
  FX_LIVE: 'off',
  duffelEnabled: false,
};
const duffelEnv: ServerEnv = {
  ...fixtureEnv,
  PROVIDER_MODE: 'duffel_test',
  DUFFEL_ACCESS_TOKEN: 'duffel_test_x',
  duffelEnabled: true,
};

let ip = 0;
const post = (url: string, body: unknown) =>
  new Request(`http://localhost${url}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.0.0.${++ip}` },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const lucia = {
  balances: [{ program: 'iberia_club', points: 120_000 }],
  valuations: [{ program: 'iberia_club', eurPerPoint: '0.012' }],
};

const quick = (over: object = {}) => ({
  origin: 'MAD',
  destination: 'SCL',
  tripType: 'one_way',
  departDate: '2027-02-10',
  adults: 1,
  cabin: 'business',
  objective: 'B_ECONOMIC_COST',
  wallet: lucia,
  ...over,
});

describe('POST /api/search/quick (fixture mode)', () => {
  it('T-FUN-003: CS-03 end to end → save €1,674 (57.7%), award ranked first, all labelled fixture', async () => {
    const res = await handleQuickSearch(post('/api/search/quick', quick()), {
      env: fixtureEnv,
      now: NOW,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.data.dataMode).toBe('FIXTURE');
    expect(body.data.comparison.headline).toBe('SAVING');
    expect(body.data.comparison.economicSaving).toEqual({ minor: 167400, currency: 'EUR' });
    expect(body.data.comparison.savingPct).toBe('57.7');
    expect(body.data.options[0].kind).toBe('award');
    expect(
      body.data.options.every((o: { provenance: string }) => o.provenance.startsWith('FIXTURE')),
    ).toBe(true);
    expect(body.data.explanation.risks.join(' ')).toMatch(/illustrative or test data/);
  });

  it('T-FUN-001: CS-01 with ±2 days → €702 vs €780, save €78 (10.0%), award not bookable', async () => {
    const res = await handleQuickSearch(
      post(
        '/api/search/quick',
        quick({
          destination: 'PEK',
          tripType: 'return',
          returnDate: '2027-02-24',
          cabin: 'economy',
          flexDays: 2,
          nearbyAirports: true,
          wallet: { balances: [], valuations: [] },
        }),
      ),
      { env: fixtureEnv, now: NOW },
    );
    const body = await res.json();
    expect(body.data.comparison.economicSaving.minor).toBe(7800);
    expect(body.data.comparison.savingPct).toBe('10.0');
    const award = body.data.options.find((o: { kind: string }) => o.kind === 'award');
    expect(award.excludedReason).toBe('NOT_ENOUGH_POINTS');
    const bcn = body.data.options.find(
      (o: { variation?: { altOrigin?: string } }) => o.variation?.altOrigin === 'BCN',
    );
    expect(bcn.cashTotal.minor).toBe(79500);
    expect(bcn.cashToday.minor).toBe(73500);
  });

  it('CS-04: cash better by €98 with break-even €0.0091', async () => {
    const res = await handleQuickSearch(
      post(
        '/api/search/quick',
        quick({
          origin: 'BCN',
          destination: 'JFK',
          tripType: 'return',
          returnDate: '2027-03-08',
          cabin: 'economy',
        }),
      ),
      { env: fixtureEnv, now: NOW },
    );
    const body = await res.json();
    expect(body.data.comparison.headline).toBe('CASH_BETTER');
    expect(body.data.comparison.awardExtraCost.minor).toBe(9800);
    expect(body.data.comparison.breakEven).toEqual({
      program: 'iberia_club',
      eurPerPoint: '0.0091',
    });
  });

  it('400 VALIDATION_ERROR for bad fields, with field paths', async () => {
    const res = await handleQuickSearch(
      post('/api/search/quick', quick({ origin: 'MADX', destination: 'MAD', adults: 0 })),
      { env: fixtureEnv, now: NOW },
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details.map((d: { path: string }) => d.path)).toEqual(
      expect.arrayContaining(['origin', 'adults']),
    );
  });

  it('400 when return date is missing or before departure', async () => {
    const res = await handleQuickSearch(
      post('/api/search/quick', quick({ tripType: 'return', returnDate: '2027-02-01' })),
      { env: fixtureEnv, now: NOW },
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.details[0].path).toBe('returnDate');
  });

  it('429 RATE_LIMITED with Retry-After after 20 searches a minute from one IP', async () => {
    const same = () =>
      new Request('http://localhost/api/search/quick', {
        method: 'POST',
        headers: { 'x-forwarded-for': '10.9.9.9' },
        body: '{}',
      });
    for (let i = 0; i < 20; i++)
      expect((await handleQuickSearch(same(), { env: fixtureEnv, now: NOW })).status).toBe(400);
    const limited = await handleQuickSearch(same(), { env: fixtureEnv, now: NOW });
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
    expect((await limited.json()).error.code).toBe('RATE_LIMITED');
  });

  it('400 for a body that is not JSON', async () => {
    const res = await handleQuickSearch(post('/api/search/quick', '{nope'), {
      env: fixtureEnv,
      now: NOW,
    });
    expect(res.status).toBe(400);
  });

  it('rejects absurd points balances (bounded integers only; a card number is not a balance)', async () => {
    const res = await handleQuickSearch(
      post(
        '/api/search/quick',
        quick({
          wallet: {
            balances: [{ program: 'iberia_club', points: 4242424242424242 }],
            valuations: [],
          },
        }),
      ),
      { env: fixtureEnv, now: NOW },
    );
    expect(res.status).toBe(400);
  });
});

const duffelOffer = (over: object = {}) => ({
  id: 'off_test_1',
  live_mode: false,
  total_amount: '612.40',
  total_currency: 'EUR',
  expires_at: '2026-10-27T10:30:00Z',
  owner: { name: 'Duffel Airways', iata_code: 'ZZ' },
  passengers: [{ id: 'pas_1', type: 'adult' }],
  conditions: { refund_before_departure: null, change_before_departure: { allowed: true } },
  slices: [
    {
      origin: { iata_code: 'MAD' },
      destination: { iata_code: 'SCL' },
      duration: 'PT13H25M',
      segments: [
        {
          origin: { iata_code: 'MAD' },
          destination: { iata_code: 'SCL' },
          departing_at: '2027-02-10T23:55:00',
          arriving_at: '2027-02-11T08:20:00',
          duration: 'PT13H25M',
          marketing_carrier: { name: 'Duffel Airways', iata_code: 'ZZ' },
          marketing_carrier_flight_number: '1234',
        },
      ],
    },
  ],
  ...over,
});

describe('Duffel test provider (msw, no real network)', () => {
  it('maps a test offer with LIVE_TEST_DUFFEL provenance and unknown refund rules (T-INT-010)', async () => {
    server.use(
      http.post('https://api.duffel.com/air/offer_requests', () =>
        HttpResponse.json({ data: { live_mode: false, offers: [duffelOffer()] } }),
      ),
    );
    const res = await handleQuickSearch(post('/api/search/quick', quick()), {
      env: duffelEnv,
      now: NOW,
    });
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.data.dataMode).toBe('MIXED');
    const d = body.data.options.find(
      (o: { provenance: string }) => o.provenance === 'LIVE_TEST_DUFFEL',
    );
    expect(d.cashTotal).toEqual({ minor: 61240, currency: 'EUR' });
    expect(d.conditions).toEqual({ refund: 'unknown', change: 'allowed' });
    expect(d.sourceLabel).toMatch(/not a real market fare/);
  });

  it('falls back to labelled fixtures when Duffel returns 500 twice (one retry only)', async () => {
    let calls = 0;
    server.use(
      http.post('https://api.duffel.com/air/offer_requests', () => {
        calls++;
        return HttpResponse.json({ errors: [] }, { status: 500 });
      }),
    );
    const res = await handleQuickSearch(post('/api/search/quick', quick()), {
      env: duffelEnv,
      now: NOW,
    });
    const body = await res.json();
    expect(calls).toBe(2);
    expect(res.status).toBe(200);
    expect(body.status).toBe('fixture_fallback');
    expect(body.data.dataMode).toBe('FIXTURE');
    expect(body.meta.providers.find((p: { id: string }) => p.id === 'duffel-test').outcome).toBe(
      'error',
    );
  });

  it('fails closed on a live-mode response (TEST_MODE_REQUIRED) and falls back to fixtures', async () => {
    server.use(
      http.post('https://api.duffel.com/air/offer_requests', () =>
        HttpResponse.json({
          data: { live_mode: true, offers: [duffelOffer({ live_mode: true })] },
        }),
      ),
    );
    const res = await handleQuickSearch(post('/api/search/quick', quick()), {
      env: duffelEnv,
      now: NOW,
    });
    const body = await res.json();
    expect(body.status).toBe('fixture_fallback');
    expect(
      body.data.options.some((o: { provenance: string }) => o.provenance === 'LIVE_TEST_DUFFEL'),
    ).toBe(false);
    expect(body.meta.providers[0].note).toBe('Test mode required');
  });

  it('treats a malformed response as an error, not a result', async () => {
    server.use(
      http.post('https://api.duffel.com/air/offer_requests', () =>
        HttpResponse.json({ data: { live_mode: false } }),
      ),
    );
    const body = await (
      await handleQuickSearch(post('/api/search/quick', quick()), { env: duffelEnv, now: NOW })
    ).json();
    expect(body.status).toBe('fixture_fallback');
  });

  it('marks non-EUR offers FX_STALE when no fresh rate exists (fails closed)', async () => {
    server.use(
      http.post('https://api.duffel.com/air/offer_requests', () =>
        HttpResponse.json({
          data: {
            live_mode: false,
            offers: [duffelOffer({ total_currency: 'USD', total_amount: '700.00' })],
          },
        }),
      ),
    );
    const late = new Date('2026-11-20T10:00:00Z');
    const body = await (
      await handleQuickSearch(post('/api/search/quick', quick({ departDate: '2027-03-10' })), {
        env: duffelEnv,
        now: late,
      })
    ).json();
    const d = body.data.options.find(
      (o: { provenance: string }) => o.provenance === 'LIVE_TEST_DUFFEL',
    );
    expect(d.excludedReason).toBe('FX_STALE');
  });

  it('converts USD offers with a fresh ECB snapshot', async () => {
    server.use(
      http.post('https://api.duffel.com/air/offer_requests', () =>
        HttpResponse.json({
          data: {
            live_mode: false,
            offers: [duffelOffer({ total_currency: 'USD', total_amount: '111.88' })],
          },
        }),
      ),
    );
    const body = await (
      await handleQuickSearch(post('/api/search/quick', quick()), { env: duffelEnv, now: NOW })
    ).json();
    const d = body.data.options.find(
      (o: { provenance: string }) => o.provenance === 'LIVE_TEST_DUFFEL',
    );
    expect(d.cashTotal.minor).toBe(10000); // 111.88 / 1.1188
    expect(d.costLines[0].original).toEqual({ minor: 11188, currency: 'USD' });
  });

  it('refuses a non-test token at construction', () => {
    expect(() =>
      createDuffelCashProvider({ token: 'duffel_live_x', fx: async () => FIXTURE_FX }),
    ).toThrow(/test token/);
  });

  it('times out instead of hanging (provider budget) and reports it', async () => {
    const slow = {
      id: 'duffel-slow',
      kind: 'cash' as const,
      search: (_q: unknown, signal: AbortSignal) =>
        new Promise<never>((_, rej) =>
          signal.addEventListener('abort', () => rej(new Error('aborted'))),
        ),
    };
    const res = await handleQuickSearch(post('/api/search/quick', quick()), {
      env: fixtureEnv,
      now: NOW,
      cashProvider: slow,
    });
    const body = await res.json();
    expect(body.status).toBe('fixture_fallback');
    expect(body.meta.providers[0].outcome).toBe('timeout');
  }, 15_000);
});

describe('POST /api/search/plan', () => {
  const plan = {
    legs: [
      { origin: 'MAD', destination: 'PEK', date: '2027-04-01' },
      { origin: 'PEK', destination: 'PVG', date: '2027-04-06' },
      { origin: 'PVG', destination: 'MAD', date: '2027-04-12' },
    ],
    adults: 1,
    cabin: 'economy',
    objective: 'B_ECONOMIC_COST',
    wallet: {
      balances: [{ program: 'iberia_club', points: 30_000 }],
      valuations: [{ program: 'iberia_club', eurPerPoint: '0.010' }],
    },
  };

  it('T-FUN-002: CS-05 → open-jaw €970, saving €0, rejected per-leg awards with reason', async () => {
    const res = await handlePlanSearch(post('/api/search/plan', plan), {
      env: fixtureEnv,
      now: NOW,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.best.ec.minor).toBe(97000);
    expect(body.data.normal.ec.minor).toBe(97000);
    expect(body.data.economicSaving.minor).toBe(0);
    expect(body.data.rejected[0].reason).toBe('Needs 50,000 Avios; you have 30,000');
    expect(body.data.approximate).toBe(false);
  });

  it('422 for more than 6 flights; 400 for out-of-order dates', async () => {
    const seven = {
      ...plan,
      legs: Array.from({ length: 7 }, (_, i) => ({
        origin: 'MAD',
        destination: 'BCN',
        date: `2027-04-0${i + 1}`,
      })),
    };
    expect(
      (await handlePlanSearch(post('/api/search/plan', seven), { env: fixtureEnv, now: NOW }))
        .status,
    ).toBe(422);
    const backwards = { ...plan, legs: [plan.legs[1], plan.legs[0]] };
    const res = await handlePlanSearch(post('/api/search/plan', backwards), {
      env: fixtureEnv,
      now: NOW,
    });
    expect(res.status).toBe(400);
  });
});
