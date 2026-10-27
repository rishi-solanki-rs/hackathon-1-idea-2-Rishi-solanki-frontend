import { describe, expect, it } from 'vitest';
import { allocate, minimalLossSubset, spendUnits } from '@/domain/cards';
import { userValue } from '@/domain/profile';
import { ROUTES, card, profile } from '../../helpers/profile';

const TODAY = '2026-11-01';
const UNTIL = '2027-01-31'; // three monthly occurrences: Nov 15, Dec 15, Jan 15

describe('spend units', () => {
  it('expands monthly spending to the 15th of each month and skips optional, uncommitted purchases', () => {
    const { units, excluded } = spendUnits(
      [{ id: 'g', label: 'Groceries', category: 'groceries', amountEur: 400 }],
      [
        {
          id: 'tv',
          label: 'New TV',
          category: 'shopping',
          amountEur: 900,
          date: '2026-12-01',
          necessity: 'flexible',
          committed: false,
          refundable: true,
        },
        {
          id: 'rent',
          label: 'Deposit',
          category: 'bills',
          amountEur: 1200,
          date: '2026-12-05',
          necessity: 'necessary',
          committed: true,
          refundable: false,
        },
      ],
      TODAY,
      UNTIL,
    );
    expect(units.filter((u) => u.kind === 'monthly').map((u) => u.date)).toEqual([
      '2026-11-15',
      '2026-12-15',
      '2027-01-15',
    ]);
    expect(units.some((u) => u.id === 'rent')).toBe(true);
    expect(excluded).toEqual([
      expect.objectContaining({
        id: 'tv',
        reason: expect.stringMatching(/never count spending you might not do/),
      }),
    ]);
  });
});

describe('card allocation', () => {
  it('picks the higher rate and respects a monthly cap (overflow at base rate)', () => {
    const a = allocate(
      profile({
        cards: [
          card({ id: 'Grocer', rates: { groceries: 2, all: 1 }, caps: { groceries: 500 } }),
          card({ id: 'Basic', rates: { all: 1 } }),
        ],
        monthly: [{ id: 'g', label: 'Groceries', category: 'groceries', amountEur: 700 }],
      }),
      'iberia_club',
      ROUTES,
      TODAY,
      UNTIL,
    );
    expect(a.status).toBe('OK');
    expect(a.assignments).toHaveLength(3);
    for (const x of a.assignments) {
      expect(x.cardName).toBe('Grocer');
      expect(x.points).toBe(500 * 2 + 200 * 1);
      expect(x.capped).toBe(true);
    }
  });

  it('regression: a 1/3 rate on €900 gives 300 points, not 299 (float error)', () => {
    const a = allocate(
      profile({
        cards: [card({ id: 'Aire', rates: { all: 1 / 3 } })],
        purchases: [
          {
            id: 'l',
            label: 'Laptop',
            category: 'shopping',
            amountEur: 900,
            date: '2026-11-20',
            necessity: 'necessary',
            committed: true,
            refundable: false,
          },
        ],
      }),
      'iberia_club',
      ROUTES,
      TODAY,
      UNTIL,
    );
    expect(a.assignments[0].points).toBe(300);
    expect(a.assignments[0].targetPoints).toBe(300);
  });

  it('changing a reward rate changes the allocation', () => {
    const base = {
      monthly: [{ id: 'd', label: 'Dining', category: 'dining' as const, amountEur: 300 }],
    };
    const a1 = allocate(
      profile({
        ...base,
        cards: [card({ id: 'A', rates: { all: 1 } }), card({ id: 'B', rates: { dining: 1.5 } })],
      }),
      'iberia_club',
      ROUTES,
      TODAY,
      UNTIL,
    );
    const a2 = allocate(
      profile({
        ...base,
        cards: [card({ id: 'A', rates: { all: 2 } }), card({ id: 'B', rates: { dining: 1.5 } })],
      }),
      'iberia_club',
      ROUTES,
      TODAY,
      UNTIL,
    );
    expect(a1.assignments[0].cardName).toBe('B');
    expect(a2.assignments[0].cardName).toBe('A');
  });

  it('converts bank points through a transfer route and flags cards that cannot reach the programme', () => {
    const a = allocate(
      profile({
        cards: [
          card({ id: 'Amex', program: 'amex_mr_es', rates: { all: 1 } }),
          card({ id: 'FB card', program: 'flying_blue', rates: { all: 3 } }),
        ],
        monthly: [{ id: 'g', label: 'Groceries', category: 'groceries', amountEur: 100 }],
      }),
      'iberia_club',
      ROUTES,
      TODAY,
      UNTIL,
    );
    expect(a.assignments[0].cardName).toBe('Amex');
    expect(a.assignments[0].targetPoints).toBe(100);
    expect(a.missing).toContain("FB card earns points that cannot reach this trip's programme");
  });

  it('blocks card-earning advice when the user does not pay in full, and asks when unknown', () => {
    const p = {
      cards: [card({ id: 'A' })],
      monthly: [{ id: 'g', label: 'G', category: 'groceries' as const, amountEur: 100 }],
    };
    expect(
      allocate(
        profile({ ...p, finance: { paysInFull: false } }),
        'iberia_club',
        ROUTES,
        TODAY,
        UNTIL,
      ),
    ).toMatchObject({ status: 'BLOCKED_PAYMENT', assignments: [], totalTargetPoints: 0 });
    const u = allocate(
      profile({ ...p, finance: { paysInFull: null } }),
      'iberia_club',
      ROUTES,
      TODAY,
      UNTIL,
    );
    expect(u.status).toBe('UNKNOWN_PAYMENT');
    expect(u.missing[0]).toMatch(/pay your full card statement/);
  });

  it('posting delay sets the posting date; an unknown delay uses the labelled assumption and is listed as missing', () => {
    const a = allocate(
      profile({
        cards: [card({ id: 'A', delay: 45 })],
        purchases: [
          {
            id: 'p',
            label: 'Flight to wedding',
            category: 'travel',
            amountEur: 500,
            date: '2026-11-20',
            necessity: 'necessary',
            committed: true,
            refundable: false,
          },
        ],
      }),
      'iberia_club',
      ROUTES,
      TODAY,
      UNTIL,
    );
    expect(a.assignments[0].postsOn).toBe('2027-01-04');
    const b = allocate(
      profile({
        cards: [card({ id: 'A', delay: null })],
        purchases: [
          {
            id: 'p',
            label: 'X',
            category: 'travel',
            amountEur: 500,
            date: '2026-11-20',
            necessity: 'necessary',
            committed: true,
            refundable: false,
          },
        ],
      }),
      'iberia_club',
      ROUTES,
      TODAY,
      UNTIL,
    );
    // Correction 3: an unknown delay uses the labelled conservative assumption, still listed as missing.
    expect(b.assignments[0].postsOn).toBe('2027-01-04');
    expect(b.assignments[0].postingAssumed).toBe(true);
    expect(b.missing).toContain('How many days after a purchase A points appear');
  });

  it('moves already-planned purchases onto a bonus card only when it pays off, and never suggests extra spending', () => {
    const bonusCard = card({
      id: 'Bonus',
      rates: { all: 1 },
      bonus: {
        thresholdEur: userValue(2000),
        windowDays: userValue(90),
        points: userValue(20000),
        startDate: TODAY,
      },
    });
    const rich = card({ id: 'Rich', rates: { all: 2 } });
    const purchases = [
      {
        id: 'a',
        label: 'Sofa',
        category: 'shopping' as const,
        amountEur: 1200,
        date: '2026-11-10',
        necessity: 'necessary' as const,
        committed: true,
        refundable: false,
      },
      {
        id: 'b',
        label: 'Car repair',
        category: 'transport' as const,
        amountEur: 900,
        date: '2026-12-01',
        necessity: 'necessary' as const,
        committed: true,
        refundable: false,
      },
    ];
    const a = allocate(
      profile({ cards: [bonusCard, rich], purchases }),
      'iberia_club',
      ROUTES,
      TODAY,
      UNTIL,
    );
    expect(a.bonuses[0]).toMatchObject({ reached: true, points: 20000 });
    expect(a.assignments.every((x) => x.cardName === 'Bonus')).toBe(true);

    const short = allocate(
      profile({ cards: [bonusCard, rich], purchases: [purchases[0]] }),
      'iberia_club',
      ROUTES,
      TODAY,
      UNTIL,
    );
    expect(short.bonuses[0]).toMatchObject({ reached: false });
    expect(short.bonuses[0].reason).toMatch(/will not suggest extra spending/);
  });

  it('incremental reward is measured against the cards the user uses today', () => {
    const a = allocate(
      profile({
        cards: [card({ id: 'Low', rates: { all: 0.5 } }), card({ id: 'High', rates: { all: 2 } })],
        monthly: [
          { id: 'g', label: 'G', category: 'groceries', amountEur: 100, currentCardId: 'Low' },
        ],
      }),
      'iberia_club',
      ROUTES,
      TODAY,
      UNTIL,
    );
    expect(a.totalTargetPoints).toBe(600);
    expect(a.baselineTargetPoints).toBe(150);
    expect(a.incrementalTargetPoints).toBe(450);
  });

  it('minimal-loss subset is exact within limits and refuses when the total is short', () => {
    const units = [100, 300, 450, 700].map((amt, i) => ({
      id: `u${i}`,
      sourceId: `u${i}`,
      label: '',
      category: 'other' as const,
      amountEur: amt,
      date: '2026-11-10',
      kind: 'planned' as const,
    }));
    const r = minimalLossSubset(units, 750, (u) => u.amountEur);
    expect(r.approximate).toBe(false);
    expect(r.units!.reduce((n, u) => n + u.amountEur, 0)).toBe(750);
    expect(minimalLossSubset(units, 10_000, () => 1).units).toBeNull();
  });
});
