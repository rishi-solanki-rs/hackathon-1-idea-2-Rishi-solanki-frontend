'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowDown, ChevronRight, Pencil, RefreshCw, Sparkles, Wallet } from 'lucide-react';
import type { OptionDto, QuickSearchResponse } from '@/contracts/search';
import { t } from '@/i18n/en';
import { PRESETS } from '@/lib/guestStore';
import { queryToQuick, type QuickParams } from '@/lib/query';
import { useQuickResult } from '@/lib/useQuickResult';
import { AvailabilityBadge, ProvenanceBadge } from '../Badges';
import { QuickSearchForm } from '../QuickSearchForm';
import { Alert, Badge, Button, ButtonLink, Card, Skeleton } from '../ui';
import { airportLabel, eur, programName, pts } from '../format';
import { Itinerary, optionTitle, priceLabel } from './OptionSummary';
import { Explanation } from './Explanation';

const reasonText: Record<NonNullable<OptionDto['excludedReason']>, string> = {
  NOT_ENOUGH_POINTS: 'Not bookable with your current points',
  NEEDS_POINTS_VALUE: 'Needs a points value to compare',
  FX_STALE: 'Exchange rate out of date, so not compared',
};

export function ResultsView() {
  const { request, issues, query, state, retry, hydrated, walletProfile } = useQuickResult();
  const [editing, setEditing] = useState(false);

  if (!hydrated) return <ResultsSkeleton />;
  if (!request)
    return (
      <Alert
        kind="warn"
        title="This search is incomplete"
        action={<ButtonLink href="/">Start a new search</ButtonLink>}
      >
        <p>Some details are missing or invalid, so nothing was searched.</p>
        <ul className="mt-2 list-disc pl-5">
          {issues.slice(0, 4).map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </Alert>
    );

  const params = queryToQuick(new URLSearchParams(query)) as QuickParams;
  const header = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-terracotta uppercase">
          Quick Flight
        </p>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl">
          {airportLabel(request.origin)} → {airportLabel(request.destination)}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          {request.tripType === 'return'
            ? `Return ${request.departDate} – ${request.returnDate}`
            : `One way ${request.departDate}`}{' '}
          · {request.adults} adult
          {request.adults > 1 ? 's' : ''} · {t.cabin[request.cabin]}
          {request.flexDays ? ` · ±${request.flexDays} days` : ''}
          {request.nearbyAirports ? ' · nearby airports' : ''} · Ranked by{' '}
          {t.objective[request.objective].toLowerCase()}
        </p>
      </div>
      <Button
        variant="secondary"
        onClick={() => setEditing((e) => !e)}
        aria-expanded={editing}
        aria-controls="edit-search"
      >
        <Pencil aria-hidden className="size-4" /> {editing ? 'Close' : 'Change search'}
      </Button>
    </div>
  );

  return (
    <div className="grid gap-6">
      {header}
      {editing ? (
        <Card id="edit-search" className="p-5">
          <QuickSearchForm initial={params} />
        </Card>
      ) : null}
      <WalletStrip profile={walletProfile} />
      {state.kind === 'loading' || state.kind === 'idle' ? (
        <ResultsSkeleton label="Comparing cash and points…" />
      ) : null}
      {state.kind === 'error' ? (
        <Alert
          kind="error"
          title={
            state.error.code === 'RATE_LIMITED'
              ? 'Too many searches'
              : state.error.code === 'VALIDATION_ERROR'
                ? 'Some search details need attention'
                : 'We could not complete this search'
          }
          action={
            <Button onClick={retry}>
              <RefreshCw aria-hidden className="size-4" /> Try again
            </Button>
          }
        >
          {state.error.message}
        </Alert>
      ) : null}
      {state.kind === 'success' ? <Loaded res={state.data} query={query} retry={retry} /> : null}
    </div>
  );
}

function WalletStrip({ profile }: { profile: string }) {
  const preset = PRESETS[profile];
  return (
    <p className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
      <Wallet aria-hidden className="size-4 text-sea" />
      Points used for this comparison:{' '}
      <strong className="text-ink">{preset ? preset.label : 'Your wallet'}</strong>
      <Link
        href="/wallet"
        className="font-semibold text-sea-dark underline-offset-4 hover:underline"
      >
        Change wallet
      </Link>
    </p>
  );
}

function Loaded({
  res,
  query,
  retry,
}: {
  res: QuickSearchResponse;
  query: string;
  retry: () => void;
}) {
  const { data, status } = res;
  const byId = new Map(data.options.map((o) => [o.id, o]));
  const normal = data.comparison.normalId ? byId.get(data.comparison.normalId) : undefined;
  const hacked = data.comparison.hackedId ? byId.get(data.comparison.hackedId) : undefined;
  const ranked = data.options.filter((o) => o.rank !== null);
  const excluded = data.options.filter((o) => o.rank === null);

  return (
    <>
      {status === 'fixture_fallback' ? (
        <Alert kind="warn" title="Live test search unavailable" live>
          The Duffel test search did not answer, so these are illustrative example fares. Nothing
          here is a live price.
        </Alert>
      ) : null}
      {status === 'partial' ? (
        <Alert
          kind="warn"
          title="Some sources did not respond"
          live
          action={
            <Button variant="secondary" onClick={retry}>
              Search again
            </Button>
          }
        >
          Results may be incomplete.
        </Alert>
      ) : null}
      {status === 'empty' || data.options.length === 0 ? (
        <Alert
          kind="info"
          title="No flights found for these dates"
          action={
            <ButtonLink href="/" variant="secondary">
              Change search
            </ButtonLink>
          }
        >
          Try flexible dates (± 1–3 days), nearby airports, or a different cabin.
        </Alert>
      ) : (
        <>
          <SavingsHero data={data} normal={normal} hacked={hacked} query={query} />
          <section aria-labelledby="all-options" className="grid gap-3">
            <h2 id="all-options" className="font-display text-xl">
              All options, ranked by {t.objective[data.comparison.objective].toLowerCase()}
            </h2>
            <ol className="grid gap-3">
              {ranked.map((o) => (
                <li key={o.id}>
                  <OptionCard
                    o={o}
                    query={query}
                    isNormal={o.id === normal?.id}
                    isBest={o.id === hacked?.id}
                  />
                </li>
              ))}
            </ol>
          </section>
          {excluded.length ? (
            <section aria-labelledby="not-ranked" className="grid gap-3">
              <h2 id="not-ranked" className="font-display text-xl">
                Not ranked, and why
              </h2>
              <ul className="grid gap-3">
                {excluded.map((o) => (
                  <li key={o.id}>
                    <OptionCard o={o} query={query} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <Explanation e={data.explanation} />
        </>
      )}
      <p className="text-xs text-ink-muted">
        Engine {res.meta.engineVersion} · generated{' '}
        {new Date(res.meta.generatedAt).toLocaleString('en-GB')} · sources:{' '}
        {res.meta.providers.map((p) => `${p.id} ${p.outcome}`).join(', ')}
      </p>
    </>
  );
}

function SavingsHero({
  data,
  normal,
  hacked,
  query,
}: {
  data: QuickSearchResponse['data'];
  normal?: OptionDto;
  hacked?: OptionDto;
  query: string;
}) {
  const c = data.comparison;
  const be = c.breakEven;
  let headline: React.ReactNode;
  if (c.headline === 'SAVING' && c.economicSaving)
    headline = (
      <>
        Save <span className="text-saving">{eur(c.economicSaving, true)}</span>{' '}
        <span className="text-ink-soft">({c.savingPct}%)</span>
      </>
    );
  else if (c.headline === 'CASH_BETTER' && c.awardExtraCost)
    headline = <>Paying cash is better by {eur(c.awardExtraCost, true)}</>;
  else if (c.headline === 'LESS_CASH_TODAY' && hacked)
    headline = <>Least cash today: {eur(hacked.cashToday, true)}</>;
  else if (c.headline === 'NO_NORMAL_PRICE') headline = <>No comparable cash price found</>;
  else headline = <>No saving found</>;

  return (
    <Card className="overflow-hidden" aria-labelledby="hero-heading">
      <div className="grid gap-0 md:grid-cols-[1.1fr_1fr]">
        <div className="p-5 sm:p-6">
          <Badge tone="gold">Example saving · illustrative data</Badge>
          <h2 id="hero-heading" className="mt-3 font-display text-3xl leading-tight sm:text-4xl">
            {headline}
          </h2>
          <p className="mt-2 text-ink-soft">
            {c.headline === 'SAVING' ? data.explanation.why[0] : data.explanation.summary}
          </p>
          {c.cashSavingToday &&
          c.headline === 'SAVING' &&
          c.cashSavingToday.minor !== c.economicSaving?.minor ? (
            <p className="mt-2 text-sm text-ink-soft">
              Cash paid today:{' '}
              {c.cashSavingToday.minor >= 0
                ? `${eur(c.cashSavingToday, true)} less`
                : `${eur({ ...c.cashSavingToday, minor: -c.cashSavingToday.minor }, true)} more`}{' '}
              than the normal fare.
            </p>
          ) : null}
          {be && 'eurPerPoint' in be && be.eurPerPoint ? (
            <p className="mt-2 text-sm text-ink-soft">
              Break-even: points beat cash only if you value {programName(be.program)} points above{' '}
              <strong className="text-ink">€{be.eurPerPoint}</strong> each.
            </p>
          ) : null}
        </div>
        <div className="border-t border-line bg-sand/50 md:border-t-0 md:border-l">
          <dl className="grid grid-cols-2">
            <div className="border-r border-line p-5">
              <dt className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
                Normal price
              </dt>
              <dd className="mt-1 font-display text-2xl tabular">
                {normal ? eur(normal.cashTotal, true) : '—'}
              </dd>
              <dd className="text-xs text-ink-soft">
                Cheapest cash fare, exact dates and airports
              </dd>
            </div>
            <div className="min-w-0 p-5">
              <dt className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
                Best option
              </dt>
              <dd className="mt-1 font-display text-2xl break-words tabular">
                {hacked ? priceLabel(hacked, true) : '—'}
              </dd>
              <dd className="text-xs text-ink-soft">{hacked ? optionTitle(hacked) : ''}</dd>
            </div>
          </dl>
          {hacked ? (
            <div className="border-t border-line p-4">
              <ButtonLink
                href={`/results/detail?${query}&opt=${encodeURIComponent(hacked.id)}`}
                variant="secondary"
                className="w-full"
              >
                See how this was calculated <ArrowDown aria-hidden className="size-4 -rotate-90" />
              </ButtonLink>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function OptionCard({
  o,
  query,
  isNormal,
  isBest,
}: {
  o: OptionDto;
  query: string;
  isNormal?: boolean;
  isBest?: boolean;
}) {
  const detail = `/results/detail?${query}&opt=${encodeURIComponent(o.id)}`;
  return (
    <Card className={isBest ? 'border-sea ring-1 ring-sea/30' : ''}>
      <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {o.rank ? (
              <span className="grid size-7 place-items-center rounded-full bg-ink text-xs font-bold text-white">
                {o.rank}
              </span>
            ) : null}
            <h3 className="font-semibold">{optionTitle(o)}</h3>
            {isBest ? (
              <Badge tone="sea">
                <Sparkles aria-hidden className="size-3" /> Best option
              </Badge>
            ) : null}
            {isNormal ? <Badge>Normal price</Badge> : null}
            {o.excludedReason ? <Badge tone="warn">{reasonText[o.excludedReason]}</Badge> : null}
          </div>
          <div className="mt-3">
            <Itinerary o={o} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <ProvenanceBadge p={o.provenance} />
            <AvailabilityBadge a={o.availability} />
            {o.needsTransfer ? <Badge tone="terracotta">Needs a points transfer</Badge> : null}
            {o.conditions.refund === 'unknown' ? (
              <Badge>Refund rules unknown</Badge>
            ) : o.conditions.refund === 'not_allowed' ? (
              <Badge>Non-refundable</Badge>
            ) : (
              <Badge tone="saving">Refundable</Badge>
            )}
          </div>
          {o.shortfall ? (
            <p className="mt-3 text-sm text-warn">
              Needs {pts(o.shortfall.needed, o.shortfall.program)}; you have{' '}
              {pts(o.shortfall.usable, o.shortfall.program)} (including transfers you could make).
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end sm:text-right">
          <p className="font-display text-2xl tabular">{priceLabel(o)}</p>
          {o.costLines.some((l) => l.timing === 'later') ? (
            <p className="text-xs text-ink-soft">
              + {eur({ minor: o.cashTotal.minor - o.cashToday.minor, currency: 'EUR' })} paid
              separately
            </p>
          ) : null}
          <p className="text-sm text-ink-soft">
            Overall cost:{' '}
            {o.ec ? <strong className="text-ink">{eur(o.ec)}</strong> : 'needs a points value'}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 sm:justify-end">
            <ButtonLink href={detail} variant="ghost" className="px-3">
              Details <ChevronRight aria-hidden className="size-4" />
            </ButtonLink>
            {o.kind === 'award' && !o.excludedReason ? (
              <ButtonLink
                href={`/award-steps?${query}&opt=${encodeURIComponent(o.id)}`}
                variant="secondary"
              >
                How to book with points
              </ButtonLink>
            ) : null}
            {o.kind === 'cash' && !o.excludedReason && o.offerRef ? (
              <ButtonLink
                href={`/checkout?${query}&opt=${encodeURIComponent(o.id)}`}
                variant="secondary"
              >
                Book in test mode
              </ButtonLink>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function ResultsSkeleton({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="grid gap-4">
      <span className="sr-only">{label}</span>
      <p aria-hidden className="text-sm font-medium text-ink-soft">
        {label}
      </p>
      <Skeleton className="h-44" />
      <Skeleton className="h-28" />
      <Skeleton className="h-28" />
    </div>
  );
}
