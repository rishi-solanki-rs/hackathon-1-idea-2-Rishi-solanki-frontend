'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { supabase, useAuth } from './auth';
import { onPlanWrite, writePlan, type PlanDraft } from './planStore';

type SyncState = {
  mode: 'local' | 'syncing' | 'account' | 'error';
  lastSaved: string | null;
  userId: string | null;
};
let state: SyncState = { mode: 'local', lastSaved: null, userId: null };
const listeners = new Set<() => void>();
const set = (s: Partial<SyncState>) => {
  state = { ...state, ...s };
  listeners.forEach((l) => l());
};

let pushTimer: number | undefined;
let applyingRemote = false;
let unsubscribeWrites: (() => void) | null = null;

const localDraft = (): PlanDraft | null => {
  try {
    return JSON.parse(window.localStorage.getItem('aum.plan.v1') ?? 'null');
  } catch {
    return null;
  }
};

/** Called whenever the logged-in user changes: pull the account copy (newer wins), then keep it in sync. */
async function attach(userId: string | null) {
  if (state.userId === userId) return;
  unsubscribeWrites?.();
  unsubscribeWrites = null;
  if (!userId) return set({ mode: 'local', userId: null, lastSaved: null });
  const sb = supabase();
  if (!sb) return;
  set({ mode: 'syncing', userId });
  const { data: row, error } = await sb
    .from('planner_profiles')
    .select('draft, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return set({ mode: 'error' });
  const local = localDraft();
  const localHasData =
    !!local &&
    (local.profile?.cards?.length || local.profile?.balances?.length || local.trip?.destination);
  if (row && (!localHasData || !local?.updatedAt || row.updated_at > local.updatedAt)) {
    applyingRemote = true;
    writePlan(() => ({ ...(row.draft as PlanDraft), updatedAt: row.updated_at }));
    applyingRemote = false;
  } else if (local) {
    await push(local);
  }
  set({ mode: 'account', lastSaved: row?.updated_at ?? state.lastSaved });
  unsubscribeWrites = onPlanWrite((d) => {
    if (applyingRemote) return;
    window.clearTimeout(pushTimer);
    pushTimer = window.setTimeout(() => void push(d), 700);
  });
}

async function push(d: PlanDraft) {
  const sb = supabase();
  if (!sb || !state.userId) return;
  const { error } = await sb
    .from('planner_profiles')
    .upsert(
      { user_id: state.userId, draft: d, updated_at: d.updatedAt },
      { onConflict: 'user_id' },
    );
  set(error ? { mode: 'error' } : { mode: 'account', lastSaved: d.updatedAt });
}

/** Saves a computed plan for logged-in users (one row per distinct set of inputs). */
export async function savePlanResult(
  inputsHash: string,
  result: { engineVersion: string; verdict: { outcome: string } },
) {
  const sb = supabase();
  if (!sb || !state.userId) return;
  await sb.from('plans').upsert(
    {
      user_id: state.userId,
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
  if (!sb || !state.userId) return;
  await sb.from('plans').delete().eq('user_id', state.userId);
  await sb.from('planner_profiles').delete().eq('user_id', state.userId);
}

export function useSync() {
  const auth = useAuth();
  const s = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
  useEffect(() => {
    if (auth.ready) void attach(auth.userId);
  }, [auth.ready, auth.userId]);
  const statusText =
    s.mode === 'account'
      ? `Saved to your account (${auth.email}). Only you can read it.`
      : s.mode === 'syncing'
        ? 'Syncing with your account…'
        : s.mode === 'error'
          ? 'Could not save to your account; your data is safe in this browser.'
          : 'Saved in this browser. Log in to keep it in your account.';
  return { ...s, enabled: s.mode === 'account', statusText, deleteRemote, email: auth.email };
}
