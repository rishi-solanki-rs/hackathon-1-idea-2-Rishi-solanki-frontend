import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const variants: Record<Variant, string> = {
  primary: 'bg-sea text-white hover:bg-sea-dark shadow-sm',
  secondary: 'bg-surface text-ink border border-line hover:border-sea hover:text-sea-dark',
  ghost: 'text-sea-dark hover:bg-sea-soft',
  danger: 'bg-surface text-danger border border-danger/40 hover:bg-danger-soft',
};
const base =
  'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 min-h-11';

export function Button({
  variant = 'primary',
  className,
  ...p
}: ComponentProps<'button'> & { variant?: Variant }) {
  return <button className={cn(base, variants[variant], className)} {...p} />;
}

export function ButtonLink({
  variant = 'primary',
  className,
  ...p
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cn(base, variants[variant], className)} {...p} />;
}

export function Card({ className, ...p }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)]',
        className,
      )}
      {...p}
    />
  );
}

type Tone = 'neutral' | 'sea' | 'saving' | 'warn' | 'danger' | 'terracotta' | 'gold';
const tones: Record<Tone, string> = {
  neutral: 'bg-sand text-ink-soft border-line',
  sea: 'bg-sea-soft text-sea-dark border-sea/20',
  saving: 'bg-saving-soft text-saving border-saving/25',
  warn: 'bg-warn-soft text-warn border-warn/25',
  danger: 'bg-danger-soft text-danger border-danger/25',
  terracotta: 'bg-terracotta-soft text-terracotta border-terracotta/25',
  gold: 'bg-gold-soft text-gold border-gold/25',
};

export function Badge({
  tone = 'neutral',
  className,
  ...p
}: ComponentProps<'span'> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        tones[tone],
        className,
      )}
      {...p}
    />
  );
}

const alertIcon = { info: Info, success: CheckCircle2, warn: AlertTriangle, error: XCircle };
const alertTone = {
  info: 'bg-sea-soft border-sea/25 text-ink',
  success: 'bg-saving-soft border-saving/30 text-ink',
  warn: 'bg-warn-soft border-warn/30 text-ink',
  error: 'bg-danger-soft border-danger/30 text-ink',
};
const alertIconTone = {
  info: 'text-sea-dark',
  success: 'text-saving',
  warn: 'text-warn',
  error: 'text-danger',
};

export function Alert({
  kind = 'info',
  title,
  children,
  action,
  className,
  live,
}: {
  kind?: keyof typeof alertIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
  live?: boolean;
}) {
  const Icon = alertIcon[kind];
  return (
    <div
      role={kind === 'error' ? 'alert' : live ? 'status' : undefined}
      className={cn('flex gap-3 rounded-xl border p-4 text-sm', alertTone[kind], className)}
    >
      <Icon aria-hidden className={cn('mt-0.5 size-5 shrink-0', alertIconTone[kind])} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        {children ? <div className="mt-1 text-ink-soft">{children}</div> : null}
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-lg bg-sand-deep/70', className)} />;
}

export function SectionTitle({
  eyebrow,
  title,
  children,
  as: H = 'h2',
  id,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  as?: 'h1' | 'h2';
  id?: string;
}) {
  return (
    <div className="max-w-2xl">
      {eyebrow ? (
        <p className="text-xs font-semibold tracking-[0.18em] text-terracotta uppercase">
          {eyebrow}
        </p>
      ) : null}
      <H
        id={id}
        className={cn(
          'mt-1 font-display text-ink',
          H === 'h1' ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl',
        )}
      >
        {title}
      </H>
      {children ? <div className="mt-2 text-ink-soft">{children}</div> : null}
    </div>
  );
}

export const fieldClass =
  'mt-1 block w-full min-w-0 max-w-full min-h-11 rounded-xl border border-line bg-surface px-3 py-2 text-base text-ink shadow-sm placeholder:text-ink-muted focus:border-sea aria-[invalid=true]:border-danger';

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-sm font-medium text-danger">
      {message}
    </p>
  );
}
