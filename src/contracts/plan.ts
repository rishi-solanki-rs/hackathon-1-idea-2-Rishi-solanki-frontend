import { z } from 'zod';
import { SPEND_CATEGORIES } from '@/domain/profile';
import { CabinSchema, IataSchema, IsoDateSchema, ObjectiveSchema } from './common';

const Program = z.string().regex(/^[a-z0-9_]{2,40}$/);
const Status = z.enum(['VERIFIED', 'USER_ENTERED', 'ILLUSTRATIVE', 'CONFLICTING', 'UNKNOWN']);
const sourced = <T extends z.ZodTypeAny>(t: T) =>
  z.object({
    value: t.nullable(),
    status: Status,
    sourceUrl: z.string().url().optional(),
    checkedAt: IsoDateSchema.optional(),
  });
const Category = z.enum(SPEND_CATEGORIES);
const Id = z.string().min(1).max(64);
const Label = z.string().trim().min(1).max(80);
const Euros = z.number().min(0).max(1_000_000);

export const UserCardSchema = z.object({
  id: Id,
  name: Label,
  catalogueId: z.string().max(64).optional(),
  issuingCountry: z.string().length(2),
  program: Program,
  earn: z
    .array(
      z.object({
        category: z.union([Category, z.literal('all')]),
        pointsPerEuro: sourced(z.number().min(0).max(50)),
        monthlyCapEur: sourced(Euros).optional(),
      }),
    )
    .max(12),
  bonus: z
    .object({
      thresholdEur: sourced(Euros),
      windowDays: sourced(z.number().int().min(1).max(730)),
      points: sourced(z.number().int().min(0).max(1_000_000)),
      startDate: IsoDateSchema.optional(),
    })
    .nullable()
    .optional(),
  postingDelayDays: sourced(z.number().int().min(0).max(120)),
  annualFeeEur: sourced(Euros),
});

export const ProfileSchema = z.object({
  cards: z.array(UserCardSchema).max(10),
  noCards: z.boolean(),
  balances: z
    .array(
      z.object({
        program: Program,
        kind: z.enum(['exact', 'range', 'unknown']),
        points: z.number().int().min(0).max(50_000_000).optional(),
        min: z.number().int().min(0).max(50_000_000).optional(),
        max: z.number().int().min(0).max(50_000_000).optional(),
        asOf: IsoDateSchema.optional(),
        expiresOn: IsoDateSchema.optional(),
        reserved: z.number().int().min(0).max(50_000_000).optional(),
      }),
    )
    .max(12),
  noPoints: z.boolean(),
  monthly: z
    .array(
      z.object({
        id: Id,
        label: Label,
        category: Category,
        amountEur: Euros,
        currentCardId: z.string().max(64).optional(),
      }),
    )
    .max(30),
  purchases: z
    .array(
      z.object({
        id: Id,
        label: Label,
        category: Category,
        amountEur: Euros,
        date: IsoDateSchema,
        necessity: z.enum(['necessary', 'flexible']),
        committed: z.boolean(),
        refundable: z.boolean(),
      }),
    )
    .max(30),
  finance: z.object({
    paysInFull: z.boolean().nullable(),
    cashReserveEur: Euros.nullable().optional(),
    answered: z.boolean().optional(),
  }),
  valuations: z
    .array(z.object({ program: Program, eurPerPoint: z.string().regex(/^0(\.\d{1,5})?$/) }))
    .max(12),
});

export const TripSchema = z
  .object({
    origin: IataSchema,
    destination: IataSchema,
    tripType: z.enum(['one_way', 'return']),
    earliestDepart: IsoDateSchema,
    latestDepart: IsoDateSchema,
    minNights: z.number().int().min(1).max(60).optional(),
    maxNights: z.number().int().min(1).max(60).optional(),
    adults: z.number().int().min(1).max(9),
    cabin: CabinSchema,
    objective: ObjectiveSchema,
    directOnly: z.boolean().optional(),
    bookBy: IsoDateSchema.optional(),
  })
  .superRefine((t, ctx) => {
    if (t.origin === t.destination)
      ctx.addIssue({
        code: 'custom',
        path: ['destination'],
        message: 'Choose a different destination',
      });
    if (t.latestDepart < t.earliestDepart)
      ctx.addIssue({
        code: 'custom',
        path: ['latestDepart'],
        message: 'Latest departure must be on or after the earliest',
      });
    const span = (Date.parse(t.latestDepart) - Date.parse(t.earliestDepart)) / 86_400_000;
    if (span > 60)
      ctx.addIssue({
        code: 'custom',
        path: ['latestDepart'],
        message: 'Keep the date range within 60 days',
      });
    if (t.tripType === 'return' && t.minNights && t.maxNights && t.maxNights < t.minNights)
      ctx.addIssue({
        code: 'custom',
        path: ['maxNights'],
        message: 'Longest stay must be at least the shortest stay',
      });
  });

export const AwardSchema = z.object({
  program: Program,
  points: z.number().int().min(1).max(5_000_000),
  taxesEur: Euros,
  source: z.enum(['USER_ENTERED', 'ILLUSTRATIVE']),
  seenAvailable: z.boolean().optional(),
});

export const PlanRequestSchema = z.object({
  trip: TripSchema,
  profile: ProfileSchema,
  award: AwardSchema.nullable(),
  estimateAward: z.boolean().default(false),
  /** The user explicitly asked to see a labelled example fare when live test fares are unavailable. */
  useExample: z.boolean().default(false),
});
export type PlanRequest = z.infer<typeof PlanRequestSchema>;

const Money = z.number().int();
const FlightQuote = z.object({
  depart: z.string(),
  ret: z.string().optional(),
  totalMinor: Money,
  carrier: z.string(),
  stops: z.number().int(),
  provenance: z.string(),
  offerRef: z.string().optional(),
  expiresAt: z.string().optional(),
});

export const PlanResultSchema = z.object({
  engineVersion: z.string(),
  today: z.string(),
  trip: TripSchema,
  target: z.string(),
  valuation: z.object({ eurPerPoint: z.string(), method: z.enum(['user', 'reference']) }),
  award: AwardSchema.nullable(),
  pointsNow: z.object({
    program: z.string(),
    direct: z.number(),
    viaTransfer: z.number(),
    usable: z.number(),
    transferDelayDays: z.number(),
    unknownPrograms: z.array(z.string()),
    usedRangeMinimum: z.boolean(),
    reserved: z.number(),
  }),
  allocation: z.object({
    status: z.enum(['OK', 'BLOCKED_PAYMENT', 'UNKNOWN_PAYMENT', 'NO_CARDS', 'NO_SPEND']),
    assignments: z.array(
      z.object({
        unit: z.object({
          id: z.string(),
          sourceId: z.string(),
          label: z.string(),
          category: z.string(),
          amountEur: z.number(),
          date: z.string(),
          currentCardId: z.string().optional(),
          kind: z.enum(['monthly', 'planned']),
        }),
        cardId: z.string().nullable(),
        cardName: z.string().nullable(),
        points: z.number(),
        program: z.string().nullable(),
        targetPoints: z.number(),
        postsOn: z.string().nullable(),
        capped: z.boolean(),
        reason: z.string(),
      }),
    ),
    excluded: z.array(z.object({ id: z.string(), label: z.string(), reason: z.string() })),
    bonuses: z.array(
      z.object({
        cardId: z.string(),
        cardName: z.string(),
        reached: z.boolean(),
        points: z.number(),
        postsOn: z.string().nullable(),
        reason: z.string(),
      }),
    ),
    totalTargetPoints: z.number(),
    baselineTargetPoints: z.number(),
    incrementalTargetPoints: z.number(),
    missing: z.array(z.string()),
    approximate: z.boolean(),
  }),
  earnings: z.object({
    dated: z.array(z.object({ date: z.string(), points: z.number(), label: z.string() })),
    undated: z.number(),
  }),
  pointsReady: z.string().nullable(),
  verdict: z.object({
    outcome: z.enum([
      'BOOK_CASH_NOW',
      'AWARD_WORTH_CHECKING',
      'MONITOR_NO_TRANSFER',
      'ACCUMULATE_FROM_PLANNED_SPEND',
      'CASH_BETTER',
      'INSUFFICIENT_BY_DEADLINE',
      'TOO_UNCERTAIN',
    ]),
    confidence: z.enum(['medium', 'low', 'insufficient']),
    lsbd: z.string(),
    awardAvailability: z.enum([
      'NOT_YET_SEARCHABLE',
      'UNKNOWN_AVAILABILITY',
      'USER_SAW_AVAILABLE',
      'NO_AWARD',
    ]),
    awardEconomicMinor: Money.nullable(),
    shortfall: z.number(),
    reasons: z.array(z.string()),
    fallback: z.string().nullable(),
  }),
  flights: z.object({
    status: z.enum(['ok', 'partial', 'unavailable', 'example']),
    provider: z.enum(['duffel_test', 'example']),
    quotes: z.array(FlightQuote),
    cheapest: FlightQuote.nullable(),
    searched: z.number(),
    failed: z.number(),
    note: z.string(),
  }),
  comparison: z.object({
    cashFareMinor: Money.nullable(),
    awardCashTodayMinor: Money.nullable(),
    awardEconomicMinor: Money.nullable(),
  }),
  actions: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(['do', 'verify', 'dont', 'deadline', 'missing', 'recalc', 'fallback']),
      when: z.string(),
      title: z.string(),
      detail: z.string().optional(),
    }),
  ),
  missing: z.array(z.string()),
  assumptions: z.array(z.string()),
  confidenceReasons: z.array(z.string()),
});
export type PlanResultDto = z.infer<typeof PlanResultSchema>;

export const PlanResponseSchema = z.object({
  ok: z.literal(true),
  status: z.literal('ok'),
  data: PlanResultSchema,
});
export type PlanResponse = z.infer<typeof PlanResponseSchema>;

export const ExplainResponseSchema = z.object({
  ok: z.literal(true),
  status: z.literal('ok'),
  data: z.object({
    source: z.enum(['ai', 'rules']),
    text: z.array(z.string()),
    model: z.string().nullable(),
    rejectedReason: z.string().nullable(),
    latencyMs: z.number(),
  }),
});
export type ExplainResponse = z.infer<typeof ExplainResponseSchema>;
