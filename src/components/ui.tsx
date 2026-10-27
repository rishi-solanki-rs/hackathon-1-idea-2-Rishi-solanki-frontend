import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, Plane, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const variants: Record<Variant, string> = {
  primary:
    'bg-sea text-sea-ink hover:bg-sea-dark shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0',
  secondary:
    'bg-surface text-ink border border-line hover:border-sea hover:bg-sand/60 hover:text-sea-dark shadow-xs hover:-translate-y-0.5 active:translate-y-0',
  ghost: 'text-sea-dark hover:bg-sea-soft/80',
  danger:
    'bg-surface text-danger border border-danger/40 hover:bg-danger-soft hover:-translate-y-0.5 active:translate-y-0',
};
const base =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 min-h-11';

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
        'rounded-[var(--radius-card)] border border-line/90 bg-surface shadow-[var(--shadow-card)] transition-shadow duration-200',
        className,
      )}
      {...p}
    />
  );
}

type Tone = 'neutral' | 'sea' | 'saving' | 'warn' | 'danger' | 'terracotta' | 'gold';
const tones: Record<Tone, string> = {
  neutral: 'bg-sand text-ink-soft border-line',
  sea: 'bg-sea-soft text-sea-dark border-sea/25',
  saving: 'bg-saving-soft text-saving border-saving/30',
  warn: 'bg-warn-soft text-warn border-warn/30',
  danger: 'bg-danger-soft text-danger border-danger/30',
  terracotta: 'bg-terracotta-soft text-terracotta border-terracotta/30',
  gold: 'bg-gold-soft text-gold border-gold/30',
};

export function Badge({
  tone = 'neutral',
  className,
  ...p
}: ComponentProps<'span'> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-tight',
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
      className={cn(
        'flex gap-3.5 rounded-2xl border p-4 text-sm shadow-xs',
        alertTone[kind],
        className,
      )}
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
  return <div aria-hidden className={cn('skeleton-shimmer rounded-xl', className)} />;
}

/** Flight-path loader with a gliding plane along a dashed route and step label. */
export function FlightLoader({ label, sublabel }: { label: string; sublabel?: string }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wider text-ink-muted uppercase">
        <span>Origin</span>
        <span className="text-terracotta">In flight</span>
        <span>Destination</span>
      </div>
      <div className="relative my-3 h-6 w-full">
        <span className="absolute top-1/2 right-2 left-2 border-t-2 border-dashed border-line" />
        <span className="absolute top-1/2 left-1 size-2.5 -translate-y-1/2 rounded-full bg-sea" />
        <span className="absolute top-1/2 right-1 size-2.5 -translate-y-1/2 rounded-full bg-terracotta" />
        <Plane aria-hidden className="anim-fly size-5 rotate-90 text-sea" />
      </div>
      <p className="text-sm font-semibold text-ink">{label}</p>
      {sublabel ? <p className="mt-0.5 text-xs text-ink-soft">{sublabel}</p> : null}
    </Card>
  );
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
        <p className="inline-flex items-center gap-1.5 rounded-full border border-terracotta/25 bg-terracotta-soft px-3 py-0.5 text-xs font-semibold tracking-[0.14em] text-terracotta uppercase">
          {eyebrow}
        </p>
      ) : null}
      <H
        id={id}
        className={cn(
          'mt-2 font-display tracking-tight text-ink',
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
  'mt-1.5 block w-full min-w-0 max-w-full min-h-11 rounded-xl border border-line bg-surface px-3.5 py-2 text-base text-ink shadow-xs transition-colors duration-150 placeholder:text-ink-muted hover:border-sea/60 focus:border-sea aria-[invalid=true]:border-danger';

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-sm font-medium text-danger">
      {message}
    </p>
  );
}
