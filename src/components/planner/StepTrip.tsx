'use client';

import { t } from '@/i18n/en';
import { addDays } from '@/lib/query';
import { writePlan, type PlanDraft } from '@/lib/planStore';
import { AirportSelect } from '../AirportSelect';
import { fieldClass } from '../ui';
import { Field, WhyBox } from './bits';

export function StepTrip({ d }: { d: PlanDraft }) {
  const trip = d.trip;
  const set = <K extends keyof PlanDraft['trip']>(k: K, v: PlanDraft['trip'][K]) =>
    writePlan((x) => ({ ...x, trip: { ...x.trip, [k]: v } }));
  const today = addDays(0);
  return (
    <div className="grid gap-5">
      <WhyBox>
        Tell us the trip. A date range lets us price several departure days and find the cheapest;
        you can narrow it any time.
      </WhyBox>

      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Trip type</legend>
        {(['return', 'one_way'] as const).map((tt) => (
          <label
            key={tt}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-semibold has-[:checked]:border-sea has-[:checked]:bg-sea-soft has-[:checked]:text-sea-dark"
          >
            <input
              type="radio"
              name="trip-type"
              checked={trip.tripType === tt}
              onChange={() => set('tripType', tt)}
              className="accent-sea"
            />
            {tt === 'return' ? 'Return' : 'One way'}
          </label>
        ))}
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <AirportSelect
          id="pt-origin"
          label="From"
          value={trip.origin}
          onChange={(v) => set('origin', v)}
          placeholder="Choose an airport"
        />
        <AirportSelect
          id="pt-destination"
          label="To"
          value={trip.destination}
          onChange={(v) => set('destination', v)}
          placeholder="Choose a destination"
        />
      </div>

      <fieldset className="grid gap-3 rounded-2xl border border-line p-4">
        <legend className="px-1 text-sm font-semibold">When can you leave?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
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
            />
          </Field>
          <Field
            id="pt-latest"
            label="Latest departure"
            hint="Up to 60 days after the earliest. Same day = fixed date."
          >
            <input
              id="pt-latest"
              type="date"
              min={trip.earliestDepart || today}
              value={trip.latestDepart}
              onChange={(e) => set('latestDepart', e.target.value)}
              className={fieldClass}
            />
          </Field>
        </div>
        {trip.tripType === 'return' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="pt-min-nights" label="Shortest stay (nights)">
              <input
                id="pt-min-nights"
                type="number"
                min={1}
                max={60}
                value={trip.minNights}
                onChange={(e) => set('minNights', e.target.value)}
                className={fieldClass}
              />
            </Field>
            <Field id="pt-max-nights" label="Longest stay (nights)">
              <input
                id="pt-max-nights"
                type="number"
                min={1}
                max={60}
                value={trip.maxNights}
                onChange={(e) => set('maxNights', e.target.value)}
                className={fieldClass}
              />
            </Field>
          </div>
        ) : null}
        <Field
          id="pt-bookby"
          label="Book by (optional)"
          hint="Your own deadline to have the trip booked. If empty we assume 21 days before the earliest departure."
        >
          <input
            id="pt-bookby"
            type="date"
            min={today}
            max={trip.earliestDepart || undefined}
            value={trip.bookBy}
            onChange={(e) => set('bookBy', e.target.value)}
            className={fieldClass}
          />
        </Field>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
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

      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={!!trip.directOnly}
          onChange={(e) => set('directOnly', e.target.checked)}
          className="size-5 accent-sea"
        />
        Direct flights only (a must, not a preference)
      </label>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold">What matters most?</legend>
        {(
          [
            [
              'B_ECONOMIC_COST',
              'Lowest overall cost',
              'Cash plus the value of the points you use.',
            ],
            [
              'A_CASH_TODAY',
              'Least cash today',
              'Pay as little money as possible now, even if it uses more points.',
            ],
          ] as const
        ).map(([g, title, help]) => (
          <label
            key={g}
            className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface p-3 has-[:checked]:border-sea has-[:checked]:bg-sea-soft"
          >
            <input
              type="radio"
              name="goal"
              checked={trip.objective === g}
              onChange={() => set('objective', g)}
              className="mt-1 accent-sea"
            />
            <span>
              <span className="block text-sm font-semibold">{title}</span>
              <span className="block text-sm text-ink-soft">{help}</span>
            </span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}
