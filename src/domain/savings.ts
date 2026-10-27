import Decimal from 'decimal.js';
import { percent, sub, type Money } from './money';
import { compareEvaluated, rankOptions, type Evaluated, type ExcludedReason } from './evaluate';
import type { Objective, ProgramId } from './types';

export type Headline =
  | 'SAVING' // economic saving > 0
  | 'CASH_BETTER' // best award costs more than the normal cash price
  | 'LESS_CASH_TODAY' // Goal A: pays less cash today but costs more overall
  | 'NO_SAVING'
  | 'NO_NORMAL_PRICE'; // no comparable cash price for the exact request

export type BreakEven =
  { program: ProgramId; eurPerPoint: string } | { program: ProgramId; never: true };

export type Comparison = {
  objective: Objective;
  normal: Evaluated | null;
  hacked: Evaluated | null;
  economicSaving: Money | null;
  savingPct: string | null;
  cashSavingToday: Money | null;
  headline: Headline;
  /** When the best award is worse than cash: how much more it costs overall. */
  awardExtraCost: Money | null;
  bestAward: Evaluated | null;
  breakEven: BreakEven | null;
  ranked: Evaluated[];
  excluded: { e: Evaluated; reason: ExcludedReason }[];
};

/** Normal price N: cheapest cash option for the exact request (no date shift, no other airport). */
export function normalPrice(evals: Evaluated[]): Evaluated | null {
  const exact = evals.filter(
    (e) =>
      e.option.kind === 'cash' &&
      !e.option.fxStale &&
      !e.option.variation?.dateShiftDays &&
      !e.option.variation?.altOrigin &&
      !e.option.variation?.altDestination,
  );
  exact.sort(
    (a, b) => a.cashTotal.minor - b.cashTotal.minor || a.option.id.localeCompare(b.option.id),
  );
  return exact[0] ?? null;
}

/** v* = (cashTotal(C) − cashTotal(A)) / points(A), 4 decimals (doc 12 §A.2). */
export function breakEven(award: Evaluated, bestCash: Evaluated): BreakEven | null {
  if (award.option.points.length !== 1) return null;
  const { program, amount } = award.option.points[0];
  const diff = bestCash.cashTotal.minor - award.cashTotal.minor;
  if (diff <= 0 || amount <= 0) return { program, never: true };
  const v = new Decimal(diff).div(100).div(amount).toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
  return { program, eurPerPoint: v.toFixed(4) };
}

export function compare(evals: Evaluated[], objective: Objective): Comparison {
  const { ranked, excluded } = rankOptions(evals, objective);
  const normal = normalPrice(evals);
  const hacked = ranked[0] ?? null;

  const cashOptions = evals
    .filter((e) => e.option.kind === 'cash' && !e.option.fxStale)
    .sort(
      (a, b) => a.cashTotal.minor - b.cashTotal.minor || a.option.id.localeCompare(b.option.id),
    );
  const bestCash = cashOptions[0] ?? null;

  const awards = evals.filter((e) => e.option.kind === 'award' && !e.option.fxStale);
  const bestAward =
    [...awards].sort((a, b) => compareEvaluated(a, b, 'B_ECONOMIC_COST'))[0] ?? null;
  const be = bestAward && bestCash ? breakEven(bestAward, bestCash) : null;

  const base = { objective, normal, hacked, bestAward, breakEven: be, ranked, excluded };

  if (!normal) {
    return {
      ...base,
      economicSaving: null,
      savingPct: null,
      cashSavingToday: null,
      headline: 'NO_NORMAL_PRICE',
      awardExtraCost: null,
    };
  }

  const cashSavingToday = hacked ? sub(normal.cashToday, hacked.cashToday) : null;
  const economicSaving = hacked?.ec && normal.ec ? sub(normal.ec, hacked.ec) : null;
  const savingPct = economicSaving && normal.ec ? percent(economicSaving, normal.ec) : null;

  const awardExtraCost =
    bestAward?.ec && normal.ec && bestAward.ec.minor > normal.ec.minor && bestAward.feasible
      ? sub(bestAward.ec, normal.ec)
      : null;

  let headline: Headline;
  if (economicSaving && economicSaving.minor > 0) headline = 'SAVING';
  else if (
    objective === 'A_CASH_TODAY' &&
    hacked &&
    hacked.cashToday.minor < normal.cashToday.minor
  )
    headline = 'LESS_CASH_TODAY';
  else if (awardExtraCost) headline = 'CASH_BETTER';
  else headline = 'NO_SAVING';

  return { ...base, economicSaving, savingPct, cashSavingToday, headline, awardExtraCost };
}
