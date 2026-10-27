'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { RefreshCw, Ticket, XCircle } from 'lucide-react';
import {
  PlanSearchRequestSchema,
  PlanSearchResponseSchema,
  type CombinationDto,
  type OptionDto,
  type PlanSearchResponse,
} from '@/contracts/search';
import { t } from '@/i18n/en';
import { PRESETS, useGuest, useHydrated, walletForRequest } from '@/lib/guestStore';
import { queryToPlan } from '@/lib/query';
import { useCachedPost } from '@/lib/useApi';
import { ProvenanceBadge } from '../Badges';
import { Alert, Badge, Button, ButtonLink, Card } from '../ui';
import { airportLabel, cityOf, dateOf, eur } from '../format';
import { Explanation } from '../results/Explanation';
import { ResultsSkeleton } from '../results/ResultsView';
import { priceLabel } from '../results/OptionSummary';

export function PlanResults() {
  const sp = useSearchParams();
  const guest = useGuest();
  const hydrated = useHydrated();
  const { request, issues, query } = useMemo(() => {
    const raw = {
      ...queryToPlan(new URLSearchParams(sp.toString())),
      wallet: walletForRequest(guest.wallet),
    };
    const r = PlanSearchRequestSchema.safeParse(raw);
    return {
      request: r.success ? r.data : null,
      issues: r.success ? [] : r.error.issues.map((i) => i.message),
      query: sp.toString(),
    };
  }, [sp, guest]);
  const key = hydrated && request ? `plan.${query}.${JSON.stringify(request.wallet)}` : null;
  const [state, retry] = useCachedPost(
    key,
    '/api/search/plan',
    request,
    PlanSearchResponseSchema,
    () => null,
  );

  if (!hydrated) return <ResultsSkeleton />;
  if (!request)
    return (
      <Alert
        kind="warn"
        title="This trip is incomplete"
        action={<ButtonLink href="/plan">Plan a trip</ButtonLink>}
      >
        <ul className="list-disc pl-5">
          {issues.slice(0, 4).map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </Alert>
    );
  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-terracotta uppercase">
            Full Trip Plan
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl">
            {[request.legs[0].origin, ...request.legs.map((l) => l.destination)]
              .map(cityOf)
              .join(' ? ')}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {request.legs.length} flights � {request.adults} adult{request.adults > 1 ? 's' : ''} �{' '}
            {t.cabin[request.cabin]} � Ranked by {t.objective[request.objective].toLowerCase()} �
            Wallet: {PRESETS[guest.wallet.profile]?.label ?? 'yours'}
          </p>
        </div>
        <ButtonLink href="/plan" variant="secondary">
          Change trip
        </ButtonLink>
      </div>
      {state.kind === 'loading' || state.kind === 'idle' ? (
        <ResultsSkeleton label="Checking ticket combinations�" />
      ) : null}
      {state.kind === 'error' ? (
        <Alert
          kind="error"
          title="We could not plan this trip"
          action={
            <Button onClick={retry}>
              <RefreshCw aria-hidden className="size-4" /> Try again
            </Button>
          }
        >
          {state.error.message}
        </Alert>
      ) : null}
      {state.kind === 'success' ? <PlanLoaded res={state.data} /> : null}
    </div>
  );
}

function covers(o: OptionDto, legs: PlanSearchResponse['data']['legs']) {
  return o.legIndexes.map((i) => `${legs[i].origin}?${legs[i].destination}`).join(' + ');
}

function PlanLoaded({ res }: { res: PlanSearchResponse }) {
  const d = res.data;
  const byId = new Map(d.options.map((o) => [o.id, o]));
  const best = d.best;
  const diffText = (c: CombinationDto) => {
    if (!best?.ec || !c.ec) return '';
    const diff = c.ec.minor - best.ec.minor;
    return diff > 0
      ? `${eur({ minor: diff, currency: 'EUR' }, true)} more overall`
      : diff < 0
        ? `${eur({ minor: -diff, currency: 'EUR' }, true)} less overall`
        : 'same overall';
  };

  return (
    <>
      {res.status === 'fixture_fallback' ? (
        <Alert kind="warn" title="Live test search unavailable" live>
          Showing illustrative example fares instead.
        </Alert>
      ) : null}
      {d.approximate ? (
        <Alert
          kind="warn"
          title={`Approximate: search limit reached after ${d.nodes.toLocaleString('en-IE')} combinations`}
        >
          The result is never worse than booking each flight separately, but a better combination
          might exist.
        </Alert>
      ) : null}
      {!best ? (
        <Alert kind="info" title="No complete trip could be priced">
          Try different dates or airports.
        </Alert>
      ) : (
        <Card className="overflow-hidden">
          <div className="grid md:grid-cols-[1.1fr_1fr]">
            <div className="p-5 sm:p-6">
              <Badge tone="gold">Example result � illustrative data</Badge>
              <h2 className="mt-3 font-display text-3xl leading-tight">
                {d.economicSaving && d.economicSaving.minor > 0 ? (
                  <>
                    Save <span className="text-saving">{eur(d.economicSaving, true)}</span>{' '}
                    <span className="text-ink-soft">({d.savingPct}%)</span>
                  </>
                ) : (
                  <>No saving vs paying cash</>
                )}
              </h2>
              <p className="mt-2 text-ink-soft">{d.explanation.summary}</p>
            </div>
            <dl className="grid grid-cols-2 border-t border-line bg-sand/50 md:border-t-0 md:border-l">
              <div className="border-r border-line p-5">
                <dt className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
                  Normal price
                </dt>
                <dd className="mt-1 font-display text-2xl tabular">
                  {d.normal ? eur(d.normal.cashTotal, true) : '�'}
                </dd>
                <dd className="text-xs text-ink-soft">Cheapest all-cash way to book</dd>
              </div>
              <div className="p-5">
                <dt className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
                  Best plan
                </dt>
                <dd className="mt-1 font-display text-2xl tabular">
                  {best.ec ? eur(best.ec, true) : eur(best.cashTotal, true)}
                </dd>
                <dd className="text-xs text-ink-soft">
                  {best.tickets} ticket{best.tickets > 1 ? 's' : ''} � cash today{' '}
                  {eur(best.cashToday, true)}
                </dd>
              </div>
            </dl>
          </div>
        </Card>
      )}

      {best ? (
        <section aria-labelledby="chosen" className="grid gap-3">
          <h2 id="chosen" className="font-display text-xl">
            Tickets to book
          </h2>
          <ul className="grid gap-3">
            {best.optionIds.map((id) => {
              const o = byId.get(id)!;
              return (
                <li key={id}>
                  <Card className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="flex items-center gap-2 font-semibold">
                        <Ticket aria-hidden className="size-4 text-sea" />{' '}
                        {o.kind === 'award'
                          ? 'Award'
                          : o.legIndexes.length > 1
                            ? 'One cash ticket (open-jaw or multi-city)'
                            : 'Cash ticket'}
                        : {covers(o, d.legs)}
                      </p>
                      <p className="mt-1 text-sm text-ink-soft">
                        {o.slices.map((s) => `${dateOf(s.departAt)} ${s.from}?${s.to}`).join(' � ')}
                      </p>
                      <div className="mt-2">
                        <ProvenanceBadge p={o.provenance} />
                      </div>
                    </div>
                    <p className="font-display text-xl tabular">{priceLabel(o)}</p>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="per-leg" className="grid gap-3">
        <h2 id="per-leg" className="font-display text-xl">
          Every flight, every option
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {d.legs.map((l, i) => {
            const opts = d.options.filter((o) => o.legIndexes.includes(i));
            return (
              <Card key={i} className="p-4">
                <h3 className="font-semibold">
                  Flight {i + 1}: {airportLabel(l.origin)} ? {airportLabel(l.destination)}
                </h3>
                <p className="text-sm text-ink-muted">{dateOf(l.date)}</p>
                <table className="mt-3 w-full text-sm">
                  <caption className="sr-only">Options for flight {i + 1}</caption>
                  <thead>
                    <tr className="text-left text-xs text-ink-muted uppercase">
                      <th scope="col" className="py-1 font-semibold">
                        Option
                      </th>
                      <th scope="col" className="py-1 pl-3 text-right font-semibold">
                        Price
                      </th>
                      <th scope="col" className="py-1 pl-3 text-right font-semibold">
                        Overall
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {opts.map((o) => (
                      <tr
                        key={o.id}
                        className={best?.optionIds.includes(o.id) ? 'bg-sea-soft/60' : ''}
                      >
                        <td className="py-2 pr-2">
                          {o.kind === 'award'
                            ? 'Award'
                            : o.legIndexes.length > 1
                              ? `Combined ticket (${covers(o, d.legs)})`
                              : 'Cash'}
                          {best?.optionIds.includes(o.id) ? (
                            <span className="ml-1 font-semibold text-sea-dark">� chosen</span>
                          ) : null}
                        </td>
                        <td className="py-2 pl-3 text-right tabular">{priceLabel(o)}</td>
                        <td className="py-2 pl-3 text-right tabular">{o.ec ? eur(o.ec) : '�'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            );
          })}
        </div>
      </section>

      {d.rejected.length || d.alternatives.length ? (
        <section aria-labelledby="others" className="grid gap-3">
          <h2 id="others" className="font-display text-xl">
            Other combinations we checked
          </h2>
          <ul className="grid gap-2">
            {d.rejected.map((r) => (
              <li key={r.combination.key}>
                <Card className="flex items-start gap-3 p-4 text-sm">
                  <XCircle aria-hidden className="mt-0.5 size-5 shrink-0 text-danger" />
                  <span>
                    <strong>
                      {r.combination.ec
                        ? eur(r.combination.ec, true)
                        : eur(r.combination.cashTotal, true)}
                    </strong>{' '}
                    using points on every leg it could: <strong>rejected</strong>. {r.reason}.
                  </span>
                </Card>
              </li>
            ))}
            {d.alternatives.map((c) => (
              <li key={c.key}>
                <Card className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                  <span>
                    {c.optionIds
                      .map((id) => byId.get(id))
                      .filter(Boolean)
                      .map((o) => `${o!.kind === 'award' ? 'Award' : 'Cash'} ${covers(o!, d.legs)}`)
                      .join(' � ')}
                  </span>
                  <span className="font-semibold tabular">
                    {c.ec ? eur(c.ec, true) : '�'} � {diffText(c)}
                  </span>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <Explanation e={d.explanation} />
    </>
  );
}
