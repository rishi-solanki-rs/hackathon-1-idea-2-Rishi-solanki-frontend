import type { WelcomeOffer } from '@/domain/newCards';
import type { EarnRule, Sourced, SpendCategory } from '@/domain/profile';

/**
 * Spanish card catalogue. Every term is either VERIFIED (read on the issuer's official page on `checkedAt`)
 * or UNKNOWN. Nothing is filled in by guesswork; unknown terms lower confidence and the user can enter them.
 * Monthly caps are UNKNOWN unless the issuer states one: a cap is never assumed in either direction.
 */
export type CatalogueCard = {
  id: string;
  name: string;
  issuer: string;
  country: 'ES';
  program: string;
  earn: EarnRule[];
  annualFeeEur: Sourced<number>;
  postingDelayDays: Sourced<number>;
  notes: string[];
  sourceUrl: string;
  /** Only offers whose spend conditions were read on the official page. */
  welcome?: WelcomeOffer;
};

const CHECKED = '2026-10-27';
const MR_TERMS = 'https://www.americanexpress.com/es-es/rewards/membership-rewards/terms';
const GOLD = 'https://www.americanexpress.com/es-es/tarjetas/tarjetas-de-cargo/tarjeta-gold-card/';
const PLATINUM = 'https://www.americanexpress.com/es-es/tarjetas-de-cargo/tarjeta-platinum/';
const AMEX_WELCOME = 'https://www.americanexpress.com/es/tarjetas/requisitos-para-solicitar/';
const IBERIA_CARDS = 'https://www.iberiacards.es/tarjetas-personales/';
const IBERIA_COMPARE =
  'https://www.iberiacards.es/blog/tu-tarjeta/aire-vs-icon-vs-icon-plus-vs-zenit/';
const ZENIT = 'https://www.iberiacards.es/wp/iberia-zenit/';
const REVOLUT_ES = 'https://www.revolut.com/es-ES/revpoints/';

const v = <T>(value: T, sourceUrl: string): Sourced<T> => ({
  value,
  status: 'VERIFIED',
  sourceUrl,
  checkedAt: CHECKED,
});
const unknownDelay: Sourced<number> = { value: null, status: 'UNKNOWN' };
const rule = (category: SpendCategory | 'all', rate: number, src: string): EarnRule => ({
  category,
  pointsPerEuro: v(rate, src),
  monthlyCapEur: { value: null, status: 'UNKNOWN' },
});
const amexEligibility = [
  'Only for new cardholders: no Amex card held or cancelled in the last 12 months, and no other personal Amex card.',
  'Points usually post about 10 working days after the spending, but can take up to 180 days.',
  'American Express can change or end the offer at any time.',
];

export const CARD_CATALOGUE: CatalogueCard[] = [
  {
    id: 'amex_es_platinum',
    name: 'American Express Platinum (Spain)',
    issuer: 'American Express Europe',
    country: 'ES',
    program: 'amex_mr_es',
    earn: [rule('all', 1, MR_TERMS)],
    annualFeeEur: v(780, PLATINUM),
    postingDelayDays: unknownDelay,
    notes: [
      '1 Membership Rewards point per €1 on eligible purchases (official MR terms).',
      'Fee €65 per month, €780 a year (official Platinum page).',
      'Points are credited once purchases are paid and are withdrawn if a purchase is refunded (MR terms).',
      'Welcome offer for new cardholders: 5,000 MR for each 30-day month with €1,500 spend, first 10 months (up to 50,000).',
    ],
    sourceUrl: PLATINUM,
    welcome: {
      pointsPerPeriod: 5000,
      periodDays: 30,
      minSpendPerPeriodEur: 1500,
      maxPeriods: 10,
      maxPoints: 50000,
      typicalPostingDays: 14,
      eligibility: amexEligibility,
      extras: [],
      sourceUrl: PLATINUM,
      checkedAt: CHECKED,
    },
  },
  {
    id: 'amex_es_gold',
    name: 'American Express Gold (Spain)',
    issuer: 'American Express Europe',
    country: 'ES',
    program: 'amex_mr_es',
    earn: [rule('all', 0.5, MR_TERMS), rule('groceries', 0.2, MR_TERMS)],
    annualFeeEur: v(192, GOLD),
    postingDelayDays: unknownDelay,
    notes: [
      '1 point per €2 in general and 1 per €5 at Spanish supermarkets (official MR terms).',
      '1 per €1 applies only at a list of selected travel companies, so it is not assumed for "travel"; add it yourself if your merchant is on the list.',
      'Fee €16 per month (official Gold page).',
      'Welcome offer for new cardholders: 2,000 MR points for each 30-day month with €1,000 spend, for the first 10 months (up to 20,000).',
    ],
    sourceUrl: GOLD,
    welcome: {
      pointsPerPeriod: 2000,
      periodDays: 30,
      minSpendPerPeriodEur: 1000,
      maxPeriods: 10,
      maxPoints: 20000,
      typicalPostingDays: 14,
      eligibility: amexEligibility,
      extras: ['€100 hotel credit (official comparison page); not counted here.'],
      sourceUrl: AMEX_WELCOME,
      checkedAt: CHECKED,
    },
  },
  {
    id: 'iberia_aire',
    name: 'Iberia Aire (Iberia Cards)',
    issuer: 'Iberia Cards',
    country: 'ES',
    program: 'iberia_club',
    earn: [rule('all', 1 / 3, IBERIA_COMPARE), rule('travel', 0.5, IBERIA_COMPARE)],
    annualFeeEur: v(60, IBERIA_CARDS),
    postingDelayDays: unknownDelay,
    notes: [
      '1 Avios per €3 in general, 1 per €2 on travel and Iberia Club partners, 1 per €1 on Iberia/IAG purchases (official Iberia Cards comparison).',
      'Fee €5 per month.',
      'Welcome: "up to 15,500 Avios" under the current campaign (ends 31 Oct 2026); its spend conditions are not stated, so it is not planned.',
    ],
    sourceUrl: IBERIA_COMPARE,
  },
  {
    id: 'iberia_icon',
    name: 'Iberia Icon (Iberia Cards)',
    issuer: 'Iberia Cards',
    country: 'ES',
    program: 'iberia_club',
    earn: [rule('all', 1 / 3, IBERIA_COMPARE), rule('travel', 0.5, IBERIA_COMPARE)],
    annualFeeEur: v(118.8, IBERIA_CARDS),
    postingDelayDays: unknownDelay,
    notes: [
      '1 Avios per €3 in general, 1 per €2 on travel and partners, 1 per €1 on Iberia/IAG purchases (official Iberia Cards comparison).',
      'Fee €9.90 per month.',
      'Welcome: "up to 20,000 Avios" under the current campaign (ends 31 Oct 2026); spend conditions not stated, so not planned.',
    ],
    sourceUrl: IBERIA_COMPARE,
  },
  {
    id: 'iberia_zenit',
    name: 'Iberia Zenit (Iberia Cards)',
    issuer: 'Iberia Cards',
    country: 'ES',
    program: 'iberia_club',
    earn: [rule('all', 1, ZENIT), rule('travel', 1, IBERIA_COMPARE)],
    annualFeeEur: v(948, IBERIA_CARDS),
    postingDelayDays: unknownDelay,
    notes: [
      '1 Avios per €1 in general, 3 per €1 on Iberia/IAG tickets (official Zenit conditions).',
      'Payments with Apple Pay / Google Pay earn Avios only up to €5,000 a month (official Zenit conditions); card payments have no stated cap.',
      'Fee €79 per month.',
      'Welcome: "up to 40,000 Avios" under the current campaign; spend conditions not stated, so not planned.',
    ],
    sourceUrl: ZENIT,
  },
  {
    id: 'revolut_es',
    name: 'Revolut (Spain, RevPoints)',
    issuer: 'Revolut Bank UAB',
    country: 'ES',
    program: 'revolut_revpoints',
    earn: [
      {
        category: 'all',
        pointsPerEuro: { value: null, status: 'UNKNOWN' },
        monthlyCapEur: { value: null, status: 'UNKNOWN' },
      },
    ],
    annualFeeEur: { value: null, status: 'UNKNOWN' },
    postingDelayDays: unknownDelay,
    notes: [
      'Earn rate depends on your Revolut plan (from 1 RevPoint per €10 on Standard up to 1 per €1 on Ultra); enter your plan’s rate below.',
      'Transferring RevPoints to Iberia Club requires an eligible plan; check your Revolut app.',
    ],
    sourceUrl: REVOLUT_ES,
  },
];

export const catalogueCard = (id: string) => CARD_CATALOGUE.find((c) => c.id === id);

export const CATEGORY_LABELS: Record<SpendCategory, string> = {
  groceries: 'Groceries / supermarket',
  dining: 'Restaurants and cafés',
  transport: 'Transport',
  fuel: 'Fuel',
  bills: 'Bills and utilities',
  travel: 'Travel (airlines, hotels, trains)',
  shopping: 'Shopping',
  other: 'Other',
};
