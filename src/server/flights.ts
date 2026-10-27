import 'server-only';
import { sampleDates } from '@/domain/flexDates';
import type { FlightQuote, FlightsSummary } from '@/domain/plan';
import type { TripInput } from '@/domain/profile';
import { cashTotal } from '@/domain/cost';
import type { FlightOption } from '@/domain/types';
import { createDuffelCashProvider } from '@/providers/duffel';
import { fixtureCashProvider } from '@/providers/fixtures/fixtureFlights';
import { fetchFxSnapshots } from '@/providers/fx';
import type { FlightProvider, ProviderQuery } from '@/providers/types';
import type { ServerEnv } from './env';

const PER_SEARCH_MS = 15_000;
const CONCURRENCY = 3;

const cheapestQuote = (opts: FlightOption[], directOnly: boolean): FlightQuote | null => {
  const usable = opts.filter(
    (o) => !o.fxStale && (!directOnly || o.slices.every((s) => s.segments.length <= 1)),
  );
  usable.sort((a, b) => cashTotal(a).minor - cashTotal(b).minor);
  const o = usable[0];
  if (!o) return null;
  return {
    depart: o.slices[0]?.departAt.slice(0, 10) ?? '',
    ret: o.slices.length > 1 ? o.slices[o.slices.length - 1].departAt.slice(0, 10) : undefined,
    totalMinor: cashTotal(o).minor,
    carrier: o.slices[0]?.segments[0]?.carrier ?? 'Unknown',
    stops: Math.max(0, ...o.slices.map((s) => s.segments.length - 1)),
    provenance: o.provenance,
    offerRef: o.offerRef,
    expiresAt: o.expiresAt,
  };
};

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k]);
      }
    }),
  );
  return out;
}

/**
 * Prices the sampled dates of the trip. Live test fares come only from Duffel; when they fail the result says so.
 * Example fares are returned only when the user explicitly asks for them, and are labelled as examples.
 */
export async function searchTripFares(
  trip: TripInput,
  opts: {
    env: ServerEnv;
    today: string;
    now: string;
    useExample: boolean;
    fetchImpl?: typeof fetch;
    provider?: FlightProvider;
  },
): Promise<FlightsSummary> {
  const pairs = sampleDates(trip);
  let provider: FlightProvider | null = opts.provider ?? null;
  let kind: FlightsSummary['provider'] = 'duffel_test';
  if (!provider && opts.useExample) {
    provider = fixtureCashProvider;
    kind = 'example';
  }
  if (!provider && opts.env.duffelEnabled) {
    provider = createDuffelCashProvider({
      token: opts.env.DUFFEL_ACCESS_TOKEN!,
      fetchImpl: opts.fetchImpl,
      fx: () => fetchFxSnapshots({ live: opts.env.FX_LIVE === 'on', fetchImpl: opts.fetchImpl }),
    });
  }
  if (!provider)
    return {
      status: 'unavailable',
      provider: 'duffel_test',
      quotes: [],
      cheapest: null,
      searched: 0,
      failed: 0,
      note: 'Live test fares are not configured on this server.',
    };

  let failed = 0;
  const results = await pool(pairs, CONCURRENCY, async (p) => {
    const q: ProviderQuery = {
      mode: 'quick',
      journeys: [
        {
          legIndexes: [0],
          slices: [
            { origin: trip.origin, destination: trip.destination, date: p.depart },
            ...(trip.tripType === 'return' && p.ret
              ? [{ origin: trip.destination, destination: trip.origin, date: p.ret }]
              : []),
          ],
        },
      ],
      adults: trip.adults,
      cabin: trip.cabin,
      flexDays: 0,
      nearbyAirports: false,
      today: opts.today,
      now: opts.now,
    };
    try {
      const options = await provider!.search(q, AbortSignal.timeout(PER_SEARCH_MS));
      return cheapestQuote(options, !!trip.directOnly);
    } catch {
      failed++;
      return null;
    }
  });
  const quotes = results
    .filter((q): q is FlightQuote => !!q)
    .sort((a, b) => a.depart.localeCompare(b.depart));
  const cheapest = [...quotes].sort((a, b) => a.totalMinor - b.totalMinor)[0] ?? null;
  const status: FlightsSummary['status'] =
    kind === 'example'
      ? 'example'
      : quotes.length === 0
        ? 'unavailable'
        : failed > 0
          ? 'partial'
          : 'ok';
  const note =
    kind === 'example'
      ? 'Example fares you asked for (fixture data, not real and not from Duffel).'
      : status === 'unavailable'
        ? failed
          ? 'The Duffel test search did not answer for these dates.'
          : 'No test fares were returned for these dates.'
        : `Duffel test-mode fares (sandbox data, not real market prices) for ${pairs.length} sampled dates${failed ? `; ${failed} searches failed` : ''}.`;
  return { status, provider: kind, quotes, cheapest, searched: pairs.length, failed, note };
}
