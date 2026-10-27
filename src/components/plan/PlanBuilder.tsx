'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Plus, Route, Trash2 } from 'lucide-react';
import { PlanSearchRequestSchema } from '@/contracts/search';
import { t } from '@/i18n/en';
import { useHydrated } from '@/lib/guestStore';
import { addDays, planToQuery, type PlanParams } from '@/lib/query';
import { AirportSelect } from '../AirportSelect';
import { Button, Card, FieldError, Skeleton, fieldClass } from '../ui';

export function PlanBuilder() {
  const hydrated = useHydrated();
  if (!hydrated) return <Skeleton className="h-96" />;
  return <PlanBuilderInner />;
}

function PlanBuilderInner() {
  const router = useRouter();
  const [p, setP] = useState<PlanParams>(() => ({
    legs: [
      { origin: 'MAD', destination: '', date: addDays(60) },
      { origin: '', destination: 'MAD', date: addDays(70) },
    ],
    adults: 1,
    cabin: 'economy',
    objective: 'B_ECONOMIC_COST',
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const today = addDays(0);

  const setLeg = (i: number, k: 'origin' | 'destination' | 'date', v: string) =>
    setP((s) => ({ ...s, legs: s.legs.map((l, j) => (j === i ? { ...l, [k]: v } : l)) }));

  function submit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    p.legs.forEach((l, i) => {
      if (!l.origin) errs[`legs.${i}.origin`] = 'Choose an airport';
      if (!l.destination) errs[`legs.${i}.destination`] = 'Choose an airport';
      if (!l.date) errs[`legs.${i}.date`] = 'Choose a date';
      else if (l.date < today) errs[`legs.${i}.date`] = 'Choose today or a later date';
    });
    const r = PlanSearchRequestSchema.safeParse(p);
    if (!r.success) for (const i of r.error.issues) errs[i.path.join('.')] ??= i.message;
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(`plan-${Object.keys(errs)[0].replaceAll('.', '-')}`)?.focus();
      return;
    }
    router.push(`/plan/results?${planToQuery(p)}`);
  }

  return (
    <form onSubmit={submit} noValidate aria-label="Full Trip Plan" className="grid gap-5">
      <ol className="grid gap-4">
        {p.legs.map((l, i) => (
          <li key={i}>
            <Card className="p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 font-semibold">
                  <Route aria-hidden className="size-4 text-terracotta" /> Flight {i + 1}
                </h3>
                {p.legs.length > 2 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-3"
                    onClick={() => setP((s) => ({ ...s, legs: s.legs.filter((_, j) => j !== i) }))}
                    aria-label={`Remove flight ${i + 1}`}
                  >
                    <Trash2 aria-hidden className="size-4" /> Remove
                  </Button>
                ) : null}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <AirportSelect
                  id={`plan-legs-${i}-origin`}
                  label="From"
                  value={l.origin}
                  onChange={(v) => setLeg(i, 'origin', v)}
                  error={errors[`legs.${i}.origin`]}
                  placeholder="Choose an airport"
                />
                <AirportSelect
                  id={`plan-legs-${i}-destination`}
                  label="To"
                  value={l.destination}
                  onChange={(v) => setLeg(i, 'destination', v)}
                  error={errors[`legs.${i}.destination`]}
                  placeholder="Choose an airport"
                />
                <div>
                  <label htmlFor={`plan-legs-${i}-date`} className="text-sm font-semibold">
                    Date
                  </label>
                  <input
                    id={`plan-legs-${i}-date`}
                    type="date"
                    min={today}
                    value={l.date}
                    onChange={(e) => setLeg(i, 'date', e.target.value)}
                    aria-invalid={!!errors[`legs.${i}.date`]}
                    aria-describedby={
                      errors[`legs.${i}.date`] ? `plan-legs-${i}-date-error` : undefined
                    }
                    className={fieldClass}
                  />
                  <FieldError id={`plan-legs-${i}-date-error`} message={errors[`legs.${i}.date`]} />
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ol>
      {p.legs.length < 6 ? (
        <Button
          type="button"
          variant="secondary"
          className="justify-self-start"
          onClick={() =>
            setP((s) => {
              const last = s.legs[s.legs.length - 1];
              return {
                ...s,
                legs: [...s.legs, { origin: last.destination, destination: '', date: last.date }],
              };
            })
          }
        >
          <Plus aria-hidden className="size-4" /> Add a flight
        </Button>
      ) : (
        <p className="text-sm text-ink-soft">A trip can have up to 6 flights.</p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="plan-adults" className="text-sm font-semibold">
            Travellers
          </label>
          <select
            id="plan-adults"
            value={p.adults}
            onChange={(e) => setP((s) => ({ ...s, adults: Number(e.target.value) }))}
            className={fieldClass}
          >
            {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} adult{n > 1 ? 's' : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="plan-cabin" className="text-sm font-semibold">
            Cabin
          </label>
          <select
            id="plan-cabin"
            value={p.cabin}
            onChange={(e) => setP((s) => ({ ...s, cabin: e.target.value as PlanParams['cabin'] }))}
            className={fieldClass}
          >
            {(Object.keys(t.cabin) as (keyof typeof t.cabin)[]).map((c) => (
              <option key={c} value={c}>
                {t.cabin[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="plan-objective" className="text-sm font-semibold">
            Rank by
          </label>
          <select
            id="plan-objective"
            value={p.objective}
            onChange={(e) =>
              setP((s) => ({ ...s, objective: e.target.value as PlanParams['objective'] }))
            }
            className={fieldClass}
          >
            <option value="B_ECONOMIC_COST">{t.objective.B_ECONOMIC_COST}</option>
            <option value="A_CASH_TODAY">{t.objective.A_CASH_TODAY}</option>
          </select>
        </div>
      </div>
      <Button type="submit" className="w-full sm:w-auto sm:justify-self-end">
        Plan my trip
      </Button>
    </form>
  );
}
