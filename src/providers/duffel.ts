import { toEur, type FxSnapshot } from '@/domain/fx';
import { money } from '@/domain/money';
import type { Cabin, FlightOption, Slice } from '@/domain/types';
import { ProviderError, type FlightProvider, type Journey, type ProviderQuery } from './types';

const API = 'https://api.duffel.com';
const SUPPLIER_TIMEOUT_MS = 8000;

export const isDuffelTestToken = (token: string | undefined): token is string =>
  !!token && token.startsWith('duffel_test_');

type DuffelOffer = {
  id: string;
  live_mode: boolean;
  total_amount: string;
  total_currency: string;
  base_amount?: string;
  tax_amount?: string;
  expires_at?: string;
  owner?: { name?: string; iata_code?: string };
  passengers?: { id: string; type?: string }[];
  conditions?: {
    refund_before_departure?: { allowed?: boolean } | null;
    change_before_departure?: { allowed?: boolean } | null;
  };
  slices: {
    origin: { iata_code: string; city_name?: string };
    destination: { iata_code: string; city_name?: string };
    duration?: string;
    fare_brand_name?: string;
    segments: {
      origin: { iata_code: string; terminal?: string | null };
      destination: { iata_code: string; terminal?: string | null };
      departing_at: string;
      arriving_at: string;
      duration?: string;
      marketing_carrier?: { name?: string; iata_code?: string };
      marketing_carrier_flight_number?: string;
      operating_carrier?: { name?: string };
      aircraft?: { name?: string } | null;
      passengers?: {
        cabin_class_marketing_name?: string;
        cabin_class?: string;
        baggages?: { type?: string; quantity?: number }[];
      }[];
    }[];
  }[];
};

export function isoDurationToMin(d: string | undefined): number {
  if (!d) return 0;
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/.exec(d);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 1440 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

const cond = (c: { allowed?: boolean } | null | undefined) =>
  c == null || c.allowed === undefined ? 'unknown' : c.allowed ? 'allowed' : 'not_allowed';

/** Every Duffel object must be a test-mode object; anything else fails closed. */
function assertTestMode(obj: { live_mode?: unknown }, what: string) {
  if (obj.live_mode !== false)
    throw new ProviderError('TEST_MODE_REQUIRED', `Duffel ${what} is not a test-mode resource`);
}

export function mapOffer(
  offer: DuffelOffer,
  journey: Journey,
  cabin: Cabin,
  fx: FxSnapshot[],
  today: string,
  now: string,
): FlightOption {
  assertTestMode(offer, 'offer');
  if (!offer.id || !offer.total_amount || !offer.total_currency || !Array.isArray(offer.slices))
    throw new ProviderError('MALFORMED', 'Duffel offer is missing required fields');
  const minor = Math.round(Number(offer.total_amount) * 100);
  if (!Number.isFinite(minor) || minor < 0)
    throw new ProviderError('MALFORMED', 'Bad total_amount');
  const original = money(minor, offer.total_currency);
  const converted = toEur(
    original,
    fx.find((s) => s.base === offer.total_currency),
    today,
  );

  const slices: Slice[] = offer.slices.map((s) => ({
    from: s.origin.iata_code,
    to: s.destination.iata_code,
    departAt: s.segments[0]?.departing_at ?? '',
    arriveAt: s.segments[s.segments.length - 1]?.arriving_at ?? '',
    durationMin: isoDurationToMin(s.duration),
    segments: s.segments.map((g) => ({
      from: g.origin.iata_code,
      to: g.destination.iata_code,
      departAt: g.departing_at,
      arriveAt: g.arriving_at,
      carrier: g.marketing_carrier?.name ?? offer.owner?.name ?? 'Unknown carrier',
      operatingCarrier: g.operating_carrier?.name,
      cabin: g.passengers?.[0]?.cabin_class_marketing_name ?? g.passengers?.[0]?.cabin_class,
      flightNumber:
        `${g.marketing_carrier?.iata_code ?? ''} ${g.marketing_carrier_flight_number ?? ''}`.trim(),
      durationMin: isoDurationToMin(g.duration),
    })),
  }));

  const firstSeg = offer.slices[0]?.segments[0];
  const returnedCabin =
    firstSeg?.passengers?.[0]?.cabin_class_marketing_name ?? firstSeg?.passengers?.[0]?.cabin_class;
  const sandboxAirline =
    offer.owner?.iata_code === 'ZZ' || /duffel airways/i.test(offer.owner?.name ?? '');

  return {
    id: `duffel-${offer.id}`,
    kind: 'cash',
    legIndexes: journey.legIndexes,
    slices,
    cabin,
    returnedCabin,
    sandboxAirline,
    costLines: [
      {
        code: 'fare',
        key: 'fare',
        label:
          offer.total_currency === 'EUR'
            ? 'Fare incl. taxes and fees (Duffel test)'
            : `Fare incl. taxes and fees (Duffel test, ${offer.total_currency} ${offer.total_amount} converted)`,
        amount: converted.ok ? converted.amount : money(0, 'EUR'),
        original: offer.total_currency === 'EUR' ? undefined : original,
        timing: 'today',
        provenance: 'LIVE_TEST_DUFFEL',
      },
    ],
    points: [],
    provenance: 'LIVE_TEST_DUFFEL',
    availability: 'TEST_OR_ILLUSTRATIVE',
    fetchedAt: now,
    expiresAt: offer.expires_at,
    conditions: {
      refund: cond(offer.conditions?.refund_before_departure),
      change: cond(offer.conditions?.change_before_departure),
    },
    fxStale: !converted.ok,
    offerRef: offer.id,
    sourceLabel: 'Duffel test data (sandbox airline; not a real market fare)',
  };
}

type Deps = { token: string; fetchImpl?: typeof fetch; fx: () => Promise<FxSnapshot[]> };

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Duffel-Version': 'v2',
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

async function call<T>(
  deps: Deps,
  path: string,
  init: RequestInit,
  signal: AbortSignal,
  retry: boolean,
): Promise<T> {
  const doFetch = deps.fetchImpl ?? fetch;
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await doFetch(`${API}${path}`, { ...init, headers: headers(deps.token), signal });
    } catch (e) {
      if (signal.aborted) throw new ProviderError('TIMEOUT', 'Duffel request timed out');
      if (retry && attempt === 0) continue;
      throw new ProviderError('UPSTREAM', `Duffel network error: ${(e as Error).name}`);
    }
    if (res.status >= 500 && retry && attempt === 0) continue;
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      throw new ProviderError('MALFORMED', `Duffel returned non-JSON (HTTP ${res.status})`);
    }
    if (!res.ok) {
      const errs = (body as { errors?: { code?: string; type?: string }[] }).errors ?? [];
      const codes = errs.map((x) => `${x.code ?? ''} ${x.type ?? ''}`).join(' ');
      if (res.status === 404) throw new ProviderError('NOT_FOUND', 'Duffel offer not found');
      if (/expired|no_longer_available|offer_request_already_booked/.test(codes))
        throw new ProviderError('OFFER_EXPIRED', 'Duffel offer expired');
      if (/price_changed/.test(codes))
        throw new ProviderError('PRICE_CHANGED', 'Duffel price changed');
      // Any other 4xx is a definite refusal: nothing was created.
      if (res.status >= 400 && res.status < 500) {
        const code = errs[0]?.code ?? `http_${res.status}`;
        throw new ProviderError('REJECTED', `Duffel rejected the request: ${code}`, { code });
      }
      throw new ProviderError('UPSTREAM', `Duffel HTTP ${res.status}`);
    }
    return body as T;
  }
}

export function createDuffelCashProvider(deps: Deps): FlightProvider {
  if (!isDuffelTestToken(deps.token))
    throw new ProviderError('TEST_MODE_REQUIRED', 'Duffel token is not a test token');
  return {
    id: 'duffel-test',
    kind: 'cash',
    async search(q: ProviderQuery, signal: AbortSignal) {
      const fx = await deps.fx();
      const results = await Promise.all(
        q.journeys.map(async (j) => {
          const body = {
            data: {
              cabin_class: q.cabin,
              slices: j.slices.map((s) => ({
                origin: s.origin,
                destination: s.destination,
                departure_date: s.date,
              })),
              passengers: Array.from({ length: q.adults }, () => ({ type: 'adult' })),
            },
          };
          const res = await call<{ data?: { live_mode?: boolean; offers?: DuffelOffer[] } }>(
            deps,
            `/air/offer_requests?return_offers=true&supplier_timeout=${SUPPLIER_TIMEOUT_MS}`,
            { method: 'POST', body: JSON.stringify(body) },
            signal,
            true,
          );
          if (!res.data || !Array.isArray(res.data.offers))
            throw new ProviderError('MALFORMED', 'Duffel offer request missing offers');
          assertTestMode(res.data, 'offer request');
          return res.data.offers
            .slice()
            .sort((a, b) => Number(a.total_amount) - Number(b.total_amount))
            .slice(0, 8)
            .map((o) => mapOffer(o, j, q.cabin, fx, q.today, q.now));
        }),
      );
      return results.flat();
    },
  };
}

export type ItinerarySegment = {
  from: string;
  to: string;
  departAt: string;
  arriveAt: string;
  durationMin: number;
  flightNumber: string;
  carrier: string;
  operatingCarrier?: string;
  aircraft?: string;
  cabin?: string;
  fromTerminal?: string;
  toTerminal?: string;
  checkedBags?: number;
  carryOnBags?: number;
};

export type Itinerary = {
  owner: string;
  /** Duffel Airways (ZZ) is Duffel's own sandbox airline: schedules and prices are not real. */
  sandboxAirline: boolean;
  passengers: number;
  baseAmount?: string;
  taxAmount?: string;
  currency: string;
  refund: 'allowed' | 'not_allowed' | 'unknown';
  change: 'allowed' | 'not_allowed' | 'unknown';
  slices: {
    from: string;
    to: string;
    fromCity?: string;
    toCity?: string;
    durationMin: number;
    fareBrand?: string;
    segments: ItinerarySegment[];
  }[];
};

export type DuffelOfferSnapshot = {
  offerId: string;
  totalAmount: string;
  totalCurrency: string;
  expiresAt?: string;
  passengerIds: string[];
  itinerary: Itinerary;
};

function bags(s: DuffelOffer['slices'][number]['segments'][number], type: string) {
  const b = s.passengers?.[0]?.baggages?.filter((x) => x.type === type);
  return b && b.length ? b.reduce((n, x) => n + (x.quantity ?? 0), 0) : undefined;
}

export function itineraryOf(o: DuffelOffer): Itinerary {
  return {
    owner: o.owner?.name ?? 'Unknown airline',
    sandboxAirline: o.owner?.iata_code === 'ZZ',
    passengers: o.passengers?.length ?? 0,
    baseAmount: o.base_amount,
    taxAmount: o.tax_amount,
    currency: o.total_currency,
    refund: cond(o.conditions?.refund_before_departure),
    change: cond(o.conditions?.change_before_departure),
    slices: (o.slices ?? []).map((s) => ({
      from: s.origin.iata_code,
      to: s.destination.iata_code,
      fromCity: s.origin.city_name,
      toCity: s.destination.city_name,
      durationMin: isoDurationToMin(s.duration),
      fareBrand: s.fare_brand_name,
      segments: s.segments.map((g) => ({
        from: g.origin.iata_code,
        to: g.destination.iata_code,
        departAt: g.departing_at,
        arriveAt: g.arriving_at,
        durationMin: isoDurationToMin(g.duration),
        flightNumber:
          `${g.marketing_carrier?.iata_code ?? ''} ${g.marketing_carrier_flight_number ?? ''}`.trim(),
        carrier: g.marketing_carrier?.name ?? o.owner?.name ?? 'Unknown airline',
        operatingCarrier: g.operating_carrier?.name,
        aircraft: g.aircraft?.name,
        cabin: g.passengers?.[0]?.cabin_class_marketing_name ?? g.passengers?.[0]?.cabin_class,
        fromTerminal: g.origin.terminal ?? undefined,
        toTerminal: g.destination.terminal ?? undefined,
        checkedBags: bags(g, 'checked'),
        carryOnBags: bags(g, 'carry_on'),
      })),
    })),
  };
}

/** Fetches the latest price for an offer (used to reprice before a test order). */
export async function getDuffelOffer(
  deps: Deps,
  offerId: string,
  signal: AbortSignal,
  nowMs: number = Date.now(),
): Promise<DuffelOfferSnapshot> {
  const res = await call<{ data?: DuffelOffer }>(
    deps,
    `/air/offers/${encodeURIComponent(offerId)}`,
    { method: 'GET' },
    signal,
    true,
  );
  if (!res.data) throw new ProviderError('MALFORMED', 'Duffel offer missing');
  assertTestMode(res.data, 'offer');
  if (res.data.expires_at && Date.parse(res.data.expires_at) <= nowMs)
    throw new ProviderError('OFFER_EXPIRED', 'Duffel offer expired');
  return {
    offerId: res.data.id,
    totalAmount: res.data.total_amount,
    totalCurrency: res.data.total_currency,
    expiresAt: res.data.expires_at,
    passengerIds: (res.data.passengers ?? []).map((p) => p.id),
    itinerary: itineraryOf(res.data),
  };
}

export type SyntheticPassenger = {
  given_name: string;
  family_name: string;
  born_on: string;
  gender: 'm' | 'f';
  title: 'mr' | 'ms' | 'mrs';
  email: string;
  phone_number: string;
};

type DuffelOrder = {
  id: string;
  booking_reference?: string;
  live_mode?: boolean;
  metadata?: Record<string, string> | null;
};

const orderResult = (o: DuffelOrder) => {
  assertTestMode(o, 'order');
  return { id: o.id, bookingReference: o.booking_reference ?? o.id, liveMode: false as const };
};

/**
 * Creates a Duffel TEST order paid from the test balance, tagged with our idempotency key. Never retried.
 * One distinct passenger per offer passenger id (Duffel rejects duplicate names).
 */
export async function createDuffelTestOrder(
  deps: Deps,
  input: { offer: DuffelOfferSnapshot; passengers: SyntheticPassenger[]; key: string },
  signal: AbortSignal,
): Promise<{ id: string; bookingReference: string; liveMode: false }> {
  const ids = input.offer.passengerIds;
  if (!ids.length)
    throw new ProviderError('REJECTED', 'The offer lists no passengers', { code: 'no_passengers' });
  if (input.passengers.length < ids.length)
    throw new ProviderError('REJECTED', 'Not enough travellers for this offer', {
      code: 'passenger_count',
    });
  const body = {
    data: {
      type: 'instant',
      selected_offers: [input.offer.offerId],
      payments: [
        { type: 'balance', currency: input.offer.totalCurrency, amount: input.offer.totalAmount },
      ],
      passengers: ids.map((id, i) => ({ id, ...input.passengers[i] })),
      metadata: { aum_key: input.key },
    },
  };
  const res = await call<{ data?: DuffelOrder }>(
    deps,
    '/air/orders',
    { method: 'POST', body: JSON.stringify(body) },
    signal,
    false,
  );
  if (!res.data) throw new ProviderError('MALFORMED', 'Duffel order missing');
  return orderResult(res.data);
}

/** Looks for an order we created for this offer with this idempotency key (read-only). */
export async function findDuffelOrderByKey(
  deps: Deps,
  offerId: string,
  key: string,
  signal: AbortSignal,
): Promise<{ id: string; bookingReference: string; liveMode: false } | null> {
  const res = await call<{ data?: DuffelOrder[] }>(
    deps,
    `/air/orders?offer_id=${encodeURIComponent(offerId)}&limit=50`,
    { method: 'GET' },
    signal,
    true,
  );
  const match = (res.data ?? []).find((o) => o.metadata?.aum_key === key);
  return match ? orderResult(match) : null;
}
