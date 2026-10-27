import { describe, expect, it } from 'vitest';
import { sampleDates } from '@/domain/flexDates';
import { pointsNow, readyDate } from '@/domain/forecast';
import { computePlan } from '@/domain/plan';
import { diffPlans } from '@/domain/replan';
import { decideVerdict, lastSafeBookingDate } from '@/domain/verdict';
import type { TripInput } from '@/domain/profile';
import { ROUTES, card, flights, profile } from '../../helpers/profile';

const TODAY = '2026-11-01';
const trip = (p: Partial<TripInput> = {}): TripInput => ({
  origin: 'MAD',
  destination: 'JFK',
  tripType: 'return',
  earliestDepart: '2027-03-01',
  latestDepart: '2027-03-20',
  minNights: 7,
  maxNights: 10,
  adults: 1,
  cabin: 'economy',
  objective: 'B_ECONOMIC_COST',
  ...p,
});
const base = {
  today: TODAY,
  routes: ROUTES,
  referenceEurPerPoint: '0.010',
  programName: (id: string) => id,
  programWebsite: () => 'https://example.org',
};
const AIRLINES = ['iberia_club', 'ba_club', 'flying_blue'];

describe('points now', () => {
  it('never combines programmes without a route; counts ranges at the minimum and unknowns as zero', () => {
    const p = pointsNow(
      [
        { program: 'iberia_club', kind: 'exact', points: 20_000, reserved: 5_000 },
        { program: 'flying_blue', kind: 'exact', points: 30_000 },
        { program: 'amex_mr_es', kind: 'range', min: 10_000, max: 15_000 },
        { program: 'ba_club', kind: 'unknown' },
      ],
      'iberia_club',
      ROUTES,
    );
    expect(p.direct).toBe(15_000);
    expect(p.viaTransfer).toBe(10_000);
    expect(p.usable).toBe(25_000);
    expect(p.usedRangeMinimum).toBe(true);
    expect(p.unknownPrograms).toEqual(['ba_club']);
  });

  it('ready date adds the transfer delay and returns null when not reached', () => {
    expect(readyDate(100, 100, [])).toBe('now');
    expect(readyDate(300, 100, [{ date: '2027-01-10', points: 250, label: 'x' }], 2)).toBe(
      '2027-01-12',
    );
    expect(readyDate(1000, 100, [{ date: '2027-01-10', points: 250, label: 'x' }])).toBeNull();
  });
});

describe('verdict', () => {
  const v = (p: Partial<Parameters<typeof decideVerdict>[0]>) =>
    decideVerdict({
      today: TODAY,
      trip: trip(),
      cashBestMinor: 60000,
      award: { program: 'iberia_club', points: 34_000, taxesEur: 150, source: 'USER_ENTERED' },
      eurPerPoint: '0.010',
      pointsUsableNow: 40_000,
      pointsReady: 'now',
      lowConfidenceReasons: [],
      ...p,
    });

  it('deadline: 21 days before departure minus a 3-day buffer, or the user deadline', () => {
    expect(lastSafeBookingDate({ earliestDepart: '2027-03-01' })).toBe('2027-02-05');
    expect(lastSafeBookingDate({ earliestDepart: '2027-03-01', bookBy: '2027-01-31' })).toBe(
      '2027-01-28',
    );
  });
  it('enough points and award cheaper → check the seat (never confirmed by us)', () => {
    const r = v({});
    expect(r.outcome).toBe('AWARD_WORTH_CHECKING');
    expect(r.awardEconomicMinor).toBe(49000);
    expect(r.awardAvailability).toBe('UNKNOWN_AVAILABILITY');
  });
  it('cash cheaper than the valued award → CASH_BETTER', () =>
    expect(v({ cashBestMinor: 45000 }).outcome).toBe('CASH_BETTER'));
  it('Goal A compares cash paid today', () =>
    expect(v({ cashBestMinor: 45000, trip: trip({ objective: 'A_CASH_TODAY' }) }).outcome).toBe(
      'AWARD_WORTH_CHECKING',
    ));
  it('shortfall covered before the safe date → ACCUMULATE', () =>
    expect(v({ pointsUsableNow: 30_000, pointsReady: '2027-01-20' })).toMatchObject({
      outcome: 'ACCUMULATE_FROM_PLANNED_SPEND',
      shortfall: 4_000,
    }));
  it('shortfall covered too late → INSUFFICIENT with a cash fallback', () => {
    const r = v({ pointsUsableNow: 30_000, pointsReady: '2027-02-20' });
    expect(r.outcome).toBe('INSUFFICIENT_BY_DEADLINE');
    expect(r.fallback).toMatch(/Book the cash fare/);
  });
  it('departure beyond the release window → MONITOR without transferring', () =>
    expect(
      v({ trip: trip({ earliestDepart: '2028-01-10', latestDepart: '2028-01-12' }) }).outcome,
    ).toBe('MONITOR_NO_TRANSFER'));
  it('no cash and no award → TOO_UNCERTAIN with insufficient confidence', () =>
    expect(v({ cashBestMinor: null, award: null })).toMatchObject({
      outcome: 'TOO_UNCERTAIN',
      confidence: 'insufficient',
    }));
  it('cash only → BOOK_CASH_NOW', () => expect(v({ award: null }).outcome).toBe('BOOK_CASH_NOW'));
  it('low-confidence reasons lower confidence', () =>
    expect(v({ lowConfidenceReasons: ['estimate'] }).confidence).toBe('low'));
});

describe('flexible date sampling', () => {
  it('spreads at most 7 searches across the range, endpoints included, alternating stay lengths', () => {
    const d = sampleDates({
      tripType: 'return',
      earliestDepart: '2027-03-01',
      latestDepart: '2027-03-31',
      minNights: 7,
      maxNights: 10,
    });
    expect(d).toHaveLength(7);
    expect(d[0]).toEqual({ depart: '2027-03-01', ret: '2027-03-08' });
    expect(d[1].ret).toBe('2027-03-16');
    expect(d[6].depart).toBe('2027-03-31');
  });
  it('a single day gives one search; one-way has no return', () => {
    expect(
      sampleDates({
        tripType: 'one_way',
        earliestDepart: '2027-03-01',
        latestDepart: '2027-03-01',
      }),
    ).toEqual([{ depart: '2027-03-01' }]);
  });
});

describe('full plan and re-plan', () => {
  it('no cards and no points: cash plan with honest actions', () => {
    const r = computePlan(
      {
        ...base,
        trip: trip(),
        profile: profile({ noCards: true, noPoints: true }),
        award: null,
        flights: flights(600),
      },
      AIRLINES,
    );
    expect(r.verdict.outcome).toBe('BOOK_CASH_NOW');
    expect(r.actions.map((a) => a.id)).toEqual(
      expect.arrayContaining(['book-cash', 'no-extra', 'recalc']),
    );
    expect(r.allocation.status).toBe('NO_CARDS');
  });

  it('regression: a requested example fare drives the verdict, labelled as an example, with low confidence', () => {
    const ex = { ...flights(191), status: 'example' as const, provider: 'example' as const };
    const r = computePlan(
      {
        ...base,
        trip: trip(),
        profile: profile({ noCards: true, noPoints: true }),
        award: null,
        flights: ex,
      },
      AIRLINES,
    );
    expect(r.verdict.outcome).toBe('BOOK_CASH_NOW');
    expect(r.verdict.confidence).toBe('low');
    expect(r.verdict.reasons[0]).toMatch(/€191 \(example fare\)/);
    expect(r.actions.find((a) => a.id === 'book-cash')?.detail).toMatch(
      /example fare, not a real or test price/,
    );
  });

  it('award not confirmed: plan tells the user not to transfer yet and never claims a seat', () => {
    const r = computePlan(
      {
        ...base,
        trip: trip(),
        profile: profile({ balances: [{ program: 'iberia_club', kind: 'exact', points: 40_000 }] }),
        award: { program: 'iberia_club', points: 34_000, taxesEur: 150, source: 'USER_ENTERED' },
        flights: flights(600),
      },
      AIRLINES,
    );
    expect(r.verdict.outcome).toBe('AWARD_WORTH_CHECKING');
    expect(r.actions.find((a) => a.id === 'no-transfer')).toBeTruthy();
    expect(JSON.stringify(r.actions)).not.toMatch(/seat is available|confirmed seat/i);
  });

  it('changing a balance recalculates the shortfall and explains why', () => {
    const mk = (pts: number) =>
      computePlan(
        {
          ...base,
          trip: trip(),
          profile: profile({
            balances: [{ program: 'iberia_club', kind: 'exact', points: pts }],
            cards: [card({ id: 'Iberia Visa', rates: { all: 1 }, delay: 30 })],
            monthly: [{ id: 'g', label: 'Groceries', category: 'groceries', amountEur: 1000 }],
          }),
          award: { program: 'iberia_club', points: 34_000, taxesEur: 150, source: 'USER_ENTERED' },
          flights: flights(600),
        },
        AIRLINES,
      );
    const before = mk(20_000);
    const after = mk(32_000);
    expect(before.verdict.shortfall).toBe(14_000);
    expect(after.verdict.shortfall).toBe(2_000);
    const d = diffPlans(before, after);
    expect(d.causes).toContain('Points balance changed');
    expect(d.outcome.find((c) => c.field === 'Points shortfall')).toEqual({
      field: 'Points shortfall',
      before: '14,000',
      after: '2,000',
    });
  });

  it('a cancelled planned purchase changes the allocation and is reported', () => {
    const purchase = {
      id: 'p',
      label: 'Laptop',
      category: 'shopping' as const,
      amountEur: 1500,
      date: '2026-12-10',
      necessity: 'necessary' as const,
      committed: true,
      refundable: true,
    };
    const mk = (withPurchase: boolean) =>
      computePlan(
        {
          ...base,
          trip: trip(),
          profile: profile({
            cards: [card({ id: 'C', rates: { all: 1 } })],
            purchases: withPurchase ? [purchase] : [],
          }),
          award: { program: 'iberia_club', points: 34_000, taxesEur: 150, source: 'USER_ENTERED' },
          flights: flights(600),
        },
        AIRLINES,
      );
    const d = diffPlans(mk(true), mk(false));
    expect(d.causes).toContain('Planned spending changed');
    expect(d.outcome.find((c) => c.field === 'Points from planned spending')).toEqual({
      field: 'Points from planned spending',
      before: '1,500',
      after: '0',
    });
  });
});
