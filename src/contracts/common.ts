import { z } from 'zod';

export const IataSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, 'Use a 3-letter airport code');

export const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date like 2026-12-01');

export const CabinSchema = z.enum(['economy', 'premium_economy', 'business', 'first']);
export const ObjectiveSchema = z.enum(['A_CASH_TODAY', 'B_ECONOMIC_COST']);

export const MoneySchema = z.object({ minor: z.number().int(), currency: z.string().length(3) });

export const ProvenanceSchema = z.enum([
  'LIVE_TEST_DUFFEL',
  'FIXTURE_FLIGHT',
  'FIXTURE_AWARD',
  'USER_ENTERED',
  'VERIFIED_OFFICIAL_RULE',
  'EXTERNAL_FX_SNAPSHOT',
  'FIXTURE_FX',
  'CACHED',
  'ESTIMATE',
]);

export const AvailabilitySchema = z.enum([
  'VERIFIED_RESULT',
  'TEST_OR_ILLUSTRATIVE',
  'CACHED',
  'NOT_YET_SEARCHABLE',
  'ESTIMATED_RELEASE_WINDOW',
  'UNKNOWN_AVAILABILITY',
]);

const ProgramIdSchema = z.string().regex(/^[a-z0-9_]{2,40}$/);

export const WalletInputSchema = z.object({
  balances: z
    .array(z.object({ program: ProgramIdSchema, points: z.number().int().min(0).max(50_000_000) }))
    .max(20)
    .default([]),
  valuations: z
    .array(
      z.object({
        program: ProgramIdSchema,
        eurPerPoint: z
          .string()
          .regex(/^0(\.\d{1,5})?$|^[1-9]\d{0,1}(\.\d{1,5})?$/, 'Use a value like 0.012'),
      }),
    )
    .max(20)
    .default([]),
  /** Programmes the user chose not to value: awards show break-even only (doc 12 §A.4). */
  noValuePrograms: z.array(ProgramIdSchema).max(20).optional(),
});
export type WalletInput = z.infer<typeof WalletInputSchema>;

export const ErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'UNPROCESSABLE',
  'RATE_LIMITED',
  'OFFER_EXPIRED',
  'OFFER_NOT_FOUND',
  'PRICE_CHANGED',
  'PROVIDER_ERROR',
  'TEST_MODE_REQUIRED',
  'BOOKING_REJECTED',
  'OUTCOME_UNKNOWN',
  'INTERNAL',
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ErrorEnvelopeSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export const ProviderOutcomeSchema = z.object({
  id: z.string(),
  outcome: z.enum(['ok', 'timeout', 'error', 'skipped', 'empty']),
  ms: z.number().int().min(0),
  note: z.string().optional(),
});
