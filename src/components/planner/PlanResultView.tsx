'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  Ban,
  Bot,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  CreditCard,
  Eye,
  ListChecks,
  Pencil,
  Plane,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { ExplainResponseSchema, PlanResponseSchema, type PlanResultDto } from '@/contracts/plan';
import type { PriceTrend } from '@/domain/bookingWindow';
import type { PlanResult } from '@/domain/plan';
import { diffPlans } from '@/domain/replan';
import { programById } from '@/fixtures/catalogue';
import { CATEGORY_LABELS } from '@/fixtures/cardCatalogue';
import { buildRequest } from '@/lib/planConvert';
import { writePlan, type PlanDraft } from '@/lib/planStore';
import { recordPrice, tripKey } from '@/lib/priceWatch';
import { savePlanResult } from '@/lib/sync';
import type { Outcome } from '@/lib/accountData';
import { useCachedPost } from '@/lib/useApi';
import { hash } from '@/providers/fixtures/schedule';
import { Alert, Badge, Button, ButtonLink, Card, Skeleton } from '../ui';
import { airportLabel, dateOf } from '../format';

const LAST_KEY = 'aum.plan.last.v1';
const eur = (minor: number | null | undefined, cents = false) =>
  minor === null || minor === undefined
    ? '—'
    : new Intl.NumberFormat('en-IE', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: cents ? 2 : 0,
        minimumFractionDigits: cents ? 2 : 0,
      }).format(minor / 100);
const pts = (n: number) => n.toLocaleString('en-IE');
const progName = (id: string) => programById(id)?.name ?? id;
const unit = (id: string) => programById(id)?.unit ?? 'points';
const rate = (n: number) => Number(n.toFixed(2)).toLocaleString('en-IE');

const OUTCOME: Record<
  PlanResultDto['verdict']['outcome'],
  { title: string; tone: 'saving' | 'sea' | 'warn' | 'neutral' }
> = {
  BOOK_CASH_NOW: { title: 'Book the cash fare', tone: 'sea' },
  AWARD_WORTH_CHECKING: { title: 'Use your points: check the seat first', tone: 'saving' },
  MONITOR_NO_TRANSFER: { title: 'Wait for award seats; don’t transfer yet', tone: 'warn' },
  ACCUMULATE_FROM_PLANNED_SPEND: {
    title: 'Your normal spending can close the gap',
    tone: 'saving',
  },
  CASH_BETTER: { title: 'Paying cash is better', tone: 'sea' },
  INSUFFICIENT_BY_DEADLINE: { title: 'Not enough points in time: book cash', tone: 'warn' },
  TOO_UNCERTAIN: { title: 'Not enough information yet', tone: 'neutral' },
};

const actionIcon = {
  do: CheckCircle2,
  verify: Eye,
  dont: Ban,
  deadline: CalendarClock,
  missing: CircleHelp,
  recalc: RefreshCw,
  fallback: ListChecks,
};

function Section({
  id,
  icon,
  title,
  aside,
  children,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="p-4 sm:p-6" role="region" aria-labelledby={id}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={id} className="flex items-center gap-2 font-display text-xl">
          {icon}
          {title}
        </h2>
        {aside}
      </div>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

function Fold({
  summary,
  children,
  onToggle,
}: {
  summary: ReactNode;
  children: ReactNode;
  onToggle?: (open: boolean) => void;
}) {
  return (
    <details
      className="group rounded-[var(--radius-card)] border border-line bg-surface"
      onToggle={(e) => onToggle?.((e.target as HTMLDetailsElement).open)}
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 font-semibold sm:px-6 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">{summary}</span>
        <ChevronDown aria-hidden className="size-4 shrink-0 transition group-open:rotate-180" />
      </summary>
      <div className="border-t border-line px-4 py-4 sm:px-6">{children}</div>
    </details>
  );
}

export function PlanResultView({ d, onEdit }: { d: PlanDraft; onEdit: (step: number) => void }) {
  const useExample = !!d.exampleFares;
  const setUseExample = (v: boolean) => writePlan((x) => ({ ...x, exampleFares: v }));
  const req = useMemo(() => buildRequest(d, useExample), [d, useExample]);
  const key = req.success ? `plan.${hash(JSON.stringify(req.data)).toString(36)}` : null;
  const [state, retry] = useCachedPost(
    key,
    '/api/plan/compute',
    req.success ? req.data : null,
    PlanResponseSchema,
    (r) => {
      const m = Math.min(
        ...r.data.flights.quotes.map((q) => (q.expiresAt ? Date.parse(q.expiresAt) : Infinity)),
      );
      return Number.isFinite(m) ? m : null;
    },
  );
  const [prev] = useState<{ key: string; result: PlanResultDto } | null>(() => {
    try {
      return JSON.parse(window.localStorage.getItem(LAST_KEY) ?? 'null');
    } catch {
      return null;
    }
  });
  const [trend, setTrend] = useState<PriceTrend | null>(null);
  const [saved, setSaved] = useState<Outcome | null>(null);
  const result = state.kind === 'success' ? state.data.data : null;
  useEffect(() => {
    if (!result || !key) return;
    try {
      window.localStorage.setItem(LAST_KEY, JSON.stringify({ key, result }));
    } catch {
      /* ignore */
    }
    void savePlanResult(key, result).then((r) => setSaved(r));
    if (result.flights.provider !== 'duffel_test') return;
    const t = recordPrice(tripKey(result.trip), result.flights.cheapest?.totalMinor ?? null);
    void Promise.resolve().then(() => setTrend(t));
  }, [result, key]);

  if (!req.success)
    return (
      <Alert
        kind="warn"
        title="Some answers need another look"
        action={<Button onClick={() => onEdit(0)}>Review my answers</Button>}
      >
        Go back through the steps; the field that needs attention is marked in red.
      </Alert>
    );
  if (state.kind === 'loading' || state.kind === 'idle')
    return (
      <div role="status" aria-live="polite" className="grid gap-4">
        <p className="text-sm font-medium text-ink-soft">
          Building your plan: pricing up to 7 departure dates (Duffel test mode)…
        </p>
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
      </div>
    );
  if (state.kind === 'error')
    return (
      <Alert
        kind="error"
        title="We could not build your plan"
        action={
          <Button onClick={retry}>
            <RefreshCw aria-hidden className="size-4" /> Try again
          </Button>
        }
      >
        {state.error.message}
      </Alert>
    );

  const r = result!;
  const diff =
    prev && prev.key !== key
      ? diffPlans(prev.result as unknown as PlanResult, r as unknown as PlanResult)
      : null;
  const o = OUTCOME[r.verdict.outcome];
  const cheapest = r.flights.cheapest;
  const bookHref =
    cheapest?.offerRef && r.flights.provider === 'duffel_test'
      ? `/plan/book?${new URLSearchParams({ ref: cheapest.offerRef, total: String(cheapest.totalMinor), dep: cheapest.depart, ...(cheapest.ret ? { ret: cheapest.ret } : {}), ...(cheapest.expiresAt ? { exp: cheapest.expiresAt } : {}), carrier: cheapest.carrier }).toString()}`
      : null;
  const useAward =
    r.verdict.outcome === 'AWARD_WORTH_CHECKING' ||
    r.verdict.outcome === 'ACCUMULATE_FROM_PLANNED_SPEND' ||
    r.verdict.outcome === 'MONITOR_NO_TRANSFER';
  const site = programById(r.target)?.website;
  const steps = r.actions.filter((a) => a.kind !== 'recalc' && a.kind !== 'missing');

  return (
    <div className="grid gap-4 sm:gap-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.18em] text-terracotta uppercase">
            Your plan
          </p>
          <h2 className="mt-1 font-display text-2xl sm:text-3xl">
            {airportLabel(r.trip.origin)} → {airportLabel(r.trip.destination)}
          </h2>
          <p className="text-sm text-ink-soft">
            {r.trip.earliestDepart === r.trip.latestDepart
              ? dateOf(r.trip.earliestDepart)
              : `${dateOf(r.trip.earliestDepart)} – ${dateOf(r.trip.latestDepart)}`}{' '}
            · {r.trip.adults} adult{r.trip.adults > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="secondary"
            className="px-3 sm:px-4"
            onClick={() => onEdit(0)}
            aria-label="Edit answers"
          >
            <Pencil aria-hidden className="size-4" /> <span className="hidden sm:inline">Edit</span>
          </Button>
          <Button
            variant="secondary"
            className="px-3 sm:px-4"
            onClick={retry}
            aria-label="Recalculate"
          >
            <RefreshCw aria-hidden className="size-4" />{' '}
            <span className="hidden sm:inline">Recalculate</span>
          </Button>
        </div>
      </header>

      {saved ? (
        <p
          role="status"
          className={`text-sm font-medium ${saved.ok ? 'text-saving' : 'text-danger'}`}
        >
          {saved.ok ? 'Saved to My plans.' : saved.message}
        </p>
      ) : null}

      {diff?.changed ? (
        <Alert kind="info" title="What changed since your last plan" live>
          {[
            ...diff.outcome,
            ...diff.moved.map((m) => ({ ...m, field: `Card for ${m.field}` })),
          ].map((c) => (
            <span key={c.field} className="block">
              {c.field}: {c.before.replaceAll('_', ' ').toLowerCase()} →{' '}
              <strong>{c.after.replaceAll('_', ' ').toLowerCase()}</strong>
            </span>
          ))}
          {diff.causes.length ? (
            <span className="block text-xs">Because: {diff.causes.join(' · ')}</span>
          ) : null}
        </Alert>
      ) : null}

      <Card className="overflow-hidden" aria-labelledby="verdict-h">
        <div className="p-4 sm:p-6">
          <div className="flex flex-wrap gap-2">
            <Badge tone={o.tone}>Our recommendation</Badge>
            {r.verdict.confidence !== 'medium' ? (
              <Badge tone="warn">Confidence: {r.verdict.confidence}</Badge>
            ) : null}
          </div>
          <h2 id="verdict-h" className="mt-3 font-display text-3xl leading-tight">
            {o.title}
          </h2>
          <p className="mt-2 text-ink-soft">{r.verdict.reasons[0]}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-sand/70 p-3">
              <dt className="text-xs font-semibold text-ink-muted">
                Cash fare ({r.flights.provider === 'duffel_test' ? 'test data' : 'example'})
              </dt>
              <dd className="mt-1 font-display text-2xl tabular">
                {eur(r.comparison.cashFareMinor)}
              </dd>
            </div>
            <div className="rounded-xl bg-sand/70 p-3">
              <dt className="text-xs font-semibold text-ink-muted">
                With points{r.award?.source === 'ILLUSTRATIVE' ? ' (estimate)' : ''}
              </dt>
              <dd className="mt-1 font-display text-2xl tabular">
                {r.award ? eur(r.comparison.awardEconomicMinor) : '—'}
              </dd>
            </div>
            <div className="col-span-2 rounded-xl bg-sand/70 p-3 sm:col-span-1">
              <dt className="text-xs font-semibold text-ink-muted">Book by</dt>
              <dd className="mt-1 font-display text-2xl">{dateOf(r.verdict.lsbd)}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            {useAward && site ? (
              <a
                href={site}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-sea px-5 py-2.5 text-sm font-semibold text-white hover:bg-sea-dark"
              >
                Check seats on {progName(r.target)} <ArrowRight aria-hidden className="size-4" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : bookHref ? (
              <ButtonLink href={bookHref}>
                Book this fare in test mode <ArrowRight aria-hidden className="size-4" />
              </ButtonLink>
            ) : null}
            {useAward && bookHref ? (
              <ButtonLink href={bookHref} variant="secondary">
                Or book the cash fare (test)
              </ButtonLink>
            ) : null}
          </div>
        </div>
      </Card>

      <Section
        id="next-h"
        icon={<ListChecks aria-hidden className="size-5 text-sea" />}
        title="Next steps"
      >
        <ol className="grid gap-2">
          {steps.slice(0, 3).map((a, i) => (
            <Step key={a.id} a={a} n={i + 1} />
          ))}
        </ol>
        {steps.length > 3 || r.actions.length > steps.length ? (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-semibold text-sea-dark">
              All steps ({r.actions.length})
            </summary>
            <ol className="mt-2 grid gap-2">
              {[...steps.slice(3), ...r.actions.filter((a) => !steps.includes(a))].map((a, i) => (
                <Step key={a.id} a={a} n={i + 4} />
              ))}
            </ol>
          </details>
        ) : null}
      </Section>

      <WhenToBook r={r} trend={trend} retry={retry} setUseExample={setUseExample} />
      <YourCards r={r} onEdit={onEdit} />

      <Section
        id="points-h"
        icon={<Wallet aria-hidden className="size-5 text-sea" />}
        title={`Your points (${unit(r.target)})`}
      >
        <dl className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-ink-muted">You have</dt>
            <dd className="text-lg font-semibold tabular">{pts(r.pointsNow.usable)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Trip needs</dt>
            <dd className="text-lg font-semibold tabular">{r.award ? pts(r.award.points) : '—'}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Ready</dt>
            <dd className="text-lg font-semibold">
              {r.pointsReady === 'now'
                ? 'Now'
                : r.pointsReady
                  ? dateOf(r.pointsReady)
                  : r.award
                    ? 'Not in time'
                    : '—'}
            </dd>
          </div>
        </dl>
        {r.award ? (
          <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
            {pts(r.award.points)} {unit(r.award.program)} +{' '}
            {eur(Math.round(r.award.taxesEur * 100), true)} taxes
            {r.award.source === 'ILLUSTRATIVE' ? (
              <Badge tone="gold">Rough estimate, not a programme price</Badge>
            ) : (
              <Badge tone="sea">Your input</Badge>
            )}
            <span>Seat not confirmed.</span>
          </p>
        ) : null}
        {r.pointsNow.viaTransfer > 0 ? (
          <p className="mt-2 text-sm text-ink-soft">
            Includes {pts(r.pointsNow.viaTransfer)} you could transfer from a bank programme, only
            after the seat is confirmed.
          </p>
        ) : null}
        {r.earnings.dated.length ? (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-semibold text-sea-dark">
              When new points arrive
            </summary>
            <ol className="mt-2 grid gap-1 text-sm">
              {r.earnings.dated.slice(0, 12).map((e, i) => (
                <li key={i} className="flex justify-between gap-3 border-b border-line py-1">
                  <span>
                    {dateOf(e.date)} · {e.label}
                  </span>
                  <span className="tabular">+{pts(e.points)}</span>
                </li>
              ))}
            </ol>
          </details>
        ) : null}
      </Section>

      <AiExplanation plan={r} />

      <Fold summary={<>How this was calculated</>}>
        <CardTable r={r} />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <section>
            <h3 className="text-sm font-semibold">Assumptions</h3>
            <ul className="mt-1 grid list-disc gap-1 pl-5 text-sm text-ink-soft">
              {r.assumptions.map((x) => (
                <li key={x}>{x}</li>
              ))}
              <li>
                A new card takes about 14 days to arrive; ordinary points post after about 30 days.
              </li>
            </ul>
          </section>
          <section>
            <h3 className="text-sm font-semibold">Missing or unverified</h3>
            <ul className="mt-1 grid list-disc gap-1 pl-5 text-sm text-ink-soft">
              {[...r.missing, ...r.confidenceReasons].map((x) => (
                <li key={x}>{x}</li>
              ))}
              {!r.missing.length && !r.confidenceReasons.length ? <li>Nothing flagged.</li> : null}
            </ul>
          </section>
        </div>
        <p className="mt-3 text-xs text-ink-muted">
          Engine {r.engineVersion} · computed {r.today} · fares{' '}
          {r.flights.provider === 'duffel_test' ? 'Duffel test mode' : 'labelled examples'} ·{' '}
          <Link href="/how-it-works" className="underline">
            How it works
          </Link>
        </p>
      </Fold>
    </div>
  );
}

function Step({ a, n }: { a: PlanResultDto['actions'][number]; n: number }) {
  const Icon = actionIcon[a.kind];
  return (
    <li className="flex gap-3 rounded-xl border border-line p-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sea text-xs font-bold text-white">
        {n}
      </span>
      <div className="min-w-0">
        <p className="flex items-start gap-2 font-semibold">
          <Icon
            aria-hidden
            className={`mt-0.5 size-4 shrink-0 ${a.kind === 'dont' ? 'text-danger' : 'text-sea'}`}
          />
          {a.title}
        </p>
        <p className="text-xs font-semibold text-terracotta">{a.when}</p>
        {a.detail ? (
          a.detail.startsWith('http') ? (
            <a
              className="text-sm text-sea-dark underline"
              href={a.detail}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open the programme’s site<span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : (
            <p className="text-sm break-words text-ink-soft">{a.detail}</p>
          )
        ) : null}
      </div>
    </li>
  );
}

function WhenToBook({
  r,
  trend,
  retry,
  setUseExample,
}: {
  r: PlanResultDto;
  trend: PriceTrend | null;
  retry: () => void;
  setUseExample: (v: boolean) => void;
}) {
  const b = r.booking;
  const cheapest = r.flights.cheapest;
  return (
    <Section
      id="book-h"
      icon={<CalendarClock aria-hidden className="size-5 text-sea" />}
      title="When to book"
      aside={
        <Badge
          tone={b.timing === 'book_now' ? 'warn' : b.timing === 'good_time' ? 'saving' : 'sea'}
        >
          {b.timing === 'book_now' ? 'Book soon' : b.timing === 'good_time' ? 'Good time' : 'Early'}
        </Badge>
      }
    >
      <p className="font-semibold">{b.headline}</p>
      <p className="mt-1 text-sm text-ink-soft">{b.detail}</p>
      {trend && trend.previous && trend.direction !== 'new' ? (
        <p className="mt-2 flex items-center gap-2 text-sm">
          {trend.direction === 'down' ? (
            <TrendingDown aria-hidden className="size-4 text-saving" />
          ) : trend.direction === 'up' ? (
            <TrendingUp aria-hidden className="size-4 text-danger" />
          ) : null}
          Since your check on {dateOf(trend.previous.at)}: {eur(trend.previous.cheapestMinor)} →{' '}
          {eur(cheapest?.totalMinor)}
          {trend.direction === 'same' ? ' (about the same)' : ''}{' '}
          <span className="text-ink-muted">(test data)</span>
        </p>
      ) : (
        <p className="mt-2 text-xs text-ink-muted">
          Price watch: open this plan again later and we compare with today’s price.
        </p>
      )}

      {r.flights.status === 'unavailable' ? (
        <Alert
          kind="warn"
          title="No test fare for these dates right now"
          className="mt-3"
          action={
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={retry}>
                Try again
              </Button>
              <Button variant="ghost" onClick={() => setUseExample(true)}>
                Show labelled example fares
              </Button>
            </div>
          }
        >
          Your plan still uses your points and spending, but cannot compare with cash yet.
        </Alert>
      ) : (
        <>
          <div className="mt-3 flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Plane aria-hidden className="size-4 text-sea" /> Price by departure date
            </h3>
            <Badge tone={r.flights.provider === 'duffel_test' ? 'sea' : 'gold'}>
              {r.flights.provider === 'duffel_test' ? 'Duffel test data' : 'Example data'}
            </Badge>
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {b.calendar.map((c) => (
              <li
                key={`${c.depart}-${c.ret}`}
                className={`rounded-xl border p-2.5 text-sm ${c.vsCheapestMinor === 0 ? 'border-sea bg-sea-soft/60' : 'border-line'}`}
              >
                <span className="block font-semibold">{dateOf(c.depart)}</span>
                {c.ret ? (
                  <span className="block text-xs text-ink-muted">back {dateOf(c.ret)}</span>
                ) : null}
                <span className="mt-1 block font-display text-lg tabular">{eur(c.totalMinor)}</span>
                <span className="block text-xs text-ink-muted">
                  {c.vsCheapestMinor === 0 ? 'cheapest' : `+${eur(c.vsCheapestMinor)}`}
                </span>
              </li>
            ))}
          </ul>
          {r.flights.provider === 'example' ? (
            <button
              type="button"
              className="mt-2 text-sm font-semibold text-sea-dark underline"
              onClick={() => setUseExample(false)}
            >
              Use Duffel test fares instead
            </button>
          ) : null}
        </>
      )}
      <p className="mt-3 text-xs text-ink-muted">{b.label}</p>
    </Section>
  );
}

function YourCards({ r, onEdit }: { r: PlanResultDto; onEdit: (s: number) => void }) {
  const a = r.allocation;
  const idea = r.newCards.find((c) => c.status !== 'not_suitable');
  const others = r.newCards.filter((c) => c !== idea);
  return (
    <Section
      id="cards-h"
      icon={<CreditCard aria-hidden className="size-5 text-sea" />}
      title="Your cards"
    >
      {a.status === 'BLOCKED_PAYMENT' ? (
        <Alert kind="warn" title="Card points are not planned">
          You told us you sometimes carry a balance. Interest costs more than points are worth.
        </Alert>
      ) : a.status === 'UNKNOWN_PAYMENT' ? (
        <Alert
          kind="info"
          title="Tell us how you pay your card"
          action={
            <Button variant="secondary" onClick={() => onEdit(3)}>
              Answer
            </Button>
          }
        >
          We only plan card points if you pay the full bill every month.
        </Alert>
      ) : null}

      <h3 className="text-sm font-semibold">Use for everyday spending</h3>
      {r.dailyCards.length ? (
        <ul className="mt-2 grid gap-2">
          {r.dailyCards.map((d) => (
            <li
              key={d.spendId}
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border border-line p-3 text-sm"
            >
              <span className="min-w-0">
                <strong>{d.label}</strong>{' '}
                <span className="text-ink-muted">€{pts(d.amountEur)}/month</span>
              </span>
              <span className="text-right">
                {d.cardName ? (
                  <>
                    {d.cardName} · {rate(d.pointsPerEuro)} {unit(r.target)} per €1
                    {d.gainPerMonth > 0 ? (
                      <span className="block text-xs font-semibold text-saving">
                        +{pts(d.gainPerMonth)} a month vs how you pay today
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="text-ink-muted">
                    None of your cards earns {unit(r.target)} here
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-ink-soft">
          No monthly spending entered.{' '}
          <button
            type="button"
            className="font-semibold text-sea-dark underline"
            onClick={() => onEdit(3)}
          >
            Add it
          </button>
        </p>
      )}

      <h3 className="mt-5 text-sm font-semibold">Should you get a new card?</h3>
      {idea ? (
        <div className="mt-2 rounded-xl border border-sea/40 bg-sea-soft/40 p-3 text-sm">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            {idea.name}
            <Badge tone={idea.status === 'good_fit' ? 'saving' : 'neutral'}>
              {idea.status === 'good_fit' ? 'Good fit' : 'Possible'}
            </Badge>
          </p>
          <p className="mt-1">{idea.reasons[0]}</p>
          <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-ink-muted">Extra {unit(r.target)}</dt>
              <dd className="font-semibold tabular">+{pts(idea.extraPoints)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Welcome points</dt>
              <dd className="font-semibold tabular">
                {idea.welcomePoints ? pts(idea.welcomePoints) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Fee for {idea.months} months</dt>
              <dd className="font-semibold tabular">
                {idea.feeEur === null ? 'not checked' : `€${idea.feeEur}`}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Apply by</dt>
              <dd className="font-semibold">{idea.applyBy ? dateOf(idea.applyBy) : '—'}</dd>
            </div>
          </dl>
          <ul className="mt-2 list-disc pl-5 text-xs text-ink-soft">
            {[...idea.reasons.slice(1), ...idea.eligibility].map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <a
            href={idea.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs font-semibold text-sea-dark underline"
          >
            Official terms<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      ) : (
        <p className="mt-1 text-sm text-ink-soft">
          No new card helps this trip right now{others[0] ? `: ${others[0].reasons[0]}` : '.'}
        </p>
      )}
      {others.length ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm font-semibold text-sea-dark">
            Other cards we checked ({others.length})
          </summary>
          <ul className="mt-2 grid gap-1 text-sm text-ink-soft">
            {others.map((c) => (
              <li key={c.cardId}>
                <strong className="text-ink">{c.name}:</strong>{' '}
                {c.reasons[0] ?? 'Possible, but not better than the suggestion above.'}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </Section>
  );
}

function CardTable({ r }: { r: PlanResultDto }) {
  const a = r.allocation;
  if (a.status !== 'OK')
    return (
      <p className="text-sm text-ink-soft">
        No card plan:{' '}
        {a.status === 'NO_CARDS'
          ? 'no cards added'
          : a.status === 'NO_SPEND'
            ? 'no spending before your deadline'
            : 'card points are not planned'}
        .
      </p>
    );
  return (
    <>
      <h3 className="text-sm font-semibold">Card for each purchase until your deadline</h3>
      <p className="mt-1 text-sm text-ink-soft">
        {pts(a.totalTargetPoints)} {unit(r.target)} from spending you already plan (
        {a.incrementalTargetPoints >= 0 ? '+' : ''}
        {pts(a.incrementalTargetPoints)} versus how you pay today).
      </p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <caption className="sr-only">Card for each purchase</caption>
          <thead>
            <tr className="text-left text-xs text-ink-muted">
              <th scope="col" className="py-1">
                Purchase
              </th>
              <th scope="col" className="py-1">
                Card
              </th>
              <th scope="col" className="py-1 text-right">
                Points
              </th>
              <th scope="col" className="py-1 pl-3">
                Posts
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {a.assignments.slice(0, 24).map((x) => (
              <tr key={x.unit.id}>
                <th scope="row" className="py-2 pr-2 text-left font-medium">
                  {x.unit.label}
                  <span className="block text-xs font-normal text-ink-muted">
                    €{x.unit.amountEur.toFixed(0)} · {x.unit.date} ·{' '}
                    {CATEGORY_LABELS[x.unit.category as keyof typeof CATEGORY_LABELS]}
                  </span>
                </th>
                <td className="py-2 pr-2">{x.cardName ?? '—'}</td>
                <td className="py-2 text-right tabular">{pts(x.targetPoints)}</td>
                <td className="py-2 pl-3 tabular">{x.postsOn ?? 'unknown'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {a.excluded.length ? (
        <ul className="mt-2 grid list-disc gap-1 pl-5 text-sm text-ink-soft">
          {a.excluded.map((x) => (
            <li key={x.id}>
              Not counted: {x.label} ({x.reason})
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

function AiExplanation({ plan }: { plan: PlanResultDto }) {
  const [open, setOpen] = useState(false);
  return (
    <Fold
      summary={
        <>
          <Bot aria-hidden className="size-5 text-sea" /> Explain this plan in plain words (AI)
        </>
      }
      onToggle={setOpen}
    >
      {open ? <ExplainBody plan={plan} /> : null}
      <p className="mt-3 text-xs text-ink-muted">
        The AI only rewords the calculated plan and is checked against its numbers; it never sets
        prices, points or the recommendation.
      </p>
    </Fold>
  );
}

function ExplainBody({ plan }: { plan: PlanResultDto }) {
  const key = `explain.${hash(JSON.stringify(plan)).toString(36)}`;
  const [state, retry] = useCachedPost(
    key,
    '/api/plan/explain',
    { plan },
    ExplainResponseSchema,
    () => null,
  );
  if (state.kind === 'loading' || state.kind === 'idle')
    return (
      <div role="status" aria-live="polite" className="grid gap-2">
        <span className="sr-only">Writing the explanation…</span>
        <Skeleton className="h-4" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    );
  if (state.kind === 'error')
    return (
      <Alert
        kind="warn"
        title="Explanation unavailable"
        action={
          <Button variant="secondary" onClick={retry}>
            Try again
          </Button>
        }
      >
        The plan above is complete without it.
      </Alert>
    );
  const data = state.data.data;
  return (
    <div className="grid gap-2 text-sm text-ink-soft">
      <Badge tone={data.source === 'ai' ? 'sea' : 'neutral'} className="justify-self-start">
        {data.source === 'ai'
          ? `Written by AI (${data.model}), checked against the plan`
          : 'Rules-based explanation'}
      </Badge>
      {data.text.map((t) => (
        <p key={t}>{t}</p>
      ))}
      {data.source === 'rules' && data.rejectedReason ? (
        <p className="text-xs text-ink-muted">AI text not used ({data.rejectedReason}).</p>
      ) : null}
    </div>
  );
}
