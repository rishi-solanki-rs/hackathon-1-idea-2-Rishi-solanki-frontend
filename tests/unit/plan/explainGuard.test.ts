import { describe, expect, it } from 'vitest';
import { checkExplanation, planFacts, rulesExplanation } from '@/domain/explainGuard';
import { computePlan } from '@/domain/plan';
import { ROUTES, card, flights, profile } from '../../helpers/profile';

const plan = computePlan(
  {
    today: '2026-11-01',
    trip: {
      origin: 'MAD',
      destination: 'JFK',
      tripType: 'return',
      earliestDepart: '2027-03-01',
      latestDepart: '2027-03-10',
      minNights: 7,
      maxNights: 7,
      adults: 1,
      cabin: 'economy',
      objective: 'B_ECONOMIC_COST',
    },
    profile: profile({
      balances: [{ program: 'iberia_club', kind: 'exact', points: 40_000 }],
      cards: [card({ id: 'Iberia Aire', rates: { all: 0.5 } })],
      monthly: [{ id: 'g', label: 'Groceries', category: 'groceries', amountEur: 400 }],
    }),
    award: { program: 'iberia_club', points: 34_000, taxesEur: 150, source: 'USER_ENTERED' },
    flights: flights(600),
    routes: ROUTES,
    referenceEurPerPoint: '0.010',
    programName: () => 'Iberia Club',
    programWebsite: () => 'https://www.iberia.com/',
  },
  ['iberia_club'],
);
const facts = planFacts(plan, () => 'Iberia Club');
const brands = ['Iberia Club', 'American Express Gold', 'Iberia Zenit', 'Flying Blue'];

describe('AI explanation guard', () => {
  it('accepts text that only uses plan facts', () => {
    const ok = [
      'Your 34,000 Avios award plus €150 in taxes is worth about €490, below the €600 test fare, so points look worth it.',
      'You hold 40,000 Iberia Club points, so there is no shortfall. Check the seat on the programme site before booking by ' +
        plan.verdict.lsbd +
        '.',
      'Prices are Duffel test data and the seat is not confirmed. Card approval is not guaranteed.',
    ];
    expect(checkExplanation(ok, facts, brands)).toEqual({ ok: true });
  });

  it('rejects forecasts and positive guarantees', () => {
    for (const p of [
      'Approval is guaranteed.',
      'Prices will drop next month.',
      'It will be cheaper if you wait.',
    ])
      expect(checkExplanation([p], facts, brands)).toMatchObject({
        ok: false,
        reason: expect.stringMatching(/unsupported claim/),
      });
  });

  it.each([
    [['You will save €230 with this award.'], /unsupported claim|unknown number/],
    [['The seat is available, book now for 34,000 Avios.'], /unsupported claim/],
    [['You save 18% with points.'], /percentage/],
    [['Book by 2027-02-20 at the latest.'], /unknown date/],
    [['Use your American Express Gold card for groceries.'], /unsupported name/],
    [['The cash fare is €612.'], /unknown number/],
    [[], /wrong length/],
  ])('rejects %j', (paras, reason) => {
    const r = checkExplanation(paras as string[], facts, brands);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(reason);
  });

  it('the deterministic fallback restates the computed reasons', () => {
    const text = rulesExplanation(plan);
    expect(text[0]).toBe(plan.verdict.reasons[0]);
    expect(text.join(' ')).not.toMatch(/guarantee/i);
  });

  it('accepts formatted human dates and formatted money, and rejects unknown human dates', () => {
    const ok = [
      'Your 34,000 Avios award plus €150.00 in taxes is worth about €490, below the €600 test fare.',
      'Check the seat before Fri 5 Feb 2027.',
    ];
    expect(checkExplanation(ok, facts, brands)).toEqual({ ok: true });
    expect(checkExplanation(['Book before Mon 12 Jan 2027.'], facts, brands)).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/unknown date/),
    });
  });

  it('rejects explanations that contradict the verdict or leak internal field names', () => {
    const cashPlan = computePlan(
      {
        today: '2026-11-01',
        trip: {
          origin: 'MAD',
          destination: 'JFK',
          tripType: 'one_way',
          earliestDepart: '2027-03-01',
          latestDepart: '2027-03-01',
          adults: 1,
          cabin: 'economy',
          objective: 'B_ECONOMIC_COST',
        },
        profile: profile({ noCards: true, noPoints: true }),
        award: null,
        flights: flights(600),
        routes: ROUTES,
        referenceEurPerPoint: '0.010',
        programName: () => 'Iberia Club',
        programWebsite: () => 'https://www.iberia.com/',
      },
      ['iberia_club'],
    );
    const cashFacts = planFacts(cashPlan, () => 'Iberia Club');
    expect(
      checkExplanation(['Use your points to book the award for €600.'], cashFacts, brands),
    ).toMatchObject({
      ok: false,
      reason: 'contradicts cash verdict',
    });
    expect(
      checkExplanation(['Paying cash is better than using 34,000 points.'], facts, brands),
    ).toMatchObject({
      ok: false,
      reason: 'contradicts award verdict',
    });
    expect(checkExplanation(['Your pointsUsableNow is 40,000.'], facts, brands)).toMatchObject({
      ok: false,
      reason: 'internal field name',
    });
  });
});
