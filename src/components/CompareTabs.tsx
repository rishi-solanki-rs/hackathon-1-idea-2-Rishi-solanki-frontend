'use client';

import { useState, type KeyboardEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { PlanBuilder } from './plan/PlanBuilder';
import { QuickSearchForm } from './QuickSearchForm';
import { Card } from './ui';
import { cn } from '@/lib/cn';

const TABS = [
  {
    id: 'one',
    label: 'One trip',
    help: 'One-way or return. We price it with Duffel test fares and compare cash with the points you saved in Plan my trip.',
  },
  {
    id: 'multi',
    label: 'Multi-city',
    help: 'Up to 6 flights (for example Madrid → Tokyo, Osaka → Madrid). We compare separate tickets, open-jaw and multi-city, and share your points across the trip.',
  },
] as const;

export function CompareTabs() {
  const params = useSearchParams();
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>(
    params.get('mode') === 'multi' ? 'multi' : 'one',
  );
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const next = tab === 'one' ? 'multi' : 'one';
    setTab(next);
    document.getElementById(`tab-${next}`)?.focus();
  };
  const active = TABS.find((t) => t.id === tab)!;
  return (
    <div className="grid gap-4">
      <div
        role="tablist"
        aria-label="Kind of trip"
        className="grid grid-cols-2 gap-1 rounded-full border border-line bg-surface p-1 sm:inline-grid sm:w-auto sm:justify-self-start"
        onKeyDown={onKey}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            className={cn(
              'min-h-11 rounded-full px-5 text-sm font-semibold',
              tab === t.id ? 'bg-sea text-white' : 'text-ink-soft hover:text-ink',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-ink-soft">{active.help}</p>
      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'one' ? (
          <Card className="p-4 sm:p-6">
            <QuickSearchForm />
          </Card>
        ) : (
          <PlanBuilder />
        )}
      </div>
    </div>
  );
}
