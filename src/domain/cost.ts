import { add, pointsToMoney, sub, sum, zero, type Money } from './money';
import type { CostLine, FlightOption, ProgramId, Valuation } from './types';

export class CostModelError extends Error {
  constructor(
    public code: 'DUPLICATE_COST_LINE' | 'NOT_EUR' | 'NEGATIVE_COST',
    message: string,
  ) {
    super(message);
  }
}

/** Every cost belongs to exactly one line (doc 12 §A.1). */
export function validateCostLines(lines: CostLine[]): CostLine[] {
  const seen = new Set<string>();
  for (const l of lines) {
    if (seen.has(l.key))
      throw new CostModelError('DUPLICATE_COST_LINE', `Duplicate cost line ${l.key}`);
    seen.add(l.key);
    if (l.amount.currency !== 'EUR')
      throw new CostModelError('NOT_EUR', `Line ${l.key} not in EUR`);
    if (l.amount.minor < 0) throw new CostModelError('NEGATIVE_COST', `Line ${l.key} is negative`);
  }
  return lines;
}

export const cashToday = (o: Pick<FlightOption, 'costLines'>): Money =>
  sum(
    validateCostLines(o.costLines)
      .filter((l) => l.timing === 'today')
      .map((l) => l.amount),
  );

export const cashTotal = (o: Pick<FlightOption, 'costLines'>): Money =>
  sum(validateCostLines(o.costLines).map((l) => l.amount));

export type ValuationMap = Record<ProgramId, Valuation | undefined>;

/** Σ round(points × v) per programme; null if any programme has no valuation (break-even only). */
export function pointsValue(
  points: FlightOption['points'],
  valuations: ValuationMap,
): Money | null {
  let total = zero();
  for (const p of points) {
    const v = valuations[p.program];
    if (!v) return null;
    total = add(total, pointsToMoney(p.amount, v.eurPerPoint));
  }
  return total;
}

/**
 * EC = cashTotal + pointsValue − countedRewards. Rewards earned are not counted in the MVP
 * (doc 12 §A.2), so countedRewards is always zero here.
 */
export function economicCost(o: FlightOption, valuations: ValuationMap): Money | null {
  const pv = pointsValue(o.points, valuations);
  if (pv === null) return null;
  const countedRewards = zero();
  return sub(add(cashTotal(o), pv), countedRewards);
}

export const totalPoints = (o: Pick<FlightOption, 'points'>) =>
  o.points.reduce((n, p) => n + p.amount, 0);
