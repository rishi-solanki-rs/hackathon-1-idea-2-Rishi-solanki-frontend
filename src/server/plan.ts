import 'server-only';
import { computePlan, type PlanResult } from '@/domain/plan';
import type { AwardInput } from '@/domain/profile';
import {
  PlanRequestSchema,
  PlanResponseSchema,
  PlanResultSchema,
  type PlanRequest,
  type PlanResponse,
} from '@/contracts/plan';
import {
  PROGRAMS,
  REFERENCE_EUR_PER_POINT,
  TRANSFER_ROUTES,
  airportByIata,
  programById,
} from '@/fixtures/catalogue';
import { CARD_CATALOGUE } from '@/fixtures/cardCatalogue';
import { haversineKm } from '@/domain/bookingWindow';
import { illustrativeAwardTaxesEur } from '@/providers/fixtures/fixtureFlights';
import { estimateAwardPoints } from '@/domain/awardChart';
import type { FlightProvider } from '@/providers/types';
import { signPlan } from './explain';
import { serverEnv, type ServerEnv } from './env';
import { searchTripFares } from './flights';
import { clientKey, errorResponse, okResponse, rateLimit, readJson, zodIssues } from './http';
import { madridToday } from './search';

const AIRLINES = PROGRAMS.filter((p) => p.kind === 'airline').map((p) => p.id);

function distance(from: string, to: string): number | null {
  const a = airportByIata(from);
  const b = airportByIata(to);
  return a && b ? haversineKm(a, b) : null;
}

/**
 * Award estimate in the programme the user chose, from a verified chart only (points at the peak price).
 * Taxes are a rough labelled figure. Unsupported programmes or cabins return no estimate, with the reason.
 */
export function estimateAward(req: PlanRequest): { award: AwardInput | null; note: string | null } {
  if (!req.estimateAward || req.award) return { award: null, note: null };
  const program = req.estimateProgram;
  if (!program)
    return {
      award: null,
      note: 'Choose the programme you would book with to get an award estimate.',
    };
  const legs = req.trip.tripType === 'return' ? 2 : 1;
  const r = estimateAwardPoints({
    program,
    distanceKm: distance(req.trip.origin, req.trip.destination),
    cabin: req.trip.cabin,
    legs,
    adults: req.trip.adults,
  });
  if (!r.ok) return { award: null, note: r.reason };
  return {
    award: {
      program,
      points: r.estimate.points,
      taxesEur:
        illustrativeAwardTaxesEur(req.trip.origin, req.trip.destination, req.trip.cabin) *
        legs *
        req.trip.adults,
      source: 'ILLUSTRATIVE',
    },
    note: `Award estimate from Iberia's official chart (band ${r.estimate.band}, ${r.estimate.miles.toLocaleString('en-IE')} miles): ${r.estimate.offPeakPoints.toLocaleString('en-IE')} to ${r.estimate.points.toLocaleString('en-IE')} Avios (off-peak to peak; peak used). Taxes are a rough estimate.`,
  };
}

export type PlanDeps = {
  env?: ServerEnv;
  now?: Date;
  fetchImpl?: typeof fetch;
  provider?: FlightProvider;
};

export async function runPlan(req: PlanRequest, deps: PlanDeps = {}): Promise<PlanResponse> {
  const env = deps.env ?? serverEnv();
  const now = deps.now ?? new Date();
  const today = madridToday(now);
  const flights = await searchTripFares(req.trip, {
    env,
    today,
    now: now.toISOString(),
    useExample: req.useExample,
    fetchImpl: deps.fetchImpl,
    provider: deps.provider,
  });
  const est = estimateAward(req);
  const award = req.award ?? est.award;
  const result: PlanResult = computePlan(
    {
      today,
      trip: req.trip,
      profile: req.profile,
      award,
      awardNote: est.note,
      preferredProgram: req.award?.program ?? req.estimateProgram,
      flights,
      routes: TRANSFER_ROUTES,
      referenceEurPerPoint: REFERENCE_EUR_PER_POINT,
      programName: (id) => programById(id)?.name ?? id,
      programWebsite: (id) => programById(id)?.website,
      distanceKm: distance(req.trip.origin, req.trip.destination),
      cardOptions: CARD_CATALOGUE,
    },
    AIRLINES,
  );
  const parsed = PlanResultSchema.parse(result);
  return PlanResponseSchema.parse({
    ok: true,
    status: 'ok',
    data: parsed,
    planToken: signPlan(parsed),
  });
}

export async function handlePlanCompute(req: Request, deps: PlanDeps = {}) {
  const rl = rateLimit(`plan:${clientKey(req)}`);
  if (!rl.ok)
    return errorResponse('RATE_LIMITED', 'Too many plan requests. Try again shortly.', undefined, {
      'Retry-After': String(rl.retryAfter),
    });
  const body = await readJson(req);
  if (!body.ok) return errorResponse('VALIDATION_ERROR', 'The request body is not valid JSON.');
  const parsed = PlanRequestSchema.safeParse(body.value);
  if (!parsed.success)
    return errorResponse(
      'VALIDATION_ERROR',
      'Some details need attention.',
      zodIssues(parsed.error),
    );
  try {
    return okResponse(await runPlan(parsed.data, deps));
  } catch (e) {
    console.error('plan compute failed', (e as Error).name);
    return errorResponse('INTERNAL', 'Something went wrong while building your plan.');
  }
}
