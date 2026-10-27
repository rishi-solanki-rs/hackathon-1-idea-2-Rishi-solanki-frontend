import { bookingAdvice, type BookingAdvice } from './bookingWindow';
import { allocate, type Allocation } from './cards';
import {
  dailyCards,
  suggestNewCards,
  type CardOption,
  type DailyCard,
  type NewCardSuggestion,
} from './newCards';
import { earningEvents, pointsNow, readyDate, type EarnEvent, type PointsNow } from './forecast';
import { decideVerdict, type Verdict } from './verdict';
import type { AwardInput, Profile, TripInput } from './profile';
import type { ProgramId, Provenance } from './types';
import type { TransferRoute } from './wallet';

export const PLAN_ENGINE_VERSION = 'plan-2026.10.27';

export type FlightQuote = {
  depart: string;
  ret?: string;
  totalMinor: number;
  carrier: string;
  stops: number;
  provenance: Provenance;
  offerRef?: string;
  expiresAt?: string;
};

export type FlightsSummary = {
  status: 'ok' | 'partial' | 'unavailable' | 'example';
  provider: 'duffel_test' | 'example';
  quotes: FlightQuote[];
  cheapest: FlightQuote | null;
  searched: number;
  failed: number;
  note: string;
};

export type Action = {
  id: string;
  kind: 'do' | 'verify' | 'dont' | 'deadline' | 'missing' | 'recalc' | 'fallback';
  when: string;
  title: string;
  detail?: string;
};

export type PlanResult = {
  engineVersion: string;
  today: string;
  trip: TripInput;
  target: ProgramId;
  valuation: { eurPerPoint: string; method: 'user' | 'reference' };
  award: AwardInput | null;
  pointsNow: PointsNow;
  allocation: Allocation;
  earnings: { dated: EarnEvent[]; undated: number };
  pointsReady: 'now' | string | null;
  verdict: Verdict;
  flights: FlightsSummary;
  comparison: {
    cashFareMinor: number | null;
    awardCashTodayMinor: number | null;
    awardEconomicMinor: number | null;
  };
  actions: Action[];
  missing: string[];
  assumptions: string[];
  confidenceReasons: string[];
  /** Points still missing at the safe booking date after planned spending; null without an award. */
  gapAfterPlan: number | null;
  dailyCards: DailyCard[];
  newCards: NewCardSuggestion[];
  booking: BookingAdvice;
};

export type PlanInputs = {
  today: string;
  trip: TripInput;
  profile: Profile;
  award: AwardInput | null;
  flights: FlightsSummary;
  routes: TransferRoute[];
  referenceEurPerPoint: string;
  programName: (id: ProgramId) => string;
  programWebsite: (id: ProgramId) => string | undefined;
  /** Great-circle distance origin → destination, for the booking window (short vs long haul). */
  distanceKm?: number | null;
  /** Cards the user could apply for (official terms only). */
  cardOptions?: CardOption[];
};

/** Programme the trip is measured in: the award's programme, else the airline programme the user holds most of. */
export function targetProgram(
  profile: Profile,
  award: AwardInput | null,
  airlinePrograms: ProgramId[],
): ProgramId {
  if (award) return award.program;
  const held = profile.balances
    .filter((b) => airlinePrograms.includes(b.program))
    .sort((a, b) => (b.points ?? b.min ?? 0) - (a.points ?? a.min ?? 0));
  return held[0]?.program ?? airlinePrograms[0];
}

export function computePlan(input: PlanInputs, airlinePrograms: ProgramId[]): PlanResult {
  const { today, trip, profile, award, flights, routes } = input;
  const target = targetProgram(profile, award, airlinePrograms);
  const userV = profile.valuations.find((v) => v.program === target);
  const valuation = userV
    ? { eurPerPoint: userV.eurPerPoint, method: 'user' as const }
    : { eurPerPoint: input.referenceEurPerPoint, method: 'reference' as const };

  const now = pointsNow(profile.balances, target, routes);
  const until =
    trip.bookBy && trip.bookBy < trip.earliestDepart ? trip.bookBy : trip.earliestDepart;
  const allocation = allocate(profile, target, routes, today, until);
  const earnings = earningEvents(allocation);
  const pointsReady = award
    ? readyDate(
        award.points,
        now.usable,
        earnings.dated,
        now.viaTransfer > 0 ? now.transferDelayDays : 0,
      )
    : null;

  const confidenceReasons: string[] = [];
  if (award?.source === 'ILLUSTRATIVE')
    confidenceReasons.push(
      'The award price is our rough estimate, not a price from the programme.',
    );
  if (now.unknownPrograms.length)
    confidenceReasons.push(
      `Unknown balance for ${now.unknownPrograms.map(input.programName).join(', ')}.`,
    );
  if (now.usedRangeMinimum)
    confidenceReasons.push('An approximate balance was counted at its lowest value.');
  if (allocation.missing.length) confidenceReasons.push('Some card terms are unknown.');
  if (flights.status === 'unavailable') confidenceReasons.push('No live test fare was available.');
  if (flights.status === 'example')
    confidenceReasons.push(
      'Cash fares are labelled examples you asked for, not Duffel test or real prices.',
    );
  if (earnings.undated > 0) confidenceReasons.push('Some points have no known posting date.');

  const cashFareMinor = flights.cheapest?.totalMinor ?? null;
  const verdict = decideVerdict({
    today,
    trip,
    cashBestMinor: cashFareMinor,
    fareLabel: flights.status === 'example' ? 'example fare' : 'test data',
    award,
    eurPerPoint: valuation.eurPerPoint,
    pointsUsableNow: now.usable,
    pointsReady,
    lowConfidenceReasons: confidenceReasons,
  });

  const missing = [...allocation.missing];
  if (profile.balances.length === 0 && !profile.noPoints)
    missing.push('Your loyalty points balances');
  if (profile.cards.length === 0 && !profile.noCards) missing.push('Which cards you hold');
  if (!award)
    missing.push(
      'An award price from the programme’s site (points + taxes), if you want to compare points',
    );
  for (const p of now.unknownPrograms) missing.push(`Your ${input.programName(p)} balance`);

  const assumptions = [
    `Points valued at €${valuation.eurPerPoint} each (${valuation.method === 'user' ? 'your value' : 'reference value, editable'}).`,
    trip.bookBy
      ? `Your booking deadline: ${trip.bookBy}.`
      : `Booking deadline assumed 21 days before your earliest departure.`,
    'A 3-day safety buffer is kept before the deadline.',
    'Monthly spending is counted on the 15th of each month until the deadline.',
    'Only necessary or committed purchases are counted; nothing extra is suggested.',
  ];

  const earnedByLsbd = earnings.dated
    .filter((e) => e.date <= verdict.lsbd)
    .reduce((s, e) => s + e.points, 0);
  const gapAfterPlan = award ? Math.max(0, verdict.shortfall - earnedByLsbd) : null;
  const newCards = suggestNewCards({
    today,
    needBy: verdict.lsbd,
    profile,
    target,
    routes,
    eurPerPoint: valuation.eurPerPoint,
    gap: gapAfterPlan,
    cashIsBetter: verdict.outcome === 'CASH_BETTER',
    candidates: input.cardOptions ?? [],
  });
  const booking = bookingAdvice({
    today,
    earliestDepart: trip.earliestDepart,
    latestDepart: trip.latestDepart,
    lsbd: verdict.lsbd,
    distanceKm: input.distanceKm ?? null,
    quotes: flights.quotes,
  });

  const result: Omit<PlanResult, 'actions'> = {
    gapAfterPlan,
    dailyCards: dailyCards(profile, target, routes),
    newCards,
    booking,
    engineVersion: PLAN_ENGINE_VERSION,
    today,
    trip,
    target,
    valuation,
    award,
    pointsNow: now,
    allocation,
    earnings,
    pointsReady,
    verdict,
    flights,
    comparison: {
      cashFareMinor,
      awardCashTodayMinor: award ? Math.round(award.taxesEur * 100) : null,
      awardEconomicMinor: verdict.awardEconomicMinor,
    },
    missing: [...new Set(missing)],
    assumptions,
    confidenceReasons,
  };
  return { ...result, actions: buildActions(result, input) };
}

export function buildActions(
  r: Omit<PlanResult, 'actions'>,
  input: Pick<PlanInputs, 'programName' | 'programWebsite'>,
): Action[] {
  const a: Action[] = [];
  const prog = input.programName(r.target);
  const v = r.verdict;
  const cheapest = r.flights.cheapest;
  const cashLine = cheapest
    ? `€${(cheapest.totalMinor / 100).toFixed(2)} on ${cheapest.depart}${cheapest.ret ? ` (return ${cheapest.ret})` : ''}`
    : null;
  const fareNote =
    r.flights.provider === 'example'
      ? 'This is an example fare, not a real or test price.'
      : 'Ours is Duffel test data.';

  switch (v.outcome) {
    case 'BOOK_CASH_NOW':
    case 'CASH_BETTER':
    case 'INSUFFICIENT_BY_DEADLINE':
      if (cashLine)
        a.push({
          id: 'book-cash',
          kind: 'do',
          when: `By ${v.lsbd}`,
          title: 'Book the cash fare',
          detail: `Cheapest found: ${cashLine}. Check the real price on the airline or an agent site. ${fareNote}`,
        });
      break;
    case 'AWARD_WORTH_CHECKING':
      a.push({
        id: 'check-seat',
        kind: 'verify',
        when: 'Now',
        title: `Find the award seat on ${prog}`,
        detail: input.programWebsite(r.target),
      });
      if (r.pointsNow.viaTransfer > 0 && r.pointsNow.direct < (r.award?.points ?? 0))
        a.push({
          id: 'transfer-after',
          kind: 'do',
          when: 'Only after the seat is confirmed',
          title: `Transfer the missing points to ${prog}`,
          detail: `Transfers can take up to ${r.pointsNow.transferDelayDays} days and usually cannot be reversed.`,
        });
      a.push({
        id: 'book-award',
        kind: 'do',
        when: `By ${v.lsbd}`,
        title: `Book the award on ${prog}`,
      });
      break;
    case 'MONITOR_NO_TRANSFER':
      a.push({
        id: 'monitor',
        kind: 'verify',
        when: 'When seats are released',
        title: `Check ${prog} for award seats`,
        detail: 'Seats for these dates are probably not bookable yet.',
      });
      break;
    case 'ACCUMULATE_FROM_PLANNED_SPEND':
      a.push({
        id: 'accumulate',
        kind: 'do',
        when: 'Now until the points post',
        title: 'Use the cards below for spending you already planned',
        detail: `The gap should close by ${r.pointsReady}.`,
      });
      a.push({
        id: 'check-later',
        kind: 'verify',
        when: `When the points post (${r.pointsReady})`,
        title: `Find the award seat on ${prog}, then book`,
      });
      break;
    case 'TOO_UNCERTAIN':
      break;
  }

  if (r.allocation.status === 'OK') {
    const byCard = new Map<string, { label: string; amount: number; points: number }[]>();
    for (const x of r.allocation.assignments) {
      if (!x.cardName || x.targetPoints <= 0) continue;
      const key = x.cardName;
      const list = byCard.get(key) ?? [];
      const existing = list.find((l) => l.label === x.unit.label);
      if (existing) {
        existing.amount += x.unit.amountEur;
        existing.points += x.targetPoints;
      } else list.push({ label: x.unit.label, amount: x.unit.amountEur, points: x.targetPoints });
      byCard.set(key, list);
    }
    for (const [card, items] of byCard)
      a.push({
        id: `card-${card}`,
        kind: 'do',
        when: 'For spending you already planned',
        title: `Pay with ${card}`,
        detail: items
          .map(
            (i) =>
              `${i.label} (€${i.amount.toFixed(0)} → ${i.points.toLocaleString('en-IE')} ${prog} points)`,
          )
          .join('; '),
      });
  } else if (r.allocation.status === 'BLOCKED_PAYMENT') {
    a.push({
      id: 'pay-in-full',
      kind: 'dont',
      when: 'Now',
      title: 'Do not use cards to earn points while you carry a balance',
      detail: 'Card interest costs more than the points are worth. Pay the balance off first.',
    });
  }

  const nc = r.newCards.find((c) => c.status === 'good_fit');
  if (nc)
    a.push({
      id: 'new-card',
      kind: 'verify',
      when: nc.applyBy ? `Optional, apply by ${nc.applyBy}` : 'Optional',
      title: `Consider the ${nc.name}`,
      detail: `${nc.reasons[0]} Approval is not guaranteed and this is not financial advice.`,
    });
  if (r.booking.timing === 'early')
    a.push({
      id: 'recheck-price',
      kind: 'deadline',
      when: `From ${r.booking.window.startDate}`,
      title: 'Check the fare again',
      detail: r.booking.label,
    });

  if (r.award && v.outcome !== 'CASH_BETTER')
    a.push({
      id: 'no-transfer',
      kind: 'dont',
      when: 'Until the seat is confirmed',
      title: 'Do not transfer points yet',
      detail: 'Award seats are not confirmed by A Una Milla. Transfers are usually irreversible.',
    });
  a.push({
    id: 'no-extra',
    kind: 'dont',
    when: 'Always',
    title: 'Do not spend extra or buy points to close a gap',
  });
  for (const m of r.missing.slice(0, 5))
    a.push({ id: `missing-${m}`, kind: 'missing', when: 'When you can', title: `Add: ${m}` });
  if (v.fallback)
    a.push({
      id: 'fallback',
      kind: 'fallback',
      when: 'If the plan does not work out',
      title: v.fallback,
    });
  a.push({
    id: 'recalc',
    kind: 'recalc',
    when: 'Whenever something changes',
    title: 'Recalculate this plan',
    detail: 'After a balance update, a new or cancelled purchase, a card change or new dates.',
  });
  return a;
}
