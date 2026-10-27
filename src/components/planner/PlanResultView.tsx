'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Ban,
  Bot,
  CalendarClock,
  CheckCircle2,
  CircleHelp,
  Eye,
  ListChecks,
  Pencil,
  Plane,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { ExplainResponseSchema, PlanResponseSchema, type PlanResultDto } from '@/contracts/plan';
import type { PlanResult } from '@/domain/plan';
import { diffPlans } from '@/domain/replan';
import { programById } from '@/fixtures/catalogue';
import { CATEGORY_LABELS } from '@/fixtures/cardCatalogue';
import { buildRequest } from '@/lib/planConvert';
import { writePlan, type PlanDraft } from '@/lib/planStore';
import { useCachedPost } from '@/lib/useApi';
import { savePlanResult } from '@/lib/sync';
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

const OUTCOME: Record<
  PlanResultDto['verdict']['outcome'],
  { title: string; tone: 'saving' | 'sea' | 'warn' | 'neutral' }
> = {
  BOOK_CASH_NOW: { title: 'Book the cash fare', tone: 'sea' },
  AWARD_WORTH_CHECKING: { title: 'Points look worth it: check the seat first', tone: 'saving' },
  MONITOR_NO_TRANSFER: { title: 'Wait for award seats; don’t transfer yet', tone: 'warn' },
  ACCUMULATE_FROM_PLANNED_SPEND: {
    title: 'Your planned spending can close the gap',
    tone: 'saving',
  },
  CASH_BETTER: { title: 'Paying cash is better', tone: 'sea' },
  INSUFFICIENT_BY_DEADLINE: { title: 'Not enough points in time: book cash', tone: 'warn' },
  TOO_UNCERTAIN: { title: 'Too uncertain to recommend', tone: 'neutral' },
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
      const exp = r.data.flights.quotes.map((q) =>
        q.expiresAt ? Date.parse(q.expiresAt) : Infinity,
      );
      const m = Math.min(...exp);
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
  const result = state.kind === 'success' ? state.data.data : null;
  useEffect(() => {
    if (result && key) {
      try {
        window.localStorage.setItem(LAST_KEY, JSON.stringify({ key, result }));
      } catch {
        /* ignore */
      }
      void savePlanResult(key, result);
    }
  }, [result, key]);

  if (!req.success)
    return (
      <Alert
        kind="warn"
        title="Some details are missing"
        action={<Button onClick={() => onEdit(0)}>Review my answers</Button>}
      >
        <ul className="list-disc pl-5">
          {req.error.issues.slice(0, 5).map((i) => (
            <li key={i.path.join('.') + i.message}>
              {i.path.join(' › ')}: {i.message}
            </li>
          ))}
        </ul>
      </Alert>
    );
  if (state.kind === 'loading' || state.kind === 'idle')
    return (
      <div role="status" aria-live="polite" className="grid gap-4">
        <p className="text-sm font-medium text-ink-soft">
          Building your plan: pricing up to 7 departure dates with Duffel test mode…
        </p>
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
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
  const need = r.award?.points ?? 0;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-terracotta uppercase">
            Your plan
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl">
            {airportLabel(r.trip.origin)} → {airportLabel(r.trip.destination)}
          </h1>
          <p className="text-sm text-ink-soft">
            Leaving{' '}
            {r.trip.earliestDepart === r.trip.latestDepart
              ? r.trip.earliestDepart
              : `between ${r.trip.earliestDepart} and ${r.trip.latestDepart}`}{' '}
            · {r.trip.adults} adult{r.trip.adults > 1 ? 's' : ''} · goal:{' '}
            {r.trip.objective === 'A_CASH_TODAY' ? 'least cash today' : 'lowest overall cost'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => onEdit(0)}>
            <Pencil aria-hidden className="size-4" /> Edit answers
          </Button>
          <Button variant="secondary" onClick={retry}>
            <RefreshCw aria-hidden className="size-4" /> Recalculate
          </Button>
        </div>
      </div>

      {diff?.changed ? (
        <Card className="border-sea p-5" role="region" aria-labelledby="what-changed">
          <h2 id="what-changed" className="font-display text-xl">
            What changed
          </h2>
          {diff.causes.length ? (
            <p className="mt-1 text-sm text-ink-soft">Because: {diff.causes.join(' · ')}</p>
          ) : null}
          <table className="mt-3 w-full text-sm">
            <caption className="sr-only">Before and after</caption>
            <thead>
              <tr className="text-left text-xs text-ink-muted uppercase">
                <th scope="col" className="py-1">
                  Item
                </th>
                <th scope="col" className="py-1">
                  Before
                </th>
                <th scope="col" className="py-1">
                  Now
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[
                ...diff.outcome,
                ...diff.moved.map((m) => ({ ...m, field: `Card for ${m.field}` })),
              ].map((c) => (
                <tr key={c.field}>
                  <th scope="row" className="py-2 pr-2 text-left font-medium">
                    {c.field}
                  </th>
                  <td className="py-2 pr-2">{c.before.replaceAll('_', ' ').toLowerCase()}</td>
                  <td className="py-2 font-semibold">
                    {c.after.replaceAll('_', ' ').toLowerCase()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}

      <Card className="overflow-hidden" aria-labelledby="verdict-h">
        <div className="grid md:grid-cols-[1.3fr_1fr]">
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap gap-2">
              <Badge tone={o.tone}>Verdict</Badge>
              <Badge tone={r.verdict.confidence === 'medium' ? 'sea' : 'warn'}>
                Confidence: {r.verdict.confidence}
              </Badge>
            </div>
            <h2 id="verdict-h" className="mt-3 font-display text-3xl leading-tight">
              {o.title}
            </h2>
            <ul className="mt-3 grid list-disc gap-1 pl-5 text-sm text-ink-soft">
              {r.verdict.reasons.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm">
              <strong>Safe booking date:</strong> {r.verdict.lsbd}
            </p>
          </div>
          <dl className="grid grid-cols-2 content-start border-t border-line bg-sand/50 md:border-t-0 md:border-l">
            <div className="border-r border-b border-line p-4">
              <dt className="text-xs font-semibold text-ink-muted uppercase">Cash fare (test)</dt>
              <dd className="mt-1 font-display text-2xl tabular">
                {eur(r.comparison.cashFareMinor)}
              </dd>
            </div>
            <div className="border-b border-line p-4">
              <dt className="text-xs font-semibold text-ink-muted uppercase">Award cash today</dt>
              <dd className="mt-1 font-display text-2xl tabular">
                {eur(r.comparison.awardCashTodayMinor)}
              </dd>
            </div>
            <div className="border-r border-line p-4">
              <dt className="text-xs font-semibold text-ink-muted uppercase">Award overall</dt>
              <dd className="mt-1 font-display text-2xl tabular">
                {eur(r.comparison.awardEconomicMinor)}
              </dd>
              <dd className="text-xs text-ink-soft">points at €{r.valuation.eurPerPoint}</dd>
            </div>
            <div className="p-4">
              <dt className="text-xs font-semibold text-ink-muted uppercase">Points short</dt>
              <dd className="mt-1 font-display text-2xl tabular">
                {r.award ? pts(r.verdict.shortfall) : '—'}
              </dd>
              <dd className="text-xs text-ink-soft">{unit(r.target)}</dd>
            </div>
          </dl>
        </div>
      </Card>

      <Card className="p-5 sm:p-6" role="region" aria-labelledby="next-h">
        <h2 id="next-h" className="font-display text-xl">
          What to do next
        </h2>
        <ol className="mt-3 grid gap-3">
          {r.actions.map((a, i) => {
            const Icon = actionIcon[a.kind];
            return (
              <li key={a.id} className="flex gap-3 rounded-xl border border-line p-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sea text-xs font-bold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    <Icon
                      aria-hidden
                      className={`size-4 ${a.kind === 'dont' ? 'text-danger' : 'text-sea'}`}
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
                        Open the programme’s site
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    ) : (
                      <p className="text-sm text-ink-soft break-words">{a.detail}</p>
                    )
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </Card>

      <Explanation plan={r} />

      <Card className="p-5 sm:p-6" role="region" aria-labelledby="fares-h">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="fares-h" className="flex items-center gap-2 font-display text-xl">
            <Plane aria-hidden className="size-5 text-sea" /> Cash fares across your dates
          </h2>
          <Badge tone={r.flights.provider === 'duffel_test' ? 'sea' : 'gold'}>
            {r.flights.provider === 'duffel_test' ? 'Duffel test data' : 'Example data'}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          {r.flights.note}{' '}
          {r.flights.provider === 'example' ? (
            <button
              type="button"
              className="font-semibold text-sea-dark underline"
              onClick={() => setUseExample(false)}
            >
              Use live test fares instead
            </button>
          ) : null}
        </p>
        {r.flights.status === 'unavailable' ? (
          <Alert
            kind="warn"
            title="Flight prices unavailable"
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
            Your plan still uses your points and spending, but it cannot compare with cash until a
            fare is available.
          </Alert>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {r.flights.quotes.map((q) => {
              const best =
                q === r.flights.cheapest ||
                (r.flights.cheapest &&
                  q.depart === r.flights.cheapest.depart &&
                  q.totalMinor === r.flights.cheapest.totalMinor);
              return (
                <li
                  key={`${q.depart}-${q.ret}`}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm ${best ? 'border-sea bg-sea-soft/50' : 'border-line'}`}
                >
                  <span>
                    <strong>{dateOf(q.depart)}</strong>
                    {q.ret ? ` → ${dateOf(q.ret)}` : ''} · {q.carrier} ·{' '}
                    {q.stops === 0 ? 'direct' : `${q.stops} stop${q.stops > 1 ? 's' : ''}`}
                    {best ? (
                      <span className="ml-2 font-semibold text-sea-dark">cheapest</span>
                    ) : null}
                  </span>
                  <span className="font-display text-lg tabular">{eur(q.totalMinor, true)}</span>
                </li>
              );
            })}
          </ul>
        )}
        {r.flights.cheapest?.offerRef && r.flights.provider === 'duffel_test' ? (
          <ButtonLink
            className="mt-4"
            variant="secondary"
            href={`/plan/book?${new URLSearchParams({ ref: r.flights.cheapest.offerRef, total: String(r.flights.cheapest.totalMinor), dep: r.flights.cheapest.depart, ...(r.flights.cheapest.ret ? { ret: r.flights.cheapest.ret } : {}), ...(r.flights.cheapest.expiresAt ? { exp: r.flights.cheapest.expiresAt } : {}), carrier: r.flights.cheapest.carrier }).toString()}`}
          >
            Book the cheapest in test mode
          </ButtonLink>
        ) : null}
      </Card>

      <Card className="p-5 sm:p-6" role="region" aria-labelledby="points-h">
        <h2 id="points-h" className="flex items-center gap-2 font-display text-xl">
          <Wallet aria-hidden className="size-5 text-sea" /> Points for this trip (
          {progName(r.target)})
        </h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-ink-muted">Held now</dt>
            <dd className="text-lg font-semibold tabular">{pts(r.pointsNow.direct)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">By transfer (after seat check)</dt>
            <dd className="text-lg font-semibold tabular">{pts(r.pointsNow.viaTransfer)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Needed</dt>
            <dd className="text-lg font-semibold tabular">
              {r.award ? pts(need) : 'no award price yet'}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">Ready</dt>
            <dd className="text-lg font-semibold">
              {r.pointsReady === 'now'
                ? 'now'
                : (r.pointsReady ?? (r.award ? 'not by your deadline' : '—'))}
            </dd>
          </div>
        </dl>
        {r.award ? (
          <p className="mt-2 text-sm text-ink-soft">
            Award: {pts(r.award.points)} {unit(r.award.program)} +{' '}
            {eur(Math.round(r.award.taxesEur * 100), true)} —{' '}
            {r.award.source === 'ILLUSTRATIVE' ? (
              <Badge tone="gold">Rough estimate, not a programme price</Badge>
            ) : (
              <Badge tone="sea">Your input</Badge>
            )}{' '}
            {r.verdict.awardAvailability === 'USER_SAW_AVAILABLE'
              ? 'You saw it available today; it can still disappear.'
              : 'Seat availability not confirmed.'}
          </p>
        ) : null}
        {r.earnings.dated.length ? (
          <>
            <h3 className="mt-4 text-sm font-semibold">When new points arrive</h3>
            <ol className="mt-2 grid gap-1 text-sm">
              {r.earnings.dated.slice(0, 12).map((e, i) => (
                <li key={i} className="flex justify-between gap-3 border-b border-line py-1">
                  <span>
                    {e.date} · {e.label}
                  </span>
                  <span className="tabular">+{pts(e.points)}</span>
                </li>
              ))}
            </ol>
          </>
        ) : null}
        {r.earnings.undated > 0 ? (
          <p className="mt-2 text-sm text-warn">
            {pts(r.earnings.undated)} points have no known posting date (enter “days until points
            appear” for your cards).
          </p>
        ) : null}
      </Card>

      <CardPlan r={r} onEdit={onEdit} />

      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-xl">How this was calculated</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <section>
            <h3 className="text-sm font-semibold uppercase text-ink-muted">Assumptions</h3>
            <ul className="mt-1 grid list-disc gap-1 pl-5 text-sm text-ink-soft">
              {r.assumptions.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="text-sm font-semibold uppercase text-ink-muted">
              Missing or unverified
            </h3>
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
          {r.flights.provider === 'duffel_test' ? 'Duffel test mode' : 'example fixtures'}.
        </p>
      </Card>
    </div>
  );
}

function CardPlan({ r, onEdit }: { r: PlanResultDto; onEdit: (s: number) => void }) {
  const a = r.allocation;
  return (
    <Card className="p-5 sm:p-6" role="region" aria-labelledby="cards-h">
      <h2 id="cards-h" className="font-display text-xl">
        Which card for which purchase
      </h2>
      {a.status === 'BLOCKED_PAYMENT' ? (
        <Alert kind="warn" className="mt-3" title="Card points are not planned">
          You told us you sometimes carry a balance. Interest costs more than points are worth.
        </Alert>
      ) : null}
      {a.status === 'UNKNOWN_PAYMENT' ? (
        <Alert
          kind="info"
          className="mt-3"
          title="Tell us how you pay your card"
          action={
            <Button variant="secondary" onClick={() => onEdit(3)}>
              Answer
            </Button>
          }
        >
          We only plan card points if you pay the full statement every month.
        </Alert>
      ) : null}
      {a.status === 'NO_CARDS' ? (
        <p className="mt-2 text-sm text-ink-soft">
          No cards added, so no card plan.{' '}
          <button className="font-semibold text-sea-dark underline" onClick={() => onEdit(1)}>
            Add a card
          </button>
        </p>
      ) : null}
      {a.status === 'NO_SPEND' ? (
        <p className="mt-2 text-sm text-ink-soft">
          No spending before your deadline.{' '}
          <button className="font-semibold text-sea-dark underline" onClick={() => onEdit(3)}>
            Add spending you already plan
          </button>
        </p>
      ) : null}
      {a.status === 'OK' ? (
        <>
          <p className="mt-1 text-sm text-ink-soft">
            {pts(a.totalTargetPoints)} {unit(r.target)} from spending you already plan (
            {a.incrementalTargetPoints >= 0 ? '+' : ''}
            {pts(a.incrementalTargetPoints)} versus how you pay today)
            {a.approximate ? ' · approximate (many purchases)' : ''}.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <caption className="sr-only">Card for each purchase</caption>
              <thead>
                <tr className="text-left text-xs text-ink-muted uppercase">
                  <th scope="col" className="py-1">
                    Purchase
                  </th>
                  <th scope="col" className="py-1">
                    Date
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
                        €{x.unit.amountEur.toFixed(0)} ·{' '}
                        {CATEGORY_LABELS[x.unit.category as keyof typeof CATEGORY_LABELS]}
                      </span>
                    </th>
                    <td className="py-2 pr-2 tabular">{x.unit.date}</td>
                    <td className="py-2 pr-2">
                      {x.cardName ?? '—'}
                      <span className="block text-xs text-ink-muted">{x.reason}</span>
                    </td>
                    <td className="py-2 text-right tabular">{pts(x.targetPoints)}</td>
                    <td className="py-2 pl-3 tabular">{x.postsOn ?? 'unknown'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {a.bonuses.length ? (
            <ul className="mt-3 grid gap-1 text-sm">
              {a.bonuses.map((b) => (
                <li key={b.cardId}>
                  <strong>{b.cardName} bonus:</strong>{' '}
                  {b.reached ? `${pts(b.points)} points` : 'not planned'} — {b.reason}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
      {a.excluded.length ? (
        <div className="mt-3">
          <h3 className="text-sm font-semibold">Not counted</h3>
          <ul className="mt-1 grid list-disc gap-1 pl-5 text-sm text-ink-soft">
            {a.excluded.map((x) => (
              <li key={x.id}>
                {x.label}: {x.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}

function Explanation({ plan }: { plan: PlanResultDto }) {
  const key = `explain.${hash(JSON.stringify(plan)).toString(36)}`;
  const [state, retry] = useCachedPost(
    key,
    '/api/plan/explain',
    { plan },
    ExplainResponseSchema,
    () => null,
  );
  return (
    <Card className="p-5 sm:p-6" role="region" aria-labelledby="explain-h">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="explain-h" className="flex items-center gap-2 font-display text-xl">
          <Bot aria-hidden className="size-5 text-sea" /> In plain words
        </h2>
        {state.kind === 'success' ? (
          <Badge tone={state.data.data.source === 'ai' ? 'sea' : 'neutral'}>
            {state.data.data.source === 'ai'
              ? `AI-written (${state.data.data.model}), checked against the numbers above`
              : 'Rules-based explanation'}
          </Badge>
        ) : null}
      </div>
      {state.kind === 'loading' || state.kind === 'idle' ? (
        <div role="status" aria-live="polite" className="mt-3 grid gap-2">
          <span className="sr-only">Writing the explanation…</span>
          <Skeleton className="h-4" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      ) : null}
      {state.kind === 'error' ? (
        <Alert
          kind="warn"
          className="mt-3"
          title="Explanation unavailable"
          action={
            <Button variant="secondary" onClick={retry}>
              Try again
            </Button>
          }
        >
          The plan above is complete without it.
        </Alert>
      ) : null}
      {state.kind === 'success' ? (
        <div className="mt-3 grid gap-2 text-sm text-ink-soft">
          {state.data.data.text.map((t) => (
            <p key={t}>{t}</p>
          ))}
          {state.data.data.source === 'rules' && state.data.data.rejectedReason ? (
            <p className="text-xs text-ink-muted">
              AI explanation not used ({state.data.data.rejectedReason}).
            </p>
          ) : null}
        </div>
      ) : null}
      <p className="mt-3 text-xs text-ink-muted">
        The AI only rewords the calculated plan; it never sets prices, points or the verdict.{' '}
        <Link href="/how-it-works" className="underline">
          How we calculate
        </Link>
      </p>
    </Card>
  );
}
