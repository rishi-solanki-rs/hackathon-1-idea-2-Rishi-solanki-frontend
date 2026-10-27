'use client';

import { Plus, Trash2 } from 'lucide-react';
import {
  SPEND_CATEGORIES,
  type MonthlySpend,
  type PlannedPurchase,
  type SpendCategory,
} from '@/domain/profile';
import { CATEGORY_LABELS } from '@/fixtures/cardCatalogue';
import { addDays } from '@/lib/query';
import { newId, writePlan, type PlanDraft } from '@/lib/planStore';
import { Alert, Button, Card, fieldClass } from '../ui';
import { Choice, Field, GroupError, NumberInput, WhyBox, useErr } from './bits';

const PRESETS: { label: string; category: SpendCategory }[] = [
  { label: 'Groceries', category: 'groceries' },
  { label: 'Bills and utilities', category: 'bills' },
  { label: 'Transport', category: 'transport' },
  { label: 'Fuel', category: 'fuel' },
  { label: 'Restaurants', category: 'dining' },
];

export function StepSpending({ d }: { d: PlanDraft }) {
  const p = d.profile;
  const setP = (fn: (x: PlanDraft['profile']) => PlanDraft['profile']) =>
    writePlan((x) => ({ ...x, profile: fn(x.profile) }));
  const setMonthly = (i: number, patch: Partial<MonthlySpend>) =>
    setP((x) => ({ ...x, monthly: x.monthly.map((m, j) => (j === i ? { ...m, ...patch } : m)) }));
  const setPurchase = (i: number, patch: Partial<PlannedPurchase>) =>
    setP((x) => ({
      ...x,
      purchases: x.purchases.map((m, j) => (j === i ? { ...m, ...patch } : m)),
    }));
  const pay = (v: boolean | null) =>
    setP((x) => ({ ...x, finance: { ...x.finance, paysInFull: v, answered: true } }));
  const answered = !!p.finance.answered;

  return (
    <div className="grid gap-6">
      <WhyBox>
        Spending you already expect tells us which card to use and when new points arrive. We never
        suggest buying anything extra.
      </WhyBox>

      <fieldset className="grid gap-2" aria-describedby={useErr('pay-yes')['aria-describedby']}>
        <legend className="mb-1 text-sm font-semibold">
          Do you pay your full card bill every month?
        </legend>
        <div className="grid gap-2 sm:grid-cols-3">
          <Choice
            id="pay-yes"
            name="pay"
            checked={answered && p.finance.paysInFull === true}
            onChange={() => pay(true)}
            title="Yes, always"
          />
          <Choice
            name="pay"
            checked={answered && p.finance.paysInFull === false}
            onChange={() => pay(false)}
            title="No, I carry a balance"
          />
          <Choice
            name="pay"
            checked={answered && p.finance.paysInFull === null}
            onChange={() => pay(null)}
            title="Not sure"
          />
        </div>
        <GroupError id="pay-yes" />
        {answered && p.finance.paysInFull === false ? (
          <Alert kind="warn" title="We won’t plan card points for you">
            Card interest costs more than points are worth. Your plan still compares cash and
            points.
          </Alert>
        ) : null}
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-1 text-sm font-semibold">Your cash for this trip (optional)</legend>
        <Field
          id="fin-budget"
          label="Trip budget (€)"
          hint="What you can pay in cash for the flights."
        >
          <NumberInput
            id="fin-budget"
            value={p.finance.tripBudgetEur ?? null}
            onChange={(v) => setP((x) => ({ ...x, finance: { ...x.finance, tripBudgetEur: v } }))}
            placeholder="Not set"
          />
        </Field>
        <Field
          id="fin-reserve"
          label="Cash to keep in reserve (€)"
          hint="Money that must stay untouched after paying."
        >
          <NumberInput
            id="fin-reserve"
            value={p.finance.cashReserveEur ?? null}
            onChange={(v) => setP((x) => ({ ...x, finance: { ...x.finance, cashReserveEur: v } }))}
            placeholder="Not set"
          />
        </Field>
      </fieldset>

      <section aria-labelledby="monthly-h" className="grid gap-3">
        <h3 id="monthly-h" className="font-semibold">
          Every month you spend on…
        </h3>
        <div className="flex flex-wrap gap-2">
          {PRESETS.filter((x) => !p.monthly.some((m) => m.category === x.category)).map((x) => (
            <button
              key={x.category}
              type="button"
              onClick={() =>
                setP((y) => ({
                  ...y,
                  monthly: [
                    ...y.monthly,
                    { id: newId(), label: x.label, category: x.category, amountEur: 0 },
                  ],
                }))
              }
              className="inline-flex min-h-10 items-center gap-1 rounded-full border border-line bg-surface px-3 text-sm font-semibold hover:border-sea"
            >
              <Plus aria-hidden className="size-3.5" /> {x.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() =>
              setP((y) => ({
                ...y,
                monthly: [
                  ...y.monthly,
                  { id: newId(), label: '', category: 'other', amountEur: 0 },
                ],
              }))
            }
            className="inline-flex min-h-10 items-center gap-1 rounded-full border border-dashed border-line px-3 text-sm font-semibold"
          >
            <Plus aria-hidden className="size-3.5" /> Other
          </button>
        </div>
        {p.monthly.map((m, i) => (
          <MonthlyRow
            key={m.id}
            m={m}
            i={i}
            cards={p.cards}
            set={(patch) => setMonthly(i, patch)}
            remove={() => setP((x) => ({ ...x, monthly: x.monthly.filter((_, j) => j !== i) }))}
          />
        ))}
      </section>

      <section aria-labelledby="planned-h" className="grid gap-3">
        <h3 id="planned-h" className="font-semibold">
          Big purchases you already plan
        </h3>
        {p.purchases.map((x, i) => (
          <PurchaseRow
            key={x.id}
            x={x}
            i={i}
            cards={p.cards}
            set={(patch) => setPurchase(i, patch)}
            remove={() => setP((y) => ({ ...y, purchases: y.purchases.filter((_, j) => j !== i) }))}
          />
        ))}
        <Button
          type="button"
          variant="secondary"
          className="justify-self-start"
          onClick={() =>
            setP((y) => ({
              ...y,
              purchases: [
                ...y.purchases,
                {
                  id: newId(),
                  label: '',
                  category: 'shopping',
                  amountEur: 0,
                  date: addDays(30),
                  necessity: 'necessary',
                  committed: false,
                  refundable: false,
                },
              ],
            }))
          }
        >
          <Plus aria-hidden className="size-4" /> Add a planned purchase
        </Button>
      </section>
    </div>
  );
}

function MonthlyRow({
  m,
  i,
  cards,
  set,
  remove,
}: {
  m: MonthlySpend;
  i: number;
  cards: PlanDraft['profile']['cards'];
  set: (p: Partial<MonthlySpend>) => void;
  remove: () => void;
}) {
  const eLabel = useErr(`m-${i}-label`);
  return (
    <Card className="grid gap-4 p-4">
      <div className="flex items-end gap-2">
        <Field id={`m-${i}-label`} label="What" className="flex-1">
          <input
            id={`m-${i}-label`}
            value={m.label}
            maxLength={80}
            onChange={(e) => set({ label: e.target.value })}
            className={fieldClass}
            {...eLabel}
          />
        </Field>
        <button
          type="button"
          aria-label={`Remove ${m.label || 'row'}`}
          onClick={remove}
          className="mb-0.5 grid size-11 shrink-0 place-items-center rounded-full text-ink-muted hover:text-danger"
        >
          <Trash2 aria-hidden className="size-4" />
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id={`m-${i}-amt`} label="€ per month">
          <NumberInput
            id={`m-${i}-amt`}
            value={m.amountEur || null}
            onChange={(v) => set({ amountEur: v ?? 0 })}
          />
        </Field>
        <Field id={`m-${i}-cat`} label="Category">
          <select
            id={`m-${i}-cat`}
            value={m.category}
            onChange={(e) => set({ category: e.target.value as SpendCategory })}
            className={fieldClass}
          >
            {SPEND_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field id={`m-${i}-card`} label="Paid today with">
          <select
            id={`m-${i}-card`}
            value={m.currentCardId ?? ''}
            onChange={(e) => set({ currentCardId: e.target.value || undefined })}
            className={fieldClass}
          >
            <option value="">Cash / debit</option>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </Card>
  );
}

function PurchaseRow({
  x,
  i,
  cards,
  set,
  remove,
}: {
  x: PlannedPurchase;
  i: number;
  cards: PlanDraft['profile']['cards'];
  set: (p: Partial<PlannedPurchase>) => void;
  remove: () => void;
}) {
  const eLabel = useErr(`p-${i}-label`);
  const eDate = useErr(`p-${i}-date`);
  return (
    <Card className="grid gap-4 p-4">
      <div className="flex items-end gap-2">
        <Field id={`p-${i}-label`} label="What" className="flex-1">
          <input
            id={`p-${i}-label`}
            value={x.label}
            maxLength={80}
            placeholder="e.g. New laptop"
            onChange={(e) => set({ label: e.target.value })}
            className={fieldClass}
            {...eLabel}
          />
        </Field>
        <button
          type="button"
          aria-label={`Remove ${x.label || 'purchase'}`}
          onClick={remove}
          className="mb-0.5 grid size-11 shrink-0 place-items-center rounded-full text-ink-muted hover:text-danger"
        >
          <Trash2 aria-hidden className="size-4" />
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id={`p-${i}-amt`} label="Amount (€)">
          <NumberInput
            id={`p-${i}-amt`}
            value={x.amountEur || null}
            onChange={(v) => set({ amountEur: v ?? 0 })}
          />
        </Field>
        <Field id={`p-${i}-date`} label="When">
          <input
            id={`p-${i}-date`}
            type="date"
            value={x.date}
            onChange={(e) => set({ date: e.target.value })}
            className={fieldClass}
            {...eDate}
          />
        </Field>
        <Field id={`p-${i}-cat`} label="Category">
          <select
            id={`p-${i}-cat`}
            value={x.category}
            onChange={(e) => set({ category: e.target.value as SpendCategory })}
            className={fieldClass}
          >
            {SPEND_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="flex flex-wrap gap-x-5 text-sm">
        <label className="flex min-h-11 items-center gap-2">
          <input
            type="checkbox"
            checked={x.committed}
            onChange={(e) => set({ committed: e.target.checked })}
            className="size-5 accent-sea"
          />
          Already committed
        </label>
        <label className="flex min-h-11 items-center gap-2">
          <input
            type="checkbox"
            checked={x.necessity === 'flexible'}
            onChange={(e) => set({ necessity: e.target.checked ? 'flexible' : 'necessary' })}
            className="size-5 accent-sea"
          />
          Optional (might not buy)
        </label>
        <label className="flex min-h-11 items-center gap-2">
          <input
            type="checkbox"
            checked={x.refundable}
            onChange={(e) => set({ refundable: e.target.checked })}
            className="size-5 accent-sea"
          />
          Refundable
        </label>
      </div>
      <Field id={`p-${i}-card`} label="Would pay today with">
        <select
          id={`p-${i}-card`}
          value={x.currentCardId ?? ''}
          onChange={(e) => set({ currentCardId: e.target.value || undefined })}
          className={fieldClass}
        >
          <option value="">Cash / debit</option>
          {cards.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
    </Card>
  );
}
