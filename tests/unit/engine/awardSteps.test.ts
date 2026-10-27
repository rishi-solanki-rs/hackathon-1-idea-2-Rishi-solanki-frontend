import { describe, expect, it } from 'vitest';
import { buildAwardPlan } from '@/domain/awardSteps';
import { TRANSFER_ROUTES } from '@/fixtures/catalogue';

const bal = (program: string, points: number) => ({
  program,
  points,
  asOf: '2026-10-27',
  source: 'DEMO' as const,
});

describe('award booking steps (REQ-BRF-05)', () => {
  it('no transfer when the programme balance is enough; seat check comes before booking', () => {
    const p = buildAwardPlan({
      program: 'iberia_club',
      pointsNeeded: 70_500,
      taxesMinor: 38000,
      balances: [bal('iberia_club', 120_000)],
      routes: TRANSFER_ROUTES,
    });
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect(p.steps.map((s) => s.kind)).toEqual([
      'check_balance',
      'find_seat',
      'book',
      'verify_ticket',
    ]);
    expect(p.warnings.join(' ')).not.toMatch(/cannot be reversed/);
  });

  it('puts the transfer after the seat check, sized to the gap, with irreversibility and unverified warnings', () => {
    const p = buildAwardPlan({
      program: 'iberia_club',
      pointsNeeded: 130_000,
      taxesMinor: 38000,
      balances: [bal('iberia_club', 120_000), bal('amex_mr_es', 15_000)],
      routes: TRANSFER_ROUTES,
    });
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    const kinds = p.steps.map((s) => s.kind);
    expect(kinds.indexOf('find_seat')).toBeLessThan(kinds.indexOf('transfer'));
    const t = p.steps.find((s) => s.kind === 'transfer');
    expect(t && t.kind === 'transfer' && t.transfer.send).toBe(10_000);
    expect(p.warnings[0]).toMatch(/cannot be reversed/);
    expect(p.warnings.join(' ')).toMatch(/unverified or illustrative/);
  });

  it('refuses to produce steps when points are insufficient (no invented points)', () => {
    const p = buildAwardPlan({
      program: 'iberia_club',
      pointsNeeded: 50_000,
      taxesMinor: 32000,
      balances: [bal('iberia_club', 20_000)],
      routes: TRANSFER_ROUTES,
    });
    expect(p).toEqual({
      ok: false,
      reason: 'NOT_ENOUGH_POINTS',
      needed: 50_000,
      usable: 20_000,
      program: 'iberia_club',
    });
  });
});
