'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import type { EvidenceStatus } from '@/domain/profile';
import type { FieldErrors } from '@/lib/planValidation';
import { cn } from '@/lib/cn';
import { Badge, fieldClass } from '../ui';

export const STEPS = ['Trip', 'Cards', 'Points', 'Spending', 'Plan'] as const;

export const ErrorsContext = createContext<FieldErrors>({});
/** aria props for an input whose error (if any) is rendered by <Field> under it. */
export function useErr(id: string) {
  const msg = useContext(ErrorsContext)[id];
  return {
    'aria-invalid': msg ? true : undefined,
    'aria-describedby': msg ? `${id}-err` : undefined,
  } as const;
}

export function Stepper({
  step,
  onGo,
  maxReached,
}: {
  step: number;
  onGo: (i: number) => void;
  maxReached: number;
}) {
  return (
    <nav aria-label="Plan steps">
      <ol className="flex gap-1.5">
        {STEPS.map((s, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={s} className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onGo(i)}
                disabled={i > maxReached}
                aria-current={current ? 'step' : undefined}
                aria-label={`Step ${i + 1}: ${s}${done ? ' (done)' : ''}`}
                className="group flex w-full flex-col items-stretch gap-1.5 text-left disabled:cursor-not-allowed"
              >
                <span
                  className={cn(
                    'h-1.5 rounded-full',
                    current ? 'bg-sea' : done ? 'bg-sea/60' : 'bg-line',
                  )}
                />
                <span
                  className={cn(
                    'flex items-center gap-1 truncate text-xs font-semibold',
                    current ? 'text-ink' : 'text-ink-muted',
                  )}
                >
                  {done ? <Check aria-hidden className="size-3.5 shrink-0 text-sea-dark" /> : null}
                  {s}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

const statusTone: Record<EvidenceStatus, 'saving' | 'sea' | 'gold' | 'warn' | 'neutral'> = {
  VERIFIED: 'saving',
  USER_ENTERED: 'sea',
  ILLUSTRATIVE: 'gold',
  CONFLICTING: 'warn',
  UNKNOWN: 'neutral',
};
const statusText: Record<EvidenceStatus, string> = {
  VERIFIED: 'Official source',
  USER_ENTERED: 'Your input',
  ILLUSTRATIVE: 'Estimate',
  CONFLICTING: 'Conflicting',
  UNKNOWN: 'Unknown',
};

export function SourceBadge({
  status,
  url,
  checkedAt,
}: {
  status: EvidenceStatus;
  url?: string;
  checkedAt?: string;
}) {
  const badge = <Badge tone={statusTone[status]}>{statusText[status]}</Badge>;
  if (status === 'VERIFIED' && url)
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={`Checked ${checkedAt}`}
        className="inline-flex rounded-full"
      >
        {badge}
        <span className="sr-only"> (opens the official source, checked {checkedAt})</span>
      </a>
    );
  return badge;
}

/** Label above, input, then the error (or hint) right under the input. */
export function Field({
  id,
  label,
  hint,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  const msg = useContext(ErrorsContext)[id];
  return (
    <div className={cn('min-w-0', className)}>
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      {children}
      {msg ? (
        <p id={`${id}-err`} className="mt-1 text-sm font-medium text-danger">
          {msg}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/** Error for controls that are not a single input (choice groups, add buttons). */
export function GroupError({ id }: { id: string }) {
  const msg = useContext(ErrorsContext)[id];
  return msg ? (
    <p id={`${id}-err`} className="text-sm font-medium text-danger">
      {msg}
    </p>
  ) : null;
}

export function NumberInput({
  id,
  value,
  onChange,
  min = 0,
  step = 1,
  placeholder,
}: {
  id: string;
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  min?: number;
  step?: number;
  placeholder?: string;
}) {
  const err = useErr(id);
  return (
    <input
      id={id}
      type="number"
      inputMode="decimal"
      min={min}
      step={step}
      placeholder={placeholder}
      value={value === null || value === undefined || Number.isNaN(value) ? '' : value}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      className={fieldClass}
      {...err}
    />
  );
}

export function WhyBox({ children }: { children: ReactNode }) {
  return <p className="text-sm text-ink-soft">{children}</p>;
}

export function Choice({
  name,
  checked,
  onChange,
  title,
  help,
  id,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  help?: string;
  id?: string;
}) {
  return (
    <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface p-3 has-[:checked]:border-sea has-[:checked]:bg-sea-soft">
      <input
        id={id}
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="mt-1 size-4 accent-sea"
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        {help ? <span className="block text-sm text-ink-soft">{help}</span> : null}
      </span>
    </label>
  );
}
