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
import {
  createDuffelTestOrder,
  findDuffelOrderByKey,
  getDuffelOffer,
  type DuffelOfferSnapshot,
  type SyntheticPassenger,
} from '@/providers/duffel';
import { fetchFxSnapshots } from '@/providers/fx';
import { ProviderError } from '@/providers/types';
import { hash } from '@/providers/fixtures/schedule';
import { serverEnv, type ServerEnv } from './env';
import { madridToday } from './search';

const NAMES: [string, 'm' | 'f'][] = [
  ['Lucia', 'f'],
  ['Mateo', 'm'],
  ['Carmen', 'f'],
  ['Pablo', 'm'],
  ['Elena', 'f'],
  ['Javier', 'm'],
  ['Sofia', 'f'],
  ['Diego', 'm'],
  ['Marta', 'f'],
];

/** Fictional adult travellers, one distinct name per passenger (Duffel rejects duplicate names). */
export function syntheticPassengers(n: number): SyntheticPassenger[] {
  return Array.from({ length: n }, (_, i) => {
    const [given, gender] = NAMES[i % NAMES.length]!;
    return {
      given_name: given,
      family_name: i < NAMES.length ? 'Demo' : `Demo${Math.floor(i / NAMES.length) + 1}`,
      born_on: `19${80 + (i % 15)}-0${(i % 9) + 1}-1${i % 9}`,
      gender,
      title: gender === 'f' ? 'ms' : 'mr',
      email: `${given.toLowerCase()}.demo${i + 1}@example.com`,
      phone_number: `+346000000${String(10 + i).padStart(2, '0')}`,
    };
  });
}
export const SYNTHETIC_PASSENGER = syntheticPassengers(1)[0]!;

export class BookingError extends Error {
  constructor(
    public code:
      | 'OFFER_EXPIRED'
      | 'OFFER_NOT_FOUND'
      | 'PRICE_CHANGED'
      | 'PROVIDER_ERROR'
      | 'TEST_MODE_REQUIRED'
      | 'BOOKING_REJECTED'
      | 'OUTCOME_UNKNOWN',
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

type Deps = {
  env?: ServerEnv;
  now?: Date;
  fetchImpl?: typeof fetch;
  /** Duffel test orders on return trips take 12–13 s; slower ones must not be cut off. */
  orderTimeoutMs?: number;
  /** Waits before each lookup after an unclear failure (the order can appear late). */
  reconcileDelaysMs?: number[];
};

export const ORDER_TIMEOUT_MS = 60_000;
const RECONCILE_DELAYS_MS = [0, 2_000, 4_000, 6_000];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const isFixture = (ref: string) => ref.startsWith('fixture:');

function fixtureCurrentPrice(ref: string, quoted: Money): Money {
  // FX-CASH-06 (T-INT-004): this curated offer reprices from €702 to €719 per adult.
  if (ref.endsWith('MAD-PEK-return-economy:plus2')) {
    const adults = Math.max(1, Math.round(quoted.minor / 70200));
    return money(71900 * adults, 'EUR');
  }
  return quoted;
}

const REJECTION: Record<string, string> = {
  duplicate_passenger_names:
    'The airline refused the traveller names (each traveller needs a different name).',
  invalid_phone_number: 'The airline refused a traveller phone number.',
  invalid_passenger_name: 'The airline refused a traveller name.',
  invalid_passenger_title: 'The airline refused a traveller title.',
  invalid_email_address: 'The airline refused a traveller email address.',
  order_passengers_incompatible_with_offer: 'The travellers do not match this offer.',
  duplicate_booking: 'The airline already has a booking for these travellers on this flight.',
  no_passengers: 'This offer lists no travellers.',
  passenger_count: 'The number of travellers does not match this offer.',
};

/** Errors that happen before anything was sent to the order endpoint. */
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
    if (e.code === 'REJECTED') {
      const code = (e.details as { code?: string } | undefined)?.code ?? '';
      throw new BookingError(
        'BOOKING_REJECTED',
        `${REJECTION[code] ?? `Duffel refused the request (${code}).`} Nothing was booked.`,
        { code },
      );
    }
    if (e.code === 'TIMEOUT')
      throw new BookingError(
        'PROVIDER_ERROR',
        'Duffel did not answer in time. Nothing was booked; try again.',
      );
  }
  throw new BookingError(
    'PROVIDER_ERROR',
    'Duffel could not be reached. Nothing was booked; try again.',
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

type Priced = { response: RepriceResponse; offer?: DuffelOfferSnapshot };

async function priceOffer(req: RepriceRequest, deps: Deps): Promise<Priced> {
  const env = deps.env ?? serverEnv();
  const now = deps.now ?? new Date();
  if (isFixture(req.offerRef)) {
    if (req.expiresAt && Date.parse(req.expiresAt) <= now.getTime())
      throw new BookingError('OFFER_EXPIRED', 'This offer has expired. Search again.');
    const total = fixtureCurrentPrice(req.offerRef, req.quotedTotal);
    return {
      response: RepriceResponseSchema.parse({
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
      }),
    };
  }
  const d = duffelDeps(env, deps.fetchImpl);
  let offer: DuffelOfferSnapshot;
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
  return {
    offer,
    response: RepriceResponseSchema.parse({
      ok: true,
      status: 'ok',
      data: {
        offerRef: req.offerRef,
        mode: 'DUFFEL_TEST',
        total: eurResult.amount,
        previousTotal: req.quotedTotal,
        priceChanged: eurResult.amount.minor !== req.quotedTotal.minor,
        expiresAt: offer.expiresAt,
        itinerary: offer.itinerary,
      },
    }),
  };
}

export async function reprice(req: RepriceRequest, deps: Deps = {}): Promise<RepriceResponse> {
  return (await priceOffer(req, deps)).response;
}

/** Per instance: finished orders and in-flight requests by idempotency key. */
const orders = new Map<string, TestOrderResponse>();
const inflight = new Map<string, Promise<TestOrderResponse>>();

const UNKNOWN_MESSAGE =
  'We could not confirm whether Duffel created this test booking. Do not book again: press “Check again” in a minute.';
const NOT_FOUND_MESSAGE = 'Duffel has no booking from this attempt.';

export async function createTestOrder(
  req: TestOrderRequest,
  deps: Deps = {},
): Promise<TestOrderResponse> {
  const done = orders.get(req.idempotencyKey);
  if (done) return done;
  const running = inflight.get(req.idempotencyKey);
  if (running) return running;
  const p = runOrder(req, deps).finally(() => inflight.delete(req.idempotencyKey));
  inflight.set(req.idempotencyKey, p);
  return p;
}

async function runOrder(req: TestOrderRequest, deps: Deps): Promise<TestOrderResponse> {
  const env = deps.env ?? serverEnv();
  const now = deps.now ?? new Date();
  const respond = (
    reference: string,
    mode: 'SIMULATED' | 'DUFFEL_TEST',
    total: Money,
    offer?: DuffelOfferSnapshot,
  ) => {
    const n = Math.max(1, offer?.passengerIds.length ?? 1);
    const res = TestOrderResponseSchema.parse({
      ok: true,
      status: 'ok',
      data: {
        reference,
        offerRef: req.offerRef,
        mode,
        total,
        itinerary: offer?.itinerary,
        label: TEST_BOOKING_LABEL,
        passengers: syntheticPassengers(n).map(
          (x) => `${x.given_name} ${x.family_name} (fictional test traveller)`,
        ),
        createdAt: now.toISOString(),
      },
    });
    orders.set(req.idempotencyKey, res);
    if (orders.size > 1000) orders.clear();
    return res;
  };

  if (isFixture(req.offerRef)) {
    const priced = await priceOffer(
      { offerRef: req.offerRef, quotedTotal: req.confirmTotal, expiresAt: req.expiresAt },
      deps,
    );
    if (priced.response.data.priceChanged)
      throw new BookingError('PRICE_CHANGED', 'The price changed. Review it before booking.', {
        total: priced.response.data.total,
        previousTotal: req.confirmTotal,
      });
    return respond(
      `SIM-${hash(req.idempotencyKey).toString(36).toUpperCase().slice(0, 6)}`,
      'SIMULATED',
      priced.response.data.total,
    );
  }

  const d = duffelDeps(env, deps.fetchImpl);
  // Duffel is the source of truth for this key: an earlier attempt may already have created the order.
  const lookup = async () => {
    try {
      return await findDuffelOrderByKey(
        d,
        req.offerRef,
        req.idempotencyKey,
        AbortSignal.timeout(8000),
      );
    } catch {
      return undefined;
    }
  };
  const existing = await lookup();
  if (existing) return respond(existing.bookingReference, 'DUFFEL_TEST', req.confirmTotal);
  if (req.checkOnly)
    throw existing === null
      ? new BookingError('OUTCOME_UNKNOWN', NOT_FOUND_MESSAGE, { noOrderFound: true })
      : new BookingError('OUTCOME_UNKNOWN', UNKNOWN_MESSAGE);
  if (existing === undefined)
    throw new BookingError(
      'PROVIDER_ERROR',
      'Duffel could not be reached to check earlier attempts. Nothing new was booked; try again.',
    );

  const priced = await priceOffer(
    { offerRef: req.offerRef, quotedTotal: req.confirmTotal, expiresAt: req.expiresAt },
    deps,
  );
  if (priced.response.data.priceChanged)
    throw new BookingError('PRICE_CHANGED', 'The price changed. Review it before booking.', {
      total: priced.response.data.total,
      previousTotal: req.confirmTotal,
    });
  const offer = priced.offer!;
  try {
    // Pays exactly the amount of the offer snapshot that was just price-checked.
    const order = await createDuffelTestOrder(
      d,
      {
        offer,
        passengers: syntheticPassengers(offer.passengerIds.length),
        key: req.idempotencyKey,
      },
      AbortSignal.timeout(deps.orderTimeoutMs ?? ORDER_TIMEOUT_MS),
    );
    return respond(order.bookingReference, 'DUFFEL_TEST', priced.response.data.total, offer);
  } catch (e) {
    console.error('[test-order] order call failed', {
      code: e instanceof ProviderError ? e.code : 'UNEXPECTED',
      message: (e as Error).message,
      passengers: offer.passengerIds.length,
      slices: offer.itinerary?.slices.length,
    });
    if (
      e instanceof ProviderError &&
      (e.code === 'REJECTED' || e.code === 'OFFER_EXPIRED' || e.code === 'PRICE_CHANGED')
    )
      mapProviderError(e);
    if (e instanceof ProviderError && e.code === 'TEST_MODE_REQUIRED')
      throw new BookingError(
        'TEST_MODE_REQUIRED',
        'Duffel returned a non-test order; it was not accepted.',
      );
    // Timeout, lost connection or an unreadable answer: the order may exist. Reconcile, never re-post.
    for (const wait of deps.reconcileDelaysMs ?? RECONCILE_DELAYS_MS) {
      await sleep(wait);
      const found = await lookup();
      if (found)
        return respond(found.bookingReference, 'DUFFEL_TEST', priced.response.data.total, offer);
    }
    throw new BookingError('OUTCOME_UNKNOWN', UNKNOWN_MESSAGE);
  }
}
