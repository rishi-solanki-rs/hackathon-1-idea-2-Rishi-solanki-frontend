'use client';

import { useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { clearDemoData, useHydrated } from '@/lib/guestStore';
import { PLAN_KEY, resetPlanCache, usePlanDraft } from '@/lib/planStore';
import { useSync } from '@/lib/sync';
import { Button, Card, Skeleton } from './ui';

export function SettingsView() {
  const hydrated = useHydrated();
  const d = usePlanDraft();
  const sync = useSync();
  const [msg, setMsg] = useState('');
  if (!hydrated) return <Skeleton className="h-48" />;

  function exportData() {
    const blob = new Blob([JSON.stringify({ [PLAN_KEY]: d }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'a-una-milla-my-data.json';
    a.click();
    URL.revokeObjectURL(url);
    setMsg('Your data was downloaded as a JSON file.');
  }

  return (
    <div className="grid gap-6">
      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-xl">What is stored, and where</h2>
        <ul className="mt-3 grid list-disc gap-1 pl-5 text-sm text-ink-soft">
          <li>
            Your trip, cards (names and earn terms only), points balances and planned spending, in
            this browser.
          </li>
          <li>{sync.statusText}</li>
          <li>Recent search results for up to 10 minutes, in this tab’s session storage.</li>
          <li>We never store card numbers, CVV, PINs, passwords or passport data.</li>
        </ul>
        <p className="mt-3 text-sm text-ink-soft">
          Saved now: <strong className="text-ink">{d.profile.cards.length}</strong> card(s),{' '}
          <strong className="text-ink">{d.profile.balances.length}</strong> points balance(s),{' '}
          <strong className="text-ink">
            {d.profile.monthly.length + d.profile.purchases.length}
          </strong>{' '}
          spending item(s).
        </p>
      </Card>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={exportData}>
          <Download aria-hidden className="size-4" /> Export my data
        </Button>
        <Button
          variant="danger"
          onClick={async () => {
            await sync.deleteRemote();
            clearDemoData();
            resetPlanCache();
            setMsg(
              'All A Una Milla data was removed from this browser' +
                (sync.enabled ? ' and from your private account.' : '.'),
            );
          }}
        >
          <Trash2 aria-hidden className="size-4" /> Clear my data
        </Button>
      </div>
      <p role="status" aria-live="polite" className="text-sm font-medium text-saving">
        {msg}
      </p>
    </div>
  );
}
