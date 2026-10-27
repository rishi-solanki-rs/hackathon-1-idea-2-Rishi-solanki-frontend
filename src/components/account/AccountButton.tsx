'use client';

import Link from 'next/link';
import { UserRound } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useSync } from '@/lib/sync';

/** Header entry point: "Log in" for guests, the account (email initial) for logged-in users. Also keeps sync running. */
export function AccountButton() {
  const auth = useAuth();
  useSync();
  if (!auth.available) return null;
  const label = auth.email ? `Account: ${auth.email}` : 'Log in';
  return (
    <Link
      href="/login"
      aria-label={label}
      title={label}
      className="flex min-h-11 items-center gap-2 rounded-full border border-line px-3 text-sm font-semibold text-ink hover:border-sea"
    >
      <UserRound aria-hidden className="size-4" />
      <span className="hidden sm:inline">{auth.email ? auth.email.split('@')[0] : 'Log in'}</span>
    </Link>
  );
}
