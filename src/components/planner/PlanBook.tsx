'use client';

import { useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { CheckCircle2, FlaskConical, Loader2 } from 'lucide-react';
import {
  RepriceResponseSchema,
  TestOrderResponseSchema,
  type TestOrderResponse,
} from '@/contracts/booking';
import type { Money } from '@/domain/money';
import { Alert, Badge, Button, ButtonLink, Card } from '../ui';
import { dateOf, eur } from '../format';

type Phase =
  | { kind: 'review' }
  | { kind: 'working'; label: string }
  | { kind: 'changed'; from: Money; to: Money }
  | { kind: 'expired' }
  | { kind: 'error'; message: string }
  | { kind: 'done'; order: TestOrderResponse['data'] };

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { res, json: await res.json().catch(() => null) };
}

/** Test booking of a Duffel test offer from the plan: reprice first, then one idempotent order. */
export function PlanBook() {
  const sp = useSearchParams();
  const ref = sp.get('ref') ?? '';
  const exp = sp.get('exp') ?? undefined;
  const [total, setTotal] = useState<Money>({
    minor: Number(sp.get('total') ?? 0),
    currency: 'EUR',
  });
  const [phase, setPhase] = useState<Phase>({ kind: 'review' });
  const key = useRef('');

  if (!/^off_[A-Za-z0-9]+$/.test(ref) || !(total.minor > 0))
    return (
      <Alert
        kind="warn"
        title="This booking link is incomplete"
        action={<ButtonLink href="/plan">Back to my plan</ButtonLink>}
      >
        Open it from your plan’s fare list.
      </Alert>
    );

  async function confirm(confirmTotal: Money) {
    setPhase({ kind: 'working', label: 'Checking the latest test price…' });
    const rp = await post('/api/booking/reprice', {
      offerRef: ref,
      quotedTotal: confirmTotal,
      expiresAt: exp,
    });
    if (rp.res.status === 410) return setPhase({ kind: 'expired' });
    const p = RepriceResponseSchema.safeParse(rp.json);
    if (!rp.res.ok || !p.success)
      return setPhase({
        kind: 'error',
        message: rp.json?.error?.message ?? 'Could not check the price.',
      });
    if (p.data.data.priceChanged) {
      setTotal(p.data.data.total);
      return setPhase({ kind: 'changed', from: confirmTotal, to: p.data.data.total });
    }
    setPhase({ kind: 'working', label: 'Creating the test booking…' });
    key.current ||= crypto.randomUUID();
    const od = await post('/api/booking/test-order', {
      offerRef: ref,
      confirmTotal,
      expiresAt: exp,
      idempotencyKey: key.current,
    });
    if (od.res.status === 410) return setPhase({ kind: 'expired' });
    if (od.res.status === 409)
      return setPhase({
        kind: 'changed',
        from: confirmTotal,
        to: (od.json?.error?.details?.total as Money) ?? confirmTotal,
      });
    const o = TestOrderResponseSchema.safeParse(od.json);
    if (!od.res.ok || !o.success)
      return setPhase({
        kind: 'error',
        message: od.json?.error?.message ?? 'No booking was made.',
      });
    setPhase({ kind: 'done', order: o.data.data });
  }

  if (phase.kind === 'done')
    return (
      <Card className="border-sea p-6">
        <Badge tone="warn">
          <FlaskConical aria-hidden className="size-3" /> {phase.order.label}
        </Badge>
        <h1 className="mt-3 flex items-center gap-2 font-display text-2xl">
          <CheckCircle2 aria-hidden className="size-7 text-saving" /> Test booking created
        </h1>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-muted">Duffel test reference</dt>
            <dd className="font-mono text-lg font-semibold">{phase.order.reference}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Test total</dt>
            <dd className="font-semibold tabular">{eur(phase.order.total)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Traveller</dt>
            <dd className="font-semibold">{phase.order.passengers.join(', ')}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Mode</dt>
            <dd className="font-semibold">
              {phase.order.mode === 'DUFFEL_TEST' ? 'Duffel test mode (sandbox)' : 'Simulated'}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-ink-soft">
          No ticket was issued and no money was charged. To travel, book on the airline’s or an
          agent’s site.
        </p>
        <ButtonLink href="/plan" variant="secondary" className="mt-5">
          Back to my plan
        </ButtonLink>
      </Card>
    );

  return (
    <div className="grid gap-5">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-terracotta uppercase">
          Test booking
        </p>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl">
          {sp.get('carrier') ?? 'Flight'} · {dateOf(sp.get('dep') ?? '')}
          {sp.get('ret') ? ` → ${dateOf(sp.get('ret')!)}` : ''}
        </h1>
      </div>
      <Alert kind="warn" title="Test mode: nothing real is booked or charged">
        Duffel test mode uses a sandbox. The traveller is fictional and payment uses a test balance.
        We never ask for card details.
      </Alert>
      <Card className="flex flex-wrap items-baseline justify-between gap-3 p-5">
        <span className="font-semibold">Test total</span>
        <span className="font-display text-3xl tabular">{eur(total)}</span>
      </Card>
      {phase.kind === 'changed' ? (
        <Alert
          kind="warn"
          live
          title={`Price changed from ${eur(phase.from)} to ${eur(phase.to)}`}
          action={
            <Button onClick={() => confirm(phase.to)}>
              Accept {eur(phase.to)} and book (test)
            </Button>
          }
        >
          Nothing was booked yet.
        </Alert>
      ) : null}
      {phase.kind === 'expired' ? (
        <Alert
          kind="error"
          title="This test offer has expired"
          action={<ButtonLink href="/plan">Recalculate my plan</ButtonLink>}
        >
          Offers are held for a short time. Nothing was booked.
        </Alert>
      ) : null}
      {phase.kind === 'error' ? (
        <Alert
          kind="error"
          title="The test booking did not go through"
          action={
            <Button variant="secondary" onClick={() => setPhase({ kind: 'review' })}>
              Try again
            </Button>
          }
        >
          {phase.message}
        </Alert>
      ) : null}
      {phase.kind === 'review' || phase.kind === 'working' ? (
        <Button
          onClick={() => confirm(total)}
          disabled={phase.kind === 'working'}
          className="justify-self-end"
        >
          {phase.kind === 'working' ? (
            <>
              <Loader2 aria-hidden className="size-4 animate-spin" /> {phase.label}
            </>
          ) : (
            'Confirm test booking'
          )}
        </Button>
      ) : null}
      <p role="status" aria-live="polite" className="sr-only">
        {phase.kind === 'working' ? phase.label : ''}
      </p>
    </div>
  );
}
