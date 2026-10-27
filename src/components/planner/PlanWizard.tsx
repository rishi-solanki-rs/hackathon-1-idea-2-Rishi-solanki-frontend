'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { useHydrated } from '@/lib/guestStore';
import { issuesFor } from '@/lib/planConvert';
import { usePlanDraft, writePlan, type PlanDraft } from '@/lib/planStore';
import { Alert, Button, Card, Skeleton } from '../ui';
import { STEPS, Stepper } from './bits';
import { StepTrip } from './StepTrip';
import { StepCards } from './StepCards';
import { StepPoints } from './StepPoints';
import { StepSpending } from './StepSpending';
import { PlanResultView } from './PlanResultView';
import { useSync } from '@/lib/sync';

function SyncNote() {
  const s = useSync();
  return (
    <p className="mt-3 text-xs text-ink-muted" role="status">
      Saved automatically. {s.statusText}
    </p>
  );
}

function stepIssues(d: PlanDraft, step: number): string[] {
  const out: string[] = [];
  if (step === 0) {
    if (!d.trip.destination) out.push('Choose a destination.');
    if (!d.trip.earliestDepart) out.push('Choose your earliest departure date.');
    if (d.trip.earliestDepart && d.trip.earliestDepart < new Date().toISOString().slice(0, 10))
      out.push('The earliest departure is in the past.');
    if (!out.length) out.push(...issuesFor(d, 'trip'));
  }
  if (step === 1) {
    if (!d.profile.noCards && d.profile.cards.length === 0)
      out.push('Add the cards you hold, or tick “I don’t have any cards that earn points”.');
    d.profile.cards.forEach((c) => {
      if (!c.name.trim()) out.push('Every card needs a name.');
    });
  }
  if (step === 2) {
    if (!d.profile.noPoints && d.profile.balances.length === 0)
      out.push('Add your points balances, or tick “I don’t have any loyalty points”.');
    d.profile.balances.forEach((b) => {
      if (!b.program) out.push('Choose a programme for every balance.');
      if (b.kind === 'exact' && b.points === undefined)
        out.push('Enter the balance, or choose “I don’t know”.');
      if (b.kind === 'range' && (b.min === undefined || b.max === undefined || b.max < b.min))
        out.push('Enter a range where “at most” is at least “at least”.');
    });
    if (d.award.mode === 'entered' && (!Number(d.award.points) || d.award.taxesEur === ''))
      out.push('Enter the award points and taxes, or choose another option.');
    out.push(...issuesFor(d, 'award'));
  }
  if (step === 3) {
    if (!d.profile.finance.answered)
      out.push('Tell us whether you pay your full card statement every month.');
    d.profile.monthly.forEach((m) => {
      if (!m.label.trim() || !(m.amountEur > 0))
        out.push('Each monthly row needs a name and an amount (or remove it).');
    });
    d.profile.purchases.forEach((p) => {
      if (!p.label.trim() || !(p.amountEur > 0) || !p.date)
        out.push('Each planned purchase needs a name, an amount and a date (or remove it).');
    });
    if (!out.length) out.push(...issuesFor(d, 'profile'));
  }
  return [...new Set(out)];
}

export function PlanWizard() {
  const hydrated = useHydrated();
  const d = usePlanDraft();
  const [errors, setErrors] = useState<string[]>([]);
  if (!hydrated)
    return (
      <div aria-busy="true" className="grid gap-4">
        <Skeleton className="h-14" />
        <Skeleton className="h-96" />
      </div>
    );

  const step = Math.min(4, Math.max(0, d.step));
  const firstBlocked = [0, 1, 2, 3].find((s) => stepIssues(d, s).length > 0) ?? 4;
  const go = (s: number) => {
    setErrors([]);
    writePlan((x) => ({ ...x, step: s }));
    window.scrollTo({ top: 0 });
  };
  const next = () => {
    const issues = stepIssues(d, step);
    setErrors(issues);
    if (!issues.length) go(step + 1);
    else window.setTimeout(() => document.getElementById('step-errors')?.focus(), 0);
  };

  return (
    <div className="grid gap-6">
      <Stepper step={step} onGo={go} maxReached={Math.max(step, firstBlocked)} />
      {step < 4 ? (
        <Card className="p-5 sm:p-6">
          <h2 className="mb-4 font-display text-2xl">
            {step + 1}. {['Your trip', 'Your cards', 'Your points', 'Your spending'][step]}
          </h2>
          {errors.length ? (
            <div id="step-errors" tabIndex={-1} className="mb-4">
              <Alert kind="error" title="Please check this step">
                <ul className="list-disc pl-5">
                  {errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </Alert>
            </div>
          ) : null}
          {step === 0 ? <StepTrip d={d} /> : null}
          {step === 1 ? <StepCards d={d} /> : null}
          {step === 2 ? <StepPoints d={d} /> : null}
          {step === 3 ? <StepSpending d={d} /> : null}
          <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-line pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => go(step - 1)}
              disabled={step === 0}
            >
              <ArrowLeft aria-hidden className="size-4" /> Back
            </Button>
            <Button type="button" onClick={next}>
              {step === 3 ? (
                <>
                  <Sparkles aria-hidden className="size-4" /> Build my plan
                </>
              ) : (
                <>
                  Next: {STEPS[step + 1]} <ArrowRight aria-hidden className="size-4" />
                </>
              )}
            </Button>
          </div>
          <SyncNote />
        </Card>
      ) : (
        <PlanResultView d={d} onEdit={go} />
      )}
    </div>
  );
}
