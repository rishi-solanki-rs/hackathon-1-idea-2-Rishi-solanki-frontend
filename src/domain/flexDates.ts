import type { TripInput } from './profile';

export const MAX_DATE_SEARCHES = 7;
export const MAX_RANGE_DAYS = 60;

const addDays = (d: string, n: number) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
export const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

export type DatePair = { depart: string; ret?: string };

/**
 * Spreads at most MAX_DATE_SEARCHES searches evenly over the departure range (endpoints included).
 * For return trips it alternates the shortest and longest stay so both ends of the stay range are priced.
 */
export function sampleDates(
  trip: Pick<TripInput, 'tripType' | 'earliestDepart' | 'latestDepart' | 'minNights' | 'maxNights'>,
  max = MAX_DATE_SEARCHES,
): DatePair[] {
  const span = Math.max(
    0,
    Math.min(MAX_RANGE_DAYS, daysBetween(trip.earliestDepart, trip.latestDepart)),
  );
  const n = Math.min(max, span + 1);
  const departs: string[] = [];
  for (let i = 0; i < n; i++) {
    const offset = n === 1 ? 0 : Math.round((i * span) / (n - 1));
    const d = addDays(trip.earliestDepart, offset);
    if (!departs.includes(d)) departs.push(d);
  }
  if (trip.tripType === 'one_way') return departs.map((depart) => ({ depart }));
  const minN = Math.max(1, trip.minNights ?? 7);
  const maxN = Math.max(minN, trip.maxNights ?? minN);
  return departs.map((depart, i) => ({
    depart,
    ret: addDays(depart, i % 2 === 0 || minN === maxN ? minN : maxN),
  }));
}
