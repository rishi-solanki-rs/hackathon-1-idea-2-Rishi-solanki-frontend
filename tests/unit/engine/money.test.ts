import { describe, expect, it } from 'vitest';
import {
  add,
  eur,
  formatMoney,
  money,
  MoneyError,
  percent,
  pointsToMoney,
  roundHalfAway,
} from '@/domain/money';
import { toEur, type FxSnapshot } from '@/domain/fx';

describe('money (ENG-01)', () => {
  it.each([
    [0.5, 1],
    [1.5, 2],
    [-0.5, -1],
    [-1.5, -2],
    [2.4999, 2],
    [-2.4999, -2],
  ])('rounds %s half away from zero to %s', (v, expected) => {
    expect(roundHalfAway(v)).toBe(expected);
  });

  it('rejects non-integer minor units and mixed currencies', () => {
    expect(() => money(1.5)).toThrow(MoneyError);
    expect(() => add(money(100, 'EUR'), money(100, 'USD'))).toThrow(/USD/);
  });

  it('values points once per programme (70,500 × €0.012 = €846.00)', () => {
    expect(pointsToMoney(70_500, '0.012')).toEqual(eur(846));
    expect(pointsToMoney(1, '0.0125').minor).toBe(1); // 1.25 cents → 1
    expect(pointsToMoney(3, '0.005').minor).toBe(2); // 1.5 cents → 2 (half away)
  });

  it('T-CALC-002: percentages from unrounded cents, 1 decimal', () => {
    expect(percent(money(2470), money(20000))).toBe('12.4');
    expect(percent(eur(1674), eur(2900))).toBe('57.7');
    expect(percent(eur(78), eur(780))).toBe('10.0');
    expect(percent(eur(1), eur(0))).toBeNull();
  });

  it('formats headlines in whole euros and breakdowns with cents', () => {
    expect(formatMoney(eur(1674), { whole: true })).toBe('€1,674');
    expect(formatMoney(money(46650))).toBe('€466.50');
    expect(formatMoney(money(-252000), { whole: true })).toBe('−€2,520');
  });
});

describe('fx (ENG-02)', () => {
  const usd: FxSnapshot = {
    base: 'USD',
    quote: 'EUR',
    rate: '1.1193',
    rateDate: '2026-10-26',
    provenance: 'EXTERNAL_FX_SNAPSHOT',
    source: 'test',
  };

  it('T-CALC-008: USD 100.00 at 1.1193 → €89.34 and keeps the original', () => {
    const r = toEur(money(10000, 'USD'), usd, '2026-10-27');
    expect(r).toEqual({ ok: true, amount: money(8934), original: money(10000, 'USD') });
  });

  it('fails closed when the snapshot is older than 7 days (AS-19)', () => {
    expect(toEur(money(10000, 'USD'), usd, '2026-11-02').ok).toBe(true);
    expect(toEur(money(10000, 'USD'), usd, '2026-11-03')).toMatchObject({
      ok: false,
      code: 'FX_STALE',
    });
  });

  it('fails closed when no snapshot exists for the currency', () => {
    expect(toEur(money(100, 'JPY'), usd, '2026-10-27')).toMatchObject({
      ok: false,
      code: 'FX_MISSING',
    });
  });
});
