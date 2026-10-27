import 'server-only';
import { computePlan, type PlanResult } from '@/domain/plan';
import type { AwardInput } from '@/domain/profile';
import {
  PlanRequestSchema,
  PlanResponseSchema,
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
import {
  illustrativeAwardPoints,
  illustrativeAwardTaxesEur,
} from '@/providers/fixtures/fixtureFlights';
import type { FlightProvider } from '@/providers/types';
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

/** Rough award estimate for planning only: clearly ILLUSTRATIVE, never presented as a programme price. */
export function estimateAward(req: PlanRequest): AwardInput {
  const legs = req.trip.tripType === 'return' ? 2 : 1;
  return {
    program: 'iberia_club',
    points:
      illustrativeAwardPoints(req.trip.origin, req.trip.destination, req.trip.cabin) *
      legs *
      req.trip.adults,
    taxesEur:
      illustrativeAwardTaxesEur(req.trip.origin, req.trip.destination, req.trip.cabin) *
      legs *
      req.trip.adults,
    source: 'ILLUSTRATIVE',
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
  const award = req.award ?? (req.estimateAward ? estimateAward(req) : null);
  const result: PlanResult = computePlan(
    {
      today,
      trip: req.trip,
      profile: req.profile,
      award,
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
  return PlanResponseSchema.parse({ ok: true, status: 'ok', data: result });
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
