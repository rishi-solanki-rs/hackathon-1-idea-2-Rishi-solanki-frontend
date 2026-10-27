import { planTransfers, type Balance, type TransferRoute, type TransferStep } from './wallet';
import type { ProgramId } from './types';

export type AwardStep =
  | {
      kind: 'check_balance';
      program: ProgramId;
      needed: number;
      direct: number;
      enoughDirect: boolean;
    }
  | { kind: 'find_seat'; program: ProgramId }
  | { kind: 'transfer'; transfer: TransferStep; requiresSeatConfirmed: true }
  | { kind: 'book'; program: ProgramId; taxesMinor: number }
  | { kind: 'verify_ticket' };

export type AwardPlan =
  | { ok: true; steps: AwardStep[]; warnings: string[] }
  | { ok: false; reason: 'NOT_ENOUGH_POINTS'; needed: number; usable: number; program: ProgramId };

/** Ordered, guarded award-booking steps. Transfers come only after the seat is confirmed. */
export function buildAwardPlan(input: {
  program: ProgramId;
  pointsNeeded: number;
  taxesMinor: number;
  balances: Balance[];
  routes: TransferRoute[];
}): AwardPlan {
  const plan = planTransfers(input.program, input.pointsNeeded, input.balances, input.routes);
  if (plan.shortfall > 0)
    return {
      ok: false,
      reason: 'NOT_ENOUGH_POINTS',
      needed: input.pointsNeeded,
      usable: input.pointsNeeded - plan.shortfall,
      program: input.program,
    };

  const steps: AwardStep[] = [
    {
      kind: 'check_balance',
      program: input.program,
      needed: input.pointsNeeded,
      direct: plan.direct,
      enoughDirect: plan.steps.length === 0,
    },
    { kind: 'find_seat', program: input.program },
    ...plan.steps.map((t): AwardStep => ({
      kind: 'transfer',
      transfer: t,
      requiresSeatConfirmed: true,
    })),
    { kind: 'book', program: input.program, taxesMinor: input.taxesMinor },
    { kind: 'verify_ticket' },
  ];
  const warnings = [
    'Award seats can disappear at any time. Our availability is illustrative and has not been checked.',
    'Never borrow or carry a card balance to earn or buy points: interest costs more than points are worth.',
  ];
  if (plan.steps.length)
    warnings.unshift(
      'Points transfers usually cannot be reversed. Move points only after you have found the seat.',
    );
  if (plan.steps.some((s) => s.route.verification !== 'VERIFIED'))
    warnings.push(
      'At least one transfer rule is unverified or illustrative. Confirm the ratio and conditions on the official page first.',
    );
  return { ok: true, steps, warnings };
}
