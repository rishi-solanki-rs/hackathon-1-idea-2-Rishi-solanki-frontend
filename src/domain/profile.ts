import type { Cabin, Objective, ProgramId } from './types';

/** Where a value came from. Only VERIFIED values have an official source and a check date. */
export type EvidenceStatus =
  'VERIFIED' | 'USER_ENTERED' | 'ILLUSTRATIVE' | 'CONFLICTING' | 'UNKNOWN';

export type Sourced<T> = {
  value: T | null;
  status: EvidenceStatus;
  sourceUrl?: string;
  checkedAt?: string;
};

export const unknown = <T>(): Sourced<T> => ({ value: null, status: 'UNKNOWN' });
export const userValue = <T>(value: T): Sourced<T> => ({ value, status: 'USER_ENTERED' });
export const known = <T>(s: Sourced<T> | undefined): s is Sourced<T> & { value: T } =>
  !!s && s.value !== null && s.status !== 'UNKNOWN' && s.status !== 'CONFLICTING';

export const SPEND_CATEGORIES = [
  'groceries',
  'dining',
  'transport',
  'fuel',
  'bills',
  'travel',
  'shopping',
  'other',
] as const;
export type SpendCategory = (typeof SPEND_CATEGORIES)[number];

export type EarnRule = {
  /** 'all' is the card's base rate for any eligible purchase. */
  category: SpendCategory | 'all';
  pointsPerEuro: Sourced<number>;
  /** Monthly euro cap for this rate; null = no cap; UNKNOWN = cap not known. */
  monthlyCapEur?: Sourced<number | null>;
};

export type SignupBonus = {
  thresholdEur: Sourced<number>;
  windowDays: Sourced<number>;
  points: Sourced<number>;
  /** Date the window started (card opened). Unknown = bonus cannot be planned. */
  startDate?: string;
};

export type UserCard = {
  id: string;
  name: string;
  catalogueId?: string;
  issuingCountry: string;
  /** Rewards currency this card earns, e.g. amex_mr_es or iberia_club. */
  program: ProgramId;
  earn: EarnRule[];
  bonus?: SignupBonus | null;
  postingDelayDays: Sourced<number>;
  annualFeeEur: Sourced<number>;
};

export type BalanceInput = {
  program: ProgramId;
  kind: 'exact' | 'range' | 'unknown';
  points?: number;
  min?: number;
  max?: number;
  asOf?: string;
  expiresOn?: string;
  /** Points already promised to another plan. */
  reserved?: number;
};

export type MonthlySpend = {
  id: string;
  label: string;
  category: SpendCategory;
  amountEur: number;
  currentCardId?: string;
};

export type PlannedPurchase = {
  id: string;
  label: string;
  category: SpendCategory;
  amountEur: number;
  date: string;
  necessity: 'necessary' | 'flexible';
  committed: boolean;
  /** Can be returned for a refund; card points may then be clawed back. */
  refundable: boolean;
  /** Card the user would pay with today (for the "versus how you pay today" comparison). */
  currentCardId?: string;
};

export type Finance = {
  paysInFull: boolean | null;
  /** Cash the user must keep after paying for the trip. */
  cashReserveEur?: number | null;
  /** Cash available for this trip (fare or award taxes). */
  tripBudgetEur?: number | null;
  answered?: boolean;
};

export type AwardInput = {
  program: ProgramId;
  points: number;
  taxesEur: number;
  /** USER_ENTERED = the user found it on the programme's site; ILLUSTRATIVE = our rough estimate. */
  source: 'USER_ENTERED' | 'ILLUSTRATIVE';
  /** The user saw the seat available on the programme's own site today. Never set by us. */
  seenAvailable?: boolean;
};

export type TripInput = {
  origin: string;
  destination: string;
  tripType: 'one_way' | 'return';
  earliestDepart: string;
  latestDepart: string;
  minNights?: number;
  maxNights?: number;
  adults: number;
  cabin: Cabin;
  objective: Objective;
  directOnly?: boolean;
  /** Optional: the user's own latest date to have booked by. */
  bookBy?: string;
};

export type Profile = {
  cards: UserCard[];
  noCards: boolean;
  balances: BalanceInput[];
  noPoints: boolean;
  monthly: MonthlySpend[];
  purchases: PlannedPurchase[];
  finance: Finance;
  valuations: { program: ProgramId; eurPerPoint: string }[];
};
