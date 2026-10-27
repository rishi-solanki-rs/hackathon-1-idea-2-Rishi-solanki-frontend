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
    origin: { iata_code: string };
    destination: { iata_code: string };
    duration?: string;
    segments: {
      origin: { iata_code: string };
      destination: { iata_code: string };
      departing_at: string;
      arriving_at: string;
      duration?: string;
      marketing_carrier?: { name?: string; iata_code?: string };
      marketing_carrier_flight_number?: string;
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
      flightNumber:
        `${g.marketing_carrier?.iata_code ?? ''} ${g.marketing_carrier_flight_number ?? ''}`.trim(),
      durationMin: isoDurationToMin(g.duration),
    })),
  }));

  return {
    id: `duffel-${offer.id}`,
    kind: 'cash',
    legIndexes: journey.legIndexes,
    slices,
    cabin,
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
      if (/price/.test(codes)) throw new ProviderError('PRICE_CHANGED', 'Duffel price changed');
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

export type DuffelOfferSnapshot = {
  offerId: string;
  totalAmount: string;
  totalCurrency: string;
  expiresAt?: string;
  passengerIds: string[];
};

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

/** Creates a Duffel TEST order paid from the test balance. Never retried. */
export async function createDuffelTestOrder(
  deps: Deps,
  input: { offer: DuffelOfferSnapshot; passengers: SyntheticPassenger[] },
  signal: AbortSignal,
): Promise<{ id: string; bookingReference: string; liveMode: false }> {
  const body = {
    data: {
      type: 'instant',
      selected_offers: [input.offer.offerId],
      payments: [
        { type: 'balance', currency: input.offer.totalCurrency, amount: input.offer.totalAmount },
      ],
      passengers: input.offer.passengerIds.map((id, i) => ({
        id,
        ...input.passengers[i % input.passengers.length],
      })),
    },
  };
  const res = await call<{
    data?: { id: string; booking_reference?: string; live_mode?: boolean };
  }>(deps, '/air/orders', { method: 'POST', body: JSON.stringify(body) }, signal, false);
  if (!res.data) throw new ProviderError('MALFORMED', 'Duffel order missing');
  assertTestMode(res.data, 'order');
  return {
    id: res.data.id,
    bookingReference: res.data.booking_reference ?? 'TEST',
    liveMode: false,
  };
}
