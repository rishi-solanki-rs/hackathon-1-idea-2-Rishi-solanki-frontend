import { eur } from '@/domain/money';
import type { CostLine, FlightOption } from '@/domain/types';

type Spec = {
  id: string;
  kind?: 'cash' | 'award';
  cash?: number;
  later?: number;
  points?: number;
  program?: string;
  legs?: number[];
  dateShiftDays?: number;
  altOrigin?: string;
  fxStale?: boolean;
  extraLines?: CostLine[];
};

export function opt(s: Spec): FlightOption {
  const kind = s.kind ?? (s.points ? 'award' : 'cash');
  const lines: CostLine[] = [
    {
      code: kind === 'award' ? 'award_taxes' : 'fare',
      key: kind === 'award' ? 'award_taxes' : 'fare',
      label: 'test',
      amount: eur(s.cash ?? 0),
      timing: 'today',
      provenance: kind === 'award' ? 'FIXTURE_AWARD' : 'FIXTURE_FLIGHT',
    },
    ...(s.later
      ? [
          {
            code: 'positioning' as const,
            key: 'positioning',
            label: 'train',
            amount: eur(s.later),
            timing: 'later' as const,
            provenance: 'ESTIMATE' as const,
          },
        ]
      : []),
    ...(s.extraLines ?? []),
  ];
  return {
    id: s.id,
    kind,
    legIndexes: s.legs ?? [0],
    slices: [],
    cabin: 'economy',
    costLines: lines,
    points: s.points ? [{ program: s.program ?? 'iberia_club', amount: s.points }] : [],
    provenance: kind === 'award' ? 'FIXTURE_AWARD' : 'FIXTURE_FLIGHT',
    availability: 'TEST_OR_ILLUSTRATIVE',
    fetchedAt: '2026-10-27T10:00:00.000Z',
    conditions: { refund: 'unknown', change: 'unknown' },
    variation:
      s.dateShiftDays || s.altOrigin
        ? {
            ...(s.dateShiftDays ? { dateShiftDays: s.dateShiftDays } : {}),
            ...(s.altOrigin ? { altOrigin: s.altOrigin } : {}),
          }
        : undefined,
    fxStale: s.fxStale,
    sourceLabel: 'test',
  };
}

export const avios = (eurPerPoint: string) => ({
  iberia_club: { program: 'iberia_club', eurPerPoint, method: 'user' as const },
});

export const pool = (n: number) => ({ iberia_club: { direct: n, total: n } });
