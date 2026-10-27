import type { TransferRoute } from './wallet';
import {
  known,
  type MonthlySpend,
  type PlannedPurchase,
  type Profile,
  type SpendCategory,
  type UserCard,
} from './profile';
import type { ProgramId } from './types';

/** Allocation limits (doc 12 §B.8). */
export const ALLOC_LIMITS = { maxExactUnits: 12, maxThresholdCards: 3, maxStates: 200_000 };

export type SpendUnit = {
  id: string;
  sourceId: string;
  label: string;
  category: SpendCategory;
  amountEur: number;
  date: string;
  currentCardId?: string;
  kind: 'monthly' | 'planned';
};

export type Assignment = {
  unit: SpendUnit;
  cardId: string | null;
  cardName: string | null;
  points: number;
  program: ProgramId | null;
  targetPoints: number;
  postsOn: string | null;
  capped: boolean;
  reason: string;
};

export type ExcludedSpend = { id: string; label: string; reason: string };

export type Allocation = {
  status: 'OK' | 'BLOCKED_PAYMENT' | 'UNKNOWN_PAYMENT' | 'NO_CARDS' | 'NO_SPEND';
  assignments: Assignment[];
  excluded: ExcludedSpend[];
  bonuses: {
    cardId: string;
    cardName: string;
    reached: boolean;
    points: number;
    postsOn: string | null;
    reason: string;
  }[];
  totalTargetPoints: number;
  baselineTargetPoints: number;
  incrementalTargetPoints: number;
  missing: string[];
  approximate: boolean;
};

/** Floors point amounts while absorbing float error (900 x 1/3 must be 300, not 299). */
const floorPts = (x: number) => Math.floor(x + 1e-9);

const addDays = (d: string, n: number) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};

/** Expands monthly spending (on the 15th of each month) and committed/necessary purchases up to `until`. */
export function spendUnits(
  monthly: MonthlySpend[],
  purchases: PlannedPurchase[],
  today: string,
  until: string,
) {
  const units: SpendUnit[] = [];
  const excluded: ExcludedSpend[] = [];
  const start = new Date(`${today}T00:00:00Z`);
  for (let m = 0; m < 24; m++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + m, 15))
      .toISOString()
      .slice(0, 10);
    if (d > until) break;
    if (d < today) continue;
    for (const s of monthly) {
      if (!(s.amountEur > 0)) continue;
      units.push({
        id: `${s.id}@${d}`,
        sourceId: s.id,
        label: s.label,
        category: s.category,
        amountEur: s.amountEur,
        date: d,
        currentCardId: s.currentCardId,
        kind: 'monthly',
      });
    }
  }
  for (const p of purchases) {
    if (!(p.amountEur > 0)) continue;
    if (p.date < today || p.date > until) {
      excluded.push({
        id: p.id,
        label: p.label,
        reason: 'Outside the planning window (today to your booking deadline)',
      });
      continue;
    }
    if (p.necessity === 'flexible' && !p.committed) {
      excluded.push({
        id: p.id,
        label: p.label,
        reason: 'Optional and not committed: we never count spending you might not do',
      });
      continue;
    }
    units.push({
      id: p.id,
      sourceId: p.id,
      label: p.label,
      category: p.category,
      amountEur: p.amountEur,
      date: p.date,
      kind: 'planned',
    });
  }
  units.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  return { units, excluded };
}

/** How many target-programme points one card-programme point is worth (direct or one transfer hop). */
export function conversionToTarget(
  from: ProgramId,
  target: ProgramId,
  routes: TransferRoute[],
): number {
  if (from === target) return 1;
  const r = routes.find((x) => x.from === from && x.to === target && x.status === 'active');
  return r ? r.num / r.den : 0;
}

type RateInfo = { rate: number; capEur: number | null; ruleCategory: SpendCategory | 'all' } | null;

function rateFor(card: UserCard, category: SpendCategory): RateInfo {
  const specific = card.earn.find((r) => r.category === category && known(r.pointsPerEuro));
  const base = card.earn.find((r) => r.category === 'all' && known(r.pointsPerEuro));
  const rule = specific ?? base;
  if (!rule || !known(rule.pointsPerEuro)) return null;
  const cap = rule.monthlyCapEur;
  return {
    rate: rule.pointsPerEuro.value,
    capEur: cap && known(cap) ? cap.value : null,
    ruleCategory: rule.category,
  };
}

const baseRate = (card: UserCard) => {
  const base = card.earn.find((r) => r.category === 'all' && known(r.pointsPerEuro));
  return base && known(base.pointsPerEuro) ? base.pointsPerEuro.value : 0;
};

type CapState = Map<string, number>; // `${cardId}|${ruleCategory}|${yyyy-mm}` → euros used
const capKey = (cardId: string, cat: string, date: string) =>
  `${cardId}|${cat}|${date.slice(0, 7)}`;

/** Points a card earns on a unit given cap usage so far (overflow earns the base rate). */
function earn(
  card: UserCard,
  unit: SpendUnit,
  caps: CapState,
): { points: number; capped: boolean; capUse: number; ruleCategory: string } {
  const info = rateFor(card, unit.category);
  if (!info) return { points: 0, capped: false, capUse: 0, ruleCategory: 'none' };
  if (info.capEur === null)
    return {
      points: floorPts(unit.amountEur * info.rate),
      capped: false,
      capUse: 0,
      ruleCategory: info.ruleCategory,
    };
  const used = caps.get(capKey(card.id, info.ruleCategory, unit.date)) ?? 0;
  const room = Math.max(0, info.capEur - used);
  const atRate = Math.min(room, unit.amountEur);
  const overflow = unit.amountEur - atRate;
  const overflowRate = info.ruleCategory === 'all' ? 0 : baseRate(card);
  return {
    points: floorPts(atRate * info.rate + overflow * overflowRate),
    capped: overflow > 0,
    capUse: atRate,
    ruleCategory: info.ruleCategory,
  };
}

export function allocate(
  profile: Profile,
  target: ProgramId,
  routes: TransferRoute[],
  today: string,
  until: string,
): Allocation {
  const { units, excluded } = spendUnits(profile.monthly, profile.purchases, today, until);
  const missing: string[] = [];
  const empty = (status: Allocation['status']): Allocation => ({
    status,
    assignments: [],
    excluded,
    bonuses: [],
    totalTargetPoints: 0,
    baselineTargetPoints: 0,
    incrementalTargetPoints: 0,
    missing,
    approximate: false,
  });
  if (profile.finance.paysInFull === false) return empty('BLOCKED_PAYMENT');
  if (profile.finance.paysInFull === null) {
    missing.push('Whether you pay your full card statement every month');
    return empty('UNKNOWN_PAYMENT');
  }
  if (!profile.cards.length) return empty('NO_CARDS');
  if (!units.length) return empty('NO_SPEND');

  const cards = profile.cards;
  for (const c of cards) {
    if (!c.earn.some((r) => known(r.pointsPerEuro))) missing.push(`Earn rate for ${c.name}`);
    if (!known(c.postingDelayDays)) missing.push(`When ${c.name} posts points`);
    if (conversionToTarget(c.program, target, routes) === 0)
      missing.push(`${c.name} earns points that cannot reach this trip's programme`);
  }
  const conv = new Map(cards.map((c) => [c.id, conversionToTarget(c.program, target, routes)]));
  const delay = (c: UserCard) => (known(c.postingDelayDays) ? c.postingDelayDays.value : null);

  // Greedy: biggest units first to the card with the most target points (cap-aware).
  const caps: CapState = new Map();
  const order = [...units].sort((a, b) => b.amountEur - a.amountEur || a.id.localeCompare(b.id));
  const chosen = new Map<string, Assignment>();
  for (const u of order) {
    let best: { card: UserCard; e: ReturnType<typeof earn>; tp: number } | null = null;
    for (const c of cards) {
      const e = earn(c, u, caps);
      const tp = floorPts(e.points * (conv.get(c.id) ?? 0));
      if (!best || tp > best.tp || (tp === best.tp && c.id < best.card.id))
        best = { card: c, e, tp };
    }
    if (!best || best.tp <= 0) {
      chosen.set(u.id, {
        unit: u,
        cardId: null,
        cardName: null,
        points: 0,
        program: null,
        targetPoints: 0,
        postsOn: null,
        capped: false,
        reason: 'None of your cards earns points usable for this trip on this purchase',
      });
      continue;
    }
    if (best.e.capUse > 0) {
      const k = capKey(best.card.id, best.e.ruleCategory, u.date);
      caps.set(k, (caps.get(k) ?? 0) + best.e.capUse);
    }
    const d = delay(best.card);
    chosen.set(u.id, {
      unit: u,
      cardId: best.card.id,
      cardName: best.card.name,
      points: best.e.points,
      program: best.card.program,
      targetPoints: best.tp,
      postsOn: d === null ? null : addDays(u.date, d),
      capped: best.e.capped,
      reason: best.e.capped
        ? 'Highest earn rate until its monthly cap, base rate after'
        : 'Earns the most points usable for this trip',
    });
  }

  // Sign-up thresholds: move the smallest set of in-window units onto a bonus card if the bonus outweighs what is lost.
  const bonuses: Allocation['bonuses'] = [];
  let approximate = units.length > ALLOC_LIMITS.maxExactUnits;
  const bonusCards = cards.filter((c) => c.bonus).slice(0, ALLOC_LIMITS.maxThresholdCards);
  for (const c of bonusCards) {
    const b = c.bonus!;
    if (!known(b.thresholdEur) || !known(b.windowDays) || !known(b.points) || !b.startDate) {
      bonuses.push({
        cardId: c.id,
        cardName: c.name,
        reached: false,
        points: 0,
        postsOn: null,
        reason: 'Bonus terms or start date unknown, so it is not planned',
      });
      continue;
    }
    const end = addDays(b.startDate, b.windowDays.value);
    const inWindow = units.filter((u) => u.date >= b.startDate! && u.date <= end);
    const onCard = inWindow.filter((u) => chosen.get(u.id)?.cardId === c.id);
    const have = onCard.reduce((n, u) => n + u.amountEur, 0);
    const bonusTarget = floorPts(b.points.value * (conv.get(c.id) ?? 0));
    if (have >= b.thresholdEur.value) {
      const reachedOn = cumulativeDate(onCard, b.thresholdEur.value);
      bonuses.push({
        cardId: c.id,
        cardName: c.name,
        reached: true,
        points: bonusTarget,
        postsOn: reachedOn && delay(c) !== null ? addDays(reachedOn, delay(c)!) : null,
        reason: 'Already reached with the planned allocation',
      });
      continue;
    }
    const candidates = inWindow.filter((u) => chosen.get(u.id)?.cardId !== c.id);
    const need = b.thresholdEur.value - have;
    const loss = (u: SpendUnit) =>
      (chosen.get(u.id)?.targetPoints ?? 0) -
      floorPts(earn(c, u, new Map()).points * (conv.get(c.id) ?? 0));
    const pick = minimalLossSubset(candidates, need, loss);
    if (pick.approximate) approximate = true;
    if (!pick.units) {
      bonuses.push({
        cardId: c.id,
        cardName: c.name,
        reached: false,
        points: 0,
        postsOn: null,
        reason: `Your planned spending in the bonus window is short of €${b.thresholdEur.value}; we will not suggest extra spending`,
      });
      continue;
    }
    const lost = pick.units.reduce((n, u) => n + loss(u), 0);
    if (bonusTarget - lost <= 0) {
      bonuses.push({
        cardId: c.id,
        cardName: c.name,
        reached: false,
        points: 0,
        postsOn: null,
        reason: 'Reaching the bonus would lose more points than it earns',
      });
      continue;
    }
    for (const u of pick.units) {
      const e = earn(c, u, new Map());
      const d = delay(c);
      chosen.set(u.id, {
        unit: u,
        cardId: c.id,
        cardName: c.name,
        points: e.points,
        program: c.program,
        targetPoints: floorPts(e.points * (conv.get(c.id) ?? 0)),
        postsOn: d === null ? null : addDays(u.date, d),
        capped: e.capped,
        reason: `Moved here to reach the ${c.name} sign-up bonus with spending you already planned`,
      });
    }
    const reachedOn = cumulativeDate(
      [...onCard, ...pick.units].sort((a, z) => a.date.localeCompare(z.date)),
      b.thresholdEur.value,
    );
    bonuses.push({
      cardId: c.id,
      cardName: c.name,
      reached: true,
      points: bonusTarget,
      postsOn: reachedOn && delay(c) !== null ? addDays(reachedOn, delay(c)!) : null,
      reason: 'Reached by moving already-planned purchases; no extra spending',
    });
  }

  const assignments = units.map((u) => chosen.get(u.id)!);
  const totalTargetPoints =
    assignments.reduce((n, a) => n + a.targetPoints, 0) +
    bonuses.filter((b) => b.reached).reduce((n, b) => n + b.points, 0);
  // Baseline: what the user's current card choices would earn (no card chosen = nothing).
  const baseCaps: CapState = new Map();
  let baselineTargetPoints = 0;
  for (const u of units) {
    const card = cards.find((c) => c.id === u.currentCardId);
    if (!card) continue;
    const e = earn(card, u, baseCaps);
    if (e.capUse > 0)
      baseCaps.set(
        capKey(card.id, e.ruleCategory, u.date),
        (baseCaps.get(capKey(card.id, e.ruleCategory, u.date)) ?? 0) + e.capUse,
      );
    baselineTargetPoints += floorPts(e.points * (conv.get(card.id) ?? 0));
  }
  return {
    status: 'OK',
    assignments,
    excluded,
    bonuses,
    totalTargetPoints,
    baselineTargetPoints,
    incrementalTargetPoints: totalTargetPoints - baselineTargetPoints,
    missing: [...new Set(missing)],
    approximate,
  };
}

function cumulativeDate(units: SpendUnit[], threshold: number): string | null {
  let sum = 0;
  for (const u of [...units].sort((a, b) => a.date.localeCompare(b.date))) {
    sum += u.amountEur;
    if (sum >= threshold) return u.date;
  }
  return null;
}

/** Subset with total ≥ need and minimal loss. Exact DP over whole euros within limits, else greedy. */
export function minimalLossSubset(
  units: SpendUnit[],
  need: number,
  loss: (u: SpendUnit) => number,
): { units: SpendUnit[] | null; approximate: boolean } {
  const total = units.reduce((n, u) => n + u.amountEur, 0);
  if (total < need) return { units: null, approximate: false };
  const cap = Math.ceil(need);
  const statesNeeded = (units.length + 1) * (cap + 1);
  if (units.length <= ALLOC_LIMITS.maxExactUnits && statesNeeded <= ALLOC_LIMITS.maxStates) {
    // best[s] = minimal loss to reach at least s euros (s capped at `cap`).
    const INF = Number.POSITIVE_INFINITY;
    let best = new Array<number>(cap + 1).fill(INF);
    let pick: (number[] | null)[] = new Array(cap + 1).fill(null);
    best[0] = 0;
    pick[0] = [];
    units.forEach((u, i) => {
      const nb = best.slice();
      const np = pick.slice();
      const amt = Math.floor(u.amountEur);
      for (let s = 0; s <= cap; s++) {
        if (best[s] === INF) continue;
        const t = Math.min(cap, s + amt);
        const v = best[s] + loss(u);
        if (v < nb[t]) {
          nb[t] = v;
          np[t] = [...pick[s]!, i];
        }
      }
      best = nb;
      pick = np;
    });
    if (best[cap] === INF) return { units: null, approximate: false };
    return { units: pick[cap]!.map((i) => units[i]), approximate: false };
  }
  const sorted = [...units].sort(
    (a, b) => loss(a) / a.amountEur - loss(b) / b.amountEur || b.amountEur - a.amountEur,
  );
  const out: SpendUnit[] = [];
  let sum = 0;
  for (const u of sorted) {
    if (sum >= need) break;
    out.push(u);
    sum += u.amountEur;
  }
  return { units: out, approximate: true };
}
