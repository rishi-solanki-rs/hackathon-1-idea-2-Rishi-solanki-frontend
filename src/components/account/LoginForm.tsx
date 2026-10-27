'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Loader2, LogOut } from 'lucide-react';
import { signIn, signOut, signUp, useAuth } from '@/lib/auth';
import { Alert, Button, ButtonLink, Card, fieldClass } from '../ui';

type Errors = { email?: string; password?: string; form?: string };

export function LoginForm() {
  const auth = useAuth();
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') && sp.get('next')!.startsWith('/') ? sp.get('next')! : '/plan';
  const [mode, setMode] = useState<'login' | 'signup'>(
    sp.get('mode') === 'signup' ? 'signup' : 'login',
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  if (!auth.available)
    return (
      <Alert kind="warn" title="Login is not configured on this site">
        Your plan is still saved in this browser.
      </Alert>
    );
  if (auth.session)
    return (
      <Card className="grid gap-4 p-6">
        <p className="text-sm text-ink-soft">You are logged in as</p>
        <p className="text-lg font-semibold break-all">{auth.email}</p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/plan">Plan my trip</ButtonLink>
          <ButtonLink href="/my-plans" variant="secondary">
            My plans
          </ButtonLink>
          <Button variant="ghost" onClick={() => void signOut()}>
            <LogOut aria-hidden className="size-4" /> Log out
          </Button>
        </div>
      </Card>
    );

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs: Errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      errs.email = 'Enter a valid email address.';
    if (password.length < 8) errs.password = 'Use at least 8 characters.';
    setErrors(errs);
    if (errs.email || errs.password) {
      document.getElementById(errs.email ? 'login-email' : 'login-password')?.focus();
      return;
    }
    setBusy(true);
    const r =
      mode === 'signup'
        ? await signUp(email.trim(), password)
        : await signIn(email.trim(), password);
    setBusy(false);
    if (!r.ok) return setErrors({ form: r.message });
    router.push(next);
  }

  return (
    <Card className="p-6">
      <div
        role="tablist"
        aria-label="Account"
        className="mb-5 grid grid-cols-2 gap-1 rounded-full bg-sand p-1"
      >
        {(['login', 'signup'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setErrors({});
            }}
            className="min-h-10 rounded-full text-sm font-semibold aria-selected:bg-surface aria-selected:shadow-sm"
          >
            {m === 'login' ? 'Log in' : 'Create account'}
          </button>
        ))}
      </div>
      <form
        onSubmit={submit}
        noValidate
        className="grid gap-4"
        aria-label={mode === 'login' ? 'Log in' : 'Create account'}
      >
        <div>
          <label htmlFor="login-email" className="text-sm font-semibold">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'login-email-err' : undefined}
            className={fieldClass}
          />
          {errors.email ? (
            <p id="login-email-err" className="mt-1 text-sm font-medium text-danger">
              {errors.email}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="login-password" className="text-sm font-semibold">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'login-password-err' : 'login-password-hint'}
            className={fieldClass}
          />
          {errors.password ? (
            <p id="login-password-err" className="mt-1 text-sm font-medium text-danger">
              {errors.password}
            </p>
          ) : (
            <p id="login-password-hint" className="mt-1 text-xs text-ink-muted">
              At least 8 characters.
            </p>
          )}
        </div>
        {errors.form ? (
          <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm font-medium text-danger">
            {errors.form}
          </p>
        ) : null}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
          {mode === 'login' ? 'Log in' : 'Create account'}
        </Button>
        <p className="text-xs text-ink-muted">
          Your trip, cards (names and earn rates only), points and plans are stored privately in
          your account. We never ask for card numbers.
        </p>
      </form>
    </Card>
  );
}
