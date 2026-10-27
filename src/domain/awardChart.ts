import type { Cabin, ProgramId } from './types';

/**
 * Official Iberia Club award chart (Avios per one-way, per passenger), for direct flights operated by the
 * Iberia Group. Source: https://www.iberia.com/es/iberiaplus/partners/vuelos/iberia/ (read 27 Oct 2026).
 * Bands 1-4 have no Premium Economy. Iberia sells no First class.
 */
export const IBERIA_CHART_SOURCE = 'https://www.iberia.com/es/iberiaplus/partners/vuelos/iberia/';
export const IBERIA_CHART_CHECKED = '2026-10-27';

type Row = { maxMiles: number; economy: number; premium: number | null; business: number };
const OFF_PEAK: Row[] = [
  { maxMiles: 650, economy: 3500, premium: null, business: 9750 },
  { maxMiles: 1150, economy: 6500, premium: null, business: 16500 },
  { maxMiles: 2000, economy: 9500, premium: null, business: 22000 },
  { maxMiles: 3000, economy: 10500, premium: null, business: 23000 },
  { maxMiles: 4000, economy: 16000, premium: 29500, business: 40500 },
  { maxMiles: 5500, economy: 20000, premium: 36750, business: 50500 },
  { maxMiles: 6500, economy: 24000, premium: 44000, business: 60500 },
  { maxMiles: 7000, economy: 28250, premium: 51000, business: 70500 },
  { maxMiles: Infinity, economy: 41000, premium: 71000, business: 97000 },
];
const PEAK: Row[] = [
  { maxMiles: 650, economy: 4750, premium: null, business: 11500 },
  { maxMiles: 1150, economy: 8000, premium: null, business: 18250 },
  { maxMiles: 2000, economy: 10750, premium: null, business: 24000 },
  { maxMiles: 3000, economy: 12000, premium: null, business: 31000 },
  { maxMiles: 4000, economy: 19500, premium: 40250, business: 59000 },
  { maxMiles: 5500, economy: 24250, premium: 50500, business: 74000 },
  { maxMiles: 6500, economy: 29250, premium: 60500, business: 88500 },
  { maxMiles: 7000, economy: 34250, premium: 70500, business: 103500 },
  { maxMiles: Infinity, economy: 49250, premium: 97000, business: 140000 },
];

export type AwardEstimate = {
  program: ProgramId;
  /** Peak price (the conservative end) for all travellers and legs. */
  points: number;
  offPeakPoints: number;
  band: number;
  miles: number;
};

export type EstimateResult = { ok: true; estimate: AwardEstimate } | { ok: false; reason: string };

const pick = (row: Row, cabin: Cabin) =>
  cabin === 'economy'
    ? row.economy
    : cabin === 'premium_economy'
      ? row.premium
      : cabin === 'business'
        ? row.business
        : null;

/** Award price from a verified chart only. Anything else (other programmes, First, missing cabins) is "no estimate". */
export function estimateAwardPoints(x: {
  program: ProgramId;
  distanceKm: number | null;
  cabin: Cabin;
  legs: number;
  adults: number;
}): EstimateResult {
  if (x.program !== 'iberia_club')
    return {
      ok: false,
      reason:
        'We only have a verified award chart for Iberia Club, so no estimate for this programme.',
    };
  if (x.distanceKm === null)
    return { ok: false, reason: 'Unknown route distance, so no award estimate.' };
  if (x.cabin === 'first')
    return {
      ok: false,
      reason: 'Iberia sells no First class, so there is no award estimate for it.',
    };
  const miles = Math.round(x.distanceKm / 1.609344);
  const band = OFF_PEAK.findIndex((r) => miles <= r.maxMiles);
  const off = pick(OFF_PEAK[band]!, x.cabin);
  const peak = pick(PEAK[band]!, x.cabin);
  if (off === null || peak === null)
    return {
      ok: false,
      reason: 'Iberia has no Premium Economy award on routes this short, so no estimate.',
    };
  const n = x.legs * x.adults;
  return {
    ok: true,
    estimate: {
      program: x.program,
      points: peak * n,
      offPeakPoints: off * n,
      band: band + 1,
      miles,
    },
  };
}
