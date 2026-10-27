'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, FlaskConical, Loader2 } from 'lucide-react';
import {
  RepriceResponseSchema,
  TestOrderResponseSchema,
  type ItineraryDto,
  type TestOrderResponse,
} from '@/contracts/booking';
import type { OptionDto } from '@/contracts/search';
import type { Money } from '@/domain/money';
import { Ticket, itineraryFromOption } from './booking/Ticket';
import { Alert, Badge, Button, ButtonLink, Card } from './ui';
import { eur } from './format';
import { OptionPage } from './results/OptionPage';
import { optionTitle } from './results/OptionSummary';

type Phase =
  | { kind: 'review' }
  | { kind: 'working'; label: string }
  | { kind: 'price_changed'; from: Money; to: Money }
  | { kind: 'expired' }
  | { kind: 'error'; message: string }
  | { kind: 'unknown'; message: string }
  | { kind: 'done'; order: TestOrderResponse['data'] };

async function post(url: string, body: unknown) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45_000),
    });
    return { res, json: await res.json().catch(() => null) };
  } catch {
    return { res: null, json: null };
  }
}

function CheckoutInner({ o, backHref }: { o: OptionDto; backHref: string }) {
  const [phase, setPhase] = useState<Phase>({ kind: 'review' });
  const [total, setTotal] = useState<Money>(o.cashToday);
  const [itinerary, setItinerary] = useState<ItineraryDto>(() => itineraryFromOption(o));
  const key = useRef<string>('');

  async function confirm(confirmTotal: Money, checkOnly = false) {
    if (!o.offerRef) return;
    if (checkOnly) return placeOrder(confirmTotal, true);
    setPhase({ kind: 'working', label: 'Checking the latest price…' });
    const rp = await post('/api/booking/reprice', {
      offerRef: o.offerRef,
      quotedTotal: confirmTotal,
      expiresAt: o.expiresAt,
    });
    if (!rp.res)
      return setPhase({
        kind: 'error',
        message: 'Could not reach the server. Nothing was booked.',
      });
    if (rp.res.status === 410) return setPhase({ kind: 'expired' });
    const parsed = RepriceResponseSchema.safeParse(rp.json);
    if (!rp.res.ok || !parsed.success)
      return setPhase({
        kind: 'error',
        message: rp.json?.error?.message ?? 'Could not check the price.',
      });
    if (parsed.data.data.itinerary) setItinerary(parsed.data.data.itinerary);
    if (parsed.data.data.priceChanged) {
      setTotal(parsed.data.data.total);
      return setPhase({ kind: 'price_changed', from: confirmTotal, to: parsed.data.data.total });
    }
    return placeOrder(confirmTotal, false);
  }

  async function placeOrder(confirmTotal: Money, checkOnly: boolean) {
    setPhase({
      kind: 'working',
      label: checkOnly ? 'Checking with Duffel…' : 'Creating your test booking…',
    });
    key.current ||= crypto.randomUUID();
    const od = await post('/api/booking/test-order', {
      offerRef: o.offerRef,
      confirmTotal,
      expiresAt: o.expiresAt,
      idempotencyKey: key.current,
      ...(checkOnly ? { checkOnly: true } : {}),
    });
    if (!od.res || od.res.status === 504)
      return setPhase({
        kind: 'unknown',
        message:
          od.json?.error?.message ??
          'The connection dropped before Duffel answered. The booking may or may not exist.',
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
        message:
          od.json?.error?.message ?? 'Duffel did not accept the booking. Nothing was booked.',
      });
    setPhase({ kind: 'done', order: op.data.data });
  }

  if (phase.kind === 'done')
    return (
      <div className="grid gap-5">
        <div>
          <Badge tone="warn">
            <FlaskConical aria-hidden className="size-3" /> {phase.order.label}
          </Badge>
          <h1 className="mt-3 flex items-center gap-2 font-display text-2xl sm:text-3xl">
            <CheckCircle2 aria-hidden className="size-7 text-saving" /> Test booking created
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Mode:{' '}
            <strong>
              {phase.order.mode === 'SIMULATED'
                ? 'Simulated (fixture fare)'
                : 'Duffel test mode (sandbox airline)'}
            </strong>
          </p>
        </div>

        <Ticket
          itinerary={phase.order.itinerary ?? itinerary}
          total={phase.order.total}
          passengers={phase.order.passengers}
          reference={phase.order.reference}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-soft">
            No ticket was issued, no seat is held for you and no money was charged. To travel, book
            on the airline’s or a travel agent’s site.
          </p>
          <ButtonLink href={backHref} variant="secondary">
            Back to results
          </ButtonLink>
        </div>
      </div>
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

      <Ticket itinerary={itinerary} total={total} expiresAt={o.expiresAt} />

      <Card className="p-4 sm:p-5">
        <h2 className="font-display text-lg">Travellers (fictional, for the test)</h2>
        <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-ink-muted">Names</dt>
            <dd className="font-medium">Lucia Demo, Mateo Demo… (one per adult)</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Email</dt>
            <dd className="font-medium">example.com addresses only</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Payment</dt>
            <dd className="font-medium">Test balance (no card)</dd>
          </div>
        </dl>
      </Card>

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
      {phase.kind === 'unknown' ? (
        <Alert
          kind="warn"
          live
          title="We could not confirm the booking yet"
          action={<Button onClick={() => confirm(total, true)}>Check again</Button>}
        >
          {phase.message} “Check again” only looks the booking up; it never books a second time.
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
          <CheckoutInner key={o.id} o={o} backHref={backHref} />
        )
      }
    </OptionPage>
  );
}
