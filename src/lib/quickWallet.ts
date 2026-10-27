'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import type { WalletInput } from '@/contracts/common';
import { PRESETS } from './guestStore';
import { usePlanDraft } from './planStore';

export type QuickWallet = {
  wallet: WalletInput;
  label: string;
  isExample: boolean;
  profileKey: string;
};

/**
 * Points used by Quick Flight and award steps: the user's own planner balances, or a fictional
 * example wallet only when the URL explicitly asks for one (`w=lucia|marc|empty`). Examples never overwrite user data.
 */
export function useQuickWallet(): QuickWallet {
  const sp = useSearchParams();
  const d = usePlanDraft();
  const w = sp.get('w');
  return useMemo(() => {
    if (w && PRESETS[w]) {
      const p = PRESETS[w].wallet;
      return {
        wallet: {
          balances: p.balances,
          valuations: p.valuations,
          noValuePrograms: p.noValuePrograms,
        },
        label: `Example wallet: ${PRESETS[w].label} (fictional)`,
        isExample: true,
        profileKey: `ex-${w}`,
      };
    }
    const balances = d.profile.balances
      .filter((b) => b.program && (b.kind === 'exact' || b.kind === 'range'))
      .map((b) => ({
        program: b.program,
        points: Math.max(
          0,
          (b.kind === 'exact' ? (b.points ?? 0) : (b.min ?? 0)) - (b.reserved ?? 0),
        ),
      }))
      .filter((b) => b.points > 0);
    return {
      wallet: { balances, valuations: d.profile.valuations, noValuePrograms: [] },
      label: balances.length ? 'Your points (from Plan my trip)' : 'No points entered yet',
      isExample: false,
      profileKey: JSON.stringify(balances),
    };
  }, [w, d.profile.balances, d.profile.valuations]);
}
