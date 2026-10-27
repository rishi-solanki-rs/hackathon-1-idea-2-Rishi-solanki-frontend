'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import {
  QuickSearchRequestSchema,
  QuickSearchResponseSchema,
  type QuickSearchRequest,
} from '@/contracts/search';
import { queryToQuick } from './query';
import { useHydrated } from './guestStore';
import { useQuickWallet } from './quickWallet';
import { useCachedPost } from './useApi';

export function useQuickRequest() {
  const sp = useSearchParams();
  const qw = useQuickWallet();
  const hydrated = useHydrated();
  return useMemo(() => {
    const raw = { ...queryToQuick(new URLSearchParams(sp.toString())), wallet: qw.wallet };
    const parsed = QuickSearchRequestSchema.safeParse(raw);
    return {
      hydrated,
      request: parsed.success ? parsed.data : null,
      issues: parsed.success
        ? []
        : parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      query: sp.toString(),
      walletLabel: qw.label,
      walletIsExample: qw.isExample,
    };
  }, [sp, qw, hydrated]);
}

export function useQuickResult() {
  const r = useQuickRequest();
  const key =
    r.hydrated && r.request
      ? `quick.${r.query.replace(/&opt=[^&]*/, '')}.${JSON.stringify(r.request.wallet)}`
      : null;
  const [state, retry] = useCachedPost(
    key,
    '/api/search/quick',
    r.request as QuickSearchRequest,
    QuickSearchResponseSchema,
    (d) => {
      const exps = d.data.options.map((o) => (o.expiresAt ? Date.parse(o.expiresAt) : Infinity));
      const min = Math.min(...exps);
      return Number.isFinite(min) ? min : null;
    },
  );
  return { ...r, state, retry };
}
