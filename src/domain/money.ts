import Decimal from 'decimal.js';

export type Currency = string;
export type Money = { minor: number; currency: Currency };

export class MoneyError extends Error {
  constructor(
    public code: 'CURRENCY_MISMATCH' | 'NOT_INTEGER' | 'UNSAFE',
    message: string,
  ) {
    super(message);
  }
}

function check(m: Money): Money {
  if (!Number.isInteger(m.minor))
    throw new MoneyError('NOT_INTEGER', `Non-integer minor units: ${m.minor}`);
  if (!Number.isSafeInteger(m.minor)) throw new MoneyError('UNSAFE', `Unsafe amount: ${m.minor}`);
  return m;
}

export const money = (minor: number, currency: Currency = 'EUR'): Money =>
  check({ minor, currency });
export const eur = (euros: number): Money => money(Math.round(euros * 100), 'EUR');
export const zero = (currency: Currency = 'EUR'): Money => money(0, currency);

function same(a: Money, b: Money) {
  if (a.currency !== b.currency)
    throw new MoneyError('CURRENCY_MISMATCH', `${a.currency} vs ${b.currency}`);
}

export const add = (a: Money, b: Money): Money => {
  same(a, b);
  return money(a.minor + b.minor, a.currency);
};
export const sub = (a: Money, b: Money): Money => {
  same(a, b);
  return money(a.minor - b.minor, a.currency);
};
export const sum = (items: Money[], currency: Currency = 'EUR'): Money =>
  items.reduce((acc, m) => add(acc, m), zero(currency));
export const compare = (a: Money, b: Money): number => {
  same(a, b);
  return a.minor - b.minor;
};

/** Rounds a decimal number of minor units half away from zero. */
export function roundHalfAway(value: Decimal.Value): number {
  const d = new Decimal(value);
  return d.isNegative()
    ? d.neg().toDecimalPlaces(0, Decimal.ROUND_HALF_UP).neg().toNumber()
    : d.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}

/** points × eurPerPoint, rounded once to cents. */
export function pointsToMoney(points: number, eurPerPoint: string): Money {
  return money(roundHalfAway(new Decimal(points).mul(eurPerPoint).mul(100)), 'EUR');
}

/** Percentage of part/whole from unrounded minor units, 1 decimal, half away from zero. */
export function percent(part: Money, whole: Money): string | null {
  same(part, whole);
  if (whole.minor === 0) return null;
  const v = new Decimal(part.minor).div(whole.minor).mul(100);
  const r = v.isNegative()
    ? v.neg().toDecimalPlaces(1, Decimal.ROUND_HALF_UP).neg()
    : v.toDecimalPlaces(1, Decimal.ROUND_HALF_UP);
  return r.toFixed(1);
}

const fmt2 = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
const fmt0 = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

/** Headline format (whole euros, rounded half away from zero) or breakdown format (2 decimals). */
export function formatMoney(m: Money, opts: { whole?: boolean } = {}): string {
  if (m.currency !== 'EUR') {
    return new Intl.NumberFormat('en-IE', { style: 'currency', currency: m.currency }).format(
      m.minor / 100,
    );
  }
  if (opts.whole) {
    const euros = roundHalfAway(new Decimal(m.minor).div(100));
    return fmt0.format(euros).replace('-', '−');
  }
  return fmt2.format(m.minor / 100).replace('-', '−');
}

export const formatPoints = (n: number) => new Intl.NumberFormat('en-IE').format(n);
