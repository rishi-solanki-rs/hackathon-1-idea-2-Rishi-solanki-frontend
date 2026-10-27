import { airportByIata, programById, programUnit } from '@/fixtures/catalogue';
import { formatMoney, formatPoints, type Money } from '@/domain/money';

export const cityOf = (iata: string) => airportByIata(iata)?.city ?? iata;
export const airportLabel = (iata: string) => `${cityOf(iata)} (${iata})`;

/** Local time at the airport: provider times are already local. */
export const timeOf = (iso: string) => (iso.length >= 16 ? iso.slice(11, 16) : '');
export function dateOf(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(d);
}
export function dayOffset(depIso: string, arrIso: string) {
  const a = Date.parse(`${depIso.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${arrIso.slice(0, 10)}T00:00:00Z`);
  const n = Math.round((b - a) / 86_400_000);
  return n > 0 ? `+${n}` : '';
}
export const duration = (min: number) =>
  `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`;

export const eur = (m: Money, whole = false) => formatMoney(m, { whole });
export const pts = (n: number, program: string) => `${formatPoints(n)} ${programUnit(program)}`;
export const programName = (id: string) => programById(id)?.name ?? id;
