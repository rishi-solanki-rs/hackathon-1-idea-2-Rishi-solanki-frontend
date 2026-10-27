import { describe, expect, it } from 'vitest';
import {
  planTransfers,
  transferable,
  usableFor,
  type Balance,
  type TransferRoute,
} from '@/domain/wallet';

const route = (p: Partial<TransferRoute>): TransferRoute => ({
  id: 'r',
  from: 'amex_mr_es',
  to: 'iberia_club',
  num: 1,
  den: 1,
  min: 1000,
  increment: 1000,
  status: 'active',
  verification: 'UNVERIFIED',
  maxDelayDays: 2,
  preconditions: [],
  ...p,
});
const bal = (program: string, points: number): Balance => ({
  program,
  points,
  asOf: '2026-10-27',
  source: 'DEMO',
});

describe('wallet and transfers (ENG-08)', () => {
  it('T-CALC-011: min 500, step 5 → 12,503 sends 12,500; 499 sends 0', () => {
    const r = route({ to: 'flying_blue', min: 500, increment: 5 });
    expect(transferable(12_503, r)).toEqual({ send: 12_500, receive: 12_500 });
    expect(transferable(499, r)).toEqual({ send: 0, receive: 0 });
  });

  it('T-CALC-010: country ratio matters (MR ES 1:1 → 45,000; a 3:2 route → 30,000)', () => {
    expect(transferable(45_000, route({})).receive).toBe(45_000);
    expect(transferable(45_000, route({ num: 2, den: 3 })).receive).toBe(30_000);
  });

  it('never sums different programmes; usable counts only active routes', () => {
    const balances = [
      bal('iberia_club', 20_000),
      bal('amex_mr_es', 15_000),
      bal('flying_blue', 9_000),
    ];
    const u = usableFor('iberia_club', balances, [
      route({}),
      route({ id: 's', from: 'flying_blue', status: 'suspended' }),
    ]);
    expect(u.direct).toBe(20_000);
    expect(u.total).toBe(35_000);
    expect(u.viaTransfers).toHaveLength(1);
  });

  it('plans the smallest transfer rounded up to the increment', () => {
    const p = planTransfers(
      'iberia_club',
      25_000,
      [bal('iberia_club', 20_000), bal('amex_mr_es', 15_000)],
      [route({})],
    );
    expect(p.steps).toEqual([expect.objectContaining({ send: 5_000, receive: 5_000 })]);
    expect(p.shortfall).toBe(0);
  });

  it('reports a shortfall instead of inventing points', () => {
    const p = planTransfers(
      'iberia_club',
      60_000,
      [bal('iberia_club', 20_000), bal('amex_mr_es', 15_000)],
      [route({})],
    );
    expect(p.shortfall).toBe(25_000);
  });
});
