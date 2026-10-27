import Decimal from 'decimal.js';
import { fmtDate } from './fmt';
import { conversionToTarget } from './cards';
import { daysBetween } from './flexDates';
import {
  known,
  type EarnRule,
  type Profile,
  type Sourced,
  type SpendCategory,
  type UserCard,
} from './profile';
import type { ProgramId } from './types';
import type { TransferRoute } from './wallet';

/** Welcome points paid per period (e.g. 30 days) in which spending reaches a minimum. Only official terms. */
export type WelcomeOffer = {
  pointsPerPeriod: number;
  periodDays: number;
  minSpendPerPeriodEur: number;
  maxPeriods: number;
  maxPoints: number;
  /** Typical days until welcome points post after the qualifying spend (official "usually"). */
  typicalPostingDays: number;
  eligibility: string[];
  extras: string[];
  sourceUrl: string;
  checkedAt: string;
};

export type CardOption = {
  id: string;
  name: string;
  program: ProgramId;
  earn: EarnRule[];
  annualFeeEur: Sourced<number>;
  welcome?: WelcomeOffer;
  sourceUrl: string;
};

/** Assumed days from applying to having the card in hand (assumption, shown in the UI). */
export const APPROVAL_DAYS = 14;
/** Assumed days for ordinary card points to post (one statement). */
export const STATEMENT_DAYS = 30;
const PERIOD = 30;

export type NewCardSuggestion = {
  cardId: string;
  name: string;
  program: ProgramId;
  status: 'good_fit' | 'possible' | 'not_suitable';
  reasons: string[];
  /** 30-day months of spending that still count before the points are needed. */
  months: number;
  monthlySpendEur: number;
  /** Extra trip-programme points versus paying the same spending with your current cards. */
  extraPoints: number;
  welcomePoints: number;
  feeEur: number | null;
  netValueEur: number | null;
  coversGap: boolean | null;
  /** Latest date to apply for the suggestion to still work before your deadline. */
  applyBy: string | null;
  eligibility: string[];
  sourceUrl: string;
};

export type DailyCard = {
  spendId: string;
  label: string;
  category: SpendCategory;
  amountEur: number;
  cardId: string | null;
  cardName: string | null;
  /** Trip-programme points per €1 with the best card you hold. */
  pointsPerEuro: number;
  /** Trip-programme points per month you'd gain by switching from the card used today. */
  gainPerMonth: number;
};

const addDays = (d: string, n: number) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
const floorPts = (x: number) => Math.floor(x + 1e-9);

function rate(earn: EarnRule[], category: SpendCategory): number {
  const r =
    earn.find((e) => e.category === category && known(e.pointsPerEuro)) ??
    earn.find((e) => e.category === 'all' && known(e.pointsPerEuro));
  return r && known(r.pointsPerEuro) ? r.pointsPerEuro.value : 0;
}

const targetRate = (
  card: Pick<UserCard, 'earn' | 'program'>,
  category: SpendCategory,
  target: ProgramId,
  routes: TransferRoute[],
) => rate(card.earn, category) * conversionToTarget(card.program, target, routes);

/** For each monthly spending row: the card you hold that earns the most trip-programme points per €1. */
export function dailyCards(
  profile: Profile,
  target: ProgramId,
  routes: TransferRoute[],
): DailyCard[] {
  return profile.monthly
    .filter((m) => m.amountEur > 0)
    .map((m) => {
      let best: UserCard | null = null;
      let bestRate = 0;
      for (const c of profile.cards) {
        const r = targetRate(c, m.category, target, routes);
        if (r > bestRate) {
          best = c;
          bestRate = r;
        }
      }
      const current = profile.cards.find((c) => c.id === m.currentCardId);
      const currentRate = current ? targetRate(current, m.category, target, routes) : 0;
      return {
        spendId: m.id,
        label: m.label,
        category: m.category,
        amountEur: m.amountEur,
        cardId: best?.id ?? null,
        cardName: best?.name ?? null,
        pointsPerEuro: bestRate,
        gainPerMonth: floorPts(m.amountEur * bestRate) - floorPts(m.amountEur * currentRate),
      };
    });
}

export type NewCardInput = {
  today: string;
  /** Date the points must be in the account (safe booking date). */
  needBy: string;
  profile: Profile;
  target: ProgramId;
  routes: TransferRoute[];
  eurPerPoint: string;
  /** Points still missing after your planned spending, or null when there is no award to aim for. */
  gap: number | null;
  /** The award is not worth it for this trip, so a new card can only help future trips. */
  cashIsBetter: boolean;
  candidates: CardOption[];
};

/**
 * Ranks cards you don't hold yet for this trip. Only the spending you already entered is counted;
 * a welcome offer is counted only when that spending already meets the official minimum.
 */
export function suggestNewCards(input: NewCardInput): NewCardSuggestion[] {
  const { today, needBy, profile, target, routes, gap } = input;
  const held = new Set(profile.cards.map((c) => c.catalogueId).filter(Boolean));
  const holdsAmex = profile.cards.some((c) => c.program === 'amex_mr_es');
  const monthly = profile.monthly.filter((m) => m.amountEur > 0);
  const monthlySpendEur = monthly.reduce((s, m) => s + m.amountEur, 0);
  const heldPerMonth = dailyCards(profile, target, routes).reduce(
    (s, d) => s + floorPts(d.amountEur * d.pointsPerEuro),
    0,
  );

  const out: NewCardSuggestion[] = [];
  for (const c of input.candidates) {
    if (held.has(c.id)) continue;
    const conv = conversionToTarget(c.program, target, routes);
    if (conv === 0) continue;
    const w = c.welcome;
    const postDays = w ? Math.max(w.typicalPostingDays, STATEMENT_DAYS) : STATEMENT_DAYS;
    const usableDays = daysBetween(addDays(today, APPROVAL_DAYS), addDays(needBy, -postDays));
    const months = Math.max(0, Math.floor(usableDays / PERIOD));
    const earnPerMonth = monthly.reduce(
      (s, m) => s + floorPts(m.amountEur * rate(c.earn, m.category)),
      0,
    );
    const reasons: string[] = [];
    const eligibility = [
      ...(w?.eligibility ?? []),
      'Approval is up to the bank and not guaranteed. This is not financial advice.',
    ];

    let welcomeOk = !!w && monthlySpendEur >= w.minSpendPerPeriodEur;
    if (w && holdsAmex && c.program === 'amex_mr_es') {
      welcomeOk = false;
      reasons.push(
        'You already hold an Amex card, so the welcome offer for new cardholders would not apply.',
      );
    } else if (w && !welcomeOk && monthlySpendEur > 0) {
      reasons.push(
        `Welcome points need €${w.minSpendPerPeriodEur.toLocaleString('en-IE')} of spending a month; you entered €${monthlySpendEur.toLocaleString('en-IE')}. We never suggest spending more to reach it.`,
      );
    }
    const welcomePerMonth = welcomeOk && w ? w.pointsPerPeriod : 0;
    const welcomePoints =
      welcomeOk && w
        ? Math.min(w.maxPoints, Math.min(months, w.maxPeriods) * w.pointsPerPeriod)
        : 0;
    const extraPoints = Math.max(
      0,
      floorPts((months * earnPerMonth + welcomePoints) * conv) - months * heldPerMonth,
    );

    const fee = known(c.annualFeeEur)
      ? new Decimal(c.annualFeeEur.value)
          .mul(Math.min(Math.max(months, 1), 12))
          .div(12)
          .toDecimalPlaces(2)
          .toNumber()
      : null;
    const netValueEur =
      fee === null
        ? null
        : new Decimal(extraPoints).mul(input.eurPerPoint).minus(fee).toDecimalPlaces(2).toNumber();
    const coversGap = gap === null ? null : extraPoints >= gap;

    // Latest apply date: enough months to close the gap (or one month when there is no gap to close).
    const perMonthTarget = floorPts((earnPerMonth + welcomePerMonth) * conv) - heldPerMonth;
    const monthsNeeded = gap && gap > 0 && perMonthTarget > 0 ? Math.ceil(gap / perMonthTarget) : 1;
    const applyByDate = addDays(needBy, -(postDays + monthsNeeded * PERIOD + APPROVAL_DAYS));
    const applyBy = applyByDate >= today ? applyByDate : null;

    let status: NewCardSuggestion['status'] = 'possible';
    if (profile.finance.paysInFull !== true) {
      status = 'not_suitable';
      reasons.unshift('Only consider a new card if you pay the full bill every month.');
    } else if (!monthly.length) {
      status = 'not_suitable';
      reasons.unshift(
        'Add your regular monthly spending so we can check whether a new card helps.',
      );
    } else if (months < 1) {
      status = 'not_suitable';
      const lead = APPROVAL_DAYS + PERIOD + postDays;
      reasons.unshift(
        `Not enough time: you would have needed to apply by ${fmtDate(addDays(needBy, -lead))} (about ${lead} days before you need the points, ${fmtDate(needBy)}).`,
      );
    } else if (extraPoints === 0) {
      status = 'not_suitable';
      reasons.unshift('It would not earn more than the cards you already hold.');
    } else if (netValueEur !== null && netValueEur <= 0) {
      status = 'not_suitable';
      reasons.unshift(
        `The fee (about €${fee}) is more than the extra points are worth for this trip.`,
      );
    } else if (input.cashIsBetter) {
      reasons.unshift(
        'Cash is the better deal for this trip, so extra points would only help a future trip.',
      );
    } else if (coversGap && gap! > 0 && applyBy) {
      status = 'good_fit';
      reasons.unshift(
        `Could close your ${gap!.toLocaleString('en-IE')}-point gap if you apply by ${fmtDate(applyBy!)}.`,
      );
    } else if (welcomeOk && (netValueEur ?? 0) > 0) {
      status = 'good_fit';
      reasons.unshift('Your regular spending already meets the welcome offer minimum.');
    }
    if (status !== 'not_suitable' && fee === null) {
      // Without the fee the value cannot be judged, so it is never more than "possible".
      if (status === 'good_fit') status = 'possible';
      reasons.push('Annual fee not checked on the official page, so it is not subtracted.');
    }
    if (status !== 'not_suitable' && gap && gap > 0 && !coversGap)
      reasons.push(
        `It adds about ${extraPoints.toLocaleString('en-IE')} points, but your gap is ${gap.toLocaleString('en-IE')}.`,
      );

    out.push({
      cardId: c.id,
      name: c.name,
      program: c.program,
      status,
      reasons,
      months,
      monthlySpendEur,
      extraPoints,
      welcomePoints,
      feeEur: fee,
      netValueEur,
      coversGap,
      applyBy,
      eligibility,
      sourceUrl: w?.sourceUrl ?? c.sourceUrl,
    });
  }
  const rank = { good_fit: 0, possible: 1, not_suitable: 2 } as const;
  return out.sort(
    (a, b) =>
      rank[a.status] - rank[b.status] ||
      (b.netValueEur ?? -1) - (a.netValueEur ?? -1) ||
      b.extraPoints - a.extraPoints,
  );
}
