'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ArrowLeftRight, Search } from 'lucide-react';
import { QuickSearchRequestSchema } from '@/contracts/search';
import { addDays, quickToQuery, type QuickParams } from '@/lib/query';
import { t } from '@/i18n/en';
import { useHydrated } from '@/lib/guestStore';
import { AirportSelect } from './AirportSelect';
import { Button, FieldError, Skeleton, fieldClass } from './ui';

type Errors = Partial<Record<keyof QuickParams, string>>;

/** Dates depend on the visitor's clock, so the form renders after hydration. */
export function QuickSearchForm({ initial }: { initial?: Partial<QuickParams> }) {
  const hydrated = useHydrated();
  if (!hydrated)
    return (
      <div aria-busy="true" aria-label="Loading search form" className="grid gap-4">
        <Skeleton className="h-11 w-48" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-11 w-56 justify-self-end" />
      </div>
    );
  return <QuickSearchFormInner initial={initial} />;
}

function QuickSearchFormInner({ initial }: { initial?: Partial<QuickParams> }) {
  const router = useRouter();
  const [p, setP] = useState<QuickParams>(() => ({
    origin: 'MAD',
    destination: '',
    tripType: 'return',
    departDate: addDays(45),
    returnDate: addDays(59),
    adults: 1,
    cabin: 'economy',
    flexDays: 0,
    nearbyAirports: false,
    objective: 'B_ECONOMIC_COST',
    ...initial,
  }));
  const [errors, setErrors] = useState<Errors>({});
  const today = addDays(0);
  const set = <K extends keyof QuickParams>(k: K, v: QuickParams[K]) =>
    setP((s) => ({ ...s, [k]: v }));

  function submit(e: FormEvent) {
    e.preventDefault();
    const candidate = { ...p, returnDate: p.tripType === 'return' ? p.returnDate : undefined };
    const r = QuickSearchRequestSchema.safeParse(candidate);
    const errs: Errors = {};
    if (!r.success)
      for (const i of r.error.issues) errs[i.path[0] as keyof QuickParams] ??= i.message;
    if (p.departDate && p.departDate < today) errs.departDate = 'Choose today or a later date';
    if (!p.destination) errs.destination = 'Choose where you want to go';
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(`qs-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    router.push(`/results?${quickToQuery(candidate)}`);
  }

  return (
    <form onSubmit={submit} noValidate aria-label="Quick Flight search" className="grid gap-4">
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Trip type</legend>
        {(['return', 'one_way'] as const).map((tt) => (
          <label
            key={tt}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-semibold has-[:checked]:border-sea has-[:checked]:bg-sea-soft has-[:checked]:text-sea-dark"
          >
            <input
              type="radio"
              name="tripType"
              value={tt}
              checked={p.tripType === tt}
              onChange={() => set('tripType', tt)}
              className="accent-sea"
            />
            {tt === 'return' ? 'Return' : 'One way'}
          </label>
        ))}
      </fieldset>

      <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <AirportSelect
          id="qs-origin"
          label="From"
          value={p.origin}
          onChange={(v) => set('origin', v)}
          error={errors.origin}
          placeholder="Choose an airport"
        />
        <button
          type="button"
          onClick={() => setP((s) => ({ ...s, origin: s.destination, destination: s.origin }))}
          className="mb-0.5 hidden size-11 place-items-center rounded-full border border-line bg-surface text-ink-soft hover:text-sea sm:grid"
          aria-label="Swap origin and destination"
        >
          <ArrowLeftRight aria-hidden className="size-4" />
        </button>
        <AirportSelect
          id="qs-destination"
          label="To"
          value={p.destination}
          onChange={(v) => set('destination', v)}
          error={errors.destination}
          placeholder="Choose a destination"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="qs-departDate" className="text-sm font-semibold">
            Departure
          </label>
          <input
            id="qs-departDate"
            type="date"
            min={today}
            value={p.departDate}
            onChange={(e) => set('departDate', e.target.value)}
            aria-invalid={!!errors.departDate}
            aria-describedby={errors.departDate ? 'qs-departDate-error' : undefined}
            className={fieldClass}
          />
          <FieldError id="qs-departDate-error" message={errors.departDate} />
        </div>
        {p.tripType === 'return' ? (
          <div>
            <label htmlFor="qs-returnDate" className="text-sm font-semibold">
              Return
            </label>
            <input
              id="qs-returnDate"
              type="date"
              min={p.departDate || today}
              value={p.returnDate ?? ''}
              onChange={(e) => set('returnDate', e.target.value)}
              aria-invalid={!!errors.returnDate}
              aria-describedby={errors.returnDate ? 'qs-returnDate-error' : undefined}
              className={fieldClass}
            />
            <FieldError id="qs-returnDate-error" message={errors.returnDate} />
          </div>
        ) : (
          <p className="self-end rounded-xl border border-dashed border-line px-3 py-2.5 text-sm text-ink-muted">
            One-way trip: no return date needed.
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="qs-adults" className="text-sm font-semibold">
            Travellers
          </label>
          <select
            id="qs-adults"
            value={p.adults}
            onChange={(e) => set('adults', Number(e.target.value))}
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
          <label htmlFor="qs-cabin" className="text-sm font-semibold">
            Cabin
          </label>
          <select
            id="qs-cabin"
            value={p.cabin}
            onChange={(e) => set('cabin', e.target.value as QuickParams['cabin'])}
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
          <label htmlFor="qs-flexDays" className="text-sm font-semibold">
            Date flexibility
          </label>
          <select
            id="qs-flexDays"
            value={p.flexDays}
            onChange={(e) => set('flexDays', Number(e.target.value))}
            className={fieldClass}
          >
            <option value={0}>Exact dates</option>
            <option value={1}>± 1 day</option>
            <option value={2}>± 2 days</option>
            <option value={3}>± 3 days</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={p.nearbyAirports}
            onChange={(e) => set('nearbyAirports', e.target.checked)}
            className="size-5 accent-sea"
          />
          Also try nearby airports (with train or bus to get there)
        </label>
        <fieldset className="flex flex-wrap items-center gap-2 text-sm">
          <legend className="sr-only">Rank results by</legend>
          <span aria-hidden className="font-semibold text-ink-soft">
            Rank by
          </span>
          {(['B_ECONOMIC_COST', 'A_CASH_TODAY'] as const).map((g) => (
            <label
              key={g}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-3 has-[:checked]:border-sea has-[:checked]:bg-sea-soft"
            >
              <input
                type="radio"
                name="objective"
                value={g}
                checked={p.objective === g}
                onChange={() => set('objective', g)}
                className="accent-sea"
              />
              {t.objective[g]}
            </label>
          ))}
        </fieldset>
      </div>

      <Button type="submit" className="w-full sm:w-auto sm:justify-self-end">
        <Search aria-hidden className="size-4" /> Compare cash and points
      </Button>
    </form>
  );
}
