import type { Allocation } from './cards';
import type { BalanceInput } from './profile';
import type { ProgramId } from './types';
import { transferable, usableFor, type Balance, type TransferRoute } from './wallet';

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
  /** Balances that expire before the date the points are needed (not counted). */
  expired: { program: ProgramId; points: number; expiresOn: string }[];
};

/**
 * Points usable for `target` today. Ranges count at their minimum; unknown balances count as zero.
 * Balances that expire before `needBy` (the safe booking date) are excluded.
 */
export function pointsNow(
  balances: BalanceInput[],
  target: ProgramId,
  routes: TransferRoute[],
  needBy?: string,
): PointsNow {
  const unknownPrograms: ProgramId[] = [];
  const expired: PointsNow['expired'] = [];
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
    if (needBy && b.expiresOn && b.expiresOn < needBy && pts > 0) {
      expired.push({ program: b.program, points: pts, expiresOn: b.expiresOn });
      continue;
    }
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
    expired,
  };
}

export type EarnEvent = { date: string; points: number; label: string };

const addDays = (d: string, n: number) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};

/**
 * Dated future earnings in the trip's programme.
 * Points earned in another programme (e.g. bank points) become usable only after a transfer:
 * the route's delay is added, and only whole transfer steps above the minimum count
 * (together with any balance of that programme already held, `heldRaw`).
 */
export function earningEvents(
  a: Allocation,
  ctx?: { target: ProgramId; routes: TransferRoute[]; heldRaw?: Record<ProgramId, number> },
) {
  const dated: EarnEvent[] = [];
  let undated = 0;
  const bank = new Map<ProgramId, { date: string; raw: number; label: string }[]>();
  for (const x of a.assignments) {
    if (x.targetPoints <= 0) continue;
    if (!x.postsOn) {
      undated += x.targetPoints;
      continue;
    }
    if (ctx && x.program && x.program !== ctx.target) {
      const list = bank.get(x.program) ?? [];
      list.push({ date: x.postsOn, raw: x.points, label: x.unit.label });
      bank.set(x.program, list);
    } else dated.push({ date: x.postsOn, points: x.targetPoints, label: x.unit.label });
  }
  for (const b of a.bonuses) {
    if (!b.reached) continue;
    if (b.postsOn)
      dated.push({ date: b.postsOn, points: b.points, label: `${b.cardName} sign-up bonus` });
    else undated += b.points;
  }
  if (ctx)
    for (const [program, list] of bank) {
      const route = ctx.routes.find(
        (r) => r.from === program && r.to === ctx.target && r.status === 'active',
      );
      if (!route) continue;
      let cum = ctx.heldRaw?.[program] ?? 0;
      let prev = transferable(cum, route).receive;
      for (const e of list.sort((x, y) => x.date.localeCompare(y.date))) {
        cum += e.raw;
        const now = transferable(cum, route).receive;
        if (now > prev)
          dated.push({
            date: addDays(e.date, route.maxDelayDays),
            points: now - prev,
            label: e.label,
          });
        prev = now;
      }
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
    if (sum >= need) return extraDelayDays ? addDays(e.date, extraDelayDays) : e.date;
  }
  return null;
}
