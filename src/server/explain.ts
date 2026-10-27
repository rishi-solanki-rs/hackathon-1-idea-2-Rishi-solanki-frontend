import 'server-only';
import { z } from 'zod';
import { checkExplanation, planFacts, rulesExplanation } from '@/domain/explainGuard';
import type { PlanResult } from '@/domain/plan';
import { ExplainResponseSchema, PlanResultSchema } from '@/contracts/plan';
import { CARD_CATALOGUE } from '@/fixtures/cardCatalogue';
import { PROGRAMS, programById } from '@/fixtures/catalogue';
import { generateExplanation } from './ai/gemini';
import { clientKey, errorResponse, okResponse, rateLimit, readJson, zodIssues } from './http';

const ExplainRequestSchema = z.object({ plan: PlanResultSchema });

const SYSTEM = [
  'You explain a travel points plan that has ALREADY been calculated. You never calculate, estimate or add anything.',
  'Use ONLY the numbers, dates, card names and programme names present in the JSON facts. Copy numbers exactly; do not round or convert.',
  'Write dates exactly as YYYY-MM-DD. Do not use percentages.',
  'Never say a seat is available or confirmed, never call prices real or live (they are test data), never promise savings.',
  'Say plainly which values are unverified or estimated, and what to do now versus later.',
  'Never mention JSON field names (such as seatConfirmed or pointsUsableNow); describe them in everyday words.',
  'Booking-time advice is general guidance, never a price forecast: do not say prices will drop or rise.',
  'If a new card idea is given, mention it as optional and say approval is not guaranteed.',
  'Return JSON {"paragraphs": [...]} with 3 or 4 short paragraphs in plain English.',
].join(' ');

export function factsForModel(p: PlanResult) {
  const name = (id: string) => programById(id)?.name ?? id;
  return {
    verdict: p.verdict.outcome,
    confidence: p.verdict.confidence,
    reasons: p.verdict.reasons,
    safeBookingDate: p.verdict.lsbd,
    goal: p.trip.objective === 'A_CASH_TODAY' ? 'least cash today' : 'lowest overall cost',
    trip: {
      from: p.trip.origin,
      to: p.trip.destination,
      earliestDepart: p.trip.earliestDepart,
      latestDepart: p.trip.latestDepart,
      adults: p.trip.adults,
    },
    cheapestTestFareEur:
      p.comparison.cashFareMinor === null ? null : (p.comparison.cashFareMinor / 100).toFixed(2),
    fareSource:
      p.flights.provider === 'duffel_test'
        ? 'Duffel test mode (sandbox, not real prices)'
        : 'example fixture',
    award: p.award
      ? {
          programme: name(p.award.program),
          points: p.award.points,
          taxesEur: p.award.taxesEur,
          source: p.award.source === 'ILLUSTRATIVE' ? 'our rough estimate' : 'entered by the user',
          seatConfirmed: false,
        }
      : null,
    awardValueEur:
      p.comparison.awardEconomicMinor === null
        ? null
        : (p.comparison.awardEconomicMinor / 100).toFixed(2),
    pointValueEur: p.valuation.eurPerPoint,
    programme: name(p.target),
    pointsUsableNow: p.pointsNow.usable,
    shortfall: p.verdict.shortfall,
    pointsReadyOn: p.pointsReady,
    cardPlan: p.allocation.assignments
      .filter((a) => a.cardName && a.targetPoints > 0)
      .slice(0, 8)
      .map((a) => ({
        spend: a.unit.label,
        eur: a.unit.amountEur,
        card: a.cardName,
        points: a.targetPoints,
      })),
    pointsFromPlannedSpending: p.allocation.totalTargetPoints,
    pointsStillMissingAtSafeDate: p.gapAfterPlan,
    bestCardForDailySpending: p.dailyCards
      .filter((d) => d.cardName)
      .map((d) => ({
        spend: d.label,
        card: d.cardName,
        extraPointsPerMonthVsToday: d.gainPerMonth,
      })),
    newCardIdea: (() => {
      const c = p.newCards.find((x) => x.status !== 'not_suitable');
      return c
        ? {
            card: c.name,
            fit: c.status === 'good_fit' ? 'good fit' : 'possible',
            why: c.reasons[0],
            extraPoints: c.extraPoints,
            welcomePoints: c.welcomePoints,
            feeEur: c.feeEur,
            applyBy: c.applyBy,
            note: 'approval not guaranteed; not financial advice',
          }
        : null;
    })(),
    whenToBook: {
      advice: p.booking.headline,
      detail: p.booking.detail,
      guidanceOnly: p.booking.label,
      busySpanishPeriods: p.booking.peaks.map((x) => x.name),
    },
    unverifiedOrMissing: [...p.missing, ...p.confidenceReasons],
    nextSteps: p.actions.slice(0, 6).map((a) => `${a.when}: ${a.title}`),
  };
}

export async function explainPlan(p: PlanResult, fetchImpl?: typeof fetch) {
  const started = Date.now();
  const name = (id: string) => programById(id)?.name ?? id;
  const facts = planFacts(p, name);
  const brands = [
    ...CARD_CATALOGUE.map((c) => c.name.split(' (')[0]),
    ...PROGRAMS.map((x) => x.name),
    'Visa',
    'Mastercard',
    'BBVA',
    'Santander',
    'CaixaBank',
    'Revolut',
  ];
  const ai = await generateExplanation(
    { system: SYSTEM, user: `Facts:\n${JSON.stringify(factsForModel(p))}` },
    fetchImpl,
  );
  let rejectedReason: string | null = null;
  if (ai.ok) {
    const check = checkExplanation(ai.paragraphs, facts, brands);
    if (check.ok) {
      console.info('explain ai ok', { model: ai.model, ms: Date.now() - started });
      return {
        source: 'ai' as const,
        text: ai.paragraphs,
        model: ai.model,
        rejectedReason: null,
        latencyMs: Date.now() - started,
      };
    }
    rejectedReason = check.reason;
  } else rejectedReason = ai.reason;
  console.info('explain fallback', { reason: rejectedReason, ms: Date.now() - started });
  return {
    source: 'rules' as const,
    text: rulesExplanation(p),
    model: null,
    rejectedReason,
    latencyMs: Date.now() - started,
  };
}

export async function handleExplain(req: Request, fetchImpl?: typeof fetch) {
  // AI calls cost more: half the general per-IP limit (10/min with the default of 20).
  const rl = rateLimit(
    `explain:${clientKey(req)}`,
    Math.max(1, Math.floor((Number(process.env.RATE_LIMIT_PER_MIN) || 20) / 2)),
  );
  if (!rl.ok)
    return errorResponse('RATE_LIMITED', 'Too many explanation requests.', undefined, {
      'Retry-After': String(rl.retryAfter),
    });
  const body = await readJson(req);
  if (!body.ok) return errorResponse('VALIDATION_ERROR', 'The request body is not valid JSON.');
  const parsed = ExplainRequestSchema.safeParse(body.value);
  if (!parsed.success)
    return errorResponse('VALIDATION_ERROR', 'Invalid plan.', zodIssues(parsed.error));
  const data = await explainPlan(parsed.data.plan as PlanResult, fetchImpl);
  return okResponse(ExplainResponseSchema.parse({ ok: true, status: 'ok', data }));
}
