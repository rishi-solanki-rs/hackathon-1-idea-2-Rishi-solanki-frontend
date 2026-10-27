'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { useHydrated } from '@/lib/guestStore';
import { buildRequest } from '@/lib/planConvert';
import { usePlanDraft, writePlan, type PlanDraft } from '@/lib/planStore';
import { validateStep, type FieldErrors } from '@/lib/planValidation';
import { useSync } from '@/lib/sync';
import { Button, Card, Skeleton } from '../ui';
import { ErrorsContext, STEPS, Stepper } from './bits';
import { StepTrip } from './StepTrip';
import { StepCards } from './StepCards';
import { StepPoints } from './StepPoints';
import { StepSpending } from './StepSpending';
import { PlanResultView } from './PlanResultView';

const TITLES = ['Where and when?', 'Your cards', 'Your points', 'Your spending'];

/** Field checks for the step, plus a final schema check so the server never rejects what the form accepted. */
function checkStep(d: PlanDraft, step: number): FieldErrors {
  const e = validateStep(d, step);
  if (step === 3 && !Object.keys(e).length) {
    const r = buildRequest(d);
    if (!r.success)
      e['step-general'] = 'Some answers could not be used. Go back and check the earlier steps.';
  }
  return e;
}

function SyncNote() {
  const s = useSync();
  return (
    <p className="text-xs text-ink-muted" role="status">
      {s.statusText}
    </p>
  );
}

export function PlanWizard() {
  const hydrated = useHydrated();
  const d = usePlanDraft();
  const [errors, setErrors] = useState<FieldErrors>({});
  if (!hydrated)
    return (
      <div aria-busy="true" className="grid gap-4">
        <Skeleton className="h-10" />
        <Skeleton className="h-96" />
      </div>
    );

  const step = Math.min(4, Math.max(0, d.step));
  const firstBlocked = [0, 1, 2, 3].find((s) => Object.keys(validateStep(d, s)).length > 0) ?? 4;
  // Errors clear field by field as the user fixes them; new errors only appear on Next.
  const live = Object.fromEntries(Object.entries(checkStep(d, step)).filter(([k]) => k in errors));
  const count = Object.keys(live).length;

  const go = (s: number) => {
    setErrors({});
    writePlan((x) => ({ ...x, step: s }));
    window.scrollTo({ top: 0 });
  };
  const next = () => {
    const e = checkStep(d, step);
    setErrors(e);
    const ids = Object.keys(e);
    if (!ids.length) return go(step + 1);
    window.setTimeout(() => {
      const el = document.getElementById(ids[0]!) ?? document.getElementById('step-fix');
      el?.scrollIntoView({ block: 'center' });
      el?.focus();
    }, 0);
  };

  return (
    <ErrorsContext.Provider value={live}>
      <div className="grid gap-5">
        <Stepper step={step} onGo={go} maxReached={Math.max(step, firstBlocked)} />
        {step < 4 ? (
          <Card className="p-4 sm:p-6">
            <h2 className="mb-5 font-display text-2xl">{TITLES[step]}</h2>
            {step === 0 ? <StepTrip d={d} /> : null}
            {step === 1 ? <StepCards d={d} /> : null}
            {step === 2 ? <StepPoints d={d} /> : null}
            {step === 3 ? <StepSpending d={d} /> : null}

            <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:backdrop-blur-none">
              {count ? (
                <p
                  id="step-fix"
                  tabIndex={-1}
                  role="alert"
                  className="mb-2 text-sm font-semibold text-danger"
                >
                  {live['step-general'] ?? `Fix ${count} field${count > 1 ? 's' : ''} to continue.`}
                </p>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => go(step - 1)}
                  disabled={step === 0}
                  className="px-4"
                >
                  <ArrowLeft aria-hidden className="size-4" /> Back
                </Button>
                <Button type="button" onClick={next} className="flex-1 sm:flex-none">
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
            </div>
            <div className="mt-3">
              <SyncNote />
            </div>
          </Card>
        ) : (
          <PlanResultView d={d} onEdit={go} />
        )}
      </div>
    </ErrorsContext.Provider>
  );
}
