import { z } from 'zod';
import {
  AvailabilitySchema,
  CabinSchema,
  IataSchema,
  IsoDateSchema,
  MoneySchema,
  ObjectiveSchema,
  ProviderOutcomeSchema,
  ProvenanceSchema,
  WalletInputSchema,
} from './common';

export const QuickSearchRequestSchema = z
  .object({
    origin: IataSchema,
    destination: IataSchema,
    tripType: z.enum(['one_way', 'return']),
    departDate: IsoDateSchema,
    returnDate: IsoDateSchema.optional(),
    adults: z.number().int().min(1).max(9),
    cabin: CabinSchema,
    flexDays: z.number().int().min(0).max(3).default(0),
    nearbyAirports: z.boolean().default(false),
    objective: ObjectiveSchema.default('B_ECONOMIC_COST'),
    wallet: WalletInputSchema.default({ balances: [], valuations: [] }),
  })
  .superRefine((r, ctx) => {
    if (r.origin === r.destination)
      ctx.addIssue({
        code: 'custom',
        path: ['destination'],
        message: 'Choose a different destination',
      });
    if (r.tripType === 'return') {
      if (!r.returnDate)
        ctx.addIssue({ code: 'custom', path: ['returnDate'], message: 'Choose a return date' });
      else if (r.returnDate < r.departDate)
        ctx.addIssue({
          code: 'custom',
          path: ['returnDate'],
          message: 'Return must be on or after departure',
        });
    }
  });
export type QuickSearchRequest = z.infer<typeof QuickSearchRequestSchema>;

export const PlanSearchRequestSchema = z
  .object({
    legs: z
      .array(z.object({ origin: IataSchema, destination: IataSchema, date: IsoDateSchema }))
      .min(2, 'Add at least 2 flights')
      .max(6, 'A trip can have at most 6 flights'),
    adults: z.number().int().min(1).max(9),
    cabin: CabinSchema,
    objective: ObjectiveSchema.default('B_ECONOMIC_COST'),
    wallet: WalletInputSchema.default({ balances: [], valuations: [] }),
  })
  .superRefine((r, ctx) => {
    r.legs.forEach((l, i) => {
      if (l.origin === l.destination)
        ctx.addIssue({
          code: 'custom',
          path: ['legs', i, 'destination'],
          message: 'Choose a different destination',
        });
      if (i > 0 && l.date < r.legs[i - 1].date)
        ctx.addIssue({
          code: 'custom',
          path: ['legs', i, 'date'],
          message: 'Flights must be in date order',
        });
    });
  });
export type PlanSearchRequest = z.infer<typeof PlanSearchRequestSchema>;

export const SegmentSchema = z.object({
  from: z.string(),
  to: z.string(),
  departAt: z.string(),
  arriveAt: z.string(),
  carrier: z.string(),
  flightNumber: z.string(),
  durationMin: z.number().int().min(0),
});
export const SliceSchema = z.object({
  from: z.string(),
  to: z.string(),
  departAt: z.string(),
  arriveAt: z.string(),
  durationMin: z.number().int().min(0),
  segments: z.array(SegmentSchema),
});

export const CostLineSchema = z.object({
  code: z.string(),
  key: z.string(),
  label: z.string(),
  amount: MoneySchema,
  timing: z.enum(['today', 'later']),
  original: MoneySchema.optional(),
  provenance: ProvenanceSchema,
});

export const OptionDtoSchema = z.object({
  id: z.string(),
  kind: z.enum(['cash', 'award']),
  rank: z.number().int().nullable(),
  excludedReason: z.enum(['NOT_ENOUGH_POINTS', 'NEEDS_POINTS_VALUE', 'FX_STALE']).nullable(),
  legIndexes: z.array(z.number().int()),
  slices: z.array(SliceSchema),
  cabin: CabinSchema,
  costLines: z.array(CostLineSchema),
  points: z.array(z.object({ program: z.string(), amount: z.number().int() })),
  cashToday: MoneySchema,
  cashTotal: MoneySchema,
  ec: MoneySchema.nullable(),
  provenance: ProvenanceSchema,
  availability: AvailabilitySchema,
  fetchedAt: z.string(),
  expiresAt: z.string().optional(),
  conditions: z.object({
    refund: z.enum(['allowed', 'not_allowed', 'unknown']),
    change: z.enum(['allowed', 'not_allowed', 'unknown']),
  }),
  variation: z
    .object({
      dateShiftDays: z.number().int().optional(),
      altOrigin: z.string().optional(),
      altDestination: z.string().optional(),
    })
    .optional(),
  sourceLabel: z.string(),
  needsTransfer: z.boolean(),
  shortfall: z.object({ program: z.string(), needed: z.number(), usable: z.number() }).optional(),
  offerRef: z.string().optional(),
});
export type OptionDto = z.infer<typeof OptionDtoSchema>;

export const ExplanationSchema = z.object({
  summary: z.string(),
  why: z.array(z.string()),
  assumptions: z.array(z.string()),
  notCounted: z.array(z.string()),
  risks: z.array(z.string()),
  dataSources: z.array(z.string()),
});
export type Explanation = z.infer<typeof ExplanationSchema>;

export const BreakEvenSchema = z
  .object({
    program: z.string(),
    eurPerPoint: z.string().optional(),
    never: z.boolean().optional(),
  })
  .nullable();

export const DataModeSchema = z.enum(['FIXTURE', 'DUFFEL_TEST', 'MIXED']);

export const FxInfoSchema = z
  .object({ rateDate: z.string(), source: z.string(), provenance: ProvenanceSchema })
  .nullable();

export const SearchMetaSchema = z.object({
  providers: z.array(ProviderOutcomeSchema),
  engineVersion: z.string(),
  generatedAt: z.string(),
});

export const QuickSearchDataSchema = z.object({
  searchId: z.string(),
  dataMode: DataModeSchema,
  fx: FxInfoSchema,
  comparison: z.object({
    objective: ObjectiveSchema,
    headline: z.enum(['SAVING', 'CASH_BETTER', 'LESS_CASH_TODAY', 'NO_SAVING', 'NO_NORMAL_PRICE']),
    normalId: z.string().nullable(),
    hackedId: z.string().nullable(),
    bestAwardId: z.string().nullable(),
    economicSaving: MoneySchema.nullable(),
    savingPct: z.string().nullable(),
    cashSavingToday: MoneySchema.nullable(),
    awardExtraCost: MoneySchema.nullable(),
    breakEven: BreakEvenSchema,
  }),
  options: z.array(OptionDtoSchema),
  explanation: ExplanationSchema,
});
export type QuickSearchData = z.infer<typeof QuickSearchDataSchema>;

export const SearchStatusSchema = z.enum(['ok', 'partial', 'fixture_fallback', 'empty']);

export const QuickSearchResponseSchema = z.object({
  ok: z.literal(true),
  status: SearchStatusSchema,
  data: QuickSearchDataSchema,
  meta: SearchMetaSchema,
});
export type QuickSearchResponse = z.infer<typeof QuickSearchResponseSchema>;

const CombinationDtoSchema = z.object({
  key: z.string(),
  optionIds: z.array(z.string()),
  cashToday: MoneySchema,
  cashTotal: MoneySchema,
  ec: MoneySchema.nullable(),
  points: z.record(z.string(), z.number()),
  tickets: z.number().int(),
});
export type CombinationDto = z.infer<typeof CombinationDtoSchema>;

export const PlanSearchDataSchema = z.object({
  searchId: z.string(),
  dataMode: DataModeSchema,
  objective: ObjectiveSchema,
  legs: z.array(z.object({ origin: z.string(), destination: z.string(), date: z.string() })),
  best: CombinationDtoSchema.nullable(),
  normal: CombinationDtoSchema.nullable(),
  greedy: CombinationDtoSchema.nullable(),
  alternatives: z.array(CombinationDtoSchema),
  rejected: z.array(z.object({ combination: CombinationDtoSchema, reason: z.string() })),
  approximate: z.boolean(),
  nodes: z.number().int(),
  economicSaving: MoneySchema.nullable(),
  savingPct: z.string().nullable(),
  options: z.array(OptionDtoSchema),
  explanation: ExplanationSchema,
});
export type PlanSearchData = z.infer<typeof PlanSearchDataSchema>;

export const PlanSearchResponseSchema = z.object({
  ok: z.literal(true),
  status: SearchStatusSchema,
  data: PlanSearchDataSchema,
  meta: SearchMetaSchema,
});
export type PlanSearchResponse = z.infer<typeof PlanSearchResponseSchema>;
