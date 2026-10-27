import type { TransferRoute, VerificationStatus } from '@/domain/wallet';

export type Airport = {
  iata: string;
  name: string;
  city: string;
  country: string;
  tz: string;
  lat: number;
  lon: number;
};

export const AIRPORTS: Airport[] = [
  {
    iata: 'MAD',
    name: 'Adolfo Suárez Madrid–Barajas',
    city: 'Madrid',
    country: 'ES',
    tz: 'Europe/Madrid',
    lat: 40.4719,
    lon: -3.5626,
  },
  {
    iata: 'BCN',
    name: 'Josep Tarradellas Barcelona–El Prat',
    city: 'Barcelona',
    country: 'ES',
    tz: 'Europe/Madrid',
    lat: 41.2971,
    lon: 2.0785,
  },
  {
    iata: 'AGP',
    name: 'Málaga–Costa del Sol',
    city: 'Málaga',
    country: 'ES',
    tz: 'Europe/Madrid',
    lat: 36.6749,
    lon: -4.4991,
  },
  {
    iata: 'SVQ',
    name: 'Sevilla',
    city: 'Seville',
    country: 'ES',
    tz: 'Europe/Madrid',
    lat: 37.418,
    lon: -5.8931,
  },
  {
    iata: 'VLC',
    name: 'Valencia',
    city: 'Valencia',
    country: 'ES',
    tz: 'Europe/Madrid',
    lat: 39.4893,
    lon: -0.4816,
  },
  {
    iata: 'BIO',
    name: 'Bilbao',
    city: 'Bilbao',
    country: 'ES',
    tz: 'Europe/Madrid',
    lat: 43.3011,
    lon: -2.9106,
  },
  {
    iata: 'PMI',
    name: 'Palma de Mallorca',
    city: 'Palma',
    country: 'ES',
    tz: 'Europe/Madrid',
    lat: 39.5517,
    lon: 2.7388,
  },
  {
    iata: 'IBZ',
    name: 'Ibiza',
    city: 'Ibiza',
    country: 'ES',
    tz: 'Europe/Madrid',
    lat: 38.8729,
    lon: 1.3731,
  },
  {
    iata: 'ALC',
    name: 'Alicante–Elche',
    city: 'Alicante',
    country: 'ES',
    tz: 'Europe/Madrid',
    lat: 38.2822,
    lon: -0.5582,
  },
  {
    iata: 'SCQ',
    name: 'Santiago–Rosalía de Castro',
    city: 'Santiago de Compostela',
    country: 'ES',
    tz: 'Europe/Madrid',
    lat: 42.8963,
    lon: -8.4151,
  },
  {
    iata: 'LPA',
    name: 'Gran Canaria',
    city: 'Las Palmas',
    country: 'ES',
    tz: 'Atlantic/Canary',
    lat: 27.9319,
    lon: -15.3866,
  },
  {
    iata: 'TFS',
    name: 'Tenerife South',
    city: 'Tenerife',
    country: 'ES',
    tz: 'Atlantic/Canary',
    lat: 28.0445,
    lon: -16.5725,
  },
  {
    iata: 'LIS',
    name: 'Humberto Delgado',
    city: 'Lisbon',
    country: 'PT',
    tz: 'Europe/Lisbon',
    lat: 38.7742,
    lon: -9.1342,
  },
  {
    iata: 'LHR',
    name: 'Heathrow',
    city: 'London',
    country: 'GB',
    tz: 'Europe/London',
    lat: 51.47,
    lon: -0.4543,
  },
  {
    iata: 'CDG',
    name: 'Charles de Gaulle',
    city: 'Paris',
    country: 'FR',
    tz: 'Europe/Paris',
    lat: 49.0097,
    lon: 2.5479,
  },
  {
    iata: 'FCO',
    name: 'Fiumicino',
    city: 'Rome',
    country: 'IT',
    tz: 'Europe/Rome',
    lat: 41.8003,
    lon: 12.2389,
  },
  {
    iata: 'AMS',
    name: 'Schiphol',
    city: 'Amsterdam',
    country: 'NL',
    tz: 'Europe/Amsterdam',
    lat: 52.3105,
    lon: 4.7683,
  },
  {
    iata: 'JFK',
    name: 'John F. Kennedy',
    city: 'New York',
    country: 'US',
    tz: 'America/New_York',
    lat: 40.6413,
    lon: -73.7781,
  },
  {
    iata: 'MIA',
    name: 'Miami',
    city: 'Miami',
    country: 'US',
    tz: 'America/New_York',
    lat: 25.7959,
    lon: -80.287,
  },
  {
    iata: 'MEX',
    name: 'Benito Juárez',
    city: 'Mexico City',
    country: 'MX',
    tz: 'America/Mexico_City',
    lat: 19.4361,
    lon: -99.0719,
  },
  {
    iata: 'CUN',
    name: 'Cancún',
    city: 'Cancún',
    country: 'MX',
    tz: 'America/Cancun',
    lat: 21.0365,
    lon: -86.877,
  },
  {
    iata: 'BOG',
    name: 'El Dorado',
    city: 'Bogotá',
    country: 'CO',
    tz: 'America/Bogota',
    lat: 4.7016,
    lon: -74.1469,
  },
  {
    iata: 'LIM',
    name: 'Jorge Chávez',
    city: 'Lima',
    country: 'PE',
    tz: 'America/Lima',
    lat: -12.0219,
    lon: -77.1143,
  },
  {
    iata: 'SCL',
    name: 'Arturo Merino Benítez',
    city: 'Santiago de Chile',
    country: 'CL',
    tz: 'America/Santiago',
    lat: -33.393,
    lon: -70.7858,
  },
  {
    iata: 'EZE',
    name: 'Ministro Pistarini',
    city: 'Buenos Aires',
    country: 'AR',
    tz: 'America/Argentina/Buenos_Aires',
    lat: -34.8222,
    lon: -58.5358,
  },
  {
    iata: 'GRU',
    name: 'Guarulhos',
    city: 'São Paulo',
    country: 'BR',
    tz: 'America/Sao_Paulo',
    lat: -23.4356,
    lon: -46.4731,
  },
  {
    iata: 'JNB',
    name: 'O. R. Tambo',
    city: 'Johannesburg',
    country: 'ZA',
    tz: 'Africa/Johannesburg',
    lat: -26.1392,
    lon: 28.246,
  },
  {
    iata: 'DXB',
    name: 'Dubai International',
    city: 'Dubai',
    country: 'AE',
    tz: 'Asia/Dubai',
    lat: 25.2532,
    lon: 55.3657,
  },
  {
    iata: 'PEK',
    name: 'Beijing Capital',
    city: 'Beijing',
    country: 'CN',
    tz: 'Asia/Shanghai',
    lat: 40.0799,
    lon: 116.6031,
  },
  {
    iata: 'PVG',
    name: 'Shanghai Pudong',
    city: 'Shanghai',
    country: 'CN',
    tz: 'Asia/Shanghai',
    lat: 31.1443,
    lon: 121.8083,
  },
  {
    iata: 'NRT',
    name: 'Narita',
    city: 'Tokyo',
    country: 'JP',
    tz: 'Asia/Tokyo',
    lat: 35.772,
    lon: 140.3929,
  },
];

export const airportByIata = (iata: string) => AIRPORTS.find((a) => a.iata === iata);

export type Program = {
  id: string;
  name: string;
  unit: string;
  kind: 'airline' | 'bank' | 'fintech';
  website: string;
  /** Programmes that share one currency can pool only via a documented route; they are never summed. */
  note?: string;
};

export const PROGRAMS: Program[] = [
  {
    id: 'iberia_club',
    name: 'Iberia Club',
    unit: 'Avios',
    kind: 'airline',
    website: 'https://www.iberia.com/',
  },
  {
    id: 'ba_club',
    name: 'The British Airways Club',
    unit: 'Avios',
    kind: 'airline',
    website: 'https://www.britishairways.com/',
  },
  {
    id: 'flying_blue',
    name: 'Flying Blue',
    unit: 'Miles',
    kind: 'airline',
    website: 'https://www.flyingblue.com/',
  },
  {
    id: 'amex_mr_es',
    name: 'American Express Membership Rewards (Spain)',
    unit: 'MR points',
    kind: 'bank',
    website: 'https://www.americanexpress.com/es-es/',
  },
  {
    id: 'revolut_revpoints',
    name: 'Revolut RevPoints',
    unit: 'RevPoints',
    kind: 'fintech',
    website: 'https://www.revolut.com/',
  },
];

export const programById = (id: string) => PROGRAMS.find((p) => p.id === id);
export const programUnit = (id: string) => programById(id)?.unit ?? 'points';

/** Reference value per point (D-02, provisional; the user can change it). */
export const REFERENCE_EUR_PER_POINT = '0.010';

const CHECKED = 'Not rechecked on the official page on the build date';

export const TRANSFER_ROUTES: TransferRoute[] = [
  {
    id: 'amex_mr_es-iberia_club',
    from: 'amex_mr_es',
    to: 'iberia_club',
    num: 1,
    den: 1,
    min: 1000,
    increment: 1000,
    status: 'active',
    verification: 'UNVERIFIED',
    maxDelayDays: 2,
    preconditions: [
      'Your Iberia Club account is in the same name as your Amex card account',
      'Your Amex card is issued in Spain (ratios differ by country)',
      'Ratio 1:1 is stated on the official Gold and Platinum pages (20,000 MR = 20,000 Iberia Avios; 50,000 MR = 50,000 Avios, checked 27 Oct 2026); the minimum and steps are not confirmed',
      'No transfer fee per the official Membership Rewards terms (checked 27 Oct 2026)',
    ],
    sourceUrl: 'https://www.americanexpress.com/es-es/rewards/membership-rewards/terms',
    checkedAt: undefined,
  },
  {
    id: 'ba_club-iberia_club',
    from: 'ba_club',
    to: 'iberia_club',
    num: 1,
    den: 1,
    min: 1,
    increment: 1,
    status: 'active',
    verification: 'UNVERIFIED',
    maxDelayDays: 0,
    preconditions: [
      'Both accounts are in your name with matching personal details',
      'Both accounts are linked through the programme’s “combine Avios” feature, which has its own eligibility rules',
    ],
    sourceUrl: 'https://www.iberia.com/',
  },
  {
    id: 'amex_mr_es-flying_blue',
    from: 'amex_mr_es',
    to: 'flying_blue',
    num: 1,
    den: 1,
    min: 500,
    increment: 5,
    status: 'active',
    verification: 'ILLUSTRATIVE',
    maxDelayDays: 2,
    preconditions: ['Your Flying Blue account is in the same name as your Amex card account'],
  },
  {
    id: 'revolut_revpoints-iberia_club',
    from: 'revolut_revpoints',
    to: 'iberia_club',
    num: 1,
    den: 1,
    min: 1000,
    increment: 1000,
    status: 'active',
    verification: 'ILLUSTRATIVE',
    maxDelayDays: 3,
    preconditions: ['Your Revolut plan includes airline-partner transfers'],
  },
];

export const verificationLabel = (v: VerificationStatus) =>
  v === 'VERIFIED'
    ? 'Verified against the official source'
    : v === 'UNVERIFIED'
      ? `Unverified: ${CHECKED.toLowerCase()}`
      : 'Illustrative rule for the demo';
