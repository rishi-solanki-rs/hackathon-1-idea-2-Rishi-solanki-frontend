'use client';

import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import type { EvidenceStatus } from '@/domain/profile';
import { cn } from '@/lib/cn';
import { Badge, fieldClass } from '../ui';

export const STEPS = ['Trip', 'Cards', 'Points', 'Spending', 'Your plan'] as const;

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
      <ol className="grid grid-cols-5 gap-1 sm:gap-2">
        {STEPS.map((s, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={s}>
              <button
                type="button"
                onClick={() => onGo(i)}
                disabled={i > maxReached}
                aria-current={current ? 'step' : undefined}
                className={cn(
                  'flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2 text-xs font-semibold sm:flex-row sm:justify-center sm:text-sm',
                  current
                    ? 'bg-sea text-white'
                    : done
                      ? 'bg-sea-soft text-sea-dark'
                      : 'bg-sand text-ink-soft',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                )}
              >
                <span
                  className={cn(
                    'grid size-6 place-items-center rounded-full text-xs',
                    current ? 'bg-surface/20' : 'bg-surface/70',
                  )}
                >
                  {done ? <Check aria-hidden className="size-3.5" /> : i + 1}
                </span>
                <span>{s}</span>
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
  ILLUSTRATIVE: 'Illustrative',
  CONFLICTING: 'Conflicting sources',
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

export function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
}

export function NumberInput({
  id,
  value,
  onChange,
  min = 0,
  step = 1,
  placeholder,
  invalid,
}: {
  id: string;
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  min?: number;
  step?: number;
  placeholder?: string;
  invalid?: boolean;
}) {
  return (
    <input
      id={id}
      type="number"
      inputMode="decimal"
      min={min}
      step={step}
      placeholder={placeholder}
      value={value === null || value === undefined || Number.isNaN(value) ? '' : value}
      aria-invalid={invalid || undefined}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      className={fieldClass}
    />
  );
}

export function WhyBox({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-sand/70 p-3 text-sm text-ink-soft">{children}</p>;
}
