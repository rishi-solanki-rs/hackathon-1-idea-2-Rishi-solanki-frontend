import { TZDate } from '@date-fns/tz';
import { airportByIata } from '@/fixtures/catalogue';
import type { Segment, Slice } from '@/domain/types';

export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function distanceKm(a: string, b: string): number {
  const A = airportByIata(a);
  const B = airportByIata(b);
  if (!A || !B) return 1500;
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(B.lat - A.lat);
  const dLon = rad(B.lon - A.lon);
  const x =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(A.lat)) * Math.cos(rad(B.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(x)));
}

export const FICTIONAL_CARRIERS = [
  { name: 'Meseta Air', code: 'MSA' },
  { name: 'Atlántica Airways', code: 'ATX' },
  { name: 'Brisa Air', code: 'BRZ' },
  { name: 'Sierra Connect', code: 'SRC' },
];

export function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Builds a deterministic slice with local times in each airport's time zone. */
export function makeSlice(
  from: string,
  to: string,
  date: string,
  seed: string,
  carrierIndex: number,
  stops: 0 | 1,
): Slice {
  const tzFrom = airportByIata(from)?.tz ?? 'Europe/Madrid';
  const tzTo = airportByIata(to)?.tz ?? 'Europe/Madrid';
  const km = distanceKm(from, to);
  const h = hash(seed);
  const depMinutes = 6 * 60 + (h % (16 * 12)) * 5;
  const flyMin = Math.round(km / 13.5 + 35);
  const layover = stops ? 75 + (h % 6) * 15 : 0;
  const durationMin = flyMin + layover;
  const [y, m, d] = date.split('-').map(Number);
  const dep = new TZDate(y, m - 1, d, Math.floor(depMinutes / 60), depMinutes % 60, tzFrom);
  const arrUtc = new Date(dep.getTime() + durationMin * 60_000);
  const arr = new TZDate(arrUtc.getTime(), tzTo);
  const carrier = FICTIONAL_CARRIERS[carrierIndex % FICTIONAL_CARRIERS.length];
  const num = 100 + (h % 800);

  const segments: Segment[] = [];
  if (!stops) {
    segments.push({
      from,
      to,
      departAt: dep.toISOString(),
      arriveAt: arr.toISOString(),
      carrier: carrier.name,
      flightNumber: `${carrier.code} ${num}`,
      durationMin,
    });
  } else {
    const hub = from === 'LIS' || to === 'LIS' ? 'CDG' : 'LIS';
    const firstMin = Math.round(flyMin * 0.35);
    const mid1 = new Date(dep.getTime() + firstMin * 60_000);
    const mid2 = new Date(mid1.getTime() + layover * 60_000);
    const tzHub = airportByIata(hub)?.tz ?? 'Europe/Lisbon';
    segments.push(
      {
        from,
        to: hub,
        departAt: dep.toISOString(),
        arriveAt: new TZDate(mid1.getTime(), tzHub).toISOString(),
        carrier: carrier.name,
        flightNumber: `${carrier.code} ${num}`,
        durationMin: firstMin,
      },
      {
        from: hub,
        to,
        departAt: new TZDate(mid2.getTime(), tzHub).toISOString(),
        arriveAt: arr.toISOString(),
        carrier: carrier.name,
        flightNumber: `${carrier.code} ${num + 1}`,
        durationMin: flyMin - firstMin,
      },
    );
  }
  return {
    from,
    to,
    departAt: dep.toISOString(),
    arriveAt: arr.toISOString(),
    durationMin,
    segments,
  };
}
