'use client';

import { REFERENCE_EUR_PER_POINT } from '@/fixtures/catalogue';
import { useGuest } from '@/lib/guestStore';
import { AvailabilityBadge, ProvenanceBadge } from '../Badges';
import { Alert, Badge, ButtonLink, Card } from '../ui';
import { eur, programName } from '../format';
import { CostBreakdown } from './CostBreakdown';
import { Explanation } from './Explanation';
import { OptionPage } from './OptionPage';
import { Itinerary, optionTitle, priceLabel } from './OptionSummary';

const cond = {
  allowed: 'Allowed',
  not_allowed: 'Not allowed',
  unknown: 'Unknown: check before booking',
} as const;

export function OptionDetail() {
  const guest = useGuest();
  return (
    <OptionPage>
      {({ o, res, query }) => {
        const c = res.data.comparison;
        const normal = res.data.options.find((x) => x.id === c.normalId);
        const program = o.points[0]?.program;
        const userV = program
          ? guest.wallet.valuations.find((v) => v.program === program)
          : undefined;
        const valuation =
          !program || guest.wallet.noValuePrograms.includes(program)
            ? null
            : userV
              ? { eurPerPoint: userV.eurPerPoint, method: 'user' as const }
              : { eurPerPoint: REFERENCE_EUR_PER_POINT, method: 'reference' as const };
        const diff = normal?.ec && o.ec ? normal.ec.minor - o.ec.minor : null;
        return (
          <>
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-terracotta uppercase">
                Option detail
              </p>
              <h1 className="mt-1 font-display text-2xl sm:text-3xl">{optionTitle(o)}</h1>
              <p className="mt-1 font-display text-xl tabular">{priceLabel(o)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <ProvenanceBadge p={o.provenance} />
                <AvailabilityBadge a={o.availability} />
                {o.rank ? <Badge tone="sea">Ranked #{o.rank}</Badge> : null}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
              <Card className="p-5">
                <h2 className="font-display text-xl">Cost breakdown</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  Every cost appears once. Fees already inside the fare are not added again.
                </p>
                <div className="mt-4">
                  <CostBreakdown o={o} valuation={valuation} />
                </div>
                {normal && diff !== null ? (
                  <p className="mt-4 rounded-xl bg-sand/60 p-3 text-sm">
                    Compared with the normal price ({eur(normal.cashTotal)}):{' '}
                    {diff > 0 ? (
                      <strong className="text-saving">
                        {eur({ minor: diff, currency: 'EUR' })} less overall
                      </strong>
                    ) : diff < 0 ? (
                      <strong className="text-danger">
                        {eur({ minor: -diff, currency: 'EUR' })} more overall
                      </strong>
                    ) : (
                      <strong>the same overall</strong>
                    )}
                    .
                  </p>
                ) : null}
                {program &&
                c.breakEven &&
                'eurPerPoint' in c.breakEven &&
                c.breakEven.eurPerPoint &&
                c.bestAwardId === o.id ? (
                  <p className="mt-3 text-sm text-ink-soft">
                    Break-even value: €{c.breakEven.eurPerPoint} per {programName(program)} point.
                    Below that, paying cash is better.
                  </p>
                ) : null}
              </Card>

              <div className="grid content-start gap-6">
                <Card className="p-5">
                  <h2 className="font-display text-xl">Flights</h2>
                  <div className="mt-3">
                    <Itinerary o={o} />
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-ink-muted">Refund</dt>
                      <dd className="font-medium">{cond[o.conditions.refund]}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-muted">Changes</dt>
                      <dd className="font-medium">{cond[o.conditions.change]}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-ink-muted">Source</dt>
                      <dd className="font-medium">{o.sourceLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-muted">Retrieved</dt>
                      <dd className="font-medium tabular">
                        {new Date(o.fetchedAt).toLocaleString('en-GB')}
                      </dd>
                    </div>
                    {o.expiresAt ? (
                      <div>
                        <dt className="text-ink-muted">Price held until</dt>
                        <dd className="font-medium tabular">
                          {new Date(o.expiresAt).toLocaleString('en-GB')}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </Card>
                {o.excludedReason ? (
                  <Alert kind="warn" title="Not ranked">
                    {o.shortfall
                      ? `This award needs ${o.shortfall.needed.toLocaleString('en-IE')} points and you can use ${o.shortfall.usable.toLocaleString('en-IE')}. It is shown for comparison only.`
                      : 'This option could not be compared on the chosen goal.'}
                  </Alert>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {o.kind === 'award' ? (
                      <ButtonLink href={`/award-steps?${query}&opt=${encodeURIComponent(o.id)}`}>
                        How to book with points
                      </ButtonLink>
                    ) : null}
                    {o.kind === 'cash' && o.offerRef ? (
                      <ButtonLink href={`/checkout?${query}&opt=${encodeURIComponent(o.id)}`}>
                        Book in test mode
                      </ButtonLink>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
            <Explanation e={res.data.explanation} />
          </>
        );
      }}
    </OptionPage>
  );
}
