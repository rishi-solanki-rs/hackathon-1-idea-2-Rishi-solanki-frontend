import { describe, expect, it } from 'vitest';
import { validateStep } from '@/lib/planValidation';
import { emptyProfile, type PlanDraft } from '@/lib/planStore';
import { toAward } from '@/lib/planConvert';

const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

const draft = (patch: Partial<PlanDraft['trip']> = {}): PlanDraft => ({
  version: 1,
  step: 0,
  trip: {
    origin: 'MAD',
    destination: 'JFK',
    tripType: 'return',
    earliestDepart: inDays(60),
    latestDepart: inDays(65),
    minNights: '7',
    maxNights: '10',
    adults: 1,
    cabin: 'economy',
    objective: 'B_ECONOMIC_COST',
    directOnly: false,
    bookBy: '',
    ...patch,
  },
  profile: emptyProfile(),
  award: { mode: 'none', program: 'iberia_club', points: '', taxesEur: '', seenAvailable: false },
  updatedAt: '',
});

describe('validateStep', () => {
  it('accepts a valid trip', () => {
    expect(validateStep(draft(), 0)).toEqual({});
  });

  it('puts each trip error on its own field id', () => {
    const e = validateStep(
      draft({
        destination: 'MAD',
        earliestDepart: inDays(-1),
        latestDepart: inDays(-3),
        minNights: '9',
        maxNights: '3',
      }),
      0,
    );
    expect(Object.keys(e).sort()).toEqual([
      'pt-destination',
      'pt-earliest',
      'pt-latest',
      'pt-max-nights',
    ]);
  });

  it('rejects a date range longer than 60 days and a book-by after departure', () => {
    const e = validateStep(draft({ latestDepart: inDays(130), bookBy: inDays(90) }), 0);
    expect(e['pt-latest']).toMatch(/60 days/);
    expect(e['pt-bookby']).toMatch(/before/);
  });

  it('ignores nights for one-way trips', () => {
    expect(validateStep(draft({ tripType: 'one_way', minNights: '', maxNights: '' }), 0)).toEqual(
      {},
    );
  });

  it('requires cards or the explicit "no cards" answer', () => {
    const d = draft();
    expect(validateStep(d, 1)).toHaveProperty('card-pick');
    d.profile.noCards = true;
    expect(validateStep(d, 1)).toEqual({});
  });

  it('flags an exact balance with no number and an award with no taxes', () => {
    const d = draft();
    d.profile.balances = [{ program: 'iberia_club', kind: 'exact', asOf: inDays(0) }];
    d.award = { ...d.award, mode: 'entered', points: '34000', taxesEur: '' };
    const e = validateStep(d, 2);
    expect(Object.keys(e).sort()).toEqual(['aw-taxes', 'bal-0-points']);
  });

  it('requires the pay-in-full answer and complete spending rows', () => {
    const d = draft();
    d.profile.monthly = [{ id: 'a', label: '', category: 'groceries', amountEur: 0 }];
    const e = validateStep(d, 3);
    expect(Object.keys(e).sort()).toEqual(['m-0-amt', 'm-0-label', 'pay-yes']);
  });
});

describe('toAward', () => {
  it('correction 1: an estimate is only requested when chosen explicitly, with the chosen programme', () => {
    const base = { points: '', taxesEur: '', seenAvailable: false };
    expect(toAward({ ...base, mode: 'none', program: 'iberia_club' })).toEqual({
      award: null,
      estimateAward: false,
    });
    expect(toAward({ ...base, mode: 'estimate', program: '' })).toEqual({
      award: null,
      estimateAward: false,
    });
    expect(toAward({ ...base, mode: 'estimate', program: 'flying_blue' })).toEqual({
      award: null,
      estimateAward: true,
      estimateProgram: 'flying_blue',
    });
  });
  it('uses the entered award when complete', () => {
    const r = toAward({
      mode: 'entered',
      program: 'iberia_club',
      points: '34000',
      taxesEur: '120',
      seenAvailable: true,
    });
    expect(r.estimateAward).toBe(false);
    expect(r.award?.points).toBe(34000);
  });
});
