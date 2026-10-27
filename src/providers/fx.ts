import type { FxSnapshot } from '@/domain/fx';

/** Bundled fallback (ECB reference via Frankfurter, retrieved 26 Oct 2026). Fails closed once stale. */
export const FIXTURE_FX: FxSnapshot[] = [
  {
    base: 'USD',
    quote: 'EUR',
    rate: '1.1188',
    rateDate: '2026-10-26',
    provenance: 'FIXTURE_FX',
    source: 'Bundled ECB rate snapshot (Frankfurter, 26 Oct 2026)',
  },
  {
    base: 'GBP',
    quote: 'EUR',
    rate: '0.8382',
    rateDate: '2026-10-26',
    provenance: 'FIXTURE_FX',
    source: 'Bundled ECB rate snapshot (Frankfurter, 26 Oct 2026)',
  },
];

const FrankfurterUrl = 'https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD,GBP';

type Cache = { at: number; value: FxSnapshot[] } | null;
let cache: Cache = null;
const TTL_MS = 60 * 60_000;

export async function fetchFxSnapshots(opts: {
  live: boolean;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}): Promise<FxSnapshot[]> {
  if (!opts.live) return FIXTURE_FX;
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  try {
    const res = await (opts.fetchImpl ?? fetch)(FrankfurterUrl, {
      signal: opts.signal ?? AbortSignal.timeout(3000),
    });
    if (!res.ok) return FIXTURE_FX;
    const body = (await res.json()) as {
      base?: string;
      date?: string;
      rates?: Record<string, number>;
    };
    if (body.base !== 'EUR' || !body.date || !body.rates) return FIXTURE_FX;
    const value: FxSnapshot[] = Object.entries(body.rates).map(([base, rate]) => ({
      base,
      quote: 'EUR',
      rate: String(rate),
      rateDate: body.date!,
      provenance: 'EXTERNAL_FX_SNAPSHOT',
      source: `ECB reference rate via Frankfurter (${body.date})`,
    }));
    cache = { at: Date.now(), value };
    return value;
  } catch {
    return FIXTURE_FX;
  }
}

export function resetFxCacheForTests() {
  cache = null;
}
