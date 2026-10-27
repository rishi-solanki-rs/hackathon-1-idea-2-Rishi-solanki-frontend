'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, FlaskConical, Loader2, RefreshCw } from 'lucide-react';
import {
  RepriceResponseSchema,
  TestOrderResponseSchema,
  type ItineraryDto,
  type TestOrderResponse,
} from '@/contracts/booking';
import type { Money } from '@/domain/money';
import { ATTEMPT_SETTLED_MS, ORDER_CLIENT_TIMEOUT_MS } from '@/lib/bookingTiming';
import { Alert, Badge, Button, ButtonLink } from '../ui';
import { Ticket } from '../booking/Ticket';
import { eur } from '../format';

type Phase =
  | { kind: 'review' }
  | { kind: 'working'; label: string }
  | { kind: 'changed'; from: Money; to: Money }
  | { kind: 'expired' }
  | { kind: 'error'; message: string }
  | { kind: 'unknown'; message: string }
  | { kind: 'not_booked' }
  | { kind: 'done'; order: TestOrderResponse['data'] };

async function post(url: string, body: unknown, timeoutMs = 45_000) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    return { res, json: await res.json().catch(() => null) };
  } catch {
    return { res: null, json: null };
  }
}

const newKey = () => crypto.randomUUID();

/** Each offer (URL) gets its own booking state and idempotency key; nothing carries over between offers. */
export function PlanBook() {
  const sp = useSearchParams();
  return <OfferBooking key={sp.toString()} />;
}

function OfferBooking() {
  const sp = useSearchParams();
  const ref = sp.get('ref') ?? '';
  const exp = sp.get('exp') ?? undefined;
  const [total, setTotal] = useState<Money>({
    minor: Number(sp.get('total') ?? 0),
    currency: 'EUR',
  });
  const [itinerary, setItinerary] = useState<ItineraryDto | undefined>();
  const [expiresAt, setExpiresAt] = useState(exp);
  const [phase, setPhase] = useState<Phase>({ kind: 'review' });
  const key = useRef(newKey());
  const attemptAt = useRef(0);
  const valid = /^(off_[A-Za-z0-9]+|fixture:[A-Za-z0-9_:.\-]+)$/.test(ref) && total.minor > 0;

  useEffect(() => {
    if (!valid) return;
    let cancel = false;
    void post('/api/booking/reprice', { offerRef: ref, quotedTotal: total, expiresAt: exp }).then(
      ({ res, json }) => {
        if (cancel || !res) return;
        if (res.status === 410) return setPhase({ kind: 'expired' });
        const p = RepriceResponseSchema.safeParse(json);
        if (!p.success) return;
        setItinerary(p.data.data.itinerary);
        if (p.data.data.expiresAt) setExpiresAt(p.data.data.expiresAt);
        if (p.data.data.priceChanged) {
          setPhase({ kind: 'changed', from: total, to: p.data.data.total });
          setTotal(p.data.data.total);
        }
      },
    );
    return () => {
      cancel = true;
    };
    // Load the ticket once per offer; the component is re-keyed when the offer changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!valid)
    return (
      <Alert
        kind="warn"
        title="This booking link is incomplete"
        action={<ButtonLink href="/plan">Back to my plan</ButtonLink>}
      >
        Open it from your plan’s fare list.
      </Alert>
    );

  async function order(confirmTotal: Money, checkOnly = false) {
    setPhase({
      kind: 'working',
      label: checkOnly ? 'Checking with Duffel…' : 'Creating the test booking…',
    });
    if (!checkOnly && !attemptAt.current) attemptAt.current = Date.now();
    const od = await post(
      '/api/booking/test-order',
      {
        offerRef: ref,
        confirmTotal,
        expiresAt,
        idempotencyKey: key.current,
        ...(checkOnly ? { checkOnly: true } : {}),
      },
      ORDER_CLIENT_TIMEOUT_MS,
    );
    if (od.json?.error?.details?.noOrderFound)
      return Date.now() - attemptAt.current >= ATTEMPT_SETTLED_MS
        ? setPhase({ kind: 'not_booked' })
        : setPhase({
            kind: 'unknown',
            message:
              'Duffel has no booking from this attempt yet; the first request may still be finishing. Check again in a minute.',
          });
    if (!od.res || od.res.status === 504 || od.json?.error?.code === 'OUTCOME_UNKNOWN')
      return setPhase({
        kind: 'unknown',
        message:
          od.json?.error?.message ??
          'The connection dropped before Duffel answered. The booking may or may not exist.',
      });
    if (od.res.status === 410) return setPhase({ kind: 'expired' });
    if (od.res.status === 409) {
      const to = (od.json?.error?.details?.total as Money) ?? confirmTotal;
      setTotal(to);
      return setPhase({ kind: 'changed', from: confirmTotal, to });
    }
    const o = TestOrderResponseSchema.safeParse(od.json);
    if (!od.res.ok || !o.success)
      return setPhase({
        kind: 'error',
        message:
          od.json?.error?.message ?? 'Duffel did not accept the booking. Nothing was booked.',
      });
    setPhase({ kind: 'done', order: o.data.data });
  }

  const done = phase.kind === 'done' ? phase.order : null;

  return (
    <div className="grid gap-5">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-terracotta uppercase">
          Test booking
        </p>
        <h1 className="mt-1 flex items-center gap-2 font-display text-2xl sm:text-3xl">
          {done ? (
            <>
              <CheckCircle2 aria-hidden className="size-7 text-saving" /> Test booking created
            </>
          ) : (
            'Check your flight, then confirm'
          )}
        </h1>
      </div>

      {done ? (
        <Badge tone="warn" className="justify-self-start">
          <FlaskConical aria-hidden className="size-3" /> {done.label}
        </Badge>
      ) : (
        <Alert kind="warn" title="Test mode: nothing real is booked or charged">
          Duffel test mode uses a sandbox. Travellers are fictional and payment uses a test balance.
          We never ask for card details.
        </Alert>
      )}

      <Ticket
        itinerary={done?.itinerary ?? itinerary}
        total={done?.total ?? total}
        passengers={done?.passengers}
        reference={done?.reference}
        expiresAt={done ? undefined : expiresAt}
        fallback={{
          carrier: sp.get('carrier') ?? undefined,
          from: sp.get('from') ?? undefined,
          to: sp.get('to') ?? undefined,
          dep: sp.get('dep') ?? undefined,
          ret: sp.get('ret') ?? undefined,
        }}
      />

      {phase.kind === 'changed' ? (
        <Alert
          kind="warn"
          live
          title={`Price changed from ${eur(phase.from)} to ${eur(phase.to)}`}
          action={
            <Button onClick={() => order(phase.to)}>Accept {eur(phase.to)} and book (test)</Button>
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
      {phase.kind === 'unknown' ? (
        <Alert
          kind="warn"
          live
          title="We could not confirm the booking yet"
          action={
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => order(total, true)}>
                <RefreshCw aria-hidden className="size-4" /> Check again
              </Button>
              <ButtonLink href="/plan" variant="ghost">
                Back to my plan
              </ButtonLink>
            </div>
          }
        >
          {phase.message} “Check again” only looks the booking up; it never books a second time.
        </Alert>
      ) : null}
      {phase.kind === 'not_booked' ? (
        <Alert
          kind="info"
          live
          title="No booking was made"
          action={
            <Button
              onClick={() => {
                key.current = newKey();
                attemptAt.current = 0;
                void order(total);
              }}
            >
              Book again (test)
            </Button>
          }
        >
          Duffel confirmed it has no booking from the earlier attempt, so you can safely try again.
        </Alert>
      ) : null}

      {done ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-soft">
            No ticket was issued and no money was charged. To travel, book on the airline’s or an
            agent’s site.
          </p>
          <ButtonLink href="/plan" variant="secondary">
            Back to my plan
          </ButtonLink>
        </div>
      ) : phase.kind === 'review' || phase.kind === 'working' ? (
        <Button
          onClick={() => order(total)}
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
