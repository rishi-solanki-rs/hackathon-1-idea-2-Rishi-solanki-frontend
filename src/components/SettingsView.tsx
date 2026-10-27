'use client';

import { useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { clearDemoData, STORE_KEY, useGuest, useHydrated } from '@/lib/guestStore';
import { Button, Card, Skeleton } from './ui';

export function SettingsView() {
  const hydrated = useHydrated();
  const guest = useGuest();
  const [msg, setMsg] = useState('');
  if (!hydrated) return <Skeleton className="h-48" />;

  function exportData() {
    const blob = new Blob([JSON.stringify({ [STORE_KEY]: guest }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'a-una-milla-demo-data.json';
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
            Your wallet (points balances and values) and your ranking preference, in this browser’s
            local storage.
          </li>
          <li>Recent search results for up to 10 minutes, in this tab’s session storage.</li>
          <li>
            Nothing is sent to a database in this demo. Searches send your balances to our server
            only to compute the comparison; they are not saved.
          </li>
        </ul>
        <p className="mt-3 text-sm text-ink-soft">
          Current wallet:{' '}
          <strong className="text-ink">
            {guest.wallet.balances.length} programme{guest.wallet.balances.length === 1 ? '' : 's'}
          </strong>{' '}
          with points.
        </p>
      </Card>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={exportData}>
          <Download aria-hidden className="size-4" /> Export my data
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            clearDemoData();
            setMsg('All A Una Milla data was removed from this browser.');
          }}
        >
          <Trash2 aria-hidden className="size-4" /> Clear demo data
        </Button>
      </div>
      <p role="status" aria-live="polite" className="text-sm font-medium text-saving">
        {msg}
      </p>
    </div>
  );
}
