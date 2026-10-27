import type { Money } from './money';

export type Provenance =
  | 'LIVE_TEST_DUFFEL'
  | 'FIXTURE_FLIGHT'
  | 'FIXTURE_AWARD'
  | 'USER_ENTERED'
  | 'VERIFIED_OFFICIAL_RULE'
  | 'EXTERNAL_FX_SNAPSHOT'
  | 'FIXTURE_FX'
  | 'CACHED'
  | 'ESTIMATE';

export type Availability =
  | 'VERIFIED_RESULT'
  | 'TEST_OR_ILLUSTRATIVE'
  | 'CACHED'
  | 'NOT_YET_SEARCHABLE'
  | 'ESTIMATED_RELEASE_WINDOW'
  | 'UNKNOWN_AVAILABILITY';

export type Cabin = 'economy' | 'premium_economy' | 'business' | 'first';
export type Objective = 'A_CASH_TODAY' | 'B_ECONOMIC_COST';
export type ProgramId = string;

export type CostLineCode =
  | 'fare'
  | 'taxes'
  | 'carrier_surcharge'
  | 'booking_fee'
  | 'bag'
  | 'seat'
  | 'positioning'
  | 'award_taxes'
  | 'card_fx_fee'
  | 'other';

export type CostLine = {
  code: CostLineCode;
  key: string;
  label: string;
  amount: Money;
  timing: 'today' | 'later';
  original?: Money;
  provenance: Provenance;
};

export type Segment = {
  from: string;
  to: string;
  departAt: string;
  arriveAt: string;
  carrier: string;
  flightNumber: string;
  durationMin: number;
};

export type Slice = {
  from: string;
  to: string;
  departAt: string;
  arriveAt: string;
  durationMin: number;
  segments: Segment[];
};

export type Conditions = {
  refund: 'allowed' | 'not_allowed' | 'unknown';
  change: 'allowed' | 'not_allowed' | 'unknown';
};

export type FlightOption = {
  id: string;
  kind: 'cash' | 'award';
  /** Requested legs this ticket covers (indexes into the request's legs). */
  legIndexes: number[];
  slices: Slice[];
  cabin: Cabin;
  costLines: CostLine[];
  points: { program: ProgramId; amount: number }[];
  provenance: Provenance;
  availability: Availability;
  fetchedAt: string;
  expiresAt?: string;
  conditions: Conditions;
  /** Differences from the exact request (used to decide what counts as the normal price). */
  variation?: { dateShiftDays?: number; altOrigin?: string; altDestination?: string };
  fxStale?: boolean;
  offerRef?: string;
  sourceLabel: string;
};

export type Valuation = {
  program: ProgramId;
  eurPerPoint: string;
  method: 'user' | 'reference';
};
