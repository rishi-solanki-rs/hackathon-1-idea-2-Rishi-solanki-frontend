import type { Allocation } from './cards';
import type { BalanceInput } from './profile';
import type { ProgramId } from './types';
import { usableFor, type Balance, type TransferRoute } from './wallet';

export type PointsNow = {
  program: ProgramId;
  direct: number;
  viaTransfer: number;
  usable: number;
  transferDelayDays: number;
  /** Balances we could not count because they are unknown. */
  unknownPrograms: ProgramId[];
  /** True when a range balance was counted at its minimum. */
  usedRangeMinimum: boolean;
  reserved: number;
};

/** Points usable for `target` today. Ranges count at their minimum; unknown balances count as zero. */
export function pointsNow(
  balances: BalanceInput[],
  target: ProgramId,
  routes: TransferRoute[],
): PointsNow {
  const unknownPrograms: ProgramId[] = [];
  let usedRangeMinimum = false;
  let reserved = 0;
  const counted: Balance[] = [];
  for (const b of balances) {
    let pts = 0;
    if (b.kind === 'exact') pts = b.points ?? 0;
    else if (b.kind === 'range') {
      pts = b.min ?? 0;
      usedRangeMinimum = true;
    } else unknownPrograms.push(b.program);
    const res = Math.min(pts, Math.max(0, b.reserved ?? 0));
    if (b.program === target) reserved += res;
    counted.push({
      program: b.program,
      points: Math.max(0, pts - res),
      asOf: b.asOf ?? '',
      source: 'USER_ENTERED',
    });
  }
  const u = usableFor(target, counted, routes);
  return {
    program: target,
    direct: u.direct,
    viaTransfer: u.total - u.direct,
    usable: u.total,
    transferDelayDays: u.viaTransfers.length
      ? Math.max(...u.viaTransfers.map((p) => p.route.maxDelayDays))
      : 0,
    unknownPrograms,
    usedRangeMinimum,
    reserved,
  };
}

export type EarnEvent = { date: string; points: number; label: string };

/** Dated future earnings from the allocation. Undated earnings (unknown posting delay) are listed separately. */
export function earningEvents(a: Allocation) {
  const dated: EarnEvent[] = [];
  let undated = 0;
  for (const x of a.assignments) {
    if (x.targetPoints <= 0) continue;
    if (x.postsOn) dated.push({ date: x.postsOn, points: x.targetPoints, label: x.unit.label });
    else undated += x.targetPoints;
  }
  for (const b of a.bonuses) {
    if (!b.reached) continue;
    if (b.postsOn)
      dated.push({ date: b.postsOn, points: b.points, label: `${b.cardName} sign-up bonus` });
    else undated += b.points;
  }
  dated.sort((x, y) => x.date.localeCompare(y.date));
  return { dated, undated };
}

/** First date the cumulative usable balance reaches `need`: 'now', a date, or null (not reached). */
export function readyDate(
  need: number,
  now: number,
  events: EarnEvent[],
  extraDelayDays = 0,
): 'now' | string | null {
  if (now >= need) return 'now';
  let sum = now;
  for (const e of events) {
    sum += e.points;
    if (sum >= need) {
      if (!extraDelayDays) return e.date;
      const d = new Date(`${e.date}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + extraDelayDays);
      return d.toISOString().slice(0, 10);
    }
  }
  return null;
}
