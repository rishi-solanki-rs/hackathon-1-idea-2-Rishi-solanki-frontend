/** English (P0) string catalogue. A Spanish catalogue can mirror these keys later. */
export const en = {
  brand: 'A Una Milla',
  tagline: 'Same trip. Much less money.',
  demoBanner: 'Demo · fares are Duffel test data · bookings are tests, no money is charged',
  clearDemoData: 'Clear my data',
  cleared: 'Your data was cleared.',
  nav: {
    plan: 'Plan my trip',
    compare: 'Compare flights',
    myPlans: 'My plans',
  },
  footer:
    'A Una Milla is a hackathon demo for travellers in Spain. Fares are Duffel test-mode data, never real market prices. Test bookings issue no ticket. Card terms show their source. Not financial advice.',
  provenance: {
    LIVE_TEST_DUFFEL: 'Duffel test data',
    FIXTURE_FLIGHT: 'Illustrative fare',
    FIXTURE_AWARD: 'Illustrative award',
    USER_ENTERED: 'Your input',
    VERIFIED_OFFICIAL_RULE: 'Official rule',
    EXTERNAL_FX_SNAPSHOT: 'ECB exchange rate',
    FIXTURE_FX: 'Bundled exchange rate',
    CACHED: 'Cached',
    ESTIMATE: 'Estimate',
  },
  availability: {
    VERIFIED_RESULT: 'Seat confirmed',
    TEST_OR_ILLUSTRATIVE: 'Availability not checked',
    CACHED: 'Seen earlier; may be gone',
    NOT_YET_SEARCHABLE: 'Not bookable yet',
    ESTIMATED_RELEASE_WINDOW: 'Release date estimated',
    UNKNOWN_AVAILABILITY: 'Availability unknown',
  },
  cabin: {
    economy: 'Economy',
    premium_economy: 'Premium economy',
    business: 'Business',
    first: 'First',
  },
  objective: {
    B_ECONOMIC_COST: 'Lowest overall cost',
    A_CASH_TODAY: 'Least cash today',
  },
} as const;

export const t = en;
