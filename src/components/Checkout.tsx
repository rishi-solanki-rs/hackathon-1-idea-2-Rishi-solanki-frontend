'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, FlaskConical, Loader2 } from 'lucide-react';
import {
  RepriceResponseSchema,
  TestOrderResponseSchema,
  type TestOrderResponse,
} from '@/contracts/booking';
import type { OptionDto } from '@/contracts/search';
import type { Money } from '@/domain/money';
import { Alert, Badge, Button, ButtonLink, Card } from './ui';
import { eur } from './format';
import { OptionPage } from './results/OptionPage';
import { Itinerary, optionTitle } from './results/OptionSummary';

type Phase =
  | { kind: 'review' }
  | { kind: 'working'; label: string }
  | { kind: 'price_changed'; from: Money; to: Money }
  | { kind: 'expired' }
  | { kind: 'error'; message: string }
  | { kind: 'done'; order: TestOrderResponse['data'] };

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { res, json };
}

function CheckoutInner({ o, backHref }: { o: OptionDto; backHref: string }) {
  const [phase, setPhase] = useState<Phase>({ kind: 'review' });
  const [total, setTotal] = useState<Money>(o.cashToday);
  const key = useRef<string>('');

  async function confirm(confirmTotal: Money) {
    if (!o.offerRef) return;
    setPhase({ kind: 'working', label: 'Checking the latest price…' });
    const rp = await post('/api/booking/reprice', {
      offerRef: o.offerRef,
      quotedTotal: confirmTotal,
      expiresAt: o.expiresAt,
    });
    if (rp.res.status === 410) return setPhase({ kind: 'expired' });
    const parsed = RepriceResponseSchema.safeParse(rp.json);
    if (!rp.res.ok || !parsed.success)
      return setPhase({
        kind: 'error',
        message: rp.json?.error?.message ?? 'Could not check the price.',
      });
    if (parsed.data.data.priceChanged) {
      setTotal(parsed.data.data.total);
      return setPhase({ kind: 'price_changed', from: confirmTotal, to: parsed.data.data.total });
    }
    setPhase({ kind: 'working', label: 'Creating your test booking…' });
    key.current ||= crypto.randomUUID();
    const od = await post('/api/booking/test-order', {
      offerRef: o.offerRef,
      confirmTotal,
      expiresAt: o.expiresAt,
      idempotencyKey: key.current,
    });
    if (od.res.status === 410) return setPhase({ kind: 'expired' });
    if (od.res.status === 409) {
      const to = od.json?.error?.details?.total as Money | undefined;
      if (to) setTotal(to);
      return setPhase({ kind: 'price_changed', from: confirmTotal, to: to ?? confirmTotal });
    }
    const op = TestOrderResponseSchema.safeParse(od.json);
    if (!od.res.ok || !op.success)
      return setPhase({
        kind: 'error',
        message: od.json?.error?.message ?? 'No booking was made.',
      });
    setPhase({ kind: 'done', order: op.data.data });
  }

  if (phase.kind === 'done')
    return (
      <Card className="border-sea p-6">
        <Badge tone="warn">
          <FlaskConical aria-hidden className="size-3" /> {phase.order.label}
        </Badge>
        <h1 className="mt-3 flex items-center gap-2 font-display text-2xl sm:text-3xl">
          <CheckCircle2 aria-hidden className="size-7 text-saving" /> Test booking created
        </h1>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-muted">Test reference</dt>
            <dd className="font-mono text-lg font-semibold">{phase.order.reference}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Mode</dt>
            <dd className="font-semibold">
              {phase.order.mode === 'SIMULATED'
                ? 'Simulated (fixture fare)'
                : 'Duffel test mode (sandbox airline)'}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">Test total</dt>
            <dd className="font-semibold tabular">{eur(phase.order.total)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Traveller</dt>
            <dd className="font-semibold">{phase.order.passengers.join(', ')}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-ink-soft">
          No ticket was issued, no seat is held for you and no money was charged. To travel, book on
          the airline’s or a travel agent’s site.
        </p>
        <ButtonLink href={backHref} variant="secondary" className="mt-5">
          Back to results
        </ButtonLink>
      </Card>
    );

  return (
    <>
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-terracotta uppercase">
          Test checkout
        </p>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl">{optionTitle(o)}</h1>
      </div>
      <Alert kind="warn" title="Test mode: nothing real is booked or charged">
        This demonstrates the booking flow with a fictional traveller. No ticket is issued and no
        payment is taken. We never ask for card details.
      </Alert>
      <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
        <Card className="p-5">
          <h2 className="font-display text-xl">Flights</h2>
          <div className="mt-3">
            <Itinerary o={o} />
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-display text-xl">Traveller (fictional)</h2>
          <dl className="mt-3 grid gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Name</dt>
              <dd className="font-medium">Lucia Demo</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Email</dt>
              <dd className="font-medium">lucia.demo@example.com</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Payment</dt>
              <dd className="font-medium">Test balance (no card)</dd>
            </div>
          </dl>
          <p className="mt-4 flex items-baseline justify-between border-t border-line pt-3">
            <span className="font-semibold">Test total</span>
            <span className="font-display text-2xl tabular">{eur(total)}</span>
          </p>
        </Card>
      </div>

      {phase.kind === 'price_changed' ? (
        <Alert
          kind="warn"
          title={`Price changed from ${eur(phase.from)} to ${eur(phase.to)}`}
          live
          action={
            <Button onClick={() => confirm(phase.to)}>
              Accept {eur(phase.to)} and book (test)
            </Button>
          }
        >
          Prices can change between search and booking. Nothing was booked yet.
        </Alert>
      ) : null}
      {phase.kind === 'expired' ? (
        <Alert
          kind="error"
          title="This price has expired"
          action={<ButtonLink href={backHref}>Search again</ButtonLink>}
        >
          Offers are held for a short time only. Nothing was booked.
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
          className="w-full sm:w-auto sm:justify-self-end"
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
    </>
  );
}

export function CheckoutView() {
  return (
    <OptionPage>
      {({ o, backHref }) =>
        o.kind !== 'cash' || !o.offerRef ? (
          <Alert
            kind="info"
            title="This option cannot be booked here"
            action={<ButtonLink href={backHref}>Back to options</ButtonLink>}
          >
            Only cash fares can be test-booked. For points, use the award steps.
          </Alert>
        ) : (
          <CheckoutInner o={o} backHref={backHref} />
        )
      }
    </OptionPage>
  );
}
