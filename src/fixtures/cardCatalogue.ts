import type { EarnRule, Sourced, SpendCategory } from '@/domain/profile';

/**
 * Card catalogue. Every term is either VERIFIED (read on the official page on `checkedAt`) or UNKNOWN.
 * Nothing is filled in by guesswork; the user is asked for unknown terms.
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
};

const CHECKED = '2026-10-27';
const MR_TERMS = 'https://www.americanexpress.com/es-es/rewards/membership-rewards/terms';
const GOLD = 'https://www.americanexpress.com/es-es/tarjetas/tarjetas-de-cargo/tarjeta-gold-card/';
const IBERIA_CARDS = 'https://www.iberiacards.es/tarjetas-personales/';
const IBERIA_COMPARE =
  'https://www.iberiacards.es/blog/tu-tarjeta/aire-vs-icon-vs-icon-plus-vs-zenit/';

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
  monthlyCapEur: v(null, src),
});

export const CARD_CATALOGUE: CatalogueCard[] = [
  {
    id: 'amex_es_platinum',
    name: 'American Express Platinum (Spain)',
    issuer: 'American Express Europe',
    country: 'ES',
    program: 'amex_mr_es',
    earn: [rule('all', 1, MR_TERMS)],
    annualFeeEur: { value: null, status: 'UNKNOWN' },
    postingDelayDays: unknownDelay,
    notes: [
      '1 Membership Rewards point per €1 on eligible purchases (official MR terms).',
      'Annual fee not checked: enter it if you want it counted.',
    ],
    sourceUrl: MR_TERMS,
  },
  {
    id: 'amex_es_gold',
    name: 'American Express Gold (Spain)',
    issuer: 'American Express Europe',
    country: 'ES',
    program: 'amex_mr_es',
    earn: [
      rule('all', 0.5, MR_TERMS),
      rule('travel', 1, MR_TERMS),
      rule('groceries', 0.2, MR_TERMS),
    ],
    annualFeeEur: v(192, GOLD),
    postingDelayDays: unknownDelay,
    notes: [
      '1 point per €2 in general, 1 per €1 at selected travel companies only, 1 per €5 at Spanish supermarkets (official MR terms).',
      'Fee €16 per month (official Gold page).',
      'The welcome offer is paid per month of spending and is not planned here.',
    ],
    sourceUrl: GOLD,
  },
  {
    id: 'iberia_aire',
    name: 'Iberia Aire (Iberia Cards)',
    issuer: 'Iberia Cards',
    country: 'ES',
    program: 'iberia_club',
    earn: [rule('all', 1 / 3, IBERIA_CARDS)],
    annualFeeEur: v(60, IBERIA_CARDS),
    postingDelayDays: unknownDelay,
    notes: [
      '1 Avios per €3 in general; 1 per €1 on Iberia purchases and 1 per €2 at Iberia Club partners (not modelled as categories).',
      'Fee €5 per month.',
      'Welcome Avios conditions not checked, so not planned.',
    ],
    sourceUrl: IBERIA_CARDS,
  },
  {
    id: 'iberia_icon',
    name: 'Iberia Icon (Iberia Cards)',
    issuer: 'Iberia Cards',
    country: 'ES',
    program: 'iberia_club',
    earn: [rule('all', 1 / 3, IBERIA_CARDS), rule('travel', 0.5, IBERIA_COMPARE)],
    annualFeeEur: v(118.8, IBERIA_CARDS),
    postingDelayDays: unknownDelay,
    notes: [
      '1 Avios per €3 in general, 1 per €2 in the travel sector (official Iberia Cards comparison).',
      'Fee €9.90 per month.',
    ],
    sourceUrl: IBERIA_CARDS,
  },
  {
    id: 'iberia_zenit',
    name: 'Iberia Zenit (Iberia Cards)',
    issuer: 'Iberia Cards',
    country: 'ES',
    program: 'iberia_club',
    earn: [rule('all', 1, IBERIA_CARDS)],
    annualFeeEur: v(948, IBERIA_CARDS),
    postingDelayDays: unknownDelay,
    notes: [
      '1 Avios per €1 in general; 3 per €1 on Iberia purchases (not modelled as a category).',
      'Fee €79 per month.',
    ],
    sourceUrl: IBERIA_CARDS,
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
