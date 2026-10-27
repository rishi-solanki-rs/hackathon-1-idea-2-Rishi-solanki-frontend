import { z } from 'zod';
import { MoneySchema } from './common';

const OfferRefSchema = z
  .string()
  .min(3)
  .max(200)
  .regex(/^[A-Za-z0-9_:.\-]+$/);

export const RepriceRequestSchema = z.object({
  offerRef: OfferRefSchema,
  quotedTotal: MoneySchema,
  expiresAt: z.string().datetime({ offset: true }).optional(),
});
export type RepriceRequest = z.infer<typeof RepriceRequestSchema>;

export const BookingModeSchema = z.enum(['SIMULATED', 'DUFFEL_TEST']);

export const RepriceResponseSchema = z.object({
  ok: z.literal(true),
  status: z.literal('ok'),
  data: z.object({
    offerRef: z.string(),
    mode: BookingModeSchema,
    total: MoneySchema,
    previousTotal: MoneySchema,
    priceChanged: z.boolean(),
    expiresAt: z.string().optional(),
  }),
});
export type RepriceResponse = z.infer<typeof RepriceResponseSchema>;

export const TestOrderRequestSchema = z.object({
  offerRef: OfferRefSchema,
  confirmTotal: MoneySchema,
  expiresAt: z.string().datetime({ offset: true }).optional(),
  idempotencyKey: z.string().regex(/^[A-Za-z0-9-]{16,64}$/),
});
export type TestOrderRequest = z.infer<typeof TestOrderRequestSchema>;

export const TEST_BOOKING_LABEL = 'TEST — no real ticket issued; no money charged';

export const TestOrderResponseSchema = z.object({
  ok: z.literal(true),
  status: z.literal('ok'),
  data: z.object({
    reference: z.string(),
    mode: BookingModeSchema,
    total: MoneySchema,
    label: z.literal(TEST_BOOKING_LABEL),
    passengers: z.array(z.string()),
    createdAt: z.string(),
  }),
});
export type TestOrderResponse = z.infer<typeof TestOrderResponseSchema>;
