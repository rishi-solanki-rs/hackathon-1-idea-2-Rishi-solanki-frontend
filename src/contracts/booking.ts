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

const Cond = z.enum(['allowed', 'not_allowed', 'unknown']);
export const ItinerarySchema = z.object({
  owner: z.string(),
  sandboxAirline: z.boolean(),
  passengers: z.number().int(),
  baseAmount: z.string().optional(),
  taxAmount: z.string().optional(),
  currency: z.string(),
  refund: Cond,
  change: Cond,
  slices: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      fromCity: z.string().optional(),
      toCity: z.string().optional(),
      durationMin: z.number(),
      fareBrand: z.string().optional(),
      segments: z.array(
        z.object({
          from: z.string(),
          to: z.string(),
          departAt: z.string(),
          arriveAt: z.string(),
          durationMin: z.number(),
          flightNumber: z.string(),
          carrier: z.string(),
          operatingCarrier: z.string().optional(),
          aircraft: z.string().optional(),
          cabin: z.string().optional(),
          fromTerminal: z.string().optional(),
          toTerminal: z.string().optional(),
          checkedBags: z.number().optional(),
          carryOnBags: z.number().optional(),
        }),
      ),
    }),
  ),
});
export type ItineraryDto = z.infer<typeof ItinerarySchema>;

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
    itinerary: ItinerarySchema.optional(),
  }),
});
export type RepriceResponse = z.infer<typeof RepriceResponseSchema>;

export const TestOrderRequestSchema = z.object({
  offerRef: OfferRefSchema,
  confirmTotal: MoneySchema,
  expiresAt: z.string().datetime({ offset: true }).optional(),
  idempotencyKey: z.string().regex(/^[A-Za-z0-9-]{16,64}$/),
  /** After an unknown outcome: only look the order up, never create one. */
  checkOnly: z.boolean().optional(),
});
export type TestOrderRequest = z.infer<typeof TestOrderRequestSchema>;

export const TEST_BOOKING_LABEL = 'TEST — no real ticket issued; no money charged';

export const TestOrderResponseSchema = z.object({
  ok: z.literal(true),
  status: z.literal('ok'),
  data: z.object({
    reference: z.string(),
    offerRef: z.string(),
    mode: BookingModeSchema,
    total: MoneySchema,
    itinerary: ItinerarySchema.optional(),
    label: z.literal(TEST_BOOKING_LABEL),
    passengers: z.array(z.string()),
    createdAt: z.string(),
  }),
});
export type TestOrderResponse = z.infer<typeof TestOrderResponseSchema>;
