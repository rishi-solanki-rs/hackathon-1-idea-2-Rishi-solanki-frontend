import { describe, expect, it } from 'vitest';
import { runPlan } from '@/server/plan';
import { explainPlan } from '@/server/explain';
import { serverEnv } from '@/server/env';
import { reprice, createTestOrder } from '@/server/booking';
import type { PlanResult } from '@/domain/plan';

const day = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

describe('LIVE: Duffel test mode + plan + Gemini (real network)', () => {
  let plan: PlanResult;

  it('prices a flexible range with real Duffel test offers', async () => {
    const env = serverEnv();
    expect(env.duffelEnabled).toBe(true);
    const res = await runPlan({
      trip: {
        origin: 'MAD',
        destination: 'LHR',
        tripType: 'return',
        earliestDepart: day(40),
        latestDepart: day(52),
        minNights: 3,
        maxNights: 5,
        adults: 1,
        cabin: 'economy',
        objective: 'B_ECONOMIC_COST',
      },
      profile: {
        cards: [],
        noCards: true,
        balances: [{ program: 'iberia_club', kind: 'exact', points: 12_000 }],
        noPoints: false,
        monthly: [],
        purchases: [],
        finance: { paysInFull: true },
        valuations: [],
      },
      award: { program: 'iberia_club', points: 9_000, taxesEur: 70, source: 'USER_ENTERED' },
      estimateAward: false,
      useExample: false,
    });
    plan = res.data as unknown as PlanResult;
    console.log(
      'flights',
      plan.flights.status,
      plan.flights.searched,
      plan.flights.failed,
      plan.flights.cheapest?.totalMinor,
      plan.flights.cheapest?.provenance,
      '| verdict',
      plan.verdict.outcome,
    );
    expect(['ok', 'partial']).toContain(plan.flights.status);
    expect(plan.flights.cheapest?.provenance).toBe('LIVE_TEST_DUFFEL');
    expect(plan.flights.cheapest?.offerRef).toMatch(/^off_/);
  });

  it('reprices and creates a real Duffel TEST order (no money, no ticket)', async () => {
    const q = plan.flights.cheapest!;
    const quoted = { minor: q.totalMinor, currency: 'EUR' };
    const rp = await reprice({
      offerRef: q.offerRef!,
      quotedTotal: quoted,
      expiresAt: q.expiresAt,
    });
    console.log('reprice', rp.data.mode, rp.data.priceChanged, rp.data.total.minor);
    expect(rp.data.mode).toBe('DUFFEL_TEST');
    const order = await createTestOrder({
      offerRef: q.offerRef!,
      confirmTotal: rp.data.total,
      expiresAt: q.expiresAt,
      idempotencyKey: crypto.randomUUID(),
    });
    console.log('order', order.data.mode, order.data.reference.length > 0, order.data.label);
    expect(order.data.mode).toBe('DUFFEL_TEST');
    expect(order.data.reference).toMatch(/\w+/);
  });

  it('books 4 adults as 4 distinct fictional travellers, with the full itinerary, and finds the order by key', async () => {
    const res = await runPlan({
      trip: {
        origin: 'MAD',
        destination: 'LHR',
        tripType: 'one_way',
        earliestDepart: day(45),
        latestDepart: day(45),
        adults: 4,
        cabin: 'economy',
        objective: 'B_ECONOMIC_COST',
      },
      profile: {
        cards: [],
        noCards: true,
        balances: [],
        noPoints: true,
        monthly: [],
        purchases: [],
        finance: { paysInFull: true },
        valuations: [],
      },
      award: null,
      estimateAward: false,
      useExample: false,
    });
    const q = (res.data as unknown as PlanResult).flights.cheapest!;
    expect(q.offerRef).toMatch(/^off_/);
    const rp = await reprice({
      offerRef: q.offerRef!,
      quotedTotal: { minor: q.totalMinor, currency: 'EUR' },
      expiresAt: q.expiresAt,
    });
    expect(rp.data.itinerary?.passengers).toBe(4);
    expect(rp.data.itinerary?.slices[0]?.segments[0]?.flightNumber).toBeTruthy();
    const key = crypto.randomUUID();
    const order = await createTestOrder({
      offerRef: q.offerRef!,
      confirmTotal: rp.data.total,
      expiresAt: q.expiresAt,
      idempotencyKey: key,
    });
    console.log(
      '4-adult order',
      order.data.reference,
      order.data.passengers.length,
      rp.data.itinerary?.owner,
    );
    expect(order.data.passengers).toHaveLength(4);
    expect(new Set(order.data.passengers).size).toBe(4);
    const { findDuffelOrderByKey } = await import('@/providers/duffel');
    const env = serverEnv();
    const found = await findDuffelOrderByKey(
      { token: env.DUFFEL_ACCESS_TOKEN!, fx: async () => [] },
      q.offerRef!,
      key,
      AbortSignal.timeout(10_000),
    );
    expect(found?.bookingReference).toBe(order.data.reference);
  });

  it('gets a validated Gemini explanation, or an honest rules fallback with a reason', async () => {
    const e = await explainPlan(plan);
    console.log('explain', e.source, e.model, e.rejectedReason, `${e.latencyMs}ms`);
    console.log(e.text.join('\n---\n'));
    expect(e.text.length).toBeGreaterThan(0);
    if (e.source === 'rules') expect(e.rejectedReason).toBeTruthy();
  });
});
