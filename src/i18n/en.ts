/** English (P0) string catalogue. A Spanish catalogue can mirror these keys later. */
export const en = {
  brand: 'A Una Milla',
  tagline: 'Same trip. Much less money.',
  demoBanner: 'Demo · test mode · illustrative prices · your data stays in this browser',
  clearDemoData: 'Clear demo data',
  cleared: 'Demo data cleared from this browser.',
  nav: {
    quick: 'Quick Flight',
    plan: 'Full Trip Plan',
    wallet: 'Wallet',
    how: 'How it works',
    settings: 'Privacy',
  },
  footer:
    'A Una Milla is a hackathon demo. Prices are illustrative fixtures or Duffel test data, never real market fares. Test bookings issue no ticket and charge no money. Not financial advice.',
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
