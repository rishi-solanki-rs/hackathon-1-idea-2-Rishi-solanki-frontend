'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  SPEND_CATEGORIES,
  unknown,
  userValue,
  type EarnRule,
  type Sourced,
  type UserCard,
} from '@/domain/profile';
import { CARD_CATALOGUE, CATEGORY_LABELS, catalogueCard } from '@/fixtures/cardCatalogue';
import { PROGRAMS } from '@/fixtures/catalogue';
import { newId, writePlan, type PlanDraft } from '@/lib/planStore';
import { Button, Card, fieldClass } from '../ui';
import { Field, NumberInput, SourceBadge, WhyBox } from './bits';

const edit = <T,>(s: Sourced<T> | undefined, value: T | null): Sourced<T> =>
  value === null ? unknown<T>() : userValue(value);

export function StepCards({ d }: { d: PlanDraft }) {
  const [pick, setPick] = useState('');
  const cards = d.profile.cards;
  const setCards = (fn: (c: UserCard[]) => UserCard[]) =>
    writePlan((x) => ({
      ...x,
      profile: { ...x.profile, cards: fn(x.profile.cards), noCards: false },
    }));
  const update = (id: string, fn: (c: UserCard) => UserCard) =>
    setCards((cs) => cs.map((c) => (c.id === id ? fn(c) : c)));

  function addCatalogue() {
    const c = catalogueCard(pick);
    if (!c) return;
    setCards((cs) => [
      ...cs,
      {
        id: newId(),
        name: c.name,
        catalogueId: c.id,
        issuingCountry: c.country,
        program: c.program,
        earn: structuredClone(c.earn),
        bonus: null,
        postingDelayDays: c.postingDelayDays,
        annualFeeEur: c.annualFeeEur,
      },
    ]);
    setPick('');
  }
  function addCustom() {
    setCards((cs) => [
      ...cs,
      {
        id: newId(),
        name: 'My card',
        issuingCountry: 'ES',
        program: 'iberia_club',
        earn: [{ category: 'all', pointsPerEuro: unknown() }],
        bonus: null,
        postingDelayDays: unknown(),
        annualFeeEur: unknown(),
      },
    ]);
  }

  return (
    <div className="grid gap-5">
      <WhyBox>
        Which cards do you already hold? We use their earn rates to show which card to use for
        spending you already plan, and when the points arrive. We never ask for card numbers, CVV or
        PINs.
      </WhyBox>

      <label className="flex min-h-11 items-center gap-3 rounded-xl border border-line bg-surface p-3 text-sm">
        <input
          type="checkbox"
          checked={d.profile.noCards}
          onChange={(e) =>
            writePlan((x) => ({
              ...x,
              profile: {
                ...x.profile,
                noCards: e.target.checked,
                cards: e.target.checked ? [] : x.profile.cards,
              },
            }))
          }
          className="size-5 accent-sea"
        />
        I don’t have any cards that earn points
      </label>

      {!d.profile.noCards ? (
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <Field
            id="card-pick"
            label="Add a card from our list"
            hint="Terms come from the issuer’s official page with the date we checked."
          >
            <select
              id="card-pick"
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              className={fieldClass}
            >
              <option value="">Choose a card</option>
              {CARD_CATALOGUE.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Button type="button" onClick={addCatalogue} disabled={!pick}>
            <Plus aria-hidden className="size-4" /> Add card
          </Button>
          <Button type="button" variant="secondary" onClick={addCustom}>
            Card not listed
          </Button>
        </div>
      ) : null}

      <ul className="grid gap-4">
        {cards.map((c, idx) => (
          <li key={c.id}>
            <CardEditor
              c={c}
              idx={idx}
              onChange={(fn) => update(c.id, fn)}
              onRemove={() => setCards((cs) => cs.filter((x) => x.id !== c.id))}
            />
          </li>
        ))}
      </ul>
      {!cards.length && !d.profile.noCards ? (
        <p className="text-sm text-ink-muted">
          No cards added yet. Add one, or tick “I don’t have any cards”.
        </p>
      ) : null}
    </div>
  );
}

function CardEditor({
  c,
  idx,
  onChange,
  onRemove,
}: {
  c: UserCard;
  idx: number;
  onChange: (fn: (c: UserCard) => UserCard) => void;
  onRemove: () => void;
}) {
  const cat = c.catalogueId ? catalogueCard(c.catalogueId) : undefined;
  const p = `card-${idx}`;
  const setRule = (i: number, fn: (r: EarnRule) => EarnRule) =>
    onChange((x) => ({ ...x, earn: x.earn.map((r, j) => (j === i ? fn(r) : r)) }));
  return (
    <Card className="grid gap-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
          <Field id={`${p}-name`} label="Card name">
            <input
              id={`${p}-name`}
              value={c.name}
              maxLength={80}
              onChange={(e) => onChange((x) => ({ ...x, name: e.target.value }))}
              className={fieldClass}
            />
          </Field>
          <Field id={`${p}-program`} label="Earns points in">
            <select
              id={`${p}-program`}
              value={c.program}
              onChange={(e) => onChange((x) => ({ ...x, program: e.target.value }))}
              className={fieldClass}
              disabled={!!cat}
            >
              {PROGRAMS.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.name} ({pr.unit})
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Button type="button" variant="ghost" onClick={onRemove} aria-label={`Remove ${c.name}`}>
          <Trash2 aria-hidden className="size-4" /> Remove
        </Button>
      </div>
      {cat ? (
        <ul className="list-disc pl-5 text-xs text-ink-muted">
          {cat.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}

      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold">Points per €1 spent</legend>
        {c.earn.map((r, i) => (
          <div key={i} className="grid items-end gap-2 sm:grid-cols-[1.2fr_1fr_1fr_auto]">
            <Field id={`${p}-r${i}-cat`} label="On">
              <select
                id={`${p}-r${i}-cat`}
                value={r.category}
                onChange={(e) =>
                  setRule(i, (x) => ({ ...x, category: e.target.value as EarnRule['category'] }))
                }
                className={fieldClass}
              >
                <option value="all">Any purchase (base rate)</option>
                {SPEND_CATEGORIES.map((k) => (
                  <option key={k} value={k}>
                    {CATEGORY_LABELS[k]}
                  </option>
                ))}
              </select>
            </Field>
            <Field id={`${p}-r${i}-rate`} label="Points per €1">
              <NumberInput
                id={`${p}-r${i}-rate`}
                step={0.01}
                value={
                  r.pointsPerEuro.value === null ? null : Number(r.pointsPerEuro.value.toFixed(4))
                }
                placeholder="Unknown"
                onChange={(v) =>
                  setRule(i, (x) => ({ ...x, pointsPerEuro: edit(x.pointsPerEuro, v) }))
                }
              />
            </Field>
            <Field id={`${p}-r${i}-cap`} label="Monthly cap (€)" hint="Empty = no cap">
              <NumberInput
                id={`${p}-r${i}-cap`}
                value={r.monthlyCapEur?.value ?? null}
                placeholder="No cap"
                onChange={(v) =>
                  setRule(i, (x) => ({
                    ...x,
                    monthlyCapEur:
                      v === null ? userValue<number | null>(null) : userValue<number | null>(v),
                  }))
                }
              />
            </Field>
            <div className="flex items-center gap-2 pb-2">
              <SourceBadge
                status={r.pointsPerEuro.status}
                url={r.pointsPerEuro.sourceUrl}
                checkedAt={r.pointsPerEuro.checkedAt}
              />
              {c.earn.length > 1 ? (
                <button
                  type="button"
                  className="rounded-full p-2 text-ink-muted hover:text-danger"
                  aria-label={`Remove rate ${i + 1}`}
                  onClick={() =>
                    onChange((x) => ({ ...x, earn: x.earn.filter((_, j) => j !== i) }))
                  }
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
              ) : null}
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          className="justify-self-start px-3"
          onClick={() =>
            onChange((x) => ({
              ...x,
              earn: [...x.earn, { category: 'groceries', pointsPerEuro: unknown() }],
            }))
          }
        >
          <Plus aria-hidden className="size-4" /> Add a category rate
        </Button>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id={`${p}-delay`}
          label="Days until points appear"
          hint="Usually after the statement. Leave empty if you don’t know."
        >
          <div className="flex items-center gap-2">
            <NumberInput
              id={`${p}-delay`}
              value={c.postingDelayDays.value}
              placeholder="Unknown"
              onChange={(v) =>
                onChange((x) => ({
                  ...x,
                  postingDelayDays: edit(x.postingDelayDays, v === null ? null : Math.round(v)),
                }))
              }
            />
            <SourceBadge status={c.postingDelayDays.status} />
          </div>
        </Field>
        <Field id={`${p}-fee`} label="Annual fee (€)">
          <div className="flex items-center gap-2">
            <NumberInput
              id={`${p}-fee`}
              value={c.annualFeeEur.value}
              placeholder="Unknown"
              onChange={(v) => onChange((x) => ({ ...x, annualFeeEur: edit(x.annualFeeEur, v) }))}
            />
            <SourceBadge
              status={c.annualFeeEur.status}
              url={c.annualFeeEur.sourceUrl}
              checkedAt={c.annualFeeEur.checkedAt}
            />
          </div>
        </Field>
      </div>

      <details className="rounded-xl border border-line p-3" open={!!c.bonus}>
        <summary className="cursor-pointer text-sm font-semibold">
          Sign-up bonus still in progress (optional)
        </summary>
        <p className="mt-2 text-xs text-ink-muted">
          Only if you opened this card recently and the bonus is not earned yet. We only count
          spending you already plan.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <Field id={`${p}-b-thr`} label="Spend needed (€)">
            <NumberInput
              id={`${p}-b-thr`}
              value={c.bonus?.thresholdEur.value ?? null}
              onChange={(v) =>
                onChange((x) => ({
                  ...x,
                  bonus: {
                    ...(x.bonus ?? { windowDays: unknown(), points: unknown() }),
                    thresholdEur: edit(undefined, v),
                  } as UserCard['bonus'],
                }))
              }
            />
          </Field>
          <Field id={`${p}-b-days`} label="Within (days)">
            <NumberInput
              id={`${p}-b-days`}
              value={c.bonus?.windowDays.value ?? null}
              onChange={(v) =>
                onChange((x) => ({
                  ...x,
                  bonus: {
                    ...(x.bonus ?? { thresholdEur: unknown(), points: unknown() }),
                    windowDays: edit(undefined, v === null ? null : Math.round(v)),
                  } as UserCard['bonus'],
                }))
              }
            />
          </Field>
          <Field id={`${p}-b-pts`} label="Bonus points">
            <NumberInput
              id={`${p}-b-pts`}
              value={c.bonus?.points.value ?? null}
              onChange={(v) =>
                onChange((x) => ({
                  ...x,
                  bonus: {
                    ...(x.bonus ?? { thresholdEur: unknown(), windowDays: unknown() }),
                    points: edit(undefined, v === null ? null : Math.round(v)),
                  } as UserCard['bonus'],
                }))
              }
            />
          </Field>
          <Field id={`${p}-b-start`} label="Card opened on">
            <input
              id={`${p}-b-start`}
              type="date"
              value={c.bonus?.startDate ?? ''}
              onChange={(e) =>
                onChange((x) => ({
                  ...x,
                  bonus: {
                    ...(x.bonus ?? {
                      thresholdEur: unknown(),
                      windowDays: unknown(),
                      points: unknown(),
                    }),
                    startDate: e.target.value || undefined,
                  } as UserCard['bonus'],
                }))
              }
              className={fieldClass}
            />
          </Field>
        </div>
        {c.bonus ? (
          <Button
            type="button"
            variant="ghost"
            className="mt-2 px-3"
            onClick={() => onChange((x) => ({ ...x, bonus: null }))}
          >
            Remove bonus
          </Button>
        ) : null}
      </details>
    </Card>
  );
}
