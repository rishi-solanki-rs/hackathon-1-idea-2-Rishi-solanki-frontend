import { describe, expect, it } from 'vitest';
import { cashToday, cashTotal, CostModelError, economicCost } from '@/domain/cost';
import { evaluate } from '@/domain/evaluate';
import { eur, money } from '@/domain/money';
import { breakEven, compare } from '@/domain/savings';
import type { ValuationMap } from '@/domain/cost';
import type { UsableMap } from '@/domain/evaluate';
import { avios, opt, pool } from '../../helpers/options';

const evalAll = (
  opts: ReturnType<typeof opt>[],
  v: ValuationMap = avios('0.012'),
  p: UsableMap = pool(0),
) => opts.map((o) => evaluate(o, v, p));

describe('cost model (doc 12 §A)', () => {
  it('separates cash today from cash paid later; EC uses the total', () => {
    const o = opt({ id: 'bcn', cash: 735, later: 60 });
    expect(cashToday(o)).toEqual(eur(735));
    expect(cashTotal(o)).toEqual(eur(795));
    expect(economicCost(o, {})).toEqual(eur(795));
  });

  it('rejects a duplicated cost line instead of double-counting it', () => {
    const bag = {
      code: 'bag' as const,
      key: 'bag:pax1',
      label: 'bag',
      amount: eur(40),
      timing: 'today' as const,
      provenance: 'FIXTURE_FLIGHT' as const,
    };
    const o = opt({ id: 'dup', cash: 580, extraLines: [bag, bag] });
    expect(() => cashTotal(o)).toThrow(CostModelError);
  });

  it('an all-in fare is counted once (fees are inside the fare line)', () => {
    expect(cashTotal(opt({ id: 'x', cash: 780 }))).toEqual(eur(780));
  });

  it('returns no EC when a programme has no valuation (break-even only)', () => {
    expect(economicCost(opt({ id: 'a', cash: 310, points: 34_000 }), {})).toBeNull();
  });
});

describe('Phase 1 worked examples', () => {
  it('CS-01 (T-CALC-004): flexible dates save €78 / 10.0%; BCN + train €795 is worse', () => {
    const c = compare(
      evalAll([
        opt({ id: 'exact', cash: 780 }),
        opt({ id: 'plus2', cash: 702, dateShiftDays: 2 }),
        opt({ id: 'bcn', cash: 735, later: 60, altOrigin: 'BCN' }),
        opt({ id: 'award', cash: 320, points: 50_000 }),
      ]),
      'B_ECONOMIC_COST',
    );
    expect(c.normal?.option.id).toBe('exact');
    expect(c.hacked?.option.id).toBe('plus2');
    expect(c.economicSaving).toEqual(eur(78));
    expect(c.savingPct).toBe('10.0');
    expect(c.headline).toBe('SAVING');
    expect(c.excluded.find((x) => x.e.option.id === 'award')?.reason).toBe('NOT_ENOUGH_POINTS');
  });

  it('CS-02 (T-CALC-005): 20,000 of 25,000 points → not bookable; H stays cash, saving €0', () => {
    const c = compare(
      evalAll(
        [opt({ id: 'cash', cash: 520 }), opt({ id: 'award', cash: 160, points: 25_000 })],
        avios('0.010'),
        pool(20_000),
      ),
      'B_ECONOMIC_COST',
    );
    expect(c.hacked?.option.id).toBe('cash');
    expect(c.economicSaving).toEqual(eur(0));
    expect(c.headline).toBe('NO_SAVING');
    const award = c.excluded[0];
    expect(award.reason).toBe('NOT_ENOUGH_POINTS');
    expect(award.e.shortfall).toEqual({ program: 'iberia_club', needed: 25_000, usable: 20_000 });
    expect(award.e.ec).toEqual(eur(410)); // hypothetical, shown as conditional only
  });

  it('CS-02b (T-CALC-023): award taxes 160 + bought points 106.50 + 20,000 × 0.010 → €466.50', () => {
    const o = opt({
      id: 'gapfill',
      cash: 160,
      points: 20_000,
      extraLines: [
        {
          code: 'other',
          key: 'buy-points',
          label: 'Buy 5,000 points',
          amount: money(10650),
          timing: 'today',
          provenance: 'USER_ENTERED',
        },
      ],
    });
    expect(cashToday(o)).toEqual(money(26650));
    expect(economicCost(o, avios('0.010'))).toEqual(money(46650));
  });

  it('CS-03 (T-CALC-006): €2,900 cash vs 70,500 Avios + €380 → save €1,674 (57.7%), cash today €2,520 less', () => {
    const c = compare(
      evalAll(
        [opt({ id: 'cash', cash: 2900 }), opt({ id: 'award', cash: 380, points: 70_500 })],
        avios('0.012'),
        pool(120_000),
      ),
      'B_ECONOMIC_COST',
    );
    expect(c.hacked?.option.id).toBe('award');
    expect(c.hacked?.ec).toEqual(eur(1226));
    expect(c.economicSaving).toEqual(eur(1674));
    expect(c.savingPct).toBe('57.7');
    expect(c.cashSavingToday).toEqual(eur(2520));
  });

  it('CS-04 (T-CALC-106, T-CALC-003): award EC €718 > €620 → cash better by €98; v* €0.0091', () => {
    const evals = evalAll(
      [opt({ id: 'cash', cash: 620 }), opt({ id: 'award', cash: 310, points: 34_000 })],
      avios('0.012'),
      pool(120_000),
    );
    const b = compare(evals, 'B_ECONOMIC_COST');
    expect(b.hacked?.option.id).toBe('cash');
    expect(b.headline).toBe('CASH_BETTER');
    expect(b.awardExtraCost).toEqual(eur(98));
    expect(b.breakEven).toEqual({ program: 'iberia_club', eurPerPoint: '0.0091' });

    // T-CALC-012: Goal A puts the award first and says it costs €98 more overall.
    const a = compare(evals, 'A_CASH_TODAY');
    expect(a.hacked?.option.id).toBe('award');
    expect(a.headline).toBe('LESS_CASH_TODAY');
    expect(a.economicSaving).toEqual(eur(-98));
  });

  it('FX-CASH-08 (T-CALC-022): break-even uses all-in totals once → €0.0079', () => {
    const bag = (k: string) => ({
      code: 'bag' as const,
      key: k,
      label: 'bag',
      amount: eur(40),
      timing: 'today' as const,
      provenance: 'FIXTURE_FLIGHT' as const,
    });
    const [award, cash] = evalAll([
      opt({ id: 'award', cash: 310, points: 34_000, extraLines: [bag('bag:a')] }),
      opt({ id: 'cash', cash: 580, extraLines: [bag('bag:c')] }),
    ]);
    expect(breakEven(award, cash)).toEqual({ program: 'iberia_club', eurPerPoint: '0.0079' });
  });

  it('break-even is "never" when award taxes alone exceed cash', () => {
    const [award, cash] = evalAll([
      opt({ id: 'a', cash: 300, points: 10_000 }),
      opt({ id: 'c', cash: 250 }),
    ]);
    expect(breakEven(award, cash)).toEqual({ program: 'iberia_club', never: true });
  });
});

describe('guards', () => {
  it('zero saving is never shown as a saving', () => {
    const c = compare(
      evalAll([opt({ id: 'a', cash: 500 }), opt({ id: 'b', cash: 500 })]),
      'B_ECONOMIC_COST',
    );
    expect(c.economicSaving).toEqual(eur(0));
    expect(c.headline).toBe('NO_SAVING');
  });

  it('missing valuation: award is ranked under Goal A but excluded from Goal B ranking', () => {
    const evals = evalAll(
      [opt({ id: 'cash', cash: 620 }), opt({ id: 'award', cash: 310, points: 34_000 })],
      {},
      pool(50_000),
    );
    expect(compare(evals, 'B_ECONOMIC_COST').excluded[0]).toMatchObject({
      reason: 'NEEDS_POINTS_VALUE',
    });
    expect(compare(evals, 'A_CASH_TODAY').hacked?.option.id).toBe('award');
  });

  it('stale FX options are excluded and never become the normal price', () => {
    const c = compare(
      evalAll([opt({ id: 'stale', cash: 1, fxStale: true }), opt({ id: 'ok', cash: 700 })]),
      'B_ECONOMIC_COST',
    );
    expect(c.normal?.option.id).toBe('ok');
    expect(c.excluded[0]).toMatchObject({ reason: 'FX_STALE' });
  });

  it('no comparable cash price → no saving claimed', () => {
    const c = compare(
      evalAll([opt({ id: 'shift', cash: 600, dateShiftDays: 1 })]),
      'B_ECONOMIC_COST',
    );
    expect(c.headline).toBe('NO_NORMAL_PRICE');
    expect(c.economicSaving).toBeNull();
  });

  it('tie-break is deterministic (same inputs in any order → same ranking)', () => {
    const a = [
      opt({ id: 'b', cash: 500 }),
      opt({ id: 'a', cash: 500 }),
      opt({ id: 'c', cash: 400 }),
    ];
    const r1 = compare(evalAll(a), 'B_ECONOMIC_COST').ranked.map((e) => e.option.id);
    const r2 = compare(evalAll([...a].reverse()), 'B_ECONOMIC_COST').ranked.map((e) => e.option.id);
    expect(r1).toEqual(['c', 'a', 'b']);
    expect(r2).toEqual(r1);
  });
});
