import { describe, expect, it } from 'vitest';
import { bookingAdvice, easterSunday, peaksOverlapping, priceTrend } from '@/domain/bookingWindow';
import { dailyCards, suggestNewCards, type NewCardInput } from '@/domain/newCards';
import { computePlan } from '@/domain/plan';
import { CARD_CATALOGUE } from '@/fixtures/cardCatalogue';
import { ROUTES, card, flights, profile } from '../../helpers/profile';

const TODAY = '2026-11-01';
const avios = card({ id: 'aire', name: 'Avios card', rates: { all: 1 / 3 } });
const input = (p: Partial<NewCardInput> = {}): NewCardInput => ({
  today: TODAY,
  needBy: '2027-06-01',
  profile: profile({
    cards: [avios],
    monthly: [{ id: 'm1', label: 'Bills', category: 'bills', amountEur: 1200 }],
  }),
  target: 'iberia_club',
  routes: ROUTES,
  eurPerPoint: '0.010',
  gap: 8000,
  cashIsBetter: false,
  candidates: CARD_CATALOGUE,
  ...p,
});
const gold = (r: ReturnType<typeof suggestNewCards>) => r.find((c) => c.cardId === 'amex_es_gold')!;

describe('new card suggestions', () => {
  it('counts the official Gold welcome offer only from spending already entered, net of the pro-rated fee', () => {
    const g = gold(suggestNewCards(input()));
    // 5 usable months: 5 x (600 earned + 2,000 welcome) − 5 x 400 the current card already earns.
    expect(g.months).toBe(5);
    expect(g.welcomePoints).toBe(10_000);
    expect(g.extraPoints).toBe(11_000);
    expect(g.feeEur).toBe(80);
    expect(g.netValueEur).toBe(30);
    expect(g.coversGap).toBe(true);
    expect(g.applyBy).toBe('2026-12-19');
    expect(g.status).toBe('good_fit');
    expect(g.eligibility.join(' ')).toMatch(/not guaranteed/);
  });

  it('never assumes extra spending to reach a welcome minimum', () => {
    const g = gold(
      suggestNewCards(
        input({
          profile: profile({
            cards: [avios],
            monthly: [{ id: 'm1', label: 'Bills', category: 'bills', amountEur: 600 }],
          }),
        }),
      ),
    );
    expect(g.welcomePoints).toBe(0);
    expect(g.reasons.join(' ')).toMatch(/never suggest spending more/);
    expect(g.status).not.toBe('good_fit');
  });

  it('blocks every suggestion when the bill is not paid in full', () => {
    const r = suggestNewCards(
      input({
        profile: profile({
          cards: [avios],
          finance: { paysInFull: false },
          monthly: [{ id: 'm1', label: 'Bills', category: 'bills', amountEur: 1200 }],
        }),
      }),
    );
    expect(r.every((c) => c.status === 'not_suitable')).toBe(true);
  });

  it('drops the welcome offer for existing Amex holders and skips cards already held', () => {
    const plat = card({
      id: 'p',
      catalogueId: 'amex_es_platinum',
      program: 'amex_mr_es',
      rates: { all: 1 },
    });
    const r = suggestNewCards(
      input({
        profile: profile({
          cards: [plat],
          monthly: [{ id: 'm1', label: 'Bills', category: 'bills', amountEur: 1200 }],
        }),
      }),
    );
    expect(r.some((c) => c.cardId === 'amex_es_platinum')).toBe(false);
    expect(gold(r).welcomePoints).toBe(0);
  });

  it('rejects a card whose fee outweighs the extra points', () => {
    const zenit = suggestNewCards(input()).find((c) => c.cardId === 'iberia_zenit')!;
    expect(zenit.status).toBe('not_suitable');
    expect(zenit.reasons[0]).toMatch(/fee/);
  });

  it('says when there is not enough time', () => {
    const g = gold(suggestNewCards(input({ needBy: '2026-12-01' })));
    expect(g.months).toBe(0);
    expect(g.status).toBe('not_suitable');
  });

  it('picks the best held card for each daily spend', () => {
    const amex = card({
      id: 'gold',
      name: 'Gold',
      program: 'amex_mr_es',
      rates: { all: 0.5, groceries: 0.2 },
    });
    const d = dailyCards(
      profile({
        cards: [avios, amex],
        monthly: [
          { id: 'g', label: 'Food', category: 'groceries', amountEur: 300 },
          { id: 'b', label: 'Bills', category: 'bills', amountEur: 300 },
        ],
      }),
      'iberia_club',
      ROUTES,
    );
    expect(d.find((x) => x.spendId === 'g')!.cardName).toBe('Avios card');
    expect(d.find((x) => x.spendId === 'b')!.cardName).toBe('Gold');
    expect(d.find((x) => x.spendId === 'b')!.gainPerMonth).toBe(150);
  });
});

describe('booking window', () => {
  it('knows Easter and Spanish peak periods', () => {
    expect(easterSunday(2026)).toBe('2026-04-05');
    expect(easterSunday(2027)).toBe('2027-03-28');
    expect(peaksOverlapping('2027-03-22', '2027-03-24').map((p) => p.name)).toEqual([
      'Semana Santa (Easter week)',
    ]);
    expect(peaksOverlapping('2027-07-10', '2027-07-20').map((p) => p.name)).toEqual([
      'Summer holidays (July and August)',
    ]);
    expect(peaksOverlapping('2027-02-10', '2027-02-20')).toEqual([]);
  });

  const quotes = [
    {
      depart: '2027-09-15',
      totalMinor: 65000,
      carrier: 'T',
      stops: 0,
      provenance: 'LIVE_TEST_DUFFEL' as const,
    },
    {
      depart: '2027-09-12',
      totalMinor: 50000,
      carrier: 'T',
      stops: 0,
      provenance: 'LIVE_TEST_DUFFEL' as const,
    },
  ];

  it('long haul far ahead: early, with a re-check date and a sorted price calendar', () => {
    const b = bookingAdvice({
      today: TODAY,
      earliestDepart: '2027-09-12',
      latestDepart: '2027-09-15',
      lsbd: '2027-08-19',
      distanceKm: 5800,
      quotes,
    });
    expect(b.haul).toBe('long');
    expect(b.timing).toBe('early');
    expect(b.window).toMatchObject({ fromDays: 60, toDays: 180 });
    expect(b.calendar.map((c) => c.depart)).toEqual(['2027-09-12', '2027-09-15']);
    expect(b.calendar[1]!.vsCheapestMinor).toBe(15000);
    expect(b.spreadMinor).toBe(15000);
    expect(b.label).toMatch(/not a price forecast/);
  });

  it('short haul close to departure: book now', () => {
    expect(
      bookingAdvice({
        today: TODAY,
        earliestDepart: '2026-11-20',
        latestDepart: '2026-11-20',
        lsbd: '2026-10-27',
        distanceKm: 500,
        quotes: [],
      }).timing,
    ).toBe('book_now');
  });

  it('Christmas uses the longer peak window', () => {
    const b = bookingAdvice({
      today: TODAY,
      earliestDepart: '2026-12-20',
      latestDepart: '2026-12-22',
      lsbd: '2026-11-26',
      distanceKm: 500,
      quotes: [],
    });
    expect(b.peaks[0]!.name).toMatch(/Christmas/);
    expect(b.timing).toBe('good_time');
  });

  it('price watch compares with the last saved check', () => {
    expect(priceTrend([], 50000).direction).toBe('new');
    const t = priceTrend(
      [
        { at: '2026-10-01', cheapestMinor: 60000 },
        { at: '2026-10-20', cheapestMinor: 55000 },
      ],
      50000,
    );
    expect(t).toMatchObject({ direction: 'down', changeMinor: -5000 });
    expect(priceTrend([{ at: '2026-10-20', cheapestMinor: 50050 }], 50000).direction).toBe('same');
  });
});

describe('plan integration', () => {
  it('adds the gap, daily cards, new-card idea and booking advice to the plan', () => {
    const r = computePlan(
      {
        today: TODAY,
        trip: {
          origin: 'MAD',
          destination: 'JFK',
          tripType: 'return',
          earliestDepart: '2027-06-01',
          latestDepart: '2027-06-10',
          minNights: 7,
          maxNights: 10,
          adults: 1,
          cabin: 'economy',
          objective: 'B_ECONOMIC_COST',
        },
        profile: profile({
          cards: [avios],
          balances: [{ program: 'iberia_club', kind: 'exact', points: 20_000 }],
          monthly: [{ id: 'm1', label: 'Bills', category: 'bills', amountEur: 1200 }],
        }),
        award: { program: 'iberia_club', points: 34_000, taxesEur: 150, source: 'USER_ENTERED' },
        flights: flights(900),
        routes: ROUTES,
        referenceEurPerPoint: '0.010',
        programName: (id) => id,
        programWebsite: () => undefined,
        distanceKm: 5800,
        cardOptions: CARD_CATALOGUE,
      },
      ['iberia_club'],
    );
    expect(r.gapAfterPlan).toBeGreaterThan(0);
    expect(r.dailyCards[0]!.cardName).toBe('Avios card');
    expect(gold(r.newCards).status).toBe('good_fit');
    expect(r.actions.some((a) => a.id === 'new-card')).toBe(true);
    expect(r.booking.haul).toBe('long');
  });
});
