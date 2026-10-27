'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useSyncExternalStore } from 'react';
import { onPlanWrite, writePlan, type PlanDraft } from './planStore';

type SyncState = {
  mode: 'checking' | 'account' | 'local' | 'error';
  reason: string | null;
  lastSaved: string | null;
};

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: SupabaseClient | null = null;
let state: SyncState = { mode: 'checking', reason: null, lastSaved: null };
const listeners = new Set<() => void>();
const set = (s: Partial<SyncState>) => {
  state = { ...state, ...s };
  listeners.forEach((l) => l());
};

/** Browser client with the publishable key only. The session lives under the `aum.` prefix so "clear my data" signs out too. */
function supabase(): SupabaseClient | null {
  if (!URL || !KEY) return null;
  client ??= createClient(URL, KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'aum.auth',
      detectSessionInUrl: false,
    },
  });
  return client;
}

let started = false;
let pushTimer: number | undefined;
let applyingRemote = false;

async function start() {
  if (started) return;
  started = true;
  const sb = supabase();
  if (!sb) return set({ mode: 'local', reason: 'Account storage is not configured on this site.' });
  try {
    let { data } = await sb.auth.getSession();
    if (!data.session) {
      const res = await sb.auth.signInAnonymously();
      if (res.error) {
        return set({
          mode: 'local',
          reason: /anonymous/i.test(res.error.message)
            ? 'Private account saving is switched off for this demo (anonymous sign-ins disabled).'
            : 'Could not create a private session.',
        });
      }
      data = { session: res.data.session };
    }
    const uid = data.session?.user.id;
    if (!uid) return set({ mode: 'local', reason: 'No session.' });
    const { data: row, error } = await sb
      .from('planner_profiles')
      .select('draft, updated_at')
      .eq('user_id', uid)
      .maybeSingle();
    if (error) return set({ mode: 'error', reason: 'Could not read your saved profile.' });
    const local = readLocalUpdatedAt();
    if (row && (!local || row.updated_at > local)) {
      applyingRemote = true;
      writePlan(() => ({ ...(row.draft as PlanDraft), updatedAt: row.updated_at }));
      applyingRemote = false;
    }
    set({ mode: 'account', reason: null, lastSaved: row?.updated_at ?? null });
    onPlanWrite((d) => {
      if (applyingRemote) return;
      window.clearTimeout(pushTimer);
      pushTimer = window.setTimeout(() => void push(d), 800);
    });
    if (!row) void push(JSON.parse(window.localStorage.getItem('aum.plan.v1') ?? 'null'));
  } catch {
    set({
      mode: 'error',
      reason: 'The account service did not respond. Your data is still saved in this browser.',
    });
  }
}

function readLocalUpdatedAt(): string | null {
  try {
    const d = JSON.parse(window.localStorage.getItem('aum.plan.v1') ?? 'null') as PlanDraft | null;
    return d && d.updatedAt && d.updatedAt > '1971' ? d.updatedAt : null;
  } catch {
    return null;
  }
}

async function push(d: PlanDraft | null) {
  const sb = supabase();
  if (!sb || !d || state.mode !== 'account') return;
  const { data } = await sb.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid)
    return set({
      mode: 'local',
      reason: 'Your private session ended. Data is saved in this browser.',
    });
  const { error } = await sb
    .from('planner_profiles')
    .upsert({ user_id: uid, draft: d, updated_at: d.updatedAt }, { onConflict: 'user_id' });
  if (error)
    set({
      mode: 'error',
      reason: 'Saving to your account failed; your data is safe in this browser.',
    });
  else set({ lastSaved: d.updatedAt });
}

export async function savePlanResult(
  inputsHash: string,
  result: { engineVersion: string; verdict: { outcome: string } },
) {
  const sb = supabase();
  if (!sb || state.mode !== 'account') return;
  const { data } = await sb.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) return;
  await sb.from('plans').upsert(
    {
      user_id: uid,
      inputs_hash: inputsHash.slice(0, 64),
      engine_version: result.engineVersion,
      verdict: result.verdict.outcome,
      result,
    },
    { onConflict: 'user_id,inputs_hash', ignoreDuplicates: true },
  );
}

async function deleteRemote() {
  const sb = supabase();
  if (!sb || state.mode !== 'account') return;
  const { data } = await sb.auth.getSession();
  const uid = data.session?.user.id;
  if (uid) {
    await sb.from('plans').delete().eq('user_id', uid);
    await sb.from('planner_profiles').delete().eq('user_id', uid);
  }
  await sb.auth.signOut();
  started = false;
  set({ mode: 'checking', lastSaved: null });
}

export function useSync() {
  const s = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
  useEffect(() => {
    void start();
  }, []);
  const statusText =
    s.mode === 'account'
      ? 'A private copy is saved to your anonymous account (Supabase, row-level security: only you can read it).'
      : s.mode === 'checking'
        ? 'Checking private account storage…'
        : `Saved in this browser only. ${s.reason ?? ''}`.trim();
  return { ...s, enabled: s.mode === 'account', statusText, deleteRemote };
}
