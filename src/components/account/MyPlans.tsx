'use client';

import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { supabase, useAuth } from '@/lib/auth';
import { deletePlanRow } from '@/lib/accountData';
import { Alert, Badge, Button, ButtonLink, Card, Skeleton } from '../ui';
import { cityOf } from '../format';

type Row = {
  id: string;
  created_at: string;
  verdict: string;
  result: {
    trip: {
      origin: string;
      destination: string;
      earliestDepart: string;
      latestDepart: string;
      adults: number;
    };
    comparison: { cashFareMinor: number | null };
    flights: { provider: string };
  };
};

const VERDICT: Record<string, string> = {
  BOOK_CASH_NOW: 'Book the cash fare',
  AWARD_WORTH_CHECKING: 'Points look worth it',
  MONITOR_NO_TRANSFER: 'Wait for award seats',
  ACCUMULATE_FROM_PLANNED_SPEND: 'Earn the missing points',
  CASH_BETTER: 'Cash is better',
  INSUFFICIENT_BY_DEADLINE: 'Not enough points in time',
  TOO_UNCERTAIN: 'Too uncertain',
};

export function MyPlans() {
  const auth = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sb = supabase();
    if (!auth.userId || !sb) return;
    let cancel = false;
    void sb
      .from('plans')
      .select('id, created_at, verdict, result')
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data, error: e }) => {
        if (cancel) return;
        if (e) setError('Could not load your plans.');
        else setRows((data ?? []) as Row[]);
      });
    return () => {
      cancel = true;
    };
  }, [auth.userId]);

  if (!auth.ready) return <Skeleton className="h-40" />;
  if (!auth.session)
    return (
      <Alert
        kind="info"
        title="Log in to see your saved plans"
        action={<ButtonLink href="/login?next=/my-plans">Log in</ButtonLink>}
      >
        Plans you build while logged in are saved here automatically.
      </Alert>
    );
  if (error && !rows) return <Alert kind="error" title={error} />;
  if (!rows) return <Skeleton className="h-40" />;
  if (!rows.length)
    return (
      <Alert
        kind="info"
        title="No saved plans yet"
        action={<ButtonLink href="/plan">Plan my trip</ButtonLink>}
      >
        Build a plan and it will appear here.
      </Alert>
    );

  return (
    <ul className="grid gap-3">
      {error ? (
        <li>
          <Alert kind="error" title={error} />
        </li>
      ) : null}
      {rows.map((r) => (
        <li key={r.id}>
          <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-semibold">
                {cityOf(r.result.trip.origin)} → {cityOf(r.result.trip.destination)}
              </p>
              <p className="text-sm text-ink-soft">
                {r.result.trip.earliestDepart} – {r.result.trip.latestDepart} ·{' '}
                {r.result.trip.adults} adult{r.result.trip.adults > 1 ? 's' : ''} · saved{' '}
                {new Date(r.created_at).toLocaleString('en-GB')}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone="sea">{VERDICT[r.verdict] ?? r.verdict}</Badge>
                {r.result.comparison.cashFareMinor !== null ? (
                  <Badge>
                    Cash fare €{(r.result.comparison.cashFareMinor / 100).toFixed(0)} (
                    {r.result.flights.provider === 'duffel_test' ? 'Duffel test' : 'example'})
                  </Badge>
                ) : null}
              </div>
            </div>
            <Button
              variant="ghost"
              aria-label="Delete this saved plan"
              onClick={async () => {
                const sb = supabase();
                if (!sb) return;
                const res = await deletePlanRow(sb, r.id);
                if (!res.ok) return setError(res.message);
                setError(null);
                setRows((x) => x?.filter((y) => y.id !== r.id) ?? null);
              }}
            >
              <Trash2 aria-hidden className="size-4" />
            </Button>
          </Card>
        </li>
      ))}
    </ul>
  );
}
