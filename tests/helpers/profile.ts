import { userValue, type Profile, type UserCard } from '@/domain/profile';
import type { TransferRoute } from '@/domain/wallet';
import type { FlightsSummary } from '@/domain/plan';

export const ROUTES: TransferRoute[] = [
  {
    id: 'mr-ib',
    from: 'amex_mr_es',
    to: 'iberia_club',
    num: 1,
    den: 1,
    min: 1000,
    increment: 1000,
    status: 'active',
    verification: 'UNVERIFIED',
    maxDelayDays: 2,
    preconditions: [],
  },
];

export function card(
  p: Partial<UserCard> & {
    id: string;
    rates?: Record<string, number>;
    caps?: Record<string, number>;
    delay?: number | null;
  },
): UserCard {
  const rates = p.rates ?? { all: 1 };
  return {
    name: p.id,
    issuingCountry: 'ES',
    program: 'iberia_club',
    bonus: null,
    annualFeeEur: userValue(0),
    postingDelayDays:
      p.delay === null ? { value: null, status: 'UNKNOWN' } : userValue(p.delay ?? 30),
    ...p,
    earn:
      p.earn ??
      Object.entries(rates).map(([category, r]) => ({
        category: category as UserCard['earn'][number]['category'],
        pointsPerEuro: userValue(r),
        ...(p.caps?.[category] !== undefined ? { monthlyCapEur: userValue(p.caps[category]) } : {}),
      })),
  };
}

export function profile(p: Partial<Profile> = {}): Profile {
  return {
    cards: [],
    noCards: false,
    balances: [],
    noPoints: false,
    monthly: [],
    purchases: [],
    finance: { paysInFull: true },
    valuations: [],
    ...p,
  };
}

export const flights = (eur: number | null): FlightsSummary =>
  eur === null
    ? {
        status: 'unavailable',
        provider: 'duffel_test',
        quotes: [],
        cheapest: null,
        searched: 3,
        failed: 3,
        note: 'unavailable',
      }
    : {
        status: 'ok',
        provider: 'duffel_test',
        quotes: [
          {
            depart: '2027-03-01',
            totalMinor: eur * 100,
            carrier: 'Test Air',
            stops: 0,
            provenance: 'LIVE_TEST_DUFFEL',
          },
        ],
        cheapest: {
          depart: '2027-03-01',
          totalMinor: eur * 100,
          carrier: 'Test Air',
          stops: 0,
          provenance: 'LIVE_TEST_DUFFEL',
        },
        searched: 1,
        failed: 0,
        note: 'ok',
      };
