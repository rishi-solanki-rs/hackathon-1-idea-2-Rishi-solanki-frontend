'use client';

import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';
import { clearUserData } from './accountData';
import { resetPlanCache } from './planStore';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: SupabaseClient | null = null;

/** Browser client with the publishable key only. Session storage key uses the `aum.` prefix so "clear my data" also logs out. */
export function supabase(): SupabaseClient | null {
  if (!URL || !KEY) return null;
  if (typeof window === 'undefined') return null;
  if (!client) {
    client = createClient(URL, KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'aum.auth',
        detectSessionInUrl: false,
      },
    });
    client.auth.onAuthStateChange((_e, s) => {
      // Deferred: React re-renders synchronously, and any Supabase call made inside this callback deadlocks on the auth lock.
      window.setTimeout(() => {
        state = { ready: true, session: s };
        listeners.forEach((l) => l());
      }, 0);
    });
    void client.auth.getSession().then(({ data }) => {
      state = { ready: true, session: data.session };
      listeners.forEach((l) => l());
    });
  }
  return client;
}

type AuthState = { ready: boolean; session: Session | null };
let state: AuthState = { ready: false, session: null };
const SERVER: AuthState = { ready: false, session: null };
const listeners = new Set<() => void>();

export const authAvailable = () => !!URL && !!KEY;

export function useAuth() {
  const s = useSyncExternalStore(
    (cb) => {
      supabase();
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => SERVER,
  );
  return {
    ready: s.ready || !authAvailable(),
    session: s.session,
    email: s.session?.user.email ?? null,
    userId: s.session?.user.id ?? null,
    available: authAvailable(),
  };
}

const friendly = (m: string) =>
  /invalid login/i.test(m)
    ? 'Email or password is not correct.'
    : /already registered|already exists/i.test(m)
      ? 'An account with this email already exists. Log in instead.'
      : /password/i.test(m)
        ? 'Use a password of at least 8 characters.'
        : /rate limit/i.test(m)
          ? 'Too many attempts. Wait a minute and try again.'
          : 'Something went wrong. Try again.';

export async function signUp(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const sb = supabase();
  if (!sb) return { ok: false, message: 'Login is not configured on this site.' };
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) return { ok: false, message: friendly(error.message) };
  if (!data.session)
    return {
      ok: false,
      message: 'Account created, but email confirmation is required before logging in.',
    };
  return { ok: true };
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const sb = supabase();
  if (!sb) return { ok: false, message: 'Login is not configured on this site.' };
  const { error } = await sb.auth.signInWithPassword({ email, password });
  return error ? { ok: false, message: friendly(error.message) } : { ok: true };
}

/** Signs out and removes this person's answers from the browser, so the next person starts clean. */
export async function signOut() {
  await supabase()?.auth.signOut();
  try {
    clearUserData(window.localStorage, window.sessionStorage);
  } catch {
    /* storage unavailable */
  }
  resetPlanCache();
}
