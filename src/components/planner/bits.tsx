'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { Check, Info } from 'lucide-react';
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
    <nav
      aria-label="Plan steps"
      className="rounded-2xl border border-line/80 bg-surface p-2 shadow-xs sm:p-3"
    >
      <ol className="flex gap-1 sm:gap-2">
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
                className="group flex w-full min-w-0 cursor-pointer flex-col items-stretch gap-1.5 rounded-xl p-0.5 text-left transition-colors hover:bg-sand/60 disabled:cursor-not-allowed disabled:hover:bg-transparent sm:p-1"
              >
                <span
                  className={cn(
                    'h-2 rounded-full transition-all duration-300',
                    current ? 'bg-sea' : done ? 'bg-sea/65' : 'bg-line',
                  )}
                />
                <span
                  className={cn(
                    'flex min-w-0 items-center gap-1 text-xs font-semibold',
                    current ? 'text-ink' : done ? 'text-ink-soft' : 'text-ink-muted',
                  )}
                >
                  {done ? (
                    <Check aria-hidden className="size-3.5 shrink-0 text-saving" />
                  ) : (
                    <span className="hidden shrink-0 font-mono text-[11px] opacity-75 sm:inline">
                      {i + 1}.
                    </span>
                  )}
                  <span className="truncate">{s}</span>
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
        className="inline-flex rounded-full transition-transform hover:scale-105"
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
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
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
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-line/80 bg-sand/50 px-3.5 py-2.5 text-sm text-ink-soft">
      <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-terracotta" />
      <p>{children}</p>
    </div>
  );
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
    <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-2xs transition-all duration-150 hover:border-sea/60 has-[:checked]:border-sea has-[:checked]:bg-sea-soft has-[:checked]:shadow-xs">
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
        {help ? <span className="mt-0.5 block text-sm text-ink-soft">{help}</span> : null}
      </span>
    </label>
  );
}
