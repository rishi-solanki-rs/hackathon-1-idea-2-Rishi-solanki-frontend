import { eur, money } from '@/domain/money';
import type { Cabin, CostLine, FlightOption } from '@/domain/types';
import type { FlightProvider, Journey, ProviderQuery } from '../types';
import { distanceKm, hash, makeSlice, shiftDate } from './schedule';

const FIXTURE_TTL_MS = 30 * 60_000;

type CashSpec = {
  idSuffix: string;
  perAdultEur: number;
  carrier: number;
  stops: 0 | 1;
  dateShiftDays?: number;
  altOrigin?: string;
  positioning?: { label: string; perAdultEur: number };
  refund?: 'allowed' | 'not_allowed' | 'unknown';
  breakdown?: string;
};
type AwardSpec = {
  idSuffix: string;
  perAdultPoints: number;
  perAdultTaxesEur: number;
  program: string;
  cached?: boolean;
};
type Curated = { cash: CashSpec[]; award: AwardSpec[] };

/**
 * Curated scenarios reproduce the Phase 1 worked examples exactly (doc 02 §5, all ILLUSTRATIVE).
 * Key: origin-destination-trip-cabin.
 */
const CURATED: Record<string, (q: ProviderQuery) => Curated> = {
  'MAD-PEK-return-economy': (q) => ({
    cash: [
      {
        idSuffix: 'exact',
        perAdultEur: 780,
        carrier: 0,
        stops: 1,
        breakdown: 'Base fare €520 + taxes €260',
      },
      { idSuffix: 'exact-nonstop', perAdultEur: 845, carrier: 1, stops: 0 },
      ...(q.flexDays >= 2
        ? [{ idSuffix: 'plus2', perAdultEur: 702, carrier: 0, stops: 1 as const, dateShiftDays: 2 }]
        : []),
      ...(q.nearbyAirports
        ? [
            {
              idSuffix: 'bcn',
              perAdultEur: 735,
              carrier: 2,
              stops: 1 as const,
              altOrigin: 'BCN',
              positioning: { label: 'Train Madrid ↔ Barcelona (estimate)', perAdultEur: 60 },
            },
          ]
        : []),
    ],
    award: [
      {
        idSuffix: 'avios',
        perAdultPoints: 50_000,
        perAdultTaxesEur: 320,
        program: 'iberia_club',
        cached: true,
      },
    ],
  }),
  'MAD-SCL-one_way-business': () => ({
    cash: [
      { idSuffix: 'exact', perAdultEur: 2900, carrier: 0, stops: 0 },
      { idSuffix: 'exact-alt', perAdultEur: 3150, carrier: 1, stops: 1 },
    ],
    award: [
      { idSuffix: 'avios', perAdultPoints: 70_500, perAdultTaxesEur: 380, program: 'iberia_club' },
    ],
  }),
  'BCN-JFK-return-economy': () => ({
    cash: [
      { idSuffix: 'exact', perAdultEur: 620, carrier: 1, stops: 1 },
      { idSuffix: 'exact-nonstop', perAdultEur: 655, carrier: 0, stops: 0 },
    ],
    award: [
      { idSuffix: 'avios', perAdultPoints: 34_000, perAdultTaxesEur: 310, program: 'iberia_club' },
    ],
  }),
};

/** Curated multi-city scenario FX-MULTI-01 (CS-05). */
const CURATED_PLAN_KEY = 'MAD-PEK|PEK-PVG|PVG-MAD|economy';
const CURATED_PLAN = {
  legs: [
    { cash: 520, award: { points: 25_000, taxes: 160 } },
    { cash: 90, award: null },
    { cash: 540, award: { points: 25_000, taxes: 170 } },
  ],
  openJaw: { legIndexes: [0, 2], cash: 880 },
};

const NEARBY: Record<string, { iata: string; label: string; eur: number }[]> = {
  MAD: [{ iata: 'BCN', label: 'Train Madrid ↔ Barcelona (estimate)', eur: 60 }],
  BCN: [{ iata: 'VLC', label: 'Train Barcelona ↔ Valencia (estimate)', eur: 45 }],
  AGP: [{ iata: 'SVQ', label: 'Train Málaga ↔ Seville (estimate)', eur: 40 }],
  SVQ: [{ iata: 'AGP', label: 'Train Seville ↔ Málaga (estimate)', eur: 40 }],
  VLC: [{ iata: 'ALC', label: 'Train Valencia ↔ Alicante (estimate)', eur: 35 }],
  ALC: [{ iata: 'VLC', label: 'Train Alicante ↔ Valencia (estimate)', eur: 35 }],
};

const CABIN_FACTOR: Record<Cabin, number> = {
  economy: 1,
  premium_economy: 1.65,
  business: 3.4,
  first: 5.2,
};

function genericOneWayEur(from: string, to: string, cabin: Cabin, seed: string): number {
  const km = distanceKm(from, to);
  const base = 39 + km * 0.072;
  const wobble = 0.88 + (hash(seed) % 25) / 100;
  return Math.round(base * CABIN_FACTOR[cabin] * wobble);
}

/** Illustrative distance bands (not an official chart). */
export function illustrativeAwardPoints(from: string, to: string, cabin: Cabin): number {
  const km = distanceKm(from, to);
  const band =
    km < 1000
      ? 7_500
      : km < 2000
        ? 10_000
        : km < 4000
          ? 17_000
          : km < 6500
            ? 25_000
            : km < 9000
              ? 34_000
              : 42_500;
  const factor =
    cabin === 'business' ? 2.5 : cabin === 'premium_economy' ? 1.6 : cabin === 'first' ? 3.5 : 1;
  return Math.round((band * factor) / 500) * 500;
}

function illustrativeAwardTaxesEur(from: string, to: string, cabin: Cabin): number {
  const km = distanceKm(from, to);
  const base = km < 2000 ? 25 : km < 6500 ? 95 : 160;
  return Math.round(base * (cabin === 'business' || cabin === 'first' ? 1.4 : 1));
}

function cashOption(q: ProviderQuery, j: Journey, spec: CashSpec, key: string): FlightOption {
  const shift = spec.dateShiftDays ?? 0;
  const slices = j.slices.map((s, i) =>
    makeSlice(
      i === 0 && spec.altOrigin ? spec.altOrigin : s.origin,
      i === j.slices.length - 1 && j.slices.length > 1 && spec.altOrigin
        ? spec.altOrigin
        : s.destination,
      shiftDate(s.date, shift),
      `${key}:${spec.idSuffix}:${i}`,
      spec.carrier,
      spec.stops,
    ),
  );
  const lines: CostLine[] = [
    {
      code: 'fare',
      key: 'fare',
      label: `Fare incl. taxes and fees${spec.breakdown ? ` (${spec.breakdown})` : ''}${q.adults > 1 ? ` · ${q.adults} adults` : ''}`,
      amount: eur(spec.perAdultEur * q.adults),
      timing: 'today',
      provenance: 'FIXTURE_FLIGHT',
    },
  ];
  if (spec.positioning) {
    lines.push({
      code: 'positioning',
      key: 'positioning:train',
      label: spec.positioning.label,
      amount: eur(spec.positioning.perAdultEur * q.adults),
      timing: 'later',
      provenance: 'ESTIMATE',
    });
  }
  return {
    id: `fx-${key}-${spec.idSuffix}`,
    kind: 'cash',
    legIndexes: j.legIndexes,
    slices,
    cabin: q.cabin,
    costLines: lines,
    points: [],
    provenance: 'FIXTURE_FLIGHT',
    availability: 'TEST_OR_ILLUSTRATIVE',
    fetchedAt: q.now,
    expiresAt: new Date(Date.parse(q.now) + FIXTURE_TTL_MS).toISOString(),
    conditions: { refund: spec.refund ?? 'not_allowed', change: 'unknown' },
    variation:
      shift || spec.altOrigin
        ? {
            ...(shift ? { dateShiftDays: shift } : {}),
            ...(spec.altOrigin ? { altOrigin: spec.altOrigin } : {}),
          }
        : undefined,
    offerRef: `fixture:${key}:${spec.idSuffix}`,
    sourceLabel: 'Illustrative example fare (fixture data, not a real market price)',
  };
}

function awardOption(q: ProviderQuery, j: Journey, spec: AwardSpec, key: string): FlightOption {
  const slices = j.slices.map((s, i) =>
    makeSlice(s.origin, s.destination, s.date, `${key}:award:${i}`, 0, 1),
  );
  return {
    id: `fx-${key}-${spec.idSuffix}`,
    kind: 'award',
    legIndexes: j.legIndexes,
    slices,
    cabin: q.cabin,
    costLines: [
      {
        code: 'award_taxes',
        key: 'award_taxes',
        label: `Taxes and carrier charges on the award${q.adults > 1 ? ` · ${q.adults} adults` : ''}`,
        amount: money(spec.perAdultTaxesEur * 100 * q.adults),
        timing: 'today',
        provenance: 'FIXTURE_AWARD',
      },
    ],
    points: [{ program: spec.program, amount: spec.perAdultPoints * q.adults }],
    provenance: 'FIXTURE_AWARD',
    availability: spec.cached ? 'CACHED' : 'TEST_OR_ILLUSTRATIVE',
    fetchedAt: q.now,
    conditions: { refund: 'unknown', change: 'unknown' },
    sourceLabel: 'Illustrative award price (fixture data; seat availability not checked)',
  };
}

function journeyKey(q: ProviderQuery, j: Journey): string {
  const s = j.slices;
  const trip =
    s.length === 2 && s[0].origin === s[1].destination && s[0].destination === s[1].origin
      ? 'return'
      : s.length === 1
        ? 'one_way'
        : 'multi';
  return `${s[0].origin}-${s[0].destination}-${trip}-${q.cabin}`;
}

function genericCurated(q: ProviderQuery, j: Journey): Curated {
  const key = j.slices.map((s) => `${s.origin}${s.destination}${s.date}`).join('|') + q.cabin;
  const oneWayTotal = j.slices.reduce(
    (n, s, i) => n + genericOneWayEur(s.origin, s.destination, q.cabin, `${key}:${i}`),
    0,
  );
  const returnFactor = j.slices.length === 2 ? 0.86 : 1;
  const base = Math.round(oneWayTotal * returnFactor);
  const cash: CashSpec[] = [
    { idSuffix: 'exact', perAdultEur: base, carrier: hash(key) % 4, stops: 0 },
    {
      idSuffix: 'exact-1stop',
      perAdultEur: Math.round(base * 0.91),
      carrier: (hash(key) + 1) % 4,
      stops: 1,
    },
    {
      idSuffix: 'exact-alt',
      perAdultEur: Math.round(base * 1.14),
      carrier: (hash(key) + 2) % 4,
      stops: 0,
    },
  ];
  if (q.mode === 'quick' && q.flexDays > 0) {
    for (const d of [-q.flexDays, q.flexDays]) {
      const f = 0.84 + (hash(`${key}:shift:${d}`) % 22) / 100;
      cash.push({
        idSuffix: `shift${d > 0 ? 'p' : 'm'}${Math.abs(d)}`,
        perAdultEur: Math.round(base * 0.91 * f),
        carrier: 0,
        stops: 1,
        dateShiftDays: d,
      });
    }
  }
  if (q.mode === 'quick' && q.nearbyAirports) {
    for (const n of NEARBY[j.slices[0].origin] ?? []) {
      cash.push({
        idSuffix: `alt-${n.iata.toLowerCase()}`,
        perAdultEur: Math.round(base * (0.82 + (hash(`${key}:${n.iata}`) % 12) / 100)),
        carrier: 3,
        stops: 1,
        altOrigin: n.iata,
        positioning: { label: n.label, perAdultEur: n.eur },
      });
    }
  }
  const points = j.slices.reduce(
    (n, s) => n + illustrativeAwardPoints(s.origin, s.destination, q.cabin),
    0,
  );
  const taxes = j.slices.reduce(
    (n, s) => n + illustrativeAwardTaxesEur(s.origin, s.destination, q.cabin),
    0,
  );
  return {
    cash,
    award: [
      {
        idSuffix: 'avios',
        perAdultPoints: points,
        perAdultTaxesEur: taxes,
        program: 'iberia_club',
      },
    ],
  };
}

function planCurated(q: ProviderQuery): FlightOption[] | null {
  const single = q.journeys.filter((j) => j.legIndexes.length === 1);
  const key =
    single.map((j) => `${j.slices[0].origin}-${j.slices[0].destination}`).join('|') + `|${q.cabin}`;
  if (key !== CURATED_PLAN_KEY) return null;
  const out: FlightOption[] = [];
  single.forEach((j, i) => {
    const leg = CURATED_PLAN.legs[i];
    const k = `plan-l${i + 1}`;
    out.push(
      cashOption(q, j, { idSuffix: 'cash', perAdultEur: leg.cash, carrier: i, stops: 0 }, k),
    );
    if (leg.award)
      out.push(
        awardOption(
          q,
          j,
          {
            idSuffix: 'avios',
            perAdultPoints: leg.award.points,
            perAdultTaxesEur: leg.award.taxes,
            program: 'iberia_club',
          },
          k,
        ),
      );
  });
  const oj = CURATED_PLAN.openJaw;
  const ojJourney: Journey = {
    legIndexes: oj.legIndexes,
    slices: oj.legIndexes.map((i) => single[i].slices[0]),
  };
  out.push(
    cashOption(
      q,
      ojJourney,
      { idSuffix: 'cash', perAdultEur: oj.cash, carrier: 1, stops: 0 },
      'plan-openjaw',
    ),
  );
  return out;
}

function search(q: ProviderQuery, kind: 'cash' | 'award'): FlightOption[] {
  if (q.mode === 'plan') {
    const curated = planCurated(q);
    if (curated) return curated.filter((o) => o.kind === kind);
  }
  const out: FlightOption[] = [];
  for (const j of q.journeys) {
    const key = journeyKey(q, j);
    const spec = CURATED[key]?.(q) ?? genericCurated(q, j);
    const k = q.mode === 'plan' ? `${key}-l${j.legIndexes.join('')}` : key;
    if (kind === 'cash') {
      const specs =
        q.mode === 'plan' && j.legIndexes.length > 1
          ? [
              {
                ...spec.cash[0],
                idSuffix: 'multi',
                perAdultEur: Math.round(spec.cash[0].perAdultEur * 0.93),
              },
            ]
          : spec.cash;
      for (const c of specs) out.push(cashOption(q, j, c, k));
    } else if (j.legIndexes.length === 1) {
      for (const a of spec.award) out.push(awardOption(q, j, a, k));
    }
  }
  return out;
}

export const fixtureCashProvider: FlightProvider = {
  id: 'fixture-cash',
  kind: 'cash',
  async search(q) {
    return search(q, 'cash');
  },
};

export const fixtureAwardProvider: FlightProvider = {
  id: 'fixture-award',
  kind: 'award',
  async search(q) {
    return search(q, 'award');
  },
};
