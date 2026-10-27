'use client';

import { useContext } from 'react';
import { t } from '@/i18n/en';
import { addDays } from '@/lib/query';
import { writePlan, type PlanDraft } from '@/lib/planStore';
import { AirportSelect } from '../AirportSelect';
import { fieldClass } from '../ui';
import { Choice, ErrorsContext, Field, useErr } from './bits';

export function StepTrip({ d }: { d: PlanDraft }) {
  const trip = d.trip;
  const errors = useContext(ErrorsContext);
  const set = <K extends keyof PlanDraft['trip']>(k: K, v: PlanDraft['trip'][K]) =>
    writePlan((x) => ({ ...x, trip: { ...x.trip, [k]: v } }));
  const today = addDays(0);
  const eEarliest = useErr('pt-earliest');
  const eLatest = useErr('pt-latest');
  const eMin = useErr('pt-min-nights');
  const eMax = useErr('pt-max-nights');
  const eBook = useErr('pt-bookby');

  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Trip type">
        {(['return', 'one_way'] as const).map((tt) => (
          <label
            key={tt}
            className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-surface text-sm font-semibold has-[:checked]:border-sea has-[:checked]:bg-sea-soft has-[:checked]:text-sea-dark"
          >
            <input
              type="radio"
              name="trip-type"
              checked={trip.tripType === tt}
              onChange={() => set('tripType', tt)}
              className="sr-only"
            />
            {tt === 'return' ? 'Return' : 'One way'}
          </label>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <AirportSelect
          id="pt-origin"
          label="From"
          value={trip.origin}
          onChange={(v) => set('origin', v)}
          error={errors['pt-origin']}
          placeholder="Choose an airport"
        />
        <AirportSelect
          id="pt-destination"
          label="To"
          value={trip.destination}
          onChange={(v) => set('destination', v)}
          error={errors['pt-destination']}
          placeholder="Choose a destination"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="pt-earliest" label="Earliest departure">
          <input
            id="pt-earliest"
            type="date"
            min={today}
            value={trip.earliestDepart}
            onChange={(e) =>
              writePlan((x) => ({
                ...x,
                trip: {
                  ...x.trip,
                  earliestDepart: e.target.value,
                  latestDepart:
                    x.trip.latestDepart && x.trip.latestDepart >= e.target.value
                      ? x.trip.latestDepart
                      : e.target.value,
                },
              }))
            }
            className={fieldClass}
            {...eEarliest}
          />
        </Field>
        <Field
          id="pt-latest"
          label="Latest departure"
          hint="Flexible? Pick a later date (up to 60 days). We price several days in between."
        >
          <input
            id="pt-latest"
            type="date"
            min={trip.earliestDepart || today}
            value={trip.latestDepart}
            onChange={(e) => set('latestDepart', e.target.value)}
            className={fieldClass}
            {...eLatest}
          />
        </Field>
      </div>

      {trip.tripType === 'return' ? (
        <div className="grid grid-cols-2 gap-4">
          <Field id="pt-min-nights" label="Shortest stay (nights)">
            <input
              id="pt-min-nights"
              type="number"
              inputMode="numeric"
              min={1}
              max={60}
              value={trip.minNights}
              onChange={(e) => set('minNights', e.target.value)}
              className={fieldClass}
              {...eMin}
            />
          </Field>
          <Field id="pt-max-nights" label="Longest stay (nights)">
            <input
              id="pt-max-nights"
              type="number"
              inputMode="numeric"
              min={1}
              max={60}
              value={trip.maxNights}
              onChange={(e) => set('maxNights', e.target.value)}
              className={fieldClass}
              {...eMax}
            />
          </Field>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        <Field id="pt-adults" label="Travellers">
          <select
            id="pt-adults"
            value={trip.adults}
            onChange={(e) => set('adults', Number(e.target.value))}
            className={fieldClass}
          >
            {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} adult{n > 1 ? 's' : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field id="pt-cabin" label="Cabin">
          <select
            id="pt-cabin"
            value={trip.cabin}
            onChange={(e) => set('cabin', e.target.value as PlanDraft['trip']['cabin'])}
            className={fieldClass}
          >
            {(Object.keys(t.cabin) as (keyof typeof t.cabin)[]).map((c) => (
              <option key={c} value={c}>
                {t.cabin[c]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-semibold">What matters most?</legend>
        <Choice
          name="goal"
          checked={trip.objective === 'B_ECONOMIC_COST'}
          onChange={() => set('objective', 'B_ECONOMIC_COST')}
          title="Lowest overall cost"
          help="Cash plus the value of the points you use."
        />
        <Choice
          name="goal"
          checked={trip.objective === 'A_CASH_TODAY'}
          onChange={() => set('objective', 'A_CASH_TODAY')}
          title="Pay as little cash as possible"
          help="Use points where they reduce what you pay now."
        />
      </fieldset>

      <details className="rounded-xl border border-line p-3">
        <summary className="cursor-pointer text-sm font-semibold">More options</summary>
        <div className="mt-3 grid gap-4">
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={!!trip.directOnly}
              onChange={(e) => set('directOnly', e.target.checked)}
              className="size-5 accent-sea"
            />
            Direct flights only
          </label>
          <Field
            id="pt-bookby"
            label="I must book by (optional)"
            hint="If empty we assume 21 days before your earliest departure."
          >
            <input
              id="pt-bookby"
              type="date"
              min={today}
              max={trip.earliestDepart || undefined}
              value={trip.bookBy}
              onChange={(e) => set('bookBy', e.target.value)}
              className={fieldClass}
              {...eBook}
            />
          </Field>
        </div>
      </details>
    </div>
  );
}
