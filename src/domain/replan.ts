import type { PlanResult } from './plan';
import { fmtEur } from './fmt';

export type Change = { field: string; before: string; after: string };

const money = (m: number | null) => (m === null ? 'none' : fmtEur(m, true));
const n = (x: number) => x.toLocaleString('en-IE');

/** What changed between two plan results, with the inputs that caused it. */
export function diffPlans(prev: PlanResult, next: PlanResult) {
  const outcome: Change[] = [];
  const push = (field: string, before: string, after: string) => {
    if (before !== after) outcome.push({ field, before, after });
  };
  push('Verdict', prev.verdict.outcome, next.verdict.outcome);
  push('Points usable now', n(prev.pointsNow.usable), n(next.pointsNow.usable));
  push('Points shortfall', n(prev.verdict.shortfall), n(next.verdict.shortfall));
  push(
    'Points ready',
    String(prev.pointsReady ?? 'not reached'),
    String(next.pointsReady ?? 'not reached'),
  );
  push(
    'Cheapest cash fare',
    money(prev.comparison.cashFareMinor),
    money(next.comparison.cashFareMinor),
  );
  push(
    'Points from planned spending',
    n(prev.allocation.totalTargetPoints),
    n(next.allocation.totalTargetPoints),
  );

  const cards = (r: PlanResult) =>
    new Map(r.allocation.assignments.map((a) => [a.unit.id, a.cardName ?? 'no card']));
  const a = cards(prev);
  const b = cards(next);
  const moved: Change[] = [];
  for (const [id, after] of b) {
    const before = a.get(id);
    if (before && before !== after)
      moved.push({
        field: next.allocation.assignments.find((x) => x.unit.id === id)!.unit.label,
        before,
        after,
      });
  }

  const causes: string[] = [];
  const pt = prev.trip;
  const nt = next.trip;
  if (
    pt.earliestDepart !== nt.earliestDepart ||
    pt.latestDepart !== nt.latestDepart ||
    pt.bookBy !== nt.bookBy
  )
    causes.push('Travel dates or deadline changed');
  if (pt.origin !== nt.origin || pt.destination !== nt.destination || pt.tripType !== nt.tripType)
    causes.push('Route changed');
  if (pt.cabin !== nt.cabin) causes.push('Cabin changed');
  if (pt.adults !== nt.adults) causes.push('Number of travellers changed');
  if (pt.objective !== nt.objective) causes.push('Goal changed');
  if (prev.valuation.eurPerPoint !== next.valuation.eurPerPoint)
    causes.push('Value per point changed');
  if (prev.comparison.cashFareMinor !== next.comparison.cashFareMinor)
    causes.push('Cash fare changed');
  const spend = (r: PlanResult) =>
    r.allocation.assignments.reduce((s, a) => s + a.unit.amountEur, 0);
  if (spend(prev) !== spend(next)) causes.push('Spending amounts changed');
  if (JSON.stringify(prev.award) !== JSON.stringify(next.award)) causes.push('Award price changed');
  if (prev.pointsNow.usable !== next.pointsNow.usable) causes.push('Points balance changed');
  if (
    prev.allocation.assignments.length !== next.allocation.assignments.length ||
    prev.allocation.excluded.length !== next.allocation.excluded.length
  )
    causes.push('Planned spending changed');
  if (moved.length) causes.push('Card terms or card choice changed');
  if (prev.allocation.status !== next.allocation.status) causes.push('Payment answer changed');

  return {
    outcome,
    moved: moved.slice(0, 20),
    causes: [...new Set(causes)],
    changed: outcome.length > 0 || moved.length > 0,
  };
}
