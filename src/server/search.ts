import 'server-only';
import { TZDate } from '@date-fns/tz';
import { evaluate, type Evaluated, type UsableMap } from '@/domain/evaluate';
import { explainQuick } from '@/domain/explain';
import { compare } from '@/domain/savings';
import { searchTrip, type Combination } from '@/domain/multiCity';
import { percent, sub } from '@/domain/money';
import type { FlightOption, Valuation } from '@/domain/types';
import { usableFor, type Balance } from '@/domain/wallet';
import type { FxSnapshot } from '@/domain/fx';
import {
  PlanSearchResponseSchema,
  QuickSearchResponseSchema,
  type CombinationDto,
  type OptionDto,
  type PlanSearchRequest,
  type PlanSearchResponse,
  type QuickSearchRequest,
  type QuickSearchResponse,
} from '@/contracts/search';
import type { WalletInput } from '@/contracts/common';
import {
  REFERENCE_EUR_PER_POINT,
  TRANSFER_ROUTES,
  programById,
  programUnit,
} from '@/fixtures/catalogue';
import { fixtureAwardProvider, fixtureCashProvider } from '@/providers/fixtures/fixtureFlights';
import { createDuffelCashProvider } from '@/providers/duffel';
import { fetchFxSnapshots } from '@/providers/fx';
import { ProviderError, type FlightProvider, type ProviderQuery } from '@/providers/types';
import { serverEnv, type ServerEnv } from './env';
import { hash } from '@/providers/fixtures/schedule';

export const ENGINE_VERSION = 'engine-2026.10.27';
const PROVIDER_BUDGET_MS = 8000;

export type SearchDeps = {
  env?: ServerEnv;
  now?: Date;
  fetchImpl?: typeof fetch;
  /** Test seam: replace the cash provider. */
  cashProvider?: FlightProvider;
};

type Outcome = {
  id: string;
  outcome: 'ok' | 'timeout' | 'error' | 'skipped' | 'empty';
  ms: number;
  note?: string;
};

export const madridToday = (now: Date) =>
  new TZDate(now.getTime(), 'Europe/Madrid').toISOString().slice(0, 10);

async function runProvider(
  p: FlightProvider,
  q: ProviderQuery,
): Promise<{ options: FlightOption[]; outcome: Outcome }> {
  const start = Date.now();
  const signal = AbortSignal.timeout(PROVIDER_BUDGET_MS);
  try {
    const options = await p.search(q, signal);
    return {
      options,
      outcome: { id: p.id, outcome: options.length ? 'ok' : 'empty', ms: Date.now() - start },
    };
  } catch (e) {
    const timeout = e instanceof ProviderError ? e.code === 'TIMEOUT' : signal.aborted;
    if (e instanceof ProviderError && e.code === 'TEST_MODE_REQUIRED') {
      return {
        options: [],
        outcome: { id: p.id, outcome: 'error', ms: Date.now() - start, note: 'Test mode required' },
      };
    }
    return {
      options: [],
      outcome: { id: p.id, outcome: timeout ? 'timeout' : 'error', ms: Date.now() - start },
    };
  }
}

function valuationsFor(
  wallet: WalletInput,
  programs: string[],
): Record<string, Valuation | undefined> {
  const out: Record<string, Valuation | undefined> = {};
  for (const program of programs) {
    const v = wallet.valuations.find((x) => x.program === program);
    if (wallet.noValuePrograms?.includes(program)) out[program] = undefined;
    else if (v) out[program] = { program, eurPerPoint: v.eurPerPoint, method: 'user' };
    else out[program] = { program, eurPerPoint: REFERENCE_EUR_PER_POINT, method: 'reference' };
  }
  return out;
}

function usableMap(wallet: WalletInput, programs: string[], today: string): UsableMap {
  const balances: Balance[] = wallet.balances.map((b) => ({
    ...b,
    asOf: today,
    source: 'USER_ENTERED',
  }));
  const out: UsableMap = {};
  for (const p of programs) {
    const u = usableFor(p, balances, TRANSFER_ROUTES);
    out[p] = { direct: u.direct, total: u.total };
  }
  return out;
}

async function gather(q: ProviderQuery, deps: SearchDeps, env: ServerEnv) {
  const outcomes: Outcome[] = [];
  let fx: FxSnapshot[] = [];
  const fxLoader = async () => {
    fx = await fetchFxSnapshots({ live: env.FX_LIVE === 'on', fetchImpl: deps.fetchImpl });
    return fx;
  };
  let cash: FlightProvider = fixtureCashProvider;
  let usingDuffel = false;
  if (deps.cashProvider) {
    cash = deps.cashProvider;
    usingDuffel = cash.id.startsWith('duffel');
  } else if (env.duffelEnabled) {
    cash = createDuffelCashProvider({
      token: env.DUFFEL_ACCESS_TOKEN!,
      fetchImpl: deps.fetchImpl,
      fx: fxLoader,
    });
    usingDuffel = true;
  }

  const [cashRes, awardRes] = await Promise.all([
    runProvider(cash, q),
    runProvider(fixtureAwardProvider, q),
  ]);
  outcomes.push(cashRes.outcome, awardRes.outcome);

  let status: 'ok' | 'partial' | 'fixture_fallback' | 'empty' = 'ok';
  let cashOptions = cashRes.options;
  if (usingDuffel && cashRes.outcome.outcome !== 'ok') {
    const fb = await runProvider(fixtureCashProvider, q);
    outcomes.push({ ...fb.outcome, note: 'Fallback: live test search unavailable' });
    cashOptions = fb.options;
    status = 'fixture_fallback';
  } else if (
    cashRes.outcome.outcome === 'error' ||
    cashRes.outcome.outcome === 'timeout' ||
    awardRes.outcome.outcome === 'error' ||
    awardRes.outcome.outcome === 'timeout'
  ) {
    status = 'partial';
  }
  const options = [...cashOptions, ...awardRes.options];
  if (!options.length) status = 'empty';
  const dataMode: 'FIXTURE' | 'DUFFEL_TEST' | 'MIXED' = cashOptions.some(
    (o) => o.provenance === 'LIVE_TEST_DUFFEL',
  )
    ? 'MIXED'
    : 'FIXTURE';
  return { options, outcomes, status, dataMode, fx };
}

function toDto(
  e: Evaluated,
  rank: number | null,
  excludedReason: OptionDto['excludedReason'],
): OptionDto {
  const o = e.option;
  return {
    id: o.id,
    kind: o.kind,
    rank,
    excludedReason,
    legIndexes: o.legIndexes,
    slices: o.slices,
    cabin: o.cabin,
    costLines: o.costLines,
    points: o.points,
    cashToday: e.cashToday,
    cashTotal: e.cashTotal,
    ec: e.ec,
    provenance: o.provenance,
    availability: o.availability,
    fetchedAt: o.fetchedAt,
    expiresAt: o.expiresAt,
    conditions: o.conditions,
    variation: o.variation,
    sourceLabel: o.sourceLabel,
    needsTransfer: e.needsTransfer,
    shortfall: e.shortfall,
    offerRef: o.offerRef,
  };
}

function dataSources(options: FlightOption[], fx: FxSnapshot[]): string[] {
  const s = new Set<string>();
  for (const o of options) s.add(o.sourceLabel);
  if (options.some((o) => o.provenance === 'LIVE_TEST_DUFFEL') && fx[0]) s.add(fx[0].source);
  s.add('Programme and transfer rules: demo catalogue (unverified or illustrative; see each rule)');
  return [...s];
}

const programName = (id: string) => programById(id)?.name ?? id;

export async function runQuickSearch(
  req: QuickSearchRequest,
  deps: SearchDeps = {},
): Promise<QuickSearchResponse> {
  const env = deps.env ?? serverEnv();
  const now = deps.now ?? new Date();
  const today = madridToday(now);
  const q: ProviderQuery = {
    mode: 'quick',
    journeys: [
      {
        legIndexes: [0],
        slices: [
          { origin: req.origin, destination: req.destination, date: req.departDate },
          ...(req.tripType === 'return' && req.returnDate
            ? [{ origin: req.destination, destination: req.origin, date: req.returnDate }]
            : []),
        ],
      },
    ],
    adults: req.adults,
    cabin: req.cabin,
    flexDays: req.flexDays,
    nearbyAirports: req.nearbyAirports,
    today,
    now: now.toISOString(),
  };
  const { options, outcomes, status, dataMode, fx } = await gather(q, deps, env);
  const programs = [...new Set(options.flatMap((o) => o.points.map((p) => p.program)))];
  const valuations = valuationsFor(req.wallet, programs);
  const usable = usableMap(req.wallet, programs, today);
  const evals = options.map((o) => evaluate(o, valuations, usable));
  const c = compare(evals, req.objective);

  const dtos: OptionDto[] = [
    ...c.ranked.map((e, i) => toDto(e, i + 1, null)),
    ...c.excluded.map((x) => toDto(x.e, null, x.reason)),
  ];
  const explanation = explainQuick(c, {
    programName,
    programUnit,
    valuations,
    dataSources: dataSources(options, fx),
  });

  const fxInfo =
    dataMode !== 'FIXTURE' && fx[0]
      ? { rateDate: fx[0].rateDate, source: fx[0].source, provenance: fx[0].provenance }
      : null;
  const response: QuickSearchResponse = {
    ok: true,
    status,
    data: {
      searchId: `q${hash(JSON.stringify(req)).toString(36)}`,
      dataMode,
      fx: fxInfo,
      comparison: {
        objective: c.objective,
        headline: c.headline,
        normalId: c.normal?.option.id ?? null,
        hackedId: c.hacked?.option.id ?? null,
        bestAwardId: c.bestAward?.option.id ?? null,
        economicSaving: c.economicSaving,
        savingPct: c.savingPct,
        cashSavingToday: c.cashSavingToday,
        awardExtraCost: c.awardExtraCost,
        breakEven: c.breakEven,
      },
      options: dtos,
      explanation,
    },
    meta: { providers: outcomes, engineVersion: ENGINE_VERSION, generatedAt: now.toISOString() },
  };
  return QuickSearchResponseSchema.parse(response);
}

const comboDto = (c: Combination | null): CombinationDto | null =>
  c && {
    key: c.key,
    optionIds: c.picks.map((p) => p.option.id),
    cashToday: c.cashToday,
    cashTotal: c.cashTotal,
    ec: c.ec,
    points: c.points,
    tickets: c.tickets,
  };

export async function runPlanSearch(
  req: PlanSearchRequest,
  deps: SearchDeps = {},
): Promise<PlanSearchResponse> {
  const env = deps.env ?? serverEnv();
  const now = deps.now ?? new Date();
  const today = madridToday(now);
  const legs = req.legs.map((l) => ({
    origin: l.origin,
    destination: l.destination,
    date: l.date,
  }));
  const q: ProviderQuery = {
    mode: 'plan',
    journeys: [
      ...legs.map((l, i) => ({ legIndexes: [i], slices: [l] })),
      { legIndexes: legs.map((_, i) => i), slices: legs },
    ],
    adults: req.adults,
    cabin: req.cabin,
    flexDays: 0,
    nearbyAirports: false,
    today,
    now: now.toISOString(),
  };
  const { options, outcomes, status, dataMode } = await gather(q, deps, env);
  const programs = [...new Set(options.flatMap((o) => o.points.map((p) => p.program)))];
  const valuations = valuationsFor(req.wallet, programs);
  const usable = usableMap(req.wallet, programs, today);
  const pool = Object.fromEntries(programs.map((p) => [p, usable[p]?.total ?? 0]));
  const evals = options.map((o) => evaluate(o, valuations, usable));
  const r = searchTrip({
    legCount: legs.length,
    options: evals,
    objective: req.objective,
    pool,
    programName: programUnit,
  });

  const economicSaving = r.best?.ec && r.normal?.ec ? sub(r.normal.ec, r.best.ec) : null;
  const savingPct = economicSaving && r.normal?.ec ? percent(economicSaving, r.normal.ec) : null;
  const chosen = new Set(r.best?.picks.map((p) => p.option.id));
  const ordered = [...evals].sort(
    (a, b) =>
      Number(chosen.has(b.option.id)) - Number(chosen.has(a.option.id)) ||
      a.option.legIndexes[0] - b.option.legIndexes[0] ||
      a.cashTotal.minor - b.cashTotal.minor,
  );

  const summary = !r.best
    ? 'No complete trip could be priced for these flights.'
    : economicSaving && economicSaving.minor > 0
      ? `Best combination saves ${savingPct}% against booking it all in cash.`
      : r.best.tickets === 1 || r.best.picks.some((p) => p.option.legIndexes.length > 1)
        ? 'Your best option is a combined cash ticket and you keep your points.'
        : 'No saving found: the normal cash price is already the best option.';
  const why: string[] = [
    `Ranked by ${req.objective === 'A_CASH_TODAY' ? 'least cash paid today' : 'lowest overall cost'} across ${r.nodes.toLocaleString('en-IE')} combinations checked.`,
    'The normal price is the cheapest way to buy the whole trip in cash, including combined (multi-city or open-jaw) tickets.',
  ];
  for (const rej of r.rejected) why.push(`Cheapest-looking combination rejected: ${rej.reason}.`);
  if (r.approximate)
    why.push(
      `Approximate: the search stopped at its limit after ${r.nodes.toLocaleString('en-IE')} combinations; the result is never worse than the simple leg-by-leg choice.`,
    );

  const response: PlanSearchResponse = {
    ok: true,
    status,
    data: {
      searchId: `p${hash(JSON.stringify(req)).toString(36)}`,
      dataMode,
      objective: req.objective,
      legs,
      best: comboDto(r.best),
      normal: comboDto(r.normal),
      greedy: comboDto(r.greedy),
      alternatives: r.alternatives.map((c) => comboDto(c)!),
      rejected: r.rejected.map((x) => ({
        combination: comboDto(x.combination)!,
        reason: x.reason,
      })),
      approximate: r.approximate,
      nodes: r.nodes,
      economicSaving,
      savingPct,
      options: ordered.map((e) => toDto(e, chosen.has(e.option.id) ? 1 : null, null)),
      explanation: {
        summary,
        why,
        assumptions: Object.values(valuations)
          .filter((v): v is Valuation => !!v)
          .map(
            (v) =>
              `${programName(v.program)}: €${v.eurPerPoint} per ${programUnit(v.program)} (${v.method === 'user' ? 'your value' : 'reference value'}).`,
          ),
        notCounted: ['Points you could earn from these bookings (not guaranteed).'],
        risks: [
          'Separate tickets are not protected if one flight is delayed.',
          'All prices are illustrative or test data.',
        ],
        dataSources: dataSources(options, []),
      },
    },
    meta: { providers: outcomes, engineVersion: ENGINE_VERSION, generatedAt: now.toISOString() },
  };
  return PlanSearchResponseSchema.parse(response);
}
