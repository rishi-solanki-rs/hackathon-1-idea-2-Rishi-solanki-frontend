'use client';

import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import type { OptionDto, QuickSearchResponse } from '@/contracts/search';
import { useQuickResult } from '@/lib/useQuickResult';
import { Alert, Button, ButtonLink } from '../ui';
import { ResultsSkeleton } from './ResultsView';

/** Loads the search from the URL and hands the selected option to `children`. */
export function OptionPage({
  children,
}: {
  children: (ctx: {
    o: OptionDto;
    res: QuickSearchResponse;
    backHref: string;
    query: string;
  }) => ReactNode;
}) {
  const sp = useSearchParams();
  const optId = sp.get('opt');
  const { request, state, retry, query, hydrated } = useQuickResult();
  const base = query.replace(/&?opt=[^&]*/, '');
  const backHref = `/results?${base}`;
  const back = (
    <ButtonLink href={backHref} variant="ghost" className="-ml-3 w-fit px-3">
      <ArrowLeft aria-hidden className="size-4" /> Back to all options
    </ButtonLink>
  );

  if (!hydrated) return <ResultsSkeleton />;
  if (!request || !optId)
    return (
      <Alert
        kind="warn"
        title="This link is incomplete"
        action={<ButtonLink href="/">Start a new search</ButtonLink>}
      >
        The search details or the selected option are missing.
      </Alert>
    );
  if (state.kind === 'loading' || state.kind === 'idle')
    return <ResultsSkeleton label="Loading this option…" />;
  if (state.kind === 'error')
    return (
      <Alert
        kind="error"
        title="We could not load this option"
        action={
          <Button onClick={retry}>
            <RefreshCw aria-hidden className="size-4" /> Try again
          </Button>
        }
      >
        {state.error.message}
      </Alert>
    );
  const o = state.data.data.options.find((x) => x.id === optId);
  if (!o)
    return (
      <div className="grid gap-4">
        {back}
        <Alert
          kind="warn"
          title="This option is no longer in the results"
          action={<ButtonLink href={backHref}>See current options</ButtonLink>}
        >
          Prices may have been refreshed since you opened this link.
        </Alert>
      </div>
    );
  return (
    <div className="grid gap-6">
      {back}
      {children({ o, res: state.data, backHref, query: base })}
    </div>
  );
}
