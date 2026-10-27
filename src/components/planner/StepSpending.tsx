'use client';

import { Plus, Trash2 } from 'lucide-react';
import { SPEND_CATEGORIES, type MonthlySpend, type PlannedPurchase } from '@/domain/profile';
import { CATEGORY_LABELS } from '@/fixtures/cardCatalogue';
import { addDays } from '@/lib/query';
import { newId, writePlan, type PlanDraft } from '@/lib/planStore';
import { Alert, Button, Card, fieldClass } from '../ui';
import { Field, NumberInput, WhyBox } from './bits';

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

  return (
    <div className="grid gap-5">
      <WhyBox>
        Spending you already expect lets us pick the best card for each purchase and estimate when
        new points arrive. We only use spending you would do anyway, and never suggest buying more.
      </WhyBox>

      <fieldset className="grid gap-2 rounded-2xl border border-line p-4">
        <legend className="px-1 text-sm font-semibold">
          Do you pay your full card statement every month?
        </legend>
        {(
          [
            [true, 'Yes, always in full'],
            [false, 'No, I sometimes carry a balance'],
            [null, 'Not sure'],
          ] as const
        ).map(([v, label]) => (
          <label key={String(v)} className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="radio"
              name="pays-in-full"
              checked={!!p.finance.answered && p.finance.paysInFull === v}
              onChange={() =>
                setP((x) => ({ ...x, finance: { ...x.finance, paysInFull: v, answered: true } }))
              }
              className="accent-sea"
            />
            {label}
          </label>
        ))}
        {p.finance.paysInFull === false ? (
          <Alert kind="warn" title="We won’t plan card points for you">
            Card interest costs more than points are worth. Pay the balance off first; your plan
            will still show cash and points options.
          </Alert>
        ) : null}
      </fieldset>

      <section aria-labelledby="monthly-h" className="grid gap-3">
        <h3 id="monthly-h" className="font-semibold">
          Regular monthly spending
        </h3>
        {p.monthly.map((m, i) => (
          <Card
            key={m.id}
            className="grid items-end gap-3 p-4 sm:grid-cols-[1.3fr_1.2fr_0.8fr_1.2fr_auto]"
          >
            <Field id={`m-${i}-label`} label="What">
              <input
                id={`m-${i}-label`}
                value={m.label}
                maxLength={80}
                onChange={(e) => setMonthly(i, { label: e.target.value })}
                className={fieldClass}
              />
            </Field>
            <Field id={`m-${i}-cat`} label="Category">
              <select
                id={`m-${i}-cat`}
                value={m.category}
                onChange={(e) =>
                  setMonthly(i, { category: e.target.value as MonthlySpend['category'] })
                }
                className={fieldClass}
              >
                {SPEND_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </Field>
            <Field id={`m-${i}-amt`} label="€ per month">
              <NumberInput
                id={`m-${i}-amt`}
                value={m.amountEur}
                onChange={(v) => setMonthly(i, { amountEur: v ?? 0 })}
              />
            </Field>
            <Field id={`m-${i}-card`} label="Card used today">
              <select
                id={`m-${i}-card`}
                value={m.currentCardId ?? ''}
                onChange={(e) => setMonthly(i, { currentCardId: e.target.value || undefined })}
                className={fieldClass}
              >
                <option value="">None / cash</option>
                {p.cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Button
              type="button"
              variant="ghost"
              aria-label={`Remove ${m.label || 'row'}`}
              onClick={() => setP((x) => ({ ...x, monthly: x.monthly.filter((_, j) => j !== i) }))}
            >
              <Trash2 aria-hidden className="size-4" />
            </Button>
          </Card>
        ))}
        <Button
          type="button"
          variant="secondary"
          className="justify-self-start"
          onClick={() =>
            setP((x) => ({
              ...x,
              monthly: [
                ...x.monthly,
                { id: newId(), label: '', category: 'groceries', amountEur: 0 },
              ],
            }))
          }
        >
          <Plus aria-hidden className="size-4" /> Add monthly spending
        </Button>
      </section>

      <section aria-labelledby="planned-h" className="grid gap-3">
        <h3 id="planned-h" className="font-semibold">
          Purchases you already plan
        </h3>
        {p.purchases.map((x, i) => (
          <Card key={x.id} className="grid gap-3 p-4">
            <div className="grid items-end gap-3 sm:grid-cols-[1.3fr_1.2fr_0.8fr_1fr_auto]">
              <Field id={`p-${i}-label`} label="What">
                <input
                  id={`p-${i}-label`}
                  value={x.label}
                  maxLength={80}
                  onChange={(e) => setPurchase(i, { label: e.target.value })}
                  className={fieldClass}
                />
              </Field>
              <Field id={`p-${i}-cat`} label="Category">
                <select
                  id={`p-${i}-cat`}
                  value={x.category}
                  onChange={(e) =>
                    setPurchase(i, { category: e.target.value as PlannedPurchase['category'] })
                  }
                  className={fieldClass}
                >
                  {SPEND_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id={`p-${i}-amt`} label="Amount (€)">
                <NumberInput
                  id={`p-${i}-amt`}
                  value={x.amountEur}
                  onChange={(v) => setPurchase(i, { amountEur: v ?? 0 })}
                />
              </Field>
              <Field id={`p-${i}-date`} label="When">
                <input
                  id={`p-${i}-date`}
                  type="date"
                  value={x.date}
                  onChange={(e) => setPurchase(i, { date: e.target.value })}
                  className={fieldClass}
                />
              </Field>
              <Button
                type="button"
                variant="ghost"
                aria-label={`Remove ${x.label || 'purchase'}`}
                onClick={() =>
                  setP((y) => ({ ...y, purchases: y.purchases.filter((_, j) => j !== i) }))
                }
              >
                <Trash2 aria-hidden className="size-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
              <label className="flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  checked={x.necessity === 'necessary'}
                  onChange={(e) =>
                    setPurchase(i, { necessity: e.target.checked ? 'necessary' : 'flexible' })
                  }
                  className="size-5 accent-sea"
                />
                I need this anyway
              </label>
              <label className="flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  checked={x.committed}
                  onChange={(e) => setPurchase(i, { committed: e.target.checked })}
                  className="size-5 accent-sea"
                />
                Already committed
              </label>
              <label className="flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  checked={x.refundable}
                  onChange={(e) => setPurchase(i, { refundable: e.target.checked })}
                  className="size-5 accent-sea"
                />
                Refundable
              </label>
            </div>
          </Card>
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
        <p className="text-xs text-ink-muted">
          Optional purchases that are not committed are listed but never counted.
        </p>
      </section>
    </div>
  );
}
