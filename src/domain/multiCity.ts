import { add, sum, zero, type Money } from './money';
import { compareEvaluated, objectiveValue, type Evaluated } from './evaluate';
import type { Objective, ProgramId } from './types';

export const SEARCH_LIMITS = {
  perLeg: 5,
  perKindPerLeg: 3,
  wholeTrip: 5,
  nodeLimit: 50_000,
  wallMs: 1_000,
};

export type Combination = {
  picks: Evaluated[];
  cashToday: Money;
  cashTotal: Money;
  ec: Money | null;
  points: Record<ProgramId, number>;
  tickets: number;
  key: string;
};

export type TripSearchResult = {
  objective: Objective;
  best: Combination | null;
  normal: Combination | null;
  greedy: Combination | null;
  alternatives: Combination[];
  rejected: { combination: Combination; reason: string }[];
  approximate: boolean;
  nodes: number;
  /** Options excluded before the search, with a reason. */
  excludedOptions: { e: Evaluated; reason: string }[];
};

export function combine(picks: Evaluated[]): Combination {
  const points: Record<ProgramId, number> = {};
  for (const p of picks)
    for (const pt of p.option.points) points[pt.program] = (points[pt.program] ?? 0) + pt.amount;
  const ecs = picks.map((p) => p.ec);
  return {
    picks,
    cashToday: sum(picks.map((p) => p.cashToday)),
    cashTotal: sum(picks.map((p) => p.cashTotal)),
    ec: ecs.every((e) => e !== null)
      ? ecs.reduce<Money>((a, e) => add(a, e as Money), zero())
      : null,
    points,
    tickets: picks.length,
    key: picks
      .map((p) => p.option.id)
      .sort()
      .join('+'),
  };
}

const f = (c: Combination, o: Objective) =>
  o === 'A_CASH_TODAY' ? c.cashToday.minor : (c.ec?.minor ?? Number.MAX_SAFE_INTEGER);
const g = (c: Combination, o: Objective) =>
  o === 'A_CASH_TODAY' ? (c.ec?.minor ?? Number.MAX_SAFE_INTEGER) : c.cashToday.minor;
const pts = (c: Combination) => Object.values(c.points).reduce((n, x) => n + x, 0);

/** Deterministic combination order (doc 12 §B.5). */
export function compareCombos(a: Combination, b: Combination, o: Objective): number {
  return (
    f(a, o) - f(b, o) ||
    g(a, o) - g(b, o) ||
    pts(a) - pts(b) ||
    a.tickets - b.tickets ||
    a.key.localeCompare(b.key)
  );
}

const fitsPool = (points: Record<ProgramId, number>, pool: Record<ProgramId, number>) =>
  Object.entries(points).every(([p, n]) => n <= (pool[p] ?? 0));

/** Dominance on (f, cashToday, points per programme), then 3 cash + 3 award, then the best 5. */
export function capLegCandidates(cands: Evaluated[], objective: Objective): Evaluated[] {
  const dominated = (a: Evaluated, b: Evaluated) => {
    const fa = objectiveValue(a, objective)!;
    const fb = objectiveValue(b, objective)!;
    const programs = new Set([...a.option.points, ...b.option.points].map((p) => p.program));
    const pa = (p: string) => a.option.points.find((x) => x.program === p)?.amount ?? 0;
    const pb = (p: string) => b.option.points.find((x) => x.program === p)?.amount ?? 0;
    const le =
      fb <= fa &&
      b.cashToday.minor <= a.cashToday.minor &&
      [...programs].every((p) => pb(p) <= pa(p));
    const lt =
      fb < fa || b.cashToday.minor < a.cashToday.minor || [...programs].some((p) => pb(p) < pa(p));
    return le && lt;
  };
  const kept = cands.filter((a) => !cands.some((b) => b !== a && dominated(a, b)));
  const byObj = (x: Evaluated[]) => [...x].sort((a, b) => compareEvaluated(a, b, objective));
  const cash = byObj(kept.filter((e) => e.option.kind === 'cash')).slice(
    0,
    SEARCH_LIMITS.perKindPerLeg,
  );
  const award = byObj(kept.filter((e) => e.option.kind === 'award')).slice(
    0,
    SEARCH_LIMITS.perKindPerLeg,
  );
  return byObj([...cash, ...award]).slice(0, SEARCH_LIMITS.perLeg);
}

type SearchCtx = {
  objective: Objective;
  pool: Record<ProgramId, number>;
  nodeLimit: number;
  deadline: number;
  nodes: number;
  limitHit: boolean;
  top: Combination[];
  keep: number;
};

function pushTop(ctx: SearchCtx, c: Combination) {
  if (ctx.top.some((t) => t.key === c.key)) return;
  ctx.top.push(c);
  ctx.top.sort((a, b) => compareCombos(a, b, ctx.objective));
  if (ctx.top.length > ctx.keep) ctx.top.length = ctx.keep;
}

/** Branch and bound over `legs` (each a candidate list), starting from fixed picks. */
function branchAndBound(fixed: Evaluated[], legs: Evaluated[][], ctx: SearchCtx) {
  const order = legs.map((c, i) => ({ c, i })).sort((a, b) => a.c.length - b.c.length || a.i - b.i);
  const minRemaining: number[] = new Array(order.length + 1).fill(0);
  for (let k = order.length - 1; k >= 0; k--) {
    const m = Math.min(...order[k].c.map((e) => objectiveValue(e, ctx.objective)!));
    minRemaining[k] = minRemaining[k + 1] + m;
  }
  const fixedF = fixed.reduce((n, e) => n + objectiveValue(e, ctx.objective)!, 0);

  const rec = (k: number, picks: Evaluated[], partialF: number) => {
    if (ctx.limitHit) return;
    ctx.nodes++;
    if (ctx.nodes >= ctx.nodeLimit || (ctx.nodes % 256 === 0 && Date.now() > ctx.deadline)) {
      ctx.limitHit = true;
      return;
    }
    const worst =
      ctx.top.length >= ctx.keep ? f(ctx.top[ctx.top.length - 1], ctx.objective) : Infinity;
    if (partialF + minRemaining[k] > worst) return;
    if (k === order.length) {
      const c = combine([...fixed, ...picks]);
      if (fitsPool(c.points, ctx.pool)) pushTop(ctx, c);
      return;
    }
    for (const e of order[k].c) {
      const next = [...fixed, ...picks, e];
      if (!fitsPool(combine(next).points, ctx.pool)) continue;
      rec(k + 1, [...picks, e], partialF + objectiveValue(e, ctx.objective)!);
    }
  };
  rec(0, [], fixedF);
}

export type TripSearchInput = {
  legCount: number;
  options: Evaluated[];
  objective: Objective;
  pool: Record<ProgramId, number>;
  nodeLimit?: number;
  /** Display name for a programme's points, e.g. "Avios". */
  programName?: (program: ProgramId) => string;
};

export function searchTrip(input: TripSearchInput): TripSearchResult {
  const { legCount, objective, pool } = input;
  const nodeLimit = input.nodeLimit ?? SEARCH_LIMITS.nodeLimit;
  const excludedOptions: TripSearchResult['excludedOptions'] = [];
  const usable = input.options.filter((e) => {
    if (e.option.fxStale) excludedOptions.push({ e, reason: 'Exchange rate out of date' });
    else if (objectiveValue(e, objective) === null)
      excludedOptions.push({ e, reason: 'Needs a points value' });
    else return true;
    return false;
  });

  const single = (i: number) =>
    usable.filter((e) => e.option.legIndexes.length === 1 && e.option.legIndexes[0] === i);
  const perLeg = Array.from({ length: legCount }, (_, i) => capLegCandidates(single(i), objective));
  const wholeTrip = usable
    .filter((e) => e.option.legIndexes.length > 1)
    .sort((a, b) => compareEvaluated(a, b, objective))
    .slice(0, SEARCH_LIMITS.wholeTrip);

  const run = (opts: {
    pool: Record<ProgramId, number>;
    cashOnly: boolean;
    obj: Objective;
    keep: number;
  }) => {
    const ctx: SearchCtx = {
      objective: opts.obj,
      pool: opts.pool,
      nodeLimit,
      deadline: Date.now() + SEARCH_LIMITS.wallMs,
      nodes: 0,
      limitHit: false,
      top: [],
      keep: opts.keep,
    };
    const filt = (x: Evaluated[]) =>
      opts.cashOnly ? x.filter((e) => e.option.kind === 'cash') : x;
    const legs = perLeg.map(filt);
    const covers: (Evaluated | null)[] = [null, ...filt(wholeTrip)];
    for (const cover of covers) {
      const covered = new Set(cover?.option.legIndexes ?? []);
      const remaining = legs.filter((_, i) => !covered.has(i));
      if (remaining.some((c) => c.length === 0)) continue;
      branchAndBound(cover ? [cover] : [], remaining, ctx);
      if (ctx.limitHit) break;
    }
    return ctx;
  };

  // Normal price: best all-cash combination (a multi-city / open-jaw cash fare where one exists).
  const normalCtx = run({ pool: {}, cashOnly: true, obj: 'B_ECONOMIC_COST', keep: 1 });
  const normal = normalCtx.top[0] ?? null;

  // Greedy baseline: legs in order, best option by objective that fits the remaining pool.
  let greedy: Combination | null = null;
  if (perLeg.every((c) => c.length > 0)) {
    const picks: Evaluated[] = [];
    for (const cands of perLeg) {
      const pick = cands.find((e) => fitsPool(combine([...picks, e]).points, pool));
      if (!pick) {
        picks.length = 0;
        break;
      }
      picks.push(pick);
    }
    if (picks.length === legCount) greedy = combine(picks);
  }

  const main = run({ pool, cashOnly: false, obj: objective, keep: 4 });
  const pool0 = Object.fromEntries(
    usable.flatMap((e) => e.option.points.map((p) => [p.program, Number.MAX_SAFE_INTEGER])),
  );
  const unconstrained =
    run({ pool: pool0, cashOnly: false, obj: objective, keep: 1 }).top[0] ?? null;

  const candidates = [main.top[0], greedy, normal].filter(
    (c): c is Combination => !!c && fitsPool(c.points, pool),
  );
  candidates.sort((a, b) => compareCombos(a, b, objective));
  const best = candidates[0] ?? null;

  const rejected: TripSearchResult['rejected'] = [];
  if (
    unconstrained &&
    best &&
    unconstrained.key !== best.key &&
    !fitsPool(unconstrained.points, pool)
  ) {
    const [program, need] = Object.entries(unconstrained.points).find(
      ([p, n]) => n > (pool[p] ?? 0),
    )!;
    const name = input.programName?.(program) ?? program;
    rejected.push({
      combination: unconstrained,
      reason: `Needs ${need.toLocaleString('en-IE')} ${name}; you have ${(pool[program] ?? 0).toLocaleString('en-IE')}`,
    });
  }

  return {
    objective,
    best,
    normal,
    greedy,
    alternatives: main.top.filter((c) => c.key !== best?.key).slice(0, 3),
    rejected,
    approximate: main.limitHit,
    nodes: main.nodes,
    excludedOptions,
  };
}
