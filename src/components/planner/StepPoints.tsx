'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { BalanceInput } from '@/domain/profile';
import {
  PROGRAMS,
  REFERENCE_EUR_PER_POINT,
  TRANSFER_ROUTES,
  programById,
  verificationLabel,
} from '@/fixtures/catalogue';
import { writePlan, type PlanDraft } from '@/lib/planStore';
import { Badge, Button, Card, fieldClass } from '../ui';
import { Field, NumberInput, WhyBox } from './bits';

export function StepPoints({ d }: { d: PlanDraft }) {
  const balances = d.profile.balances;
  const setBalances = (fn: (b: BalanceInput[]) => BalanceInput[]) =>
    writePlan((x) => ({
      ...x,
      profile: { ...x.profile, balances: fn(x.profile.balances), noPoints: false },
    }));
  const setRow = (i: number, patch: Partial<BalanceInput>) =>
    setBalances((bs) => bs.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const award = d.award;
  const setAward = (patch: Partial<PlanDraft['award']>) =>
    writePlan((x) => ({ ...x, award: { ...x.award, ...patch } }));
  const used = new Set(balances.map((b) => b.program));
  const relevantRoutes = TRANSFER_ROUTES.filter((r) => used.has(r.from));

  return (
    <div className="grid gap-5">
      <WhyBox>
        Which points do you have today? Each programme is kept separate; we never add Avios, Miles
        and bank points together. If you are not sure of a balance, say so: we will count it as zero
        and lower the confidence.
      </WhyBox>

      <label className="flex min-h-11 items-center gap-3 rounded-xl border border-line bg-surface p-3 text-sm">
        <input
          type="checkbox"
          checked={d.profile.noPoints}
          onChange={(e) =>
            writePlan((x) => ({
              ...x,
              profile: {
                ...x.profile,
                noPoints: e.target.checked,
                balances: e.target.checked ? [] : x.profile.balances,
              },
            }))
          }
          className="size-5 accent-sea"
        />
        I don’t have any loyalty points
      </label>

      <ul className="grid gap-3">
        {balances.map((b, i) => {
          const prog = programById(b.program);
          const p = `bal-${i}`;
          return (
            <li key={i}>
              <Card className="grid gap-3 p-4">
                <div className="grid items-end gap-3 sm:grid-cols-[1.4fr_1fr_auto]">
                  <Field id={`${p}-program`} label="Programme">
                    <select
                      id={`${p}-program`}
                      value={b.program}
                      onChange={(e) => setRow(i, { program: e.target.value })}
                      className={fieldClass}
                    >
                      <option value="">Choose a programme</option>
                      {PROGRAMS.map((pr) => (
                        <option
                          key={pr.id}
                          value={pr.id}
                          disabled={used.has(pr.id) && pr.id !== b.program}
                        >
                          {pr.name} ({pr.unit})
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field id={`${p}-kind`} label="I know my balance">
                    <select
                      id={`${p}-kind`}
                      value={b.kind}
                      onChange={(e) => setRow(i, { kind: e.target.value as BalanceInput['kind'] })}
                      className={fieldClass}
                    >
                      <option value="exact">Exactly</option>
                      <option value="range">Roughly (a range)</option>
                      <option value="unknown">I don’t know</option>
                    </select>
                  </Field>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setBalances((bs) => bs.filter((_, j) => j !== i))}
                    aria-label={`Remove ${prog?.name ?? 'balance'}`}
                  >
                    <Trash2 aria-hidden className="size-4" /> Remove
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  {b.kind === 'exact' ? (
                    <Field id={`${p}-points`} label={`Balance (${prog?.unit ?? 'points'})`}>
                      <NumberInput
                        id={`${p}-points`}
                        value={b.points}
                        onChange={(v) =>
                          setRow(i, { points: v === null ? undefined : Math.round(v) })
                        }
                      />
                    </Field>
                  ) : null}
                  {b.kind === 'range' ? (
                    <>
                      <Field id={`${p}-min`} label="At least">
                        <NumberInput
                          id={`${p}-min`}
                          value={b.min}
                          onChange={(v) =>
                            setRow(i, { min: v === null ? undefined : Math.round(v) })
                          }
                        />
                      </Field>
                      <Field id={`${p}-max`} label="At most">
                        <NumberInput
                          id={`${p}-max`}
                          value={b.max}
                          onChange={(v) =>
                            setRow(i, { max: v === null ? undefined : Math.round(v) })
                          }
                        />
                      </Field>
                    </>
                  ) : null}
                  <Field id={`${p}-reserved`} label="Already promised to another trip">
                    <NumberInput
                      id={`${p}-reserved`}
                      value={b.reserved}
                      onChange={(v) =>
                        setRow(i, { reserved: v === null ? undefined : Math.round(v) })
                      }
                    />
                  </Field>
                  <Field id={`${p}-expires`} label="Expire on (optional)">
                    <input
                      id={`${p}-expires`}
                      type="date"
                      value={b.expiresOn ?? ''}
                      onChange={(e) => setRow(i, { expiresOn: e.target.value || undefined })}
                      className={fieldClass}
                    />
                  </Field>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
      {!d.profile.noPoints ? (
        <Button
          type="button"
          variant="secondary"
          className="justify-self-start"
          onClick={() =>
            setBalances((bs) => [
              ...bs,
              { program: '', kind: 'exact', asOf: new Date().toISOString().slice(0, 10) },
            ])
          }
        >
          <Plus aria-hidden className="size-4" /> Add a points balance
        </Button>
      ) : null}

      {relevantRoutes.length ? (
        <div className="grid gap-2">
          <h3 className="text-sm font-semibold">Transfers you could make</h3>
          <ul className="grid gap-2 text-sm">
            {relevantRoutes.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2">
                {programById(r.from)?.name} → {programById(r.to)?.name} · {r.num}:{r.den} · min{' '}
                {r.min.toLocaleString('en-IE')} · up to {r.maxDelayDays} days
                <Badge tone="warn">{verificationLabel(r.verification)}</Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <fieldset className="grid gap-3 rounded-2xl border border-line p-4">
        <legend className="px-1 text-sm font-semibold">Points price for this trip</legend>
        <p className="text-sm text-ink-soft">
          We cannot see award seats. If you found one on the programme’s own site, enter it here so
          we can compare it with cash.
        </p>
        {(
          [
            ['none', 'I haven’t checked yet'],
            ['entered', 'I found an award on the programme’s site'],
            ['estimate', 'Give me a rough estimate (low confidence)'],
          ] as const
        ).map(([m, label]) => (
          <label key={m} className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="radio"
              name="award-mode"
              checked={award.mode === m}
              onChange={() => setAward({ mode: m })}
              className="accent-sea"
            />
            {label}
          </label>
        ))}
        {award.mode === 'entered' ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <Field id="aw-program" label="Programme">
              <select
                id="aw-program"
                value={award.program}
                onChange={(e) => setAward({ program: e.target.value })}
                className={fieldClass}
              >
                {PROGRAMS.filter((p) => p.kind === 'airline').map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="aw-points" label="Points needed (all travellers)">
              <input
                id="aw-points"
                type="number"
                min={1}
                value={award.points}
                onChange={(e) => setAward({ points: e.target.value })}
                className={fieldClass}
              />
            </Field>
            <Field id="aw-taxes" label="Taxes and charges (€)">
              <input
                id="aw-taxes"
                type="number"
                min={0}
                step="0.01"
                value={award.taxesEur}
                onChange={(e) => setAward({ taxesEur: e.target.value })}
                className={fieldClass}
              />
            </Field>
            <label className="flex min-h-11 items-center gap-3 text-sm sm:col-span-3">
              <input
                type="checkbox"
                checked={award.seenAvailable}
                onChange={(e) => setAward({ seenAvailable: e.target.checked })}
                className="size-5 accent-sea"
              />
              I saw this seat available on the programme’s site today
            </label>
          </div>
        ) : null}
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="text-sm font-semibold">What is a point worth to you? (optional)</legend>
        <p className="text-sm text-ink-soft">
          If empty we use €{REFERENCE_EUR_PER_POINT} per point as a reference.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {PROGRAMS.filter((p) => p.kind === 'airline').map((p) => {
            const v = d.profile.valuations.find((x) => x.program === p.id)?.eurPerPoint ?? '';
            return (
              <Field
                key={p.id}
                id={`val-${p.id}`}
                label={`${p.name} (€ per ${p.unit === 'Avios' ? 'Avios' : 'point'})`}
              >
                <input
                  id={`val-${p.id}`}
                  inputMode="decimal"
                  placeholder={REFERENCE_EUR_PER_POINT}
                  value={v}
                  onChange={(e) =>
                    writePlan((x) => ({
                      ...x,
                      profile: {
                        ...x.profile,
                        valuations: [
                          ...x.profile.valuations.filter((y) => y.program !== p.id),
                          ...(e.target.value
                            ? [{ program: p.id, eurPerPoint: e.target.value }]
                            : []),
                        ],
                      },
                    }))
                  }
                  className={fieldClass}
                />
              </Field>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
