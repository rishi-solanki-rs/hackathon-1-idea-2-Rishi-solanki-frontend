'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { supabase, useAuth } from './auth';
import { decideAttach, deleteAccountData, savePlanRow, type Outcome } from './accountData';
import { onPlanWrite, resetPlanCache, writePlan, type PlanDraft } from './planStore';

/** Which account the browser's draft belongs to (absent = a guest draft). */
export const OWNER_KEY = 'aum.plan.owner';

type SyncState = {
  mode: 'local' | 'syncing' | 'account' | 'error' | 'conflict';
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
let retryTimer: number | undefined;
let retries = 0;
let applyingRemote = false;
let unsubscribeWrites: (() => void) | null = null;
let pendingRemote: { draft: PlanDraft; updatedAt: string } | null = null;

const localDraft = (): PlanDraft | null => {
  try {
    return JSON.parse(window.localStorage.getItem('aum.plan.v1') ?? 'null');
  } catch {
    return null;
  }
};
const owner = () => window.localStorage.getItem(OWNER_KEY);
const setOwner = (id: string) => window.localStorage.setItem(OWNER_KEY, id);
const hasData = (d: PlanDraft | null) =>
  !!d && !!(d.profile?.cards?.length || d.profile?.balances?.length || d.trip?.destination);

function applyRemote(r: { draft: PlanDraft; updatedAt: string }, userId: string) {
  applyingRemote = true;
  writePlan(() => ({ ...r.draft, updatedAt: r.updatedAt }));
  applyingRemote = false;
  setOwner(userId);
}

function subscribe() {
  unsubscribeWrites?.();
  unsubscribeWrites = onPlanWrite((d) => {
    if (applyingRemote || state.mode === 'conflict') return;
    window.clearTimeout(pushTimer);
    pushTimer = window.setTimeout(() => void push(d), 700);
  });
}

/** Called whenever the logged-in user changes. */
async function attach(userId: string | null) {
  if (state.userId === userId) return;
  unsubscribeWrites?.();
  unsubscribeWrites = null;
  window.clearTimeout(pushTimer);
  window.clearTimeout(retryTimer);
  pendingRemote = null;
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
  const remote = row
    ? { draft: row.draft as PlanDraft, updatedAt: row.updated_at as string }
    : null;
  const decision = decideAttach({
    userId,
    localOwner: owner(),
    localHasData: hasData(local),
    localUpdatedAt: local?.updatedAt,
    remote,
  });
  if (decision === 'ask') {
    pendingRemote = remote;
    return set({ mode: 'conflict' });
  }
  if (decision === 'use_remote' && remote) applyRemote(remote, userId);
  else if (decision === 'reset') {
    window.localStorage.removeItem('aum.plan.v1');
    window.localStorage.removeItem('aum.plan.last.v1');
    setOwner(userId);
    resetPlanCache();
  } else if (decision === 'push_local' && local) await push(local);
  if (state.mode !== 'error')
    set({ mode: 'account', lastSaved: remote?.updatedAt ?? state.lastSaved });
  subscribe();
}

/** The user chose which answers to keep after logging in with a guest draft. */
async function resolveConflict(choice: 'keep_browser' | 'use_account') {
  const userId = state.userId;
  if (!userId || state.mode !== 'conflict') return;
  if (choice === 'use_account' && pendingRemote) applyRemote(pendingRemote, userId);
  else {
    const local = localDraft();
    if (local) await push(local);
  }
  pendingRemote = null;
  if (currentMode() !== 'error') set({ mode: 'account' });
  subscribe();
}
const currentMode = () => state.mode;

async function push(d: PlanDraft) {
  const sb = supabase();
  const userId = state.userId;
  if (!sb || !userId) return;
  const { error } = await sb
    .from('planner_profiles')
    .upsert({ user_id: userId, draft: d, updated_at: d.updatedAt }, { onConflict: 'user_id' });
  if (error) {
    set({ mode: 'error' });
    // Retry a few times with backoff; the browser copy stays safe meanwhile.
    if (retries < 3) {
      retries++;
      window.clearTimeout(retryTimer);
      retryTimer = window.setTimeout(() => void push(localDraft() ?? d), 5000 * 3 ** (retries - 1));
    }
    return;
  }
  retries = 0;
  setOwner(userId);
  set({ mode: 'account', lastSaved: d.updatedAt });
}

/** Saves a computed plan for logged-in users and reports the real outcome. */
export async function savePlanResult(
  inputsHash: string,
  result: { engineVersion: string; verdict: { outcome: string } },
): Promise<Outcome | null> {
  const sb = supabase();
  if (!sb || !state.userId) return null;
  return savePlanRow(sb, state.userId, inputsHash, result);
}

async function deleteRemote(): Promise<Outcome> {
  const sb = supabase();
  if (!sb || !state.userId) return { ok: true };
  window.clearTimeout(pushTimer);
  window.clearTimeout(retryTimer);
  unsubscribeWrites?.();
  unsubscribeWrites = null;
  const r = await deleteAccountData(sb, state.userId);
  if (!r.ok) subscribe();
  return r;
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
        : s.mode === 'conflict'
          ? 'Choose which answers to keep before we save to your account.'
          : s.mode === 'error'
            ? 'Could not save to your account yet; retrying. Your data is safe in this browser.'
            : 'Saved in this browser. Log in to keep it in your account.';
  return {
    ...s,
    enabled: s.mode === 'account',
    statusText,
    deleteRemote,
    resolveConflict,
    email: auth.email,
  };
}
