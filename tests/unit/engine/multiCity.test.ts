import { describe, expect, it } from 'vitest';
import { evaluate } from '@/domain/evaluate';
import { eur } from '@/domain/money';
import { compareCombos, searchTrip } from '@/domain/multiCity';
import { avios, opt, pool } from '../../helpers/options';

const cs05 = () =>
  [
    opt({ id: 'l1-cash', cash: 520, legs: [0] }),
    opt({ id: 'l1-award', cash: 160, points: 25_000, legs: [0] }),
    opt({ id: 'l2-cash', cash: 90, legs: [1] }),
    opt({ id: 'l3-cash', cash: 540, legs: [2] }),
    opt({ id: 'l3-award', cash: 170, points: 25_000, legs: [2] }),
    opt({ id: 'openjaw', cash: 880, legs: [0, 2] }),
  ].map((o) => evaluate(o, avios('0.010'), pool(30_000)));

describe('bounded multi-city search (ENG-19, doc 12 §B)', () => {
  it('CS-05 (T-CALC-007): open-jaw cash €970 wins; saving €0; per-leg awards rejected for points', () => {
    const r = searchTrip({
      legCount: 3,
      options: cs05(),
      objective: 'B_ECONOMIC_COST',
      pool: { iberia_club: 30_000 },
      programName: () => 'Avios',
    });
    expect(r.best?.ec).toEqual(eur(970));
    expect(r.best?.picks.map((p) => p.option.id).sort()).toEqual(['l2-cash', 'openjaw']);
    expect(r.normal?.ec).toEqual(eur(970));
    expect(r.rejected[0].combination.ec).toEqual(eur(920));
    expect(r.rejected[0].reason).toBe('Needs 50,000 Avios; you have 30,000');
    expect(r.alternatives.map((c) => c.ec?.minor)).toEqual([103000, 104000, 115000]);
    expect(r.approximate).toBe(false);
  });

  it('Goal A uses a cash-today bound, not the EC bound (objective-aware pruning)', () => {
    const r = searchTrip({
      legCount: 3,
      options: cs05(),
      objective: 'A_CASH_TODAY',
      pool: { iberia_club: 30_000 },
    });
    expect(r.best?.cashToday).toEqual(eur(780)); // L1 cash 520 + L2 90 + L3 award taxes 170
    expect(r.best?.picks.map((p) => p.option.id).sort()).toEqual([
      'l1-cash',
      'l2-cash',
      'l3-award',
    ]);
  });

  it('UNIT-MULTI-LIMIT: a tiny node limit is labelled approximate and never worse than greedy or N', () => {
    const r = searchTrip({
      legCount: 3,
      options: cs05(),
      objective: 'B_ECONOMIC_COST',
      pool: { iberia_club: 30_000 },
      nodeLimit: 3,
    });
    expect(r.approximate).toBe(true);
    expect(r.best).not.toBeNull();
    for (const baseline of [r.greedy, r.normal]) {
      if (baseline)
        expect(compareCombos(r.best!, baseline, 'B_ECONOMIC_COST')).toBeLessThanOrEqual(0);
    }
  });

  it('stays bounded on the worst case (6 legs × many options)', () => {
    const options = [];
    for (let leg = 0; leg < 6; leg++)
      for (let k = 0; k < 12; k++) {
        options.push(
          opt({ id: `l${leg}-c${k}`, cash: 100 + ((k * 37 + leg * 11) % 90), legs: [leg] }),
        );
        options.push(
          opt({ id: `l${leg}-a${k}`, cash: 20 + k, points: 5_000 + k * 1_000, legs: [leg] }),
        );
      }
    const evals = options.map((o) => evaluate(o, avios('0.010'), pool(40_000)));
    const t = Date.now();
    const r = searchTrip({
      legCount: 6,
      options: evals,
      objective: 'B_ECONOMIC_COST',
      pool: { iberia_club: 40_000 },
    });
    expect(Date.now() - t).toBeLessThan(2000);
    expect(r.nodes).toBeLessThanOrEqual(50_000);
    expect(r.best).not.toBeNull();
    expect(r.best!.points.iberia_club ?? 0).toBeLessThanOrEqual(40_000);
  });

  it('is deterministic regardless of option order', () => {
    const a = searchTrip({
      legCount: 3,
      options: cs05(),
      objective: 'B_ECONOMIC_COST',
      pool: { iberia_club: 30_000 },
    });
    const b = searchTrip({
      legCount: 3,
      options: cs05().reverse(),
      objective: 'B_ECONOMIC_COST',
      pool: { iberia_club: 30_000 },
    });
    expect(b.best?.key).toBe(a.best?.key);
  });

  it('whole-trip fares compete on the same objective: a cheaper open-jaw is chosen, a dearer one is not', () => {
    const cheap = searchTrip({
      legCount: 3,
      options: cs05(),
      objective: 'B_ECONOMIC_COST',
      pool: { iberia_club: 0 },
    });
    expect(cheap.best?.key).toBe('l2-cash+openjaw');
    const dear = cs05().filter((e) => e.option.id !== 'openjaw');
    dear.push(
      evaluate(opt({ id: 'openjaw-dear', cash: 1200, legs: [0, 2] }), avios('0.010'), pool(0)),
    );
    const r = searchTrip({
      legCount: 3,
      options: dear,
      objective: 'B_ECONOMIC_COST',
      pool: { iberia_club: 0 },
    });
    expect(r.best?.ec).toEqual(eur(1150));
  });
});
