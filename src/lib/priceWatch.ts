'use client';

import { priceTrend, type PriceSnapshot, type PriceTrend } from '@/domain/bookingWindow';

const KEY = 'aum.pricewatch.v1';
const MAX_PER_TRIP = 20;

type Store = Record<string, PriceSnapshot[]>;

function read(): Store {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? '{}') as Store;
  } catch {
    return {};
  }
}

export const tripKey = (t: {
  origin: string;
  destination: string;
  earliestDepart: string;
  latestDepart: string;
  adults: number;
  cabin: string;
}) => [t.origin, t.destination, t.earliestDepart, t.latestDepart, t.adults, t.cabin].join('|');

/** Compares with earlier checks of the same trip, then records this one (one snapshot per day). */
export function recordPrice(
  key: string,
  cheapestMinor: number | null,
  now = new Date(),
): PriceTrend {
  const store = read();
  const day = now.toISOString().slice(0, 10);
  const history = (store[key] ?? []).filter((s) => s.at.slice(0, 10) !== day);
  const trend = priceTrend(history, cheapestMinor);
  if (cheapestMinor !== null) {
    store[key] = [...history, { at: now.toISOString(), cheapestMinor }].slice(-MAX_PER_TRIP);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(store));
    } catch {
      /* storage unavailable */
    }
  }
  return trend;
}
