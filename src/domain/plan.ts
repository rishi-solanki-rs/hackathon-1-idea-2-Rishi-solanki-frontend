import { bookingAdvice, type BookingAdvice } from './bookingWindow';
import { fmtDate, fmtEur } from './fmt';
import { allocate, ASSUMED_POSTING_DAYS, type Allocation } from './cards';
import {
  dailyCards,
  suggestNewCards,
  type CardOption,
  type DailyCard,
  type NewCardSuggestion,
} from './newCards';
import { earningEvents, pointsNow, readyDate, type EarnEvent, type PointsNow } from './forecast';
import { decideVerdict, lastSafeBookingDate, type Verdict } from './verdict';
import type { AwardInput, Profile, TripInput } from './profile';
import type { ProgramId, Provenance } from './types';
import type { TransferRoute } from './wallet';

export const PLAN_ENGINE_VERSION = 'plan-2026.10.27';

export type FlightQuote = {
  depart: string;
  ret?: string;
  totalMinor: number;
  carrier: string;
  operatingCarrier?: string;
  cabin?: string;
  sandboxAirline?: boolean;
  stops: number;
  provenance: Provenance;
  offerRef?: string;
  expiresAt?: string;
  slices?: {
    from: string;
    to: string;
    departAt: string;
    arriveAt: string;
    durationMin: number;
    flightNumber?: string;
    stops: number;
  }[];
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
  affordability: Affordability;
  dailyCards: DailyCard[];
  newCards: NewCardSuggestion[];
  booking: BookingAdvice;
  /** Three-line deterministic summary of the plan: have/need/gap, decision, and single next action. */
  summary: {
    haveNeedGap: string;
    decision: string;
    nextAction: string;
  };
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
  /** How the award estimate was made, or why there is none. */
  awardNote?: string | null;
  /** Programme the user chose to measure the trip in. */
  preferredProgram?: ProgramId;
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

export type Affordability = {
  status: 'ok' | 'short' | 'unknown';
  /** Cash left after paying the cash fare. */
  remainingEur: number | null;
  reserveEur: number | null;
  message: string;
};

const addDays = (d: string, n: number) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
const euro = (n: number) => `€${Math.round(n).toLocaleString('en-IE')}`;

/** Budget minus the fare must leave at least the reserve. Missing inputs are reported, never assumed. */
export function checkAffordability(
  profile: Profile,
  cashFareMinor: number | null,
  award: AwardInput | null,
): Affordability {
  const budget = profile.finance.tripBudgetEur ?? null;
  const reserve = profile.finance.cashReserveEur ?? null;
  if (cashFareMinor === null)
    return {
      status: 'unknown',
      remainingEur: null,
      reserveEur: reserve,
      message: 'No cash fare yet, so affordability cannot be checked.',
    };
  if (budget === null || reserve === null)
    return {
      status: 'unknown',
      remainingEur: budget === null ? null : budget - cashFareMinor / 100,
      reserveEur: reserve,
      message:
        budget === null
          ? 'Add your trip budget to check if the cash fare is affordable.'
          : 'Add the cash you want to keep in reserve to check affordability.',
    };
  const remaining = Math.round((budget - cashFareMinor / 100) * 100) / 100;
  const awardNote = award
    ? ` With points you would pay about ${euro(award.taxesEur)} in taxes instead.`
    : '';
  return remaining >= reserve
    ? {
        status: 'ok',
        remainingEur: remaining,
        reserveEur: reserve,
        message: `Paying cash leaves ${euro(remaining)}, above your ${euro(reserve)} reserve.`,
      }
    : {
        status: 'short',
        remainingEur: remaining,
        reserveEur: reserve,
        message: `Paying cash would leave ${euro(remaining)}, below your ${euro(reserve)} reserve.${awardNote}`,
      };
}

/** "Use for everyday spending" taken from the cap-aware allocation, so both sections always agree. */
export function dailyCardsFromAllocation(
  profile: Profile,
  a: Allocation,
  target: ProgramId,
  routes: TransferRoute[],
): DailyCard[] {
  const fallback = dailyCards(profile, target, routes);
  return profile.monthly
    .filter((m) => m.amountEur > 0)
    .map((m) => {
      const units = a.assignments.filter((x) => x.unit.sourceId === m.id);
      if (!units.length) return fallback.find((d) => d.spendId === m.id)!;
      const first = units[0]!;
      const monthly = Math.round(units.reduce((n, x) => n + x.targetPoints, 0) / units.length);
      const today = fallback.find((d) => d.spendId === m.id);
      const currentMonthly = today ? today.pointsPerEuro * m.amountEur - today.gainPerMonth : 0;
      return {
        spendId: m.id,
        label: m.label,
        category: m.category,
        amountEur: m.amountEur,
        cardId: first.cardId,
        cardName: first.cardName,
        pointsPerEuro: Math.round((monthly / m.amountEur) * 1000) / 1000,
        gainPerMonth: Math.max(0, Math.round(monthly - currentMonthly)),
      };
    })
    .filter(Boolean);
}

export function computePlan(input: PlanInputs, airlinePrograms: ProgramId[]): PlanResult {
  const { today, trip, profile, award, flights, routes } = input;
  const target =
    award?.program ?? input.preferredProgram ?? targetProgram(profile, award, airlinePrograms);
  const userV = profile.valuations.find((v) => v.program === target);
  const valuation = userV
    ? { eurPerPoint: userV.eurPerPoint, method: 'user' as const }
    : { eurPerPoint: input.referenceEurPerPoint, method: 'reference' as const };

  // Illustrative transfer routes are never counted; unverified ones are counted but flagged.
  const usableRoutes = routes.filter((r) => r.verification !== 'ILLUSTRATIVE');
  const lsbd = lastSafeBookingDate(trip);
  const now = pointsNow(profile.balances, target, usableRoutes, lsbd);
  // Points are only useful if they are in the account by the safe booking date.
  const allocation = allocate(profile, target, usableRoutes, today, lsbd);
  const heldRaw: Record<ProgramId, number> = {};
  for (const b of profile.balances)
    if (b.program !== target && !(b.expiresOn && b.expiresOn < lsbd))
      heldRaw[b.program] =
        (heldRaw[b.program] ?? 0) +
        Math.max(
          0,
          (b.kind === 'exact' ? (b.points ?? 0) : b.kind === 'range' ? (b.min ?? 0) : 0) -
            (b.reserved ?? 0),
        );
  const earnings = earningEvents(allocation, { target, routes: usableRoutes, heldRaw });
  // Points already held in another programme become usable after the transfer delay.
  const events = [
    ...(now.viaTransfer > 0
      ? [
          {
            date: addDays(today, now.transferDelayDays),
            points: now.viaTransfer,
            label: 'Transfer of points you hold',
          },
        ]
      : []),
    ...earnings.dated,
  ].sort((x, y) => x.date.localeCompare(y.date));
  const pointsReady = award ? readyDate(award.points, now.direct, events) : null;

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
  for (const e of now.expired)
    confidenceReasons.push(
      `${e.points.toLocaleString('en-IE')} ${input.programName(e.program)} points expire on ${fmtDate(e.expiresOn)}, before your safe booking date, so they are not counted.`,
    );
  const held = new Set(profile.balances.map((b) => b.program));
  for (const r of routes)
    if (r.to === target && held.has(r.from) && r.verification === 'ILLUSTRATIVE')
      confidenceReasons.push(
        `Transfers from ${input.programName(r.from)} are not counted: that route is illustrative, not checked.`,
      );
  if (
    now.viaTransfer > 0 &&
    usableRoutes.some((r) => r.to === target && held.has(r.from) && r.verification === 'UNVERIFIED')
  )
    confidenceReasons.push(
      'A transfer route used for your points is not confirmed on an official page.',
    );
  if (allocation.missing.length) confidenceReasons.push('Some card terms are unknown.');
  if (allocation.approximate)
    confidenceReasons.push(
      'Many purchases: the card plan is approximate (a fast method was used).',
    );
  if (allocation.assignments.some((x) => x.postingAssumed && x.targetPoints > 0))
    confidenceReasons.push(
      `When points appear is assumed (${ASSUMED_POSTING_DAYS} days after each purchase) for cards whose rule is unknown.`,
    );
  if (allocation.assignments.some((x) => x.refundable && x.targetPoints > 0))
    confidenceReasons.push(
      'Some planned purchases are refundable: their points can be clawed back if refunded.',
    );
  for (const c of profile.cards) {
    const cat = input.cardOptions?.find((o) => o.id === c.catalogueId);
    for (const r of c.earn) {
      const off = cat?.earn.find((er) => er.category === r.category);
      if (
        off &&
        off.pointsPerEuro.value !== null &&
        r.pointsPerEuro.value !== null &&
        Math.abs(r.pointsPerEuro.value - off.pointsPerEuro.value) > 1e-4
      ) {
        confidenceReasons.push(
          `The earn rate for ${c.name} (${Number(r.pointsPerEuro.value.toFixed(3))} per €1) differs from the official rate (${Number(off.pointsPerEuro.value.toFixed(3))} per €1).`,
        );
      }
      if (
        r.pointsPerEuro.value !== null &&
        ((r.category === 'all' && r.pointsPerEuro.value > 3) || r.pointsPerEuro.value > 5)
      ) {
        confidenceReasons.push(
          `An unusually high earn rate (${Number(r.pointsPerEuro.value.toFixed(2))} per €1) was entered for ${c.name}.`,
        );
      }
    }
  }
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
      input.awardNote ??
        'An award price from the programme’s site (points + taxes), if you want to compare points',
    );
  for (const p of now.unknownPrograms) missing.push(`Your ${input.programName(p)} balance`);

  const assumptions = [
    `Points valued at €${valuation.eurPerPoint} each (${valuation.method === 'user' ? 'your value' : 'reference value, editable'}).`,
    trip.bookBy
      ? `Your booking deadline: ${fmtDate(trip.bookBy)}.`
      : `Booking deadline assumed 21 days before your earliest departure.`,
    'A 3-day safety buffer is kept before the deadline.',
    'Monthly spending is counted on the 15th of each month until the deadline.',
    'Only necessary or committed purchases are counted; nothing extra is suggested.',
    ...(award && input.awardNote ? [input.awardNote] : []),
  ];

  const earnedByLsbd = events
    .filter((e) => e.date <= verdict.lsbd)
    .reduce((s, e) => s + e.points, 0);
  const gapAfterPlan = award ? Math.max(0, award.points - now.direct - earnedByLsbd) : null;
  const affordability = checkAffordability(profile, cashFareMinor, award);
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
  if (verdict.outcome === 'INSUFFICIENT_BY_DEADLINE' && award) {
    const canClose = newCards.some((nc) => nc.status !== 'not_suitable' && nc.coversGap);
    verdict.reasons.push(
      `You have ${now.usable.toLocaleString('en-IE')} ${input.programName(target)} points. Your spending adds about ${earnedByLsbd.toLocaleString('en-IE')} by ${fmtDate(verdict.lsbd)}. This trip needs ${award.points.toLocaleString('en-IE')}. Gap: ${(gapAfterPlan ?? verdict.shortfall).toLocaleString('en-IE')}${canClose ? '.' : ', which no card or welcome offer can close in time, so book cash.'}`,
    );
  }
  const booking = bookingAdvice({
    today,
    earliestDepart: trip.earliestDepart,
    latestDepart: trip.latestDepart,
    lsbd: verdict.lsbd,
    distanceKm: input.distanceKm ?? null,
    quotes: flights.quotes,
  });

  const baseResult: Omit<PlanResult, 'actions' | 'summary'> = {
    gapAfterPlan,
    affordability,
    dailyCards: dailyCardsFromAllocation(profile, allocation, target, usableRoutes),
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
  const actions = buildActions(baseResult, input);
  const firstDo = actions.find((a) => a.kind === 'do' || a.kind === 'verify') ?? actions[0];
  const progLabel = input.programName(target);
  const summary = {
    haveNeedGap: award
      ? `You have ${now.usable.toLocaleString('en-IE')} ${progLabel} points (+${earnedByLsbd.toLocaleString('en-IE')} from planned spending by ${fmtDate(verdict.lsbd)}) · Trip needs ${award.points.toLocaleString('en-IE')}${award.source === 'ILLUSTRATIVE' ? ' (estimate)' : ''} · Gap: ${(gapAfterPlan ?? 0).toLocaleString('en-IE')}.`
      : `You have ${now.usable.toLocaleString('en-IE')} ${progLabel} points (+${earnedByLsbd.toLocaleString('en-IE')} from planned spending by ${fmtDate(verdict.lsbd)}) · No award price to compare${input.awardNote ? ` (${input.awardNote})` : '.'}`,
    decision: verdict.reasons[0] ?? 'Compare your options below.',
    nextAction: firstDo ? `${firstDo.title} (${firstDo.when}).` : 'Review the steps below.',
  };
  return { ...baseResult, actions, summary };
}

export function buildActions(
  r: Omit<PlanResult, 'actions' | 'summary'>,
  input: Pick<PlanInputs, 'programName' | 'programWebsite'>,
): Action[] {
  const a: Action[] = [];
  const prog = input.programName(r.target);
  const v = r.verdict;
  const cheapest = r.flights.cheapest;
  const cashLine = cheapest
    ? `${fmtEur(cheapest.totalMinor, true)} on ${fmtDate(cheapest.depart)}${cheapest.ret ? ` (return ${fmtDate(cheapest.ret)})` : ''}`
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
          when: `By ${fmtDate(v.lsbd)}`,
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
        when: `By ${fmtDate(v.lsbd)}`,
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
        detail: `The gap should close by ${fmtDate(r.pointsReady!)}.`,
      });
      a.push({
        id: 'check-later',
        kind: 'verify',
        when: `When the points post (${fmtDate(r.pointsReady!)})`,
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

  if (r.affordability.status === 'short')
    a.push({
      id: 'reserve',
      kind: 'verify',
      when: 'Before you book',
      title: 'Check your budget: the cash fare cuts into your reserve',
      detail: r.affordability.message,
    });
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
  for (const m of r.missing.slice(0, 5)) {
    const clean = m.startsWith('How many days after a purchase ')
      ? `Tell us ${m.charAt(0).toLowerCase()}${m.slice(1)}: Edit card`
      : m.startsWith('Monthly cap for ') || m.startsWith('Earn rate for ')
        ? `Tell us the ${m.charAt(0).toLowerCase()}${m.slice(1)}: Edit card`
        : m.startsWith('Your ')
          ? `Tell us ${m.charAt(0).toLowerCase()}${m.slice(1)}: Edit points`
          : `Tell us: ${m}`;
    a.push({ id: `missing-${m}`, kind: 'missing', when: 'When you can', title: clean });
  }
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
