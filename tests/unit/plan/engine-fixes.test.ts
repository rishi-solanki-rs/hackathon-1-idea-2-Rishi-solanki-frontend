import { describe, expect, it } from 'vitest';
import { allocate } from '@/domain/cards';
import { earningEvents, pointsNow } from '@/domain/forecast';
import { computePlan, type PlanInputs } from '@/domain/plan';
import { suggestNewCards } from '@/domain/newCards';
import { decideVerdict, lastSafeBookingDate } from '@/domain/verdict';
import { userValue, type Profile, type TripInput } from '@/domain/profile';
import type { TransferRoute } from '@/domain/wallet';
import { CARD_CATALOGUE } from '@/fixtures/cardCatalogue';
import { ROUTES, card, flights, profile } from '../../helpers/profile';

const TODAY = '2026-11-01';
const month = (
  category: Profile['monthly'][number]['category'],
  amountEur: number,
  id = category,
) => ({ id, label: category, category, amountEur });
const trip = (p: Partial<TripInput> = {}): TripInput => ({
  origin: 'MAD',
  destination: 'JFK',
  tripType: 'one_way',
  earliestDepart: '2027-06-01',
  latestDepart: '2027-06-01',
  adults: 1,
  cabin: 'economy',
  objective: 'B_ECONOMIC_COST',
  ...p,
});
const base = (p: Partial<PlanInputs>): PlanInputs => ({
  today: TODAY,
  trip: trip(),
  profile: profile(),
  award: null,
  flights: flights(900),
  routes: ROUTES,
  referenceEurPerPoint: '0.010',
  programName: (id) => id,
  programWebsite: () => undefined,
  ...p,
});

describe('caps (correction 5)', () => {
  it('regression: spend over a reduced category cap does not jump to the higher base rate', () => {
    const gold = card({
      id: 'g',
      rates: { all: 0.5, groceries: 0.2 },
      caps: { all: 1000, groceries: 1000 },
    });
    const a = allocate(
      profile({ cards: [gold], monthly: [month('groceries', 2000)] }),
      'iberia_club',
      ROUTES,
      TODAY,
      '2026-11-20',
    );
    expect(a.assignments[0]!.points).toBe(400);
  });

  it('regression: bonus-category overflow earns the base rate and uses up the base cap', () => {
    const c = card({ id: 'c', rates: { all: 1, travel: 2 }, caps: { travel: 500, all: 800 } });
    const a = allocate(
      profile({ cards: [c], monthly: [month('travel', 1000), month('other', 500)] }),
      'iberia_club',
      ROUTES,
      TODAY,
      '2026-11-20',
    );
    const pts = Object.fromEntries(a.assignments.map((x) => [x.unit.category, x.points]));
    expect(pts.travel).toBe(1500);
    expect(pts.other).toBe(300);
  });

  it('regression: an UNKNOWN cap on a bonus category is counted conservatively and reported', () => {
    const c = card({
      id: 'u',
      earn: [
        { category: 'all', pointsPerEuro: userValue(0.5) },
        {
          category: 'travel',
          pointsPerEuro: userValue(2),
          monthlyCapEur: { value: null, status: 'UNKNOWN' },
        },
      ],
    });
    const a = allocate(
      profile({ cards: [c], monthly: [month('travel', 100)] }),
      'iberia_club',
      ROUTES,
      TODAY,
      '2026-11-20',
    );
    expect(a.assignments[0]!.points).toBe(50);
    expect(a.missing.join(' ')).toMatch(/cap/i);
  });
});

describe('posting and transfer delays (correction 3)', () => {
  it('regression: an unknown posting delay uses a labelled conservative assumption instead of no date', () => {
    const c = card({ id: 'n', delay: null });
    const a = allocate(
      profile({ cards: [c], monthly: [month('groceries', 300)] }),
      'iberia_club',
      ROUTES,
      TODAY,
      '2026-11-20',
    );
    expect(a.assignments[0]!.postsOn).toBe('2026-12-30');
    expect(a.assignments[0]!.postingAssumed).toBe(true);
    expect(earningEvents(a).undated).toBe(0);
  });

  it('regression: bank-programme earnings add the transfer delay and respect minimum and steps', () => {
    const mr = card({ id: 'mr', program: 'amex_mr_es', rates: { all: 1 }, delay: 30 });
    const a = allocate(
      profile({ cards: [mr], monthly: [month('groceries', 1500)] }),
      'iberia_club',
      ROUTES,
      TODAY,
      '2026-11-20',
    );
    const ev = earningEvents(a, { target: 'iberia_club', routes: ROUTES });
    expect(ev.dated).toEqual([{ date: '2026-12-17', points: 1000, label: 'groceries' }]);
  });

  it('regression: points that expire before the safe booking date are not counted', () => {
    const p = pointsNow(
      [{ program: 'iberia_club', kind: 'exact', points: 20000, expiresOn: '2027-01-10' }],
      'iberia_club',
      ROUTES,
      '2027-05-01',
    );
    expect(p.usable).toBe(0);
    expect(p.expired).toEqual([{ program: 'iberia_club', points: 20000, expiresOn: '2027-01-10' }]);
  });
});

describe('planned purchases (correction 4)', () => {
  it('regression: a necessary refundable purchase still counts, and is flagged as possibly clawed back', () => {
    const c = card({ id: 'c' });
    const purchase = {
      id: 'p',
      label: 'Sofa',
      category: 'shopping' as const,
      amountEur: 800,
      date: '2026-11-10',
      necessity: 'necessary' as const,
      committed: true,
      refundable: true,
    };
    const r = computePlan(base({ profile: profile({ cards: [c], purchases: [purchase] }) }), [
      'iberia_club',
    ]);
    expect(r.allocation.assignments.some((x) => x.unit.id === 'p')).toBe(true);
    expect(r.confidenceReasons.join(' ')).toMatch(/clawed back|refund/i);
  });
});

describe('budget and reserve (correction 2)', () => {
  it('regression: cash left after the fare is checked against the reserve', () => {
    const short = computePlan(
      base({
        profile: profile({
          finance: { paysInFull: true, tripBudgetEur: 1000, cashReserveEur: 300 },
        }),
      }),
      ['iberia_club'],
    );
    expect(short.affordability).toMatchObject({
      status: 'short',
      remainingEur: 100,
      reserveEur: 300,
    });
    const ok = computePlan(
      base({
        profile: profile({
          finance: { paysInFull: true, tripBudgetEur: 2000, cashReserveEur: 300 },
        }),
      }),
      ['iberia_club'],
    );
    expect(ok.affordability.status).toBe('ok');
    const unknown = computePlan(base({}), ['iberia_club']);
    expect(unknown.affordability.status).toBe('unknown');
    expect(short.actions.some((x) => x.id === 'reserve')).toBe(true);
  });

  it('input wiring: the card a purchase is paid with today changes the "versus today" baseline', () => {
    const c = card({ id: 'c', rates: { all: 1 } });
    const purchase = {
      id: 'p',
      label: 'TV',
      category: 'shopping' as const,
      amountEur: 500,
      date: '2026-11-10',
      necessity: 'necessary' as const,
      committed: true,
      refundable: false,
    };
    const withoutCard = computePlan(
      base({ profile: profile({ cards: [c], purchases: [purchase] }) }),
      ['iberia_club'],
    );
    const withCard = computePlan(
      base({ profile: profile({ cards: [c], purchases: [{ ...purchase, currentCardId: 'c' }] }) }),
      ['iberia_club'],
    );
    expect(withoutCard.allocation.incrementalTargetPoints).toBe(500);
    expect(withCard.allocation.incrementalTargetPoints).toBe(0);
  });
});

describe('deadline and window', () => {
  it('regression: a book-by date equal to departure is honoured', () => {
    expect(lastSafeBookingDate({ earliestDepart: '2027-03-01', bookBy: '2027-03-01' })).toBe(
      '2027-02-26',
    );
  });

  it('regression: spending after the safe booking date is not counted', () => {
    const c = card({ id: 'c' });
    const r = computePlan(
      base({
        trip: trip({ earliestDepart: '2027-01-20', latestDepart: '2027-01-20' }),
        profile: profile({ cards: [c], monthly: [month('groceries', 300)] }),
      }),
      ['iberia_club'],
    );
    expect(r.verdict.lsbd).toBe('2026-12-27');
    expect(r.allocation.assignments.every((x) => x.unit.date <= r.verdict.lsbd)).toBe(true);
  });

  it('regression: many purchases make the result approximate, and the user is told', () => {
    const c = card({ id: 'c' });
    const monthly = ['groceries', 'dining', 'transport', 'fuel', 'bills'].map((k) =>
      month(k as never, 100),
    );
    const r = computePlan(base({ profile: profile({ cards: [c], monthly }) }), ['iberia_club']);
    expect(r.allocation.approximate).toBe(true);
    expect(r.confidenceReasons.join(' ')).toMatch(/approximate/i);
  });
});

describe('verdict wording and states', () => {
  const v = (p: Partial<Parameters<typeof decideVerdict>[0]>) =>
    decideVerdict({
      today: TODAY,
      trip: trip({ earliestDepart: '2027-03-01', latestDepart: '2027-03-01' }),
      cashBestMinor: 60000,
      award: { program: 'iberia_club', points: 34000, taxesEur: 150, source: 'USER_ENTERED' },
      eurPerPoint: '0.010',
      pointsUsableNow: 40000,
      pointsReady: 'now',
      lowConfidenceReasons: [],
      ...p,
    });

  it('regression: the "least cash" goal talks about cash paid today, not overall value', () => {
    const r = v({
      trip: trip({
        earliestDepart: '2027-03-01',
        latestDepart: '2027-03-01',
        objective: 'A_CASH_TODAY',
      }),
    });
    expect(r.reasons[0]).toMatch(/€150 in taxes/);
    expect(r.reasons[0]).not.toMatch(/worth about/);
  });

  it('regression: a past booking deadline is reported even when an award exists', () => {
    const r = v({ today: '2027-02-27' });
    expect(r.reasons.join(' ')).toMatch(/has passed/);
  });

  it('regression: a seat the user saw available beats "not yet searchable"', () => {
    const far = trip({ earliestDepart: '2028-01-15', latestDepart: '2028-01-15' });
    const r = v({
      trip: far,
      award: {
        program: 'iberia_club',
        points: 34000,
        taxesEur: 150,
        source: 'USER_ENTERED',
        seenAvailable: true,
      },
    });
    expect(r.awardAvailability).toBe('USER_SAW_AVAILABLE');
  });
});

describe('what changed', () => {
  it('regression: route, cabin, travellers, goal and spending amounts are reported as causes', async () => {
    const { diffPlans } = await import('@/domain/replan');
    const c = card({ id: 'c' });
    const a = computePlan(
      base({ profile: profile({ cards: [c], monthly: [month('groceries', 300)] }) }),
      ['iberia_club'],
    );
    const b = computePlan(
      base({
        trip: trip({ destination: 'MIA', cabin: 'business', adults: 2, objective: 'A_CASH_TODAY' }),
        profile: profile({ cards: [c], monthly: [month('groceries', 500)] }),
      }),
      ['iberia_club'],
    );
    const causes = diffPlans(a, b).causes;
    for (const x of [
      'Route changed',
      'Cabin changed',
      'Number of travellers changed',
      'Goal changed',
      'Spending amounts changed',
    ])
      expect(causes).toContain(x);
  });
});

describe('routes, new cards, daily cards', () => {
  it('regression: illustrative transfer routes are not counted as usable points', () => {
    const illustrative: TransferRoute = {
      id: 'x',
      from: 'revolut_revpoints',
      to: 'iberia_club',
      num: 1,
      den: 1,
      min: 1,
      increment: 1,
      status: 'active',
      verification: 'ILLUSTRATIVE',
      maxDelayDays: 3,
      preconditions: [],
    };
    const r = computePlan(
      base({
        routes: [illustrative],
        profile: profile({
          balances: [{ program: 'revolut_revpoints', kind: 'exact', points: 5000 }],
        }),
      }),
      ['iberia_club'],
    );
    expect(r.pointsNow.usable).toBe(0);
    expect(r.confidenceReasons.join(' ')).toMatch(/illustrative/i);
  });

  it('regression: a card with an unknown fee can be "possible" at most', () => {
    const unknownFee = {
      ...CARD_CATALOGUE.find((c) => c.id === 'amex_es_gold')!,
      id: 'x_gold',
      annualFeeEur: { value: null, status: 'UNKNOWN' as const },
    };
    const r = suggestNewCards({
      today: TODAY,
      needBy: '2027-06-01',
      profile: profile({ monthly: [month('bills', 1200)] }),
      target: 'iberia_club',
      routes: ROUTES,
      eurPerPoint: '0.010',
      gap: 8000,
      cashIsBetter: false,
      candidates: [unknownFee],
    });
    expect(r[0]!.status).toBe('possible');
  });

  it('regression: "everyday spending" uses the same card as the cap-aware allocation', () => {
    const aire = card({ id: 'aire', name: 'Aire', rates: { all: 2 }, caps: { all: 1000 } });
    const gold = card({ id: 'gold', name: 'Gold', program: 'amex_mr_es', rates: { all: 0.5 } });
    const r = computePlan(
      base({
        profile: profile({
          cards: [aire, gold],
          monthly: [month('groceries', 2000), month('transport', 200), month('fuel', 125)],
        }),
      }),
      ['iberia_club'],
    );
    for (const d of r.dailyCards) {
      const first = r.allocation.assignments.find((a) => a.unit.sourceId === d.spendId)!;
      expect(d.cardName).toBe(first.cardName);
    }
  });

  it('regression: suggestNewCards uses the card’s sourced postingDelayDays when present and builds a month-by-month plan', () => {
    const fastGold = {
      ...CARD_CATALOGUE.find((c) => c.id === 'amex_es_gold')!,
      id: 'fast_gold',
      postingDelayDays: { value: 5, status: 'VERIFIED' as const },
      welcome: undefined,
    };
    const slowGold = {
      ...CARD_CATALOGUE.find((c) => c.id === 'amex_es_gold')!,
      id: 'slow_gold',
      postingDelayDays: { value: 60, status: 'VERIFIED' as const },
      welcome: undefined,
    };
    const rFast = suggestNewCards({
      today: TODAY,
      needBy: '2027-01-05',
      profile: profile({ monthly: [month('bills', 1200)] }),
      target: 'iberia_club',
      routes: ROUTES,
      eurPerPoint: '0.010',
      gap: 500,
      cashIsBetter: false,
      candidates: [fastGold],
    });
    const rSlow = suggestNewCards({
      today: TODAY,
      needBy: '2027-01-05',
      profile: profile({ monthly: [month('bills', 1200)] }),
      target: 'iberia_club',
      routes: ROUTES,
      eurPerPoint: '0.010',
      gap: 500,
      cashIsBetter: false,
      candidates: [slowGold],
    });
    expect(rFast[0]!.months).toBeGreaterThan(rSlow[0]!.months);
    expect(rFast[0]!.monthlyPlan.length).toBeGreaterThan(0);
  });

  it('owner MAD-SCL scenario: First class has no estimate, overriding official Aire rate lowers confidence, plain summary and gap message are present', () => {
    const gold = card({
      id: 'gold',
      name: 'American Express Gold (Spain)',
      catalogueId: 'amex_es_gold',
      program: 'amex_mr_es',
      rates: { all: 0.5, groceries: 0.2 },
      delay: null,
    });
    const aireOverridden = card({
      id: 'aire',
      name: 'Iberia Aire (Iberia Cards)',
      catalogueId: 'iberia_aire',
      program: 'iberia_club',
      rates: { all: 2, travel: 0.5 },
      delay: null,
    });
    const r = computePlan(
      base({
        today: '2026-10-27',
        trip: trip({
          origin: 'MAD',
          destination: 'SCL',
          tripType: 'one_way',
          earliestDepart: '2027-02-01',
          latestDepart: '2027-03-01',
          adults: 4,
          cabin: 'first',
        }),
        profile: profile({
          cards: [gold, aireOverridden],
          balances: [{ program: 'iberia_club', kind: 'exact', points: 1200 }],
          monthly: [month('groceries', 2000), month('transport', 200), month('fuel', 125)],
          purchases: [
            {
              id: 'iphone',
              label: 'iPhone',
              category: 'shopping',
              amountEur: 1200,
              date: '2026-11-20',
              necessity: 'flexible',
              committed: false,
              refundable: true,
            },
          ],
        }),
        award: null,
        awardNote: 'Iberia sells no First class, so there is no award estimate for it.',
        flights: flights(24590.44),
        cardOptions: CARD_CATALOGUE,
      }),
      ['iberia_club'],
    );
    expect(r.confidenceReasons.join(' ')).toMatch(/official rate/i);
    expect(r.summary.haveNeedGap).toMatch(/1,200/);
    expect(r.summary.decision).toMatch(/€24,590/);
    expect(r.summary.nextAction).toMatch(/Book the cash fare/);
    expect(r.earnings.undated).toBe(0);
    expect(r.earnings.dated.length).toBeGreaterThan(0);
  });
});
