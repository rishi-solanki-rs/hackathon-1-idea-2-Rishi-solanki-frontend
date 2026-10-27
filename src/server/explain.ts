import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import {
  checkExplanation,
  planFacts,
  rulesExplanation,
  rulesSections,
} from '@/domain/explainGuard';
import { fmtDate, fmtEur } from '@/domain/fmt';
import type { PlanResult } from '@/domain/plan';
import type { SpendCategory } from '@/domain/profile';
import { ExplainResponseSchema, PlanResultSchema } from '@/contracts/plan';
import { CARD_CATALOGUE, CATEGORY_LABELS } from '@/fixtures/cardCatalogue';
import { PROGRAMS, programById } from '@/fixtures/catalogue';
import { generateExplanation } from './ai/gemini';
import { clientKey, errorResponse, okResponse, rateLimit, readJson, zodIssues } from './http';

const ExplainRequestSchema = z.object({
  plan: PlanResultSchema,
  planToken: z.string().optional(),
});

const signingSecret = () =>
  process.env.PLAN_SIGNING_SECRET ||
  process.env.DUFFEL_ACCESS_TOKEN ||
  'aum-plan-signing-secret-v1';

/** Signs a computed plan so /api/plan/explain only sends server-computed plans to Gemini. */
export function signPlan(plan: unknown): string {
  return createHmac('sha256', signingSecret()).update(JSON.stringify(plan)).digest('hex');
}

export function verifyPlanToken(plan: unknown, token: string | undefined): boolean {
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return false;
  const expected = Buffer.from(signPlan(plan), 'hex');
  const actual = Buffer.from(token, 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

const SYSTEM = [
  'You explain a travel points plan that has ALREADY been calculated. You never calculate, estimate or add anything.',
  'Use ONLY the numbers, dates, card names and programme names present in the JSON facts. Copy numbers and formatted prices/dates exactly; do not round or convert.',
  'Keep the entire output concise (at most 90 words across all fields).',
  'Never say a seat is available or confirmed, never call prices real or live (they are test data), never promise savings.',
  'Never mention JSON field names or internal confidence rating labels; use everyday words.',
  'Summary must match the verdict (if verdict is BOOK_CASH_NOW, CASH_BETTER, or INSUFFICIENT_BY_DEADLINE, say to book cash, never to use points).',
  'Booking-time advice is general guidance, never a price forecast: do not say prices will drop or rise.',
  'If a new card idea is given, mention it as optional and say approval is not guaranteed.',
  'Return JSON {"summary": "...", "why": [...], "doNow": [...], "later": [...], "caveats": [...]}.',
].join(' ');

const CATALOGUE_NAMES = new Set(CARD_CATALOGUE.map((c) => c.name));

/** Sanitises user free-text before sending to Gemini: category labels only, custom cards become "Your card N". */
export function factsForModel(p: PlanResult) {
  const name = (id: string) => programById(id)?.name ?? id;
  const customMap = new Map<string, string>();
  const safeCardName = (raw: string | null | undefined) => {
    if (!raw) return null;
    if (CATALOGUE_NAMES.has(raw)) return raw;
    if (!customMap.has(raw)) customMap.set(raw, `Your card ${customMap.size + 1}`);
    return customMap.get(raw)!;
  };
  const safeCategory = (cat: string) => CATEGORY_LABELS[cat as SpendCategory] ?? cat;

  return {
    verdict: p.verdict.outcome,
    reasons: p.verdict.reasons,
    safeBookingDate: fmtDate(p.verdict.lsbd),
    goal: p.trip.objective === 'A_CASH_TODAY' ? 'least cash today' : 'lowest overall cost',
    trip: {
      from: p.trip.origin,
      to: p.trip.destination,
      earliestDepart: fmtDate(p.trip.earliestDepart),
      latestDepart: fmtDate(p.trip.latestDepart),
      adults: p.trip.adults,
    },
    cheapestTestFareEur:
      p.comparison.cashFareMinor === null ? null : fmtEur(p.comparison.cashFareMinor, true),
    fareSource:
      p.flights.provider === 'duffel_test'
        ? 'Duffel test mode (sandbox, not real prices)'
        : 'example fixture',
    award: p.award
      ? {
          programme: name(p.award.program),
          points: p.award.points,
          taxesEur: fmtEur(Math.round(p.award.taxesEur * 100), true),
          source: p.award.source === 'ILLUSTRATIVE' ? 'our rough estimate' : 'entered by the user',
        }
      : null,
    awardValueEur:
      p.comparison.awardEconomicMinor === null
        ? null
        : fmtEur(p.comparison.awardEconomicMinor, true),
    pointValueEur: `€${p.valuation.eurPerPoint}`,
    programme: name(p.target),
    pointsUsableNow: p.pointsNow.usable,
    shortfall: p.verdict.shortfall,
    pointsReadyOn:
      p.pointsReady && p.pointsReady !== 'now' ? fmtDate(p.pointsReady) : p.pointsReady,
    cardPlan: p.allocation.assignments
      .filter((a) => a.cardName && a.targetPoints > 0)
      .slice(0, 8)
      .map((a) => ({
        category: safeCategory(a.unit.category),
        eur: a.unit.amountEur,
        card: safeCardName(a.cardName),
        points: a.targetPoints,
      })),
    pointsFromPlannedSpending: p.allocation.totalTargetPoints,
    pointsStillMissingAtSafeDate: p.gapAfterPlan,
    bestCardForDailySpending: p.dailyCards
      .filter((d) => d.cardName)
      .map((d) => ({
        category: safeCategory(d.category),
        card: safeCardName(d.cardName),
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
            applyBy: c.applyBy ? fmtDate(c.applyBy) : null,
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
    nextSteps: p.actions
      .slice(0, 6)
      .map(
        (a) =>
          `${a.when}: ${a.title.replace(/Pay with (.+)$/, (_, c) => `Pay with ${safeCardName(c) ?? c}`)}`,
      ),
  };
}

export async function explainPlan(p: PlanResult, fetchImpl?: typeof fetch) {
  const started = Date.now();
  const name = (id: string) => programById(id)?.name ?? id;
  const modelFacts = factsForModel(p);
  const facts = planFacts(p, name);
  for (const n of ['Your card 1', 'Your card 2', 'Your card 3']) facts.names.push(n);
  const brands = [
    ...CARD_CATALOGUE.map((c) => c.name.split(' (')[0]!),
    ...PROGRAMS.map((x) => x.name),
    'Visa',
    'Mastercard',
    'BBVA',
    'Santander',
    'CaixaBank',
    'Revolut',
  ];
  const ai = await generateExplanation(
    { system: SYSTEM, user: `Facts:\n${JSON.stringify(modelFacts)}` },
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
        sections: ai.sections,
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
    sections: rulesSections(p),
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
  const p = parsed.data.plan as PlanResult;
  if (!verifyPlanToken(parsed.data.plan, parsed.data.planToken)) {
    return okResponse(
      ExplainResponseSchema.parse({
        ok: true,
        status: 'ok',
        data: {
          source: 'rules',
          text: rulesExplanation(p),
          sections: rulesSections(p),
          model: null,
          rejectedReason: 'unsigned plan',
          latencyMs: 0,
        },
      }),
    );
  }
  const data = await explainPlan(p, fetchImpl);
  return okResponse(ExplainResponseSchema.parse({ ok: true, status: 'ok', data }));
}
