'use client';

import { useState } from 'react';
import { ExternalLink, Lock } from 'lucide-react';
import { buildAwardPlan, type AwardStep } from '@/domain/awardSteps';
import { TRANSFER_ROUTES, programById, verificationLabel } from '@/fixtures/catalogue';
import { useQuickWallet } from '@/lib/quickWallet';
import { Alert, Badge, ButtonLink, Card } from './ui';
import { eur, programName, pts } from './format';
import { OptionPage } from './results/OptionPage';
import { Itinerary } from './results/OptionSummary';

export function AwardStepsView() {
  const { wallet } = useQuickWallet();
  const [seatConfirmed, setSeatConfirmed] = useState(false);
  return (
    <OptionPage>
      {({ o, backHref }) => {
        if (o.kind !== 'award')
          return (
            <Alert
              kind="info"
              title="This is a cash fare"
              action={<ButtonLink href={backHref}>Back to options</ButtonLink>}
            >
              Award steps apply only to points bookings.
            </Alert>
          );
        const p = o.points[0];
        const plan = buildAwardPlan({
          program: p.program,
          pointsNeeded: p.amount,
          taxesMinor: o.cashToday.minor,
          balances: wallet.balances.map((b) => ({
            ...b,
            asOf: '',
            source: 'USER_ENTERED' as const,
          })),
          routes: TRANSFER_ROUTES,
        });
        return (
          <>
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-terracotta uppercase">
                Award booking steps
              </p>
              <h1 className="mt-1 font-display text-2xl sm:text-3xl">
                Book with {pts(p.amount, p.program)} + {eur(o.cashToday)}
              </h1>
              <p className="mt-2 text-ink-soft">
                A Una Milla cannot book awards for you. These steps show what to do on{' '}
                {programName(p.program)}’s own website, in a safe order.
              </p>
            </div>
            <Card className="p-5">
              <Itinerary o={o} />
            </Card>
            {!plan.ok ? (
              <Alert
                kind="warn"
                title="Not enough points for this award"
                action={
                  <ButtonLink href="/plan" variant="secondary">
                    Update your points
                  </ButtonLink>
                }
              >
                It needs {pts(plan.needed, plan.program)}; you can use{' '}
                {pts(plan.usable, plan.program)} including transfers. We will not suggest buying
                points or extra spending to close the gap.
              </Alert>
            ) : (
              <>
                <ul className="grid gap-3" aria-label="Warnings">
                  {plan.warnings.map((w) => (
                    <li key={w}>
                      <Alert kind="warn" title={w} />
                    </li>
                  ))}
                </ul>
                <ol className="grid gap-4">
                  {plan.steps.map((s, i) => (
                    <li key={i}>
                      <Step
                        n={i + 1}
                        s={s}
                        seatConfirmed={seatConfirmed}
                        onSeatConfirmed={setSeatConfirmed}
                      />
                    </li>
                  ))}
                </ol>
              </>
            )}
          </>
        );
      }}
    </OptionPage>
  );
}

function Step({
  n,
  s,
  seatConfirmed,
  onSeatConfirmed,
}: {
  n: number;
  s: AwardStep;
  seatConfirmed: boolean;
  onSeatConfirmed: (v: boolean) => void;
}) {
  const head = (title: string, extra?: React.ReactNode) => (
    <div className="flex flex-wrap items-center gap-3">
      <span className="grid size-8 place-items-center rounded-full bg-sea text-sm font-bold text-white">
        {n}
      </span>
      <h2 className="font-semibold">{title}</h2>
      {extra}
    </div>
  );
  if (s.kind === 'check_balance')
    return (
      <Card className="p-5">
        {head('Check your points')}
        <p className="mt-2 text-sm text-ink-soft">
          You need {pts(s.needed, s.program)} in {programName(s.program)}. Your wallet shows{' '}
          {pts(s.direct, s.program)} there.{' '}
          {s.enoughDirect
            ? 'That is enough: no transfer needed.'
            : 'The rest can come from a transfer shown below, only after you find the seat.'}
        </p>
      </Card>
    );
  if (s.kind === 'find_seat') {
    const prog = programById(s.program);
    return (
      <Card className="p-5">
        {head('Find this exact seat on the programme’s site')}
        <p className="mt-2 text-sm text-ink-soft">
          Search the same route, date and cabin. Our award prices are illustrative, so the real
          number of points and taxes may differ.
        </p>
        {prog ? (
          <a
            href={prog.website}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-sea-dark underline-offset-4 hover:underline"
          >
            Open {prog.name} <ExternalLink aria-hidden className="size-4" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        ) : null}
        <label className="mt-4 flex min-h-11 items-start gap-3 rounded-xl bg-sand/60 p-3 text-sm">
          <input
            type="checkbox"
            checked={seatConfirmed}
            onChange={(e) => onSeatConfirmed(e.target.checked)}
            className="mt-0.5 size-5 accent-sea"
          />
          I found this seat on the programme’s site and it is still available.
        </label>
      </Card>
    );
  }
  if (s.kind === 'transfer') {
    const r = s.transfer.route;
    return (
      <Card className={seatConfirmed ? 'p-5' : 'p-5 opacity-80'}>
        {head(
          `Transfer ${pts(s.transfer.send, r.from)} to ${programName(r.to)}`,
          <Badge tone={r.verification === 'VERIFIED' ? 'saving' : 'warn'}>
            {verificationLabel(r.verification)}
          </Badge>,
        )}
        {!seatConfirmed ? (
          <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-warn">
            <Lock aria-hidden className="size-4" /> Locked until you confirm the seat in the step
            above.
          </p>
        ) : (
          <div className="mt-2 text-sm text-ink-soft">
            <p>
              You will receive {pts(s.transfer.receive, r.to)} (ratio {r.num}:{r.den}, minimum{' '}
              {r.min.toLocaleString('en-IE')}, in steps of {r.increment.toLocaleString('en-IE')}).
              It can take up to {r.maxDelayDays} day{r.maxDelayDays === 1 ? '' : 's'}.
            </p>
            <p className="mt-2 font-semibold text-ink">Check before transferring:</p>
            <ul className="mt-1 list-disc pl-5">
              {r.preconditions.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    );
  }
  if (s.kind === 'book')
    return (
      <Card className="p-5">
        {head('Book the award')}
        <p className="mt-2 text-sm text-ink-soft">
          Book on {programName(s.program)} and pay about{' '}
          {eur({ minor: s.taxesMinor, currency: 'EUR' })} in taxes and charges with your own card on
          their site. A Una Milla never asks for card details.
        </p>
      </Card>
    );
  return (
    <Card className="p-5">
      {head('Check your e-ticket')}
      <p className="mt-2 text-sm text-ink-soft">
        Your booking is only final when the confirmation shows a 13-digit e-ticket number. Keep the
        email.
      </p>
    </Card>
  );
}
