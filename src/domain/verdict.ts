import Decimal from 'decimal.js';
import type { AwardInput, TripInput } from './profile';
import { daysBetween } from './flexDates';

export type Outcome =
  | 'BOOK_CASH_NOW'
  | 'AWARD_WORTH_CHECKING'
  | 'MONITOR_NO_TRANSFER'
  | 'ACCUMULATE_FROM_PLANNED_SPEND'
  | 'CASH_BETTER'
  | 'INSUFFICIENT_BY_DEADLINE'
  | 'TOO_UNCERTAIN';

export type Confidence = 'medium' | 'low' | 'insufficient';

/** Award seats are usually released about this many days before departure (programme estimate, not a guarantee). */
export const AWARD_RELEASE_DAYS = 355;
/** Default booking deadline before the earliest departure when the user gives none (assumption, shown in the UI). */
export const DEFAULT_DEADLINE_DAYS = 21;
/** Safety buffer before the deadline (AS-16). */
export const LSBD_BUFFER_DAYS = 3;

const addDays = (d: string, n: number) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};

export function lastSafeBookingDate(trip: Pick<TripInput, 'earliestDepart' | 'bookBy'>): string {
  const deadline =
    trip.bookBy && trip.bookBy < trip.earliestDepart
      ? trip.bookBy
      : addDays(trip.earliestDepart, -DEFAULT_DEADLINE_DAYS);
  return addDays(deadline, -LSBD_BUFFER_DAYS);
}

export type VerdictInput = {
  today: string;
  trip: TripInput;
  cashBestMinor: number | null;
  award: AwardInput | null;
  eurPerPoint: string;
  pointsUsableNow: number;
  pointsReady: 'now' | string | null;
  lowConfidenceReasons: string[];
  /** How the cash fare must be described: Duffel sandbox data or an example the user asked for. */
  fareLabel?: 'test data' | 'example fare';
};

export type Verdict = {
  outcome: Outcome;
  confidence: Confidence;
  lsbd: string;
  awardAvailability:
    'NOT_YET_SEARCHABLE' | 'UNKNOWN_AVAILABILITY' | 'USER_SAW_AVAILABLE' | 'NO_AWARD';
  awardEconomicMinor: number | null;
  shortfall: number;
  reasons: string[];
  fallback: string | null;
};

const eur = (minor: number) =>
  `€${(minor / 100).toLocaleString('en-IE', { maximumFractionDigits: 0 })}`;

export function decideVerdict(v: VerdictInput): Verdict {
  const lsbd = lastSafeBookingDate(v.trip);
  const reasons: string[] = [];
  const pastDeadline = v.today > lsbd;
  const awardAvailability: Verdict['awardAvailability'] = !v.award
    ? 'NO_AWARD'
    : daysBetween(v.today, v.trip.earliestDepart) > AWARD_RELEASE_DAYS
      ? 'NOT_YET_SEARCHABLE'
      : v.award.seenAvailable
        ? 'USER_SAW_AVAILABLE'
        : 'UNKNOWN_AVAILABILITY';
  const awardEconomicMinor = v.award
    ? Math.round(v.award.taxesEur * 100) +
      new Decimal(v.award.points)
        .mul(v.eurPerPoint)
        .mul(100)
        .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
        .toNumber()
    : null;
  const shortfall = v.award ? Math.max(0, v.award.points - v.pointsUsableNow) : 0;
  let confidence: Confidence = v.lowConfidenceReasons.length ? 'low' : 'medium';
  const done = (outcome: Outcome, fallback: string | null = null): Verdict => ({
    outcome,
    confidence: outcome === 'TOO_UNCERTAIN' ? 'insufficient' : confidence,
    lsbd,
    awardAvailability,
    awardEconomicMinor,
    shortfall,
    reasons,
    fallback,
  });

  if (v.cashBestMinor === null && !v.award) {
    reasons.push(
      'No cash price could be retrieved and no points price was entered, so there is nothing to compare.',
    );
    return done(
      'TOO_UNCERTAIN',
      'Try different dates or enter an award price you found on the programme’s site.',
    );
  }
  if (!v.award) {
    reasons.push(
      `Cheapest cash fare found: ${eur(v.cashBestMinor!)} (${v.fareLabel ?? 'test data'}). No points price to compare yet.`,
    );
    reasons.push(
      pastDeadline
        ? `Your booking deadline (${lsbd}) has passed.`
        : `Book by ${lsbd} to keep a safety margin before your deadline.`,
    );
    return done(
      'BOOK_CASH_NOW',
      'If you find an award on the programme’s site, enter it and we will compare.',
    );
  }
  if (v.cashBestMinor === null) {
    confidence = 'low';
    reasons.push('No cash price could be retrieved, so the award cannot be compared with cash.');
  } else {
    const awardWins =
      v.trip.objective === 'A_CASH_TODAY'
        ? Math.round(v.award.taxesEur * 100) < v.cashBestMinor
        : awardEconomicMinor! < v.cashBestMinor;
    if (!awardWins) {
      reasons.push(
        v.trip.objective === 'A_CASH_TODAY'
          ? `The award still needs ${eur(Math.round(v.award.taxesEur * 100))} in cash, not less than the ${eur(v.cashBestMinor)} fare.`
          : `The award costs about ${eur(awardEconomicMinor!)} once points are valued at €${v.eurPerPoint}, more than the ${eur(v.cashBestMinor)} cash fare.`,
      );
      return done('CASH_BETTER', 'Keep your points for a trip where they are worth more.');
    }
    reasons.push(
      `The award (${v.award.points.toLocaleString('en-IE')} points + ${eur(Math.round(v.award.taxesEur * 100))}) is worth about ${eur(awardEconomicMinor!)}, below the ${eur(v.cashBestMinor)} cash fare.`,
    );
  }

  if (shortfall === 0) {
    if (awardAvailability === 'NOT_YET_SEARCHABLE') {
      reasons.push(
        `Award seats for these dates are usually not released until about ${AWARD_RELEASE_DAYS} days before departure.`,
      );
      return done(
        'MONITOR_NO_TRANSFER',
        v.cashBestMinor !== null
          ? 'If no award seat appears before your deadline, book the cash fare.'
          : null,
      );
    }
    reasons.push('You already have enough usable points. The seat itself has not been confirmed.');
    return done(
      'AWARD_WORTH_CHECKING',
      v.cashBestMinor !== null
        ? 'If the seat is not available on the programme’s site, book the cash fare.'
        : null,
    );
  }

  reasons.push(`You need ${shortfall.toLocaleString('en-IE')} more points.`);
  if (v.pointsReady && v.pointsReady !== 'now' && v.pointsReady <= lsbd) {
    reasons.push(
      `Your already-planned spending should cover the gap by ${v.pointsReady}, before your safe booking date ${lsbd}.`,
    );
    return done(
      'ACCUMULATE_FROM_PLANNED_SPEND',
      v.cashBestMinor !== null
        ? `If the points have not posted by ${lsbd}, book the cash fare.`
        : null,
    );
  }
  reasons.push(
    v.pointsReady
      ? `Planned spending covers the gap only on ${v.pointsReady}, after your safe booking date ${lsbd}.`
      : 'Your planned spending does not cover the gap.',
  );
  return done(
    'INSUFFICIENT_BY_DEADLINE',
    v.cashBestMinor !== null
      ? 'Book the cash fare; do not buy points or spend extra to close the gap.'
      : 'Look for a cheaper award or different dates.',
  );
}
