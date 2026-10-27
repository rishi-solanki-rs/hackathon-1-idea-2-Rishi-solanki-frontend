import 'server-only';
import { toEur } from '@/domain/fx';
import { money, type Money } from '@/domain/money';
import {
  RepriceResponseSchema,
  TEST_BOOKING_LABEL,
  TestOrderResponseSchema,
  type RepriceRequest,
  type RepriceResponse,
  type TestOrderRequest,
  type TestOrderResponse,
} from '@/contracts/booking';
import { createDuffelTestOrder, getDuffelOffer, type SyntheticPassenger } from '@/providers/duffel';
import { fetchFxSnapshots } from '@/providers/fx';
import { ProviderError } from '@/providers/types';
import { hash } from '@/providers/fixtures/schedule';
import { serverEnv, type ServerEnv } from './env';
import { madridToday } from './search';

/** Synthetic, fictional passenger used for every test booking. Never real personal data. */
export const SYNTHETIC_PASSENGER: SyntheticPassenger = {
  given_name: 'Lucia',
  family_name: 'Demo',
  born_on: '1990-04-12',
  gender: 'f',
  title: 'ms',
  email: 'lucia.demo@example.com',
  phone_number: '+34600000000',
};

export class BookingError extends Error {
  constructor(
    public code:
      | 'OFFER_EXPIRED'
      | 'OFFER_NOT_FOUND'
      | 'PRICE_CHANGED'
      | 'PROVIDER_ERROR'
      | 'TEST_MODE_REQUIRED',
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

type Deps = { env?: ServerEnv; now?: Date; fetchImpl?: typeof fetch };

const isFixture = (ref: string) => ref.startsWith('fixture:');

function fixtureCurrentPrice(ref: string, quoted: Money): Money {
  // FX-CASH-06 (T-INT-004): this curated offer reprices from €702 to €719 per adult.
  if (ref.endsWith('MAD-PEK-return-economy:plus2')) {
    const adults = Math.max(1, Math.round(quoted.minor / 70200));
    return money(71900 * adults, 'EUR');
  }
  return quoted;
}

function mapProviderError(e: unknown): never {
  if (e instanceof ProviderError) {
    if (e.code === 'OFFER_EXPIRED')
      throw new BookingError('OFFER_EXPIRED', 'This offer has expired. Search again.');
    if (e.code === 'NOT_FOUND')
      throw new BookingError('OFFER_NOT_FOUND', 'This offer is no longer available.');
    if (e.code === 'PRICE_CHANGED')
      throw new BookingError('PRICE_CHANGED', 'The price changed. Review it before booking.');
    if (e.code === 'TEST_MODE_REQUIRED')
      throw new BookingError('TEST_MODE_REQUIRED', 'Test booking is unavailable.');
  }
  throw new BookingError(
    'PROVIDER_ERROR',
    'The booking provider did not respond. No booking was made.',
  );
}

function duffelDeps(env: ServerEnv, fetchImpl?: typeof fetch) {
  if (!env.duffelEnabled)
    throw new BookingError('TEST_MODE_REQUIRED', 'Duffel test mode is not configured.');
  return {
    token: env.DUFFEL_ACCESS_TOKEN!,
    fetchImpl,
    fx: () => fetchFxSnapshots({ live: env.FX_LIVE === 'on', fetchImpl }),
  };
}

export async function reprice(req: RepriceRequest, deps: Deps = {}): Promise<RepriceResponse> {
  const env = deps.env ?? serverEnv();
  const now = deps.now ?? new Date();
  if (isFixture(req.offerRef)) {
    if (req.expiresAt && Date.parse(req.expiresAt) <= now.getTime())
      throw new BookingError('OFFER_EXPIRED', 'This offer has expired. Search again.');
    const total = fixtureCurrentPrice(req.offerRef, req.quotedTotal);
    return RepriceResponseSchema.parse({
      ok: true,
      status: 'ok',
      data: {
        offerRef: req.offerRef,
        mode: 'SIMULATED',
        total,
        previousTotal: req.quotedTotal,
        priceChanged: total.minor !== req.quotedTotal.minor,
        expiresAt: req.expiresAt,
      },
    });
  }
  const d = duffelDeps(env, deps.fetchImpl);
  let offer;
  try {
    offer = await getDuffelOffer(d, req.offerRef, AbortSignal.timeout(8000), now.getTime());
  } catch (e) {
    mapProviderError(e);
  }
  const fx = await d.fx();
  const original = money(Math.round(Number(offer.totalAmount) * 100), offer.totalCurrency);
  const eurResult = toEur(
    original,
    fx.find((s) => s.base === offer.totalCurrency),
    madridToday(now),
  );
  if (!eurResult.ok)
    throw new BookingError(
      'PROVIDER_ERROR',
      'Exchange rate unavailable; cannot confirm the price.',
    );
  return RepriceResponseSchema.parse({
    ok: true,
    status: 'ok',
    data: {
      offerRef: req.offerRef,
      mode: 'DUFFEL_TEST',
      total: eurResult.amount,
      previousTotal: req.quotedTotal,
      priceChanged: eurResult.amount.minor !== req.quotedTotal.minor,
      expiresAt: offer.expiresAt,
    },
  });
}

/** Idempotency per instance: a repeated key returns the first result and never books twice. */
const orders = new Map<string, TestOrderResponse>();

export async function createTestOrder(
  req: TestOrderRequest,
  deps: Deps = {},
): Promise<TestOrderResponse> {
  const existing = orders.get(req.idempotencyKey);
  if (existing) return existing;
  const env = deps.env ?? serverEnv();
  const now = deps.now ?? new Date();

  const priced = await reprice(
    { offerRef: req.offerRef, quotedTotal: req.confirmTotal, expiresAt: req.expiresAt },
    deps,
  );
  if (priced.data.priceChanged)
    throw new BookingError('PRICE_CHANGED', 'The price changed. Review it before booking.', {
      total: priced.data.total,
      previousTotal: req.confirmTotal,
    });

  let reference: string;
  if (priced.data.mode === 'SIMULATED') {
    reference = `SIM-${hash(req.idempotencyKey).toString(36).toUpperCase().slice(0, 6)}`;
  } else {
    const d = duffelDeps(env, deps.fetchImpl);
    try {
      const offer = await getDuffelOffer(d, req.offerRef, AbortSignal.timeout(8000), now.getTime());
      const order = await createDuffelTestOrder(
        d,
        { offer, passengers: [SYNTHETIC_PASSENGER] },
        AbortSignal.timeout(15000),
      );
      reference = order.bookingReference;
    } catch (e) {
      mapProviderError(e);
    }
  }

  const res = TestOrderResponseSchema.parse({
    ok: true,
    status: 'ok',
    data: {
      reference,
      mode: priced.data.mode,
      total: priced.data.total,
      label: TEST_BOOKING_LABEL,
      passengers: [
        `${SYNTHETIC_PASSENGER.given_name} ${SYNTHETIC_PASSENGER.family_name} (fictional test traveller)`,
      ],
      createdAt: now.toISOString(),
    },
  });
  orders.set(req.idempotencyKey, res);
  if (orders.size > 1000) orders.clear();
  return res;
}
