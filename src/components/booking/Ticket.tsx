import { Briefcase, Clock, Plane, RotateCcw, Users } from 'lucide-react';
import type { ItineraryDto } from '@/contracts/booking';
import type { Money } from '@/domain/money';
import { Badge, Card } from '../ui';
import { cityOf, dateOf, duration, eur, timeOf } from '../format';
import { cn } from '@/lib/cn';

const condText = { allowed: 'Yes', not_allowed: 'No', unknown: 'Not stated' } as const;

/** Boarding-pass style view of a Duffel test offer or order. */
export function Ticket({
  itinerary,
  total,
  passengers,
  reference,
  expiresAt,
  fallback,
  className,
}: {
  itinerary?: ItineraryDto;
  total: Money;
  passengers?: string[];
  reference?: string;
  expiresAt?: string;
  fallback?: { carrier?: string; from?: string; to?: string; dep?: string; ret?: string };
  className?: string;
}) {
  const slices = itinerary?.slices ?? [];
  return (
    <Card className={cn('anim-ticket-in overflow-hidden', className)} aria-label="Flight ticket">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-sea px-4 py-3 text-white sm:px-6">
        <span className="flex items-center gap-2 font-semibold">
          <Plane aria-hidden className="size-4" />{' '}
          {itinerary?.owner ?? fallback?.carrier ?? 'Flight'}
        </span>
        <span className="flex flex-wrap gap-1.5">
          {itinerary?.sandboxAirline ? (
            <Badge tone="gold">Sandbox airline · not a real flight</Badge>
          ) : null}
          <Badge tone="warn">Test mode</Badge>
        </span>
      </div>

      <div className="grid gap-5 p-4 sm:p-6">
        {slices.length ? (
          slices.map((s, i) => {
            const first = s.segments[0];
            const last = s.segments[s.segments.length - 1];
            const stops = Math.max(0, s.segments.length - 1);
            return (
              <section
                key={i}
                aria-label={`Flight ${i + 1}: ${s.from} to ${s.to}`}
                className="grid gap-3"
              >
                <p className="text-xs font-semibold tracking-[0.18em] text-terracotta uppercase">
                  {slices.length > 1
                    ? i === 0
                      ? 'Outbound'
                      : i === slices.length - 1
                        ? 'Return'
                        : `Flight ${i + 1}`
                    : 'Flight'}{' '}
                  · {first ? dateOf(first.departAt) : ''}
                </p>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div>
                    <p className="font-display text-3xl sm:text-4xl">{s.from}</p>
                    <p className="text-sm text-ink-soft">{s.fromCity ?? cityOf(s.from)}</p>
                    <p className="font-semibold tabular">{first ? timeOf(first.departAt) : ''}</p>
                  </div>
                  <div className="flex min-w-24 flex-col items-center gap-1 text-xs text-ink-muted sm:min-w-40">
                    <span className="flex items-center gap-1">
                      <Clock aria-hidden className="size-3" />{' '}
                      {duration(s.durationMin || first?.durationMin || 0)}
                    </span>
                    <span className="relative block h-5 w-full">
                      <span className="absolute top-1/2 right-0 left-0 border-t-2 border-dashed border-line" />
                      <Plane
                        aria-hidden
                        className="absolute top-1/2 left-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rotate-90 text-sea"
                      />
                    </span>
                    <span>
                      {stops === 0
                        ? 'Direct'
                        : `${stops} stop${stops > 1 ? 's' : ''} (${s.segments
                            .slice(0, -1)
                            .map((g) => g.to)
                            .join(', ')})`}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-3xl sm:text-4xl">{s.to}</p>
                    <p className="text-sm text-ink-soft">{s.toCity ?? cityOf(s.to)}</p>
                    <p className="font-semibold tabular">{last ? timeOf(last.arriveAt) : ''}</p>
                  </div>
                </div>
                <ul className="grid gap-1.5 rounded-xl bg-sand/60 p-3 text-sm">
                  {s.segments.map((g, j) => (
                    <li key={j} className="flex flex-wrap justify-between gap-x-3 gap-y-0.5">
                      <span>
                        <strong className="font-mono">{g.flightNumber || '—'}</strong> {g.from}{' '}
                        {timeOf(g.departAt)} → {g.to} {timeOf(g.arriveAt)}
                        {g.fromTerminal ? ` · T${g.fromTerminal}` : ''}
                      </span>
                      <span className="text-ink-soft">
                        {[
                          g.cabin,
                          g.operatingCarrier && g.operatingCarrier !== g.carrier
                            ? `operated by ${g.operatingCarrier}`
                            : null,
                          g.aircraft,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        ) : (
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <p className="font-display text-3xl">{fallback?.from ?? '—'}</p>
            <Plane aria-hidden className="size-5 rotate-90 text-sea" />
            <p className="text-right font-display text-3xl">{fallback?.to ?? '—'}</p>
            <p className="col-span-3 text-sm text-ink-soft">
              {fallback?.dep ? dateOf(fallback.dep) : ''}
              {fallback?.ret ? ` → ${dateOf(fallback.ret)}` : ''} · Loading flight details…
            </p>
          </div>
        )}

        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="flex items-center gap-1 text-ink-muted">
              <Users aria-hidden className="size-3.5" /> Travellers
            </dt>
            <dd className="font-semibold">{passengers?.length ?? itinerary?.passengers ?? '—'}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-ink-muted">
              <Briefcase aria-hidden className="size-3.5" /> Bags
            </dt>
            <dd className="font-semibold">
              {(() => {
                const g = slices[0]?.segments[0];
                if (!g || (g.checkedBags === undefined && g.carryOnBags === undefined))
                  return 'Not stated';
                return `${g.checkedBags ?? 0} checked · ${g.carryOnBags ?? 0} cabin`;
              })()}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-ink-muted">
              <RotateCcw aria-hidden className="size-3.5" /> Refundable
            </dt>
            <dd className="font-semibold">{itinerary ? condText[itinerary.refund] : '—'}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Changeable</dt>
            <dd className="font-semibold">{itinerary ? condText[itinerary.change] : '—'}</dd>
          </div>
        </dl>
      </div>

      <div className="ticket-perf grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-end sm:px-6">
        <div className="text-sm">
          {reference ? (
            <>
              <p className="text-ink-muted">Duffel test reference</p>
              <p className="font-mono text-2xl font-semibold tracking-widest">{reference}</p>
            </>
          ) : (
            <p className="text-ink-muted">
              Not booked yet
              {expiresAt
                ? ` · offer held until ${timeOf(expiresAt)}${expiresAt.endsWith('Z') ? ' UTC' : ''}`
                : ''}
            </p>
          )}
          {passengers?.length ? (
            <p className="mt-1 text-ink-soft">{passengers.join(', ')}</p>
          ) : null}
        </div>
        <div className="text-right">
          {itinerary?.baseAmount && itinerary.taxAmount ? (
            <p className="text-xs text-ink-muted">
              Fare {itinerary.currency} {itinerary.baseAmount} + taxes {itinerary.taxAmount}
            </p>
          ) : null}
          <p className="text-xs text-ink-muted">Test total</p>
          <p className="font-display text-3xl tabular">{eur(total)}</p>
        </div>
      </div>
    </Card>
  );
}
