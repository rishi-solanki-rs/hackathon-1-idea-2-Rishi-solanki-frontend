import { cashToday, cashTotal, economicCost, totalPoints, type ValuationMap } from './cost';
import type { Money } from './money';
import type { FlightOption, Objective, ProgramId } from './types';

export type UsableMap = Record<ProgramId, { direct: number; total: number } | undefined>;

export type Evaluated = {
  option: FlightOption;
  cashToday: Money;
  cashTotal: Money;
  ec: Money | null;
  points: number;
  feasible: boolean;
  shortfall?: { program: ProgramId; needed: number; usable: number };
  needsTransfer: boolean;
};

export function evaluate(o: FlightOption, valuations: ValuationMap, usable: UsableMap): Evaluated {
  let feasible = true;
  let needsTransfer = false;
  let shortfall: Evaluated['shortfall'];
  for (const p of o.points) {
    const u = usable[p.program] ?? { direct: 0, total: 0 };
    if (u.total < p.amount) {
      feasible = false;
      shortfall ??= { program: p.program, needed: p.amount, usable: u.total };
    } else if (u.direct < p.amount) needsTransfer = true;
  }
  return {
    option: o,
    cashToday: cashToday(o),
    cashTotal: cashTotal(o),
    ec: economicCost(o, valuations),
    points: totalPoints(o),
    feasible,
    shortfall,
    needsTransfer,
  };
}

export type ExcludedReason = 'NOT_ENOUGH_POINTS' | 'NEEDS_POINTS_VALUE' | 'FX_STALE';

/** Objective value in cents; null when the option cannot be ranked under this objective. */
export function objectiveValue(e: Evaluated, objective: Objective): number | null {
  if (objective === 'A_CASH_TODAY') return e.cashToday.minor;
  return e.ec?.minor ?? null;
}

const secondary = (e: Evaluated, objective: Objective) =>
  objective === 'A_CASH_TODAY' ? (e.ec?.minor ?? Number.MAX_SAFE_INTEGER) : e.cashToday.minor;

/** Deterministic tie-break (doc 12 §B.5). */
export function compareEvaluated(a: Evaluated, b: Evaluated, objective: Objective): number {
  const fa = objectiveValue(a, objective) ?? Number.MAX_SAFE_INTEGER;
  const fb = objectiveValue(b, objective) ?? Number.MAX_SAFE_INTEGER;
  return (
    fa - fb ||
    secondary(a, objective) - secondary(b, objective) ||
    a.points - b.points ||
    a.option.id.localeCompare(b.option.id)
  );
}

export function excludedReason(e: Evaluated, objective: Objective): ExcludedReason | null {
  if (e.option.fxStale) return 'FX_STALE';
  if (!e.feasible) return 'NOT_ENOUGH_POINTS';
  if (objectiveValue(e, objective) === null) return 'NEEDS_POINTS_VALUE';
  return null;
}

export function rankOptions(evals: Evaluated[], objective: Objective) {
  const ranked: Evaluated[] = [];
  const excluded: { e: Evaluated; reason: ExcludedReason }[] = [];
  for (const e of evals) {
    const reason = excludedReason(e, objective);
    if (reason) excluded.push({ e, reason });
    else ranked.push(e);
  }
  ranked.sort((a, b) => compareEvaluated(a, b, objective));
  excluded.sort((a, b) => compareEvaluated(a.e, b.e, objective));
  return { ranked, excluded };
}
