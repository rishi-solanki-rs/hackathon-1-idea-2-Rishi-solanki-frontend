import type { Cabin, FlightOption } from '@/domain/types';

export type JourneySlice = { origin: string; destination: string; date: string };

/** One ticket to price: a set of slices covering one or more requested legs. */
export type Journey = { legIndexes: number[]; slices: JourneySlice[] };

export type ProviderQuery = {
  mode: 'quick' | 'plan';
  journeys: Journey[];
  adults: number;
  cabin: Cabin;
  flexDays: number;
  nearbyAirports: boolean;
  /** Server "today" (YYYY-MM-DD), passed in so providers stay deterministic in tests. */
  today: string;
  now: string;
};

export interface FlightProvider {
  id: string;
  kind: 'cash' | 'award';
  search(q: ProviderQuery, signal: AbortSignal): Promise<FlightOption[]>;
}

export class ProviderError extends Error {
  constructor(
    public code:
      | 'TIMEOUT'
      | 'UPSTREAM'
      | 'MALFORMED'
      | 'TEST_MODE_REQUIRED'
      | 'OFFER_EXPIRED'
      | 'PRICE_CHANGED'
      | 'NOT_FOUND'
      /** The supplier definitely refused the request (e.g. a 422); nothing was created. */
      | 'REJECTED',
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}
