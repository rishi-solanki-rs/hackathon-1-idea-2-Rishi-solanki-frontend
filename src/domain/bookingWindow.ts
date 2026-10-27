import { daysBetween } from './flexDates';
import { fmtDate } from './fmt';
import type { FlightQuote } from './plan';

export const BOOKING_GUIDANCE_LABEL =
  'General guidance from common airline pricing patterns, not a price forecast.';

export type PeakPeriod = { name: string; from: string; to: string };

const addDays = (d: string, n: number) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};

/** Gregorian Easter Sunday (anonymous algorithm). */
export function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Busy travel periods in Spain, when flights out of Spain usually cost more and sell out earlier. */
export function spainPeaks(year: number): PeakPeriod[] {
  const easter = easterSunday(year);
  return [
    { name: 'Christmas and Reyes', from: `${year - 1}-12-20`, to: `${year}-01-07` },
    { name: 'Semana Santa (Easter week)', from: addDays(easter, -7), to: addDays(easter, 1) },
    { name: 'Puente de mayo (1 May)', from: `${year}-04-29`, to: `${year}-05-03` },
    { name: 'Summer holidays (July and August)', from: `${year}-07-01`, to: `${year}-08-31` },
    { name: 'Puente del Pilar (12 October)', from: `${year}-10-09`, to: `${year}-10-13` },
    { name: 'Todos los Santos (1 November)', from: `${year}-10-30`, to: `${year}-11-02` },
    { name: 'Puente de diciembre (6 and 8 December)', from: `${year}-12-04`, to: `${year}-12-09` },
    { name: 'Christmas and Reyes', from: `${year}-12-20`, to: `${year + 1}-01-07` },
  ];
}

export function peaksOverlapping(from: string, to: string): PeakPeriod[] {
  const years = new Set([Number(from.slice(0, 4)), Number(to.slice(0, 4))]);
  const seen = new Set<string>();
  return [...years]
    .flatMap(spainPeaks)
    .filter((p) => p.from <= to && p.to >= from)
    .filter((p) =>
      seen.has(`${p.name}${p.from}`) ? false : (seen.add(`${p.name}${p.from}`), true),
    );
}

/** Great-circle distance in km. */
export function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)));
}

/** Rule-of-thumb booking windows in days before departure. */
export const WINDOWS = {
  short: { normal: [21, 60], peak: [45, 90] },
  long: { normal: [60, 180], peak: [90, 240] },
} as const;
export const LONG_HAUL_KM = 3000;

export type CalendarDay = {
  depart: string;
  ret?: string;
  totalMinor: number;
  vsCheapestMinor: number;
};

export type BookingAdvice = {
  daysToDeparture: number;
  haul: 'short' | 'long' | 'unknown';
  peaks: PeakPeriod[];
  window: { fromDays: number; toDays: number; startDate: string; endDate: string };
  timing: 'book_now' | 'good_time' | 'early';
  headline: string;
  detail: string;
  calendar: CalendarDay[];
  /** Difference between the dearest and the cheapest date we priced. */
  spreadMinor: number | null;
  label: string;
};

const eur = (minor: number) => `€${Math.round(minor / 100).toLocaleString('en-IE')}`;

export function bookingAdvice(input: {
  today: string;
  earliestDepart: string;
  latestDepart: string;
  /** Last safe booking date from the verdict. */
  lsbd: string;
  distanceKm: number | null;
  quotes: FlightQuote[];
}): BookingAdvice {
  const { today, earliestDepart, lsbd } = input;
  const daysToDeparture = daysBetween(today, earliestDepart);
  const haul =
    input.distanceKm === null ? 'unknown' : input.distanceKm >= LONG_HAUL_KM ? 'long' : 'short';
  const peaks = peaksOverlapping(earliestDepart, input.latestDepart || earliestDepart);
  const [minDays, maxDays] =
    WINDOWS[haul === 'long' ? 'long' : 'short'][peaks.length ? 'peak' : 'normal'];
  const window = {
    fromDays: minDays,
    toDays: maxDays,
    startDate: addDays(earliestDepart, -maxDays),
    endDate: addDays(earliestDepart, -minDays),
  };

  const sorted = [...input.quotes].sort(
    (a, b) => a.depart.localeCompare(b.depart) || (a.ret ?? '').localeCompare(b.ret ?? ''),
  );
  const min = sorted.length ? Math.min(...sorted.map((q) => q.totalMinor)) : null;
  const max = sorted.length ? Math.max(...sorted.map((q) => q.totalMinor)) : null;
  const calendar = sorted.map((q) => ({
    depart: q.depart,
    ret: q.ret,
    totalMinor: q.totalMinor,
    vsCheapestMinor: q.totalMinor - (min ?? q.totalMinor),
  }));
  const spreadMinor = min !== null && max !== null && sorted.length > 1 ? max - min : null;

  const peakText = peaks.length
    ? ` Your dates fall in ${peaks.map((p) => p.name).join(' and ')}, a busy time in Spain, so popular flights fill up earlier.`
    : '';
  const spreadText = spreadMinor
    ? ` Across the dates we priced, the fare changes by up to ${eur(spreadMinor)}, so the day you fly matters more than the day you book.`
    : '';
  const daysToLsbd = daysBetween(today, lsbd);

  let timing: BookingAdvice['timing'];
  let headline: string;
  let detail: string;
  if (daysToLsbd <= 7 || daysToDeparture <= window.fromDays) {
    timing = 'book_now';
    headline = daysToLsbd <= 7 ? 'Book soon: your deadline is close' : 'Book soon';
    detail = `Departure is ${daysToDeparture} days away. In the last weeks fares usually go up rather than down.${peakText}${spreadText}`;
  } else if (daysToDeparture <= window.toDays) {
    timing = 'good_time';
    headline = 'Now is usually a good time to book';
    detail = `For a ${haul === 'long' ? 'long-haul' : 'short-haul'} trip, ${window.fromDays}–${window.toDays} days ahead is the usual sweet spot. Waiting rarely makes it much cheaper.${peakText}${spreadText}`;
  } else {
    timing = 'early';
    headline = `You are early: check again from ${fmtDate(window.startDate)}`;
    detail = `Fares often stay similar until about ${window.toDays} days before departure. No need to rush into a non-refundable fare; recalculate around ${fmtDate(window.startDate)} and book by ${fmtDate(lsbd)}.${peakText}${spreadText}`;
  }
  return {
    daysToDeparture,
    haul,
    peaks,
    window,
    timing,
    headline,
    detail,
    calendar,
    spreadMinor,
    label: BOOKING_GUIDANCE_LABEL,
  };
}

export type PriceSnapshot = { at: string; cheapestMinor: number };
export type PriceTrend = {
  direction: 'new' | 'down' | 'up' | 'same';
  previous: PriceSnapshot | null;
  changeMinor: number;
};

/** Compares the current cheapest fare with the last saved check of the same trip. */
export function priceTrend(history: PriceSnapshot[], currentMinor: number | null): PriceTrend {
  const previous = [...history].sort((a, b) => b.at.localeCompare(a.at))[0] ?? null;
  if (!previous || currentMinor === null) return { direction: 'new', previous, changeMinor: 0 };
  const changeMinor = currentMinor - previous.cheapestMinor;
  const direction = Math.abs(changeMinor) < 100 ? 'same' : changeMinor < 0 ? 'down' : 'up';
  return { direction, previous, changeMinor };
}
