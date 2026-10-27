import Decimal from 'decimal.js';
import { money, roundHalfAway, type Money } from './money';

export type FxSnapshot = {
  base: string;
  quote: 'EUR';
  /** ECB convention: units of `base` per 1 EUR, as a decimal string (USD 1.1193 means €1 = $1.1193). */
  rate: string;
  rateDate: string; // YYYY-MM-DD
  provenance: 'EXTERNAL_FX_SNAPSHOT' | 'FIXTURE_FX';
  source: string;
};

export const FX_MAX_AGE_DAYS = 7;

export function fxAgeDays(snapshot: FxSnapshot, today: string): number {
  const a = Date.parse(`${snapshot.rateDate}T00:00:00Z`);
  const b = Date.parse(`${today}T00:00:00Z`);
  return Math.floor((b - a) / 86_400_000);
}

export type FxResult =
  | { ok: true; amount: Money; original: Money }
  | { ok: false; code: 'FX_STALE' | 'FX_MISSING'; original: Money };

/** Converts to EUR. Fails closed when the snapshot is older than 7 days (AS-19). */
export function toEur(m: Money, snapshot: FxSnapshot | undefined, today: string): FxResult {
  if (m.currency === 'EUR') return { ok: true, amount: m, original: m };
  if (!snapshot || snapshot.base !== m.currency)
    return { ok: false, code: 'FX_MISSING', original: m };
  if (fxAgeDays(snapshot, today) > FX_MAX_AGE_DAYS)
    return { ok: false, code: 'FX_STALE', original: m };
  const minor = roundHalfAway(new Decimal(m.minor).div(snapshot.rate));
  return { ok: true, amount: money(minor, 'EUR'), original: m };
}
