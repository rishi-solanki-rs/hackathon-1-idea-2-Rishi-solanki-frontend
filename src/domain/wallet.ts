import type { ProgramId } from './types';

export type Balance = {
  program: ProgramId;
  points: number;
  asOf: string;
  source: 'USER_ENTERED' | 'DEMO';
};

export type VerificationStatus = 'VERIFIED' | 'UNVERIFIED' | 'ILLUSTRATIVE';

export type TransferRoute = {
  id: string;
  from: ProgramId;
  to: ProgramId;
  /** received = floor(amount × num / den) */
  num: number;
  den: number;
  min: number;
  increment: number;
  status: 'active' | 'suspended';
  verification: VerificationStatus;
  maxDelayDays: number;
  preconditions: string[];
  sourceUrl?: string;
  checkedAt?: string;
};

export type TransferPath = {
  route: TransferRoute;
  available: number;
  maxSend: number;
  maxReceive: number;
};

export type Usable = {
  program: ProgramId;
  direct: number;
  viaTransfers: TransferPath[];
  total: number;
};

export const floorToIncrement = (amount: number, increment: number) =>
  Math.floor(amount / increment) * increment;

export function transferable(
  amount: number,
  route: TransferRoute,
): { send: number; receive: number } {
  const send = floorToIncrement(amount, route.increment);
  if (send < route.min) return { send: 0, receive: 0 };
  return { send, receive: Math.floor((send * route.num) / route.den) };
}

export function balanceOf(balances: Balance[], program: ProgramId): number {
  return balances.filter((b) => b.program === program).reduce((n, b) => n + b.points, 0);
}

/** Points usable for `target` today: direct balance plus one-hop transfers from points already held. */
export function usableFor(target: ProgramId, balances: Balance[], routes: TransferRoute[]): Usable {
  const direct = balanceOf(balances, target);
  const viaTransfers: TransferPath[] = [];
  for (const r of routes) {
    if (r.to !== target || r.status !== 'active') continue;
    const available = balanceOf(balances, r.from);
    if (available <= 0) continue;
    const { send, receive } = transferable(available, r);
    if (receive > 0) viaTransfers.push({ route: r, available, maxSend: send, maxReceive: receive });
  }
  viaTransfers.sort(
    (a, b) =>
      rank(a.route.verification) - rank(b.route.verification) ||
      a.route.id.localeCompare(b.route.id),
  );
  return {
    program: target,
    direct,
    viaTransfers,
    total: direct + viaTransfers.reduce((n, p) => n + p.maxReceive, 0),
  };
}

const rank = (v: VerificationStatus) => (v === 'VERIFIED' ? 0 : v === 'UNVERIFIED' ? 1 : 2);

export type TransferStep = { route: TransferRoute; send: number; receive: number };
export type TransferPlan = {
  needed: number;
  direct: number;
  steps: TransferStep[];
  shortfall: number;
};

/** Smallest transfers (rounded up to each route's increment) that cover `needed`. */
export function planTransfers(
  target: ProgramId,
  needed: number,
  balances: Balance[],
  routes: TransferRoute[],
): TransferPlan {
  const u = usableFor(target, balances, routes);
  let remaining = Math.max(0, needed - u.direct);
  const steps: TransferStep[] = [];
  for (const p of u.viaTransfers) {
    if (remaining <= 0) break;
    const r = p.route;
    const rawSend = Math.ceil((remaining * r.den) / r.num);
    let send = Math.max(r.min, Math.ceil(rawSend / r.increment) * r.increment);
    send = Math.min(send, p.maxSend);
    const receive = Math.floor((send * r.num) / r.den);
    if (receive <= 0) continue;
    steps.push({ route: r, send, receive });
    remaining -= receive;
  }
  return { needed, direct: u.direct, steps, shortfall: Math.max(0, remaining) };
}
