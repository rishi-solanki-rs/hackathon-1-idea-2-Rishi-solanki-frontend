'use client';

import { useContext, useState } from 'react';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import {
  SPEND_CATEGORIES,
  unknown,
  userValue,
  type EarnRule,
  type Sourced,
  type UserCard,
} from '@/domain/profile';
import { CARD_CATALOGUE, CATEGORY_LABELS, catalogueCard } from '@/fixtures/cardCatalogue';
import { PROGRAMS, programById } from '@/fixtures/catalogue';
import { newId, writePlan, type PlanDraft } from '@/lib/planStore';
import { Button, Card, fieldClass } from '../ui';
import { ErrorsContext, Field, GroupError, NumberInput, SourceBadge, WhyBox, useErr } from './bits';

const edit = <T,>(value: T | null): Sourced<T> =>
  value === null ? unknown<T>() : userValue(value);
const fmtRate = (r: EarnRule) =>
  r.pointsPerEuro.value === null ? 'unknown' : `${Number(r.pointsPerEuro.value.toFixed(3))} per €1`;

export function StepCards({ d }: { d: PlanDraft }) {
  const [pick, setPick] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const cards = d.profile.cards;
  const setCards = (fn: (c: UserCard[]) => UserCard[]) =>
    writePlan((x) => ({
      ...x,
      profile: { ...x.profile, cards: fn(x.profile.cards), noCards: false },
    }));
  const update = (id: string, fn: (c: UserCard) => UserCard) =>
    setCards((cs) => cs.map((c) => (c.id === id ? fn(c) : c)));
  const pickErr = useErr('card-pick');

  function add(catalogueId: string) {
    const c = catalogueCard(catalogueId);
    const id = newId();
    if (c)
      setCards((cs) => [
        ...cs,
        {
          id,
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
    else {
      setCards((cs) => [
        ...cs,
        {
          id,
          name: '',
          issuingCountry: 'ES',
          program: '',
          earn: [{ category: 'all', pointsPerEuro: unknown() }],
          bonus: null,
          postingDelayDays: unknown(),
          annualFeeEur: unknown(),
        },
      ]);
    }
    // Open the new card's details straight away so its terms can be checked or filled in.
    setOpen(id);
    setPick('');
    window.setTimeout(() => document.getElementById(`card-${cards.length}-name`)?.focus(), 0);
  }

  return (
    <div className="grid gap-5">
      <WhyBox>
        Which cards do you already have? We use their earn rates to pick the best card for spending
        you already plan. No card numbers, ever.
      </WhyBox>

      {!d.profile.noCards ? (
        <div className="grid gap-2">
          <label htmlFor="card-pick" className="text-sm font-semibold">
            Add a card
          </label>
          <div className="flex gap-2">
            <select
              id="card-pick"
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              className={`${fieldClass} mt-0 flex-1`}
              {...pickErr}
            >
              <option value="">Choose your card</option>
              {CARD_CATALOGUE.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value="custom">My card is not listed</option>
            </select>
            <Button
              type="button"
              onClick={() => pick && add(pick)}
              disabled={!pick}
              className="shrink-0 px-4"
            >
              <Plus aria-hidden className="size-4" /> Add
            </Button>
          </div>
          <GroupError id="card-pick" />
        </div>
      ) : null}

      {cards.length ? (
        <ul className="grid gap-3">
          {cards.map((c, idx) => (
            <li key={c.id}>
              <CardRow
                c={c}
                idx={idx}
                open={open === c.id}
                onToggle={() => setOpen((o) => (o === c.id ? null : c.id))}
                onChange={(fn) => update(c.id, fn)}
                onRemove={() => setCards((cs) => cs.filter((x) => x.id !== c.id))}
              />
            </li>
          ))}
        </ul>
      ) : null}

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
    </div>
  );
}

function CardRow({
  c,
  idx,
  open,
  onToggle,
  onChange,
  onRemove,
}: {
  c: UserCard;
  idx: number;
  open: boolean;
  onToggle: () => void;
  onChange: (fn: (c: UserCard) => UserCard) => void;
  onRemove: () => void;
}) {
  const errors = useContext(ErrorsContext);
  const p = `card-${idx}`;
  const hasError = Object.keys(errors).some((k) => k.startsWith(`${p}-`));
  const expanded = open || hasError;
  const base = c.earn.find((r) => r.category === 'all') ?? c.earn[0];
  const cat = c.catalogueId ? catalogueCard(c.catalogueId) : undefined;
  const nameErr = useErr(`${p}-name`);
  const programErr = useErr(`${p}-program`);
  const setRule = (i: number, fn: (r: EarnRule) => EarnRule) =>
    onChange((x) => ({ ...x, earn: x.earn.map((r, j) => (j === i ? fn(r) : r)) }));

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{c.name || 'Card without a name'}</p>
          <p className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
            {programById(c.program)?.unit ?? 'points'}: {base ? fmtRate(base) : 'unknown'}
            {base ? (
              <SourceBadge
                status={base.pointsPerEuro.status}
                url={base.pointsPerEuro.sourceUrl}
                checkedAt={base.pointsPerEuro.checkedAt}
              />
            ) : null}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="px-3"
          aria-expanded={expanded}
          aria-controls={`${p}-editor`}
          onClick={onToggle}
        >
          Edit{' '}
          <ChevronDown
            aria-hidden
            className={`size-4 transition ${expanded ? 'rotate-180' : ''}`}
          />
        </Button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${c.name || 'card'}`}
          className="grid size-11 place-items-center rounded-full text-ink-muted hover:text-danger"
        >
          <Trash2 aria-hidden className="size-4" />
        </button>
      </div>

      {expanded ? (
        <div id={`${p}-editor`} className="grid gap-4 border-t border-line p-4">
          <Field id={`${p}-name`} label="Card name">
            <input
              id={`${p}-name`}
              value={c.name}
              maxLength={80}
              onChange={(e) => onChange((x) => ({ ...x, name: e.target.value }))}
              className={fieldClass}
              {...nameErr}
            />
          </Field>
          {!cat ? (
            <Field id={`${p}-program`} label="Earns points in">
              <select
                id={`${p}-program`}
                value={c.program}
                onChange={(e) => onChange((x) => ({ ...x, program: e.target.value }))}
                className={fieldClass}
                {...programErr}
              >
                <option value="">Choose the points it earns</option>
                {PROGRAMS.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.name} ({pr.unit})
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <ul className="list-disc pl-5 text-xs text-ink-muted">
              {cat.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}

          <fieldset className="grid gap-3">
            <legend className="text-sm font-semibold">Points per €1 spent</legend>
            {c.earn.map((r, i) => (
              <div
                key={i}
                className="grid gap-3 rounded-xl bg-sand/60 p-3 sm:grid-cols-[1.4fr_1fr_1fr]"
              >
                <Field id={`${p}-r${i}-cat`} label="On">
                  <select
                    id={`${p}-r${i}-cat`}
                    value={r.category}
                    onChange={(e) =>
                      setRule(i, (x) => ({
                        ...x,
                        category: e.target.value as EarnRule['category'],
                      }))
                    }
                    className={fieldClass}
                  >
                    <option value="all">Any purchase</option>
                    {SPEND_CATEGORIES.map((k) => (
                      <option key={k} value={k}>
                        {CATEGORY_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  id={`${p}-r${i}-rate`}
                  label="Points per €1"
                  hint={
                    r.pointsPerEuro.status === 'VERIFIED' ? 'From the official page' : undefined
                  }
                >
                  <NumberInput
                    id={`${p}-r${i}-rate`}
                    step={0.01}
                    value={
                      r.pointsPerEuro.value === null
                        ? null
                        : Number(r.pointsPerEuro.value.toFixed(4))
                    }
                    placeholder="Unknown"
                    onChange={(v) => setRule(i, (x) => ({ ...x, pointsPerEuro: edit(v) }))}
                  />
                </Field>
                <Field id={`${p}-r${i}-cap`} label="Monthly cap (€)" hint="Empty = no cap">
                  <NumberInput
                    id={`${p}-r${i}-cap`}
                    value={r.monthlyCapEur?.value ?? null}
                    placeholder="No cap"
                    onChange={(v) =>
                      setRule(i, (x) => ({ ...x, monthlyCapEur: userValue<number | null>(v) }))
                    }
                  />
                </Field>
                {c.earn.length > 1 ? (
                  <button
                    type="button"
                    className="justify-self-start text-sm font-semibold text-danger sm:col-span-3"
                    onClick={() =>
                      onChange((x) => ({ ...x, earn: x.earn.filter((_, j) => j !== i) }))
                    }
                  >
                    Remove this rate
                  </button>
                ) : null}
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

          <Field
            id={`${p}-delay`}
            label="Points appear after (days)"
            hint="Usually after the monthly statement. Leave empty if you don’t know."
          >
            <NumberInput
              id={`${p}-delay`}
              value={c.postingDelayDays.value}
              placeholder="Unknown"
              onChange={(v) =>
                onChange((x) => ({
                  ...x,
                  postingDelayDays: edit(v === null ? null : Math.round(v)),
                }))
              }
            />
          </Field>

          <details className="rounded-xl border border-line p-3">
            <summary className="cursor-pointer text-sm font-semibold">
              More details (fee, sign-up bonus)
            </summary>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field id={`${p}-fee`} label="Annual fee (€)">
                <NumberInput
                  id={`${p}-fee`}
                  value={c.annualFeeEur.value}
                  placeholder="Unknown"
                  onChange={(v) => onChange((x) => ({ ...x, annualFeeEur: edit(v) }))}
                />
              </Field>
              <Field id={`${p}-b-thr`} label="Bonus: spend needed (€)">
                <NumberInput
                  id={`${p}-b-thr`}
                  value={c.bonus?.thresholdEur.value ?? null}
                  onChange={(v) =>
                    onChange((x) => ({
                      ...x,
                      bonus: {
                        ...(x.bonus ?? { windowDays: unknown(), points: unknown() }),
                        thresholdEur: edit(v),
                      } as UserCard['bonus'],
                    }))
                  }
                />
              </Field>
              <Field id={`${p}-b-days`} label="Bonus: within (days)">
                <NumberInput
                  id={`${p}-b-days`}
                  value={c.bonus?.windowDays.value ?? null}
                  onChange={(v) =>
                    onChange((x) => ({
                      ...x,
                      bonus: {
                        ...(x.bonus ?? { thresholdEur: unknown(), points: unknown() }),
                        windowDays: edit(v === null ? null : Math.round(v)),
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
                        points: edit(v === null ? null : Math.round(v)),
                      } as UserCard['bonus'],
                    }))
                  }
                />
              </Field>
              <Field id={`${p}-b-start`} label="Card opened on" className="sm:col-span-2">
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
          </details>
        </div>
      ) : null}
    </Card>
  );
}
