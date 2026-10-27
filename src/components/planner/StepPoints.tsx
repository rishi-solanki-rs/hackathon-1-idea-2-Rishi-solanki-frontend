'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { BalanceInput } from '@/domain/profile';
import { PROGRAMS, REFERENCE_EUR_PER_POINT, programById } from '@/fixtures/catalogue';
import { writePlan, type PlanDraft } from '@/lib/planStore';
import { Button, Card, fieldClass } from '../ui';
import { Choice, Field, GroupError, NumberInput, WhyBox, useErr } from './bits';

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
  const addErr = useErr('bal-add');
  const ePts = useErr('aw-points');
  const eTax = useErr('aw-taxes');

  return (
    <div className="grid gap-5">
      <WhyBox>
        Which points do you have today? Each programme stays separate: Avios, Miles and bank points
        are never added together.
      </WhyBox>

      {balances.length ? (
        <ul className="grid gap-3">
          {balances.map((b, i) => (
            <li key={i}>
              <BalanceRow
                b={b}
                i={i}
                used={used}
                setRow={setRow}
                remove={() => setBalances((bs) => bs.filter((_, j) => j !== i))}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {!d.profile.noPoints ? (
        <div className="grid gap-1">
          <Button
            id="bal-add"
            type="button"
            variant="secondary"
            className="justify-self-start"
            onClick={() =>
              setBalances((bs) => [
                ...bs,
                { program: '', kind: 'exact', asOf: new Date().toISOString().slice(0, 10) },
              ])
            }
            {...addErr}
          >
            <Plus aria-hidden className="size-4" /> Add a points balance
          </Button>
          <GroupError id="bal-add" />
        </div>
      ) : null}

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

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-semibold">
          Have you seen an award price for this trip?
        </legend>
        <Choice
          name="award-mode"
          checked={award.mode !== 'entered'}
          onChange={() => setAward({ mode: 'estimate' })}
          title="No, estimate it for me"
          help="If you have points, we use a rough estimate, clearly labelled, so we can still compare points with cash."
        />
        <Choice
          name="award-mode"
          checked={award.mode === 'entered'}
          onChange={() => setAward({ mode: 'entered' })}
          title="Yes, I found one on the programme’s site"
        />
      </fieldset>
      {award.mode === 'entered' ? (
        <Card className="grid gap-4 p-4 sm:grid-cols-3">
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
          <Field id="aw-points" label="Points (all travellers)">
            <input
              id="aw-points"
              type="number"
              inputMode="numeric"
              min={1}
              value={award.points}
              onChange={(e) => setAward({ points: e.target.value })}
              className={fieldClass}
              {...ePts}
            />
          </Field>
          <Field id="aw-taxes" label="Taxes and charges (€)">
            <input
              id="aw-taxes"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={award.taxesEur}
              onChange={(e) => setAward({ taxesEur: e.target.value })}
              className={fieldClass}
              {...eTax}
            />
          </Field>
          <label className="flex min-h-11 items-center gap-3 text-sm sm:col-span-3">
            <input
              type="checkbox"
              checked={award.seenAvailable}
              onChange={(e) => setAward({ seenAvailable: e.target.checked })}
              className="size-5 accent-sea"
            />
            I saw this seat available today
          </label>
        </Card>
      ) : null}

      <details className="rounded-xl border border-line p-3">
        <summary className="cursor-pointer text-sm font-semibold">
          What is a point worth to you? (optional)
        </summary>
        <p className="mt-2 text-sm text-ink-soft">
          If empty we use €{REFERENCE_EUR_PER_POINT} per point.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {PROGRAMS.filter((p) => p.kind === 'airline').map((p) => (
            <ValueInput key={p.id} program={p.id} label={`${p.name} (€ per point)`} d={d} />
          ))}
        </div>
      </details>
    </div>
  );
}

function BalanceRow({
  b,
  i,
  used,
  setRow,
  remove,
}: {
  b: BalanceInput;
  i: number;
  used: Set<string>;
  setRow: (i: number, p: Partial<BalanceInput>) => void;
  remove: () => void;
}) {
  const prog = programById(b.program);
  const p = `bal-${i}`;
  const eProg = useErr(`${p}-program`);
  return (
    <Card className="grid gap-4 p-4">
      <div className="flex items-end gap-2">
        <Field id={`${p}-program`} label="Programme" className="flex-1">
          <select
            id={`${p}-program`}
            value={b.program}
            onChange={(e) => setRow(i, { program: e.target.value })}
            className={fieldClass}
            {...eProg}
          >
            <option value="">Choose a programme</option>
            {PROGRAMS.map((pr) => (
              <option key={pr.id} value={pr.id} disabled={used.has(pr.id) && pr.id !== b.program}>
                {pr.name} ({pr.unit})
              </option>
            ))}
          </select>
        </Field>
        <button
          type="button"
          onClick={remove}
          aria-label={`Remove ${prog?.name ?? 'balance'}`}
          className="mb-0.5 grid size-11 shrink-0 place-items-center rounded-full text-ink-muted hover:text-danger"
        >
          <Trash2 aria-hidden className="size-4" />
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${p}-kind`} label="Balance">
          <select
            id={`${p}-kind`}
            value={b.kind}
            onChange={(e) => setRow(i, { kind: e.target.value as BalanceInput['kind'] })}
            className={fieldClass}
          >
            <option value="exact">I know it exactly</option>
            <option value="range">Roughly (a range)</option>
            <option value="unknown">I don’t know</option>
          </select>
        </Field>
        {b.kind === 'exact' ? (
          <Field id={`${p}-points`} label={`${prog?.unit ?? 'Points'} today`}>
            <NumberInput
              id={`${p}-points`}
              value={b.points}
              onChange={(v) => setRow(i, { points: v === null ? undefined : Math.round(v) })}
            />
          </Field>
        ) : null}
        {b.kind === 'unknown' ? (
          <p className="self-end pb-3 text-sm text-ink-soft">Counted as 0 until you know it.</p>
        ) : null}
      </div>
      {b.kind === 'range' ? (
        <div className="grid grid-cols-2 gap-4">
          <Field id={`${p}-min`} label="At least">
            <NumberInput
              id={`${p}-min`}
              value={b.min}
              onChange={(v) => setRow(i, { min: v === null ? undefined : Math.round(v) })}
            />
          </Field>
          <Field id={`${p}-max`} label="At most">
            <NumberInput
              id={`${p}-max`}
              value={b.max}
              onChange={(v) => setRow(i, { max: v === null ? undefined : Math.round(v) })}
            />
          </Field>
        </div>
      ) : null}
      <details>
        <summary className="cursor-pointer text-sm font-semibold text-sea-dark">
          Expiry or points promised to another trip
        </summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field id={`${p}-reserved`} label="Promised to another trip">
            <NumberInput
              id={`${p}-reserved`}
              value={b.reserved}
              onChange={(v) => setRow(i, { reserved: v === null ? undefined : Math.round(v) })}
            />
          </Field>
          <Field id={`${p}-expires`} label="Expire on">
            <input
              id={`${p}-expires`}
              type="date"
              value={b.expiresOn ?? ''}
              onChange={(e) => setRow(i, { expiresOn: e.target.value || undefined })}
              className={fieldClass}
            />
          </Field>
        </div>
      </details>
    </Card>
  );
}

function ValueInput({ program, label, d }: { program: string; label: string; d: PlanDraft }) {
  const id = `val-${program}`;
  const err = useErr(id);
  const v = d.profile.valuations.find((x) => x.program === program)?.eurPerPoint ?? '';
  return (
    <Field id={id} label={label}>
      <input
        id={id}
        inputMode="decimal"
        placeholder={REFERENCE_EUR_PER_POINT}
        value={v}
        onChange={(e) =>
          writePlan((x) => ({
            ...x,
            profile: {
              ...x.profile,
              valuations: [
                ...x.profile.valuations.filter((y) => y.program !== program),
                ...(e.target.value ? [{ program, eurPerPoint: e.target.value }] : []),
              ],
            },
          }))
        }
        className={fieldClass}
        {...err}
      />
    </Field>
  );
}
