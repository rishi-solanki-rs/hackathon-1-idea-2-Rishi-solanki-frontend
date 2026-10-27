import type { SupabaseClient } from '@supabase/supabase-js';

export type AccountClient = Pick<SupabaseClient, 'from'>;
export type Outcome = { ok: true } | { ok: false; message: string };

/** Saves a computed plan (one row per distinct set of inputs). A duplicate is not an error. */
export async function savePlanRow(
  sb: AccountClient,
  userId: string,
  inputsHash: string,
  result: { engineVersion: string; verdict: { outcome: string } },
): Promise<Outcome> {
  const { error } = await sb.from('plans').upsert(
    {
      user_id: userId,
      inputs_hash: inputsHash.slice(0, 64),
      engine_version: result.engineVersion,
      verdict: result.verdict.outcome,
      result,
    },
    { onConflict: 'user_id,inputs_hash', ignoreDuplicates: true },
  );
  return error
    ? { ok: false, message: 'Plan not saved to your account. Try again.' }
    : { ok: true };
}

/** Deletes all account data; reports failure if either table could not be cleared. */
export async function deleteAccountData(sb: AccountClient, userId: string): Promise<Outcome> {
  const plans = await sb.from('plans').delete().eq('user_id', userId);
  const profile = await sb.from('planner_profiles').delete().eq('user_id', userId);
  return plans.error || profile.error
    ? {
        ok: false,
        message: 'Could not delete your account data. Nothing was signed out; try again.',
      }
    : { ok: true };
}

/** Deletes one saved plan. Row-level security returns no error for 0 rows, so the row count is checked. */
export async function deletePlanRow(sb: AccountClient, id: string): Promise<Outcome> {
  const { data, error } = await sb.from('plans').delete().eq('id', id).select('id');
  return error || !data?.length
    ? { ok: false, message: 'This plan could not be deleted. Try again.' }
    : { ok: true };
}

type KeyStore = {
  readonly length: number;
  key(i: number): string | null;
  removeItem(k: string): void;
};

/** Removes everything belonging to the signed-in person (plan, owner tag, history, price watch, caches). */
export function clearUserData(local: KeyStore, session: KeyStore) {
  for (const store of [local, session]) {
    const keys = Array.from({ length: store.length }, (_, i) => store.key(i)).filter(
      (k): k is string => !!k && k.startsWith('aum.') && k !== 'aum.auth',
    );
    for (const k of keys) store.removeItem(k);
  }
}

export type AttachDecision = 'use_remote' | 'push_local' | 'ask' | 'reset';

/**
 * What to do with the browser's draft when a user logs in.
 * - Another user's draft is never pushed into this account.
 * - A guest draft goes into an empty account, but replacing existing account data needs the user's choice.
 * - For the same user, the newer copy wins (compared as dates).
 */
export function decideAttach(x: {
  userId: string;
  localOwner: string | null;
  localHasData: boolean;
  localUpdatedAt?: string;
  remote: { updatedAt: string } | null;
}): AttachDecision {
  if (x.localOwner && x.localOwner !== x.userId) return x.remote ? 'use_remote' : 'reset';
  if (!x.remote) return x.localHasData ? 'push_local' : 'reset';
  if (!x.localHasData) return 'use_remote';
  if (!x.localOwner) return 'ask';
  const local = Date.parse(x.localUpdatedAt ?? '');
  const remote = Date.parse(x.remote.updatedAt);
  return Number.isFinite(local) && local > remote ? 'push_local' : 'use_remote';
}

/** Only same-site absolute paths; rejects //host, /\host and full URLs. */
export function safeNext(next: string | null | undefined): string {
  return next && /^\/(?![/\\])/.test(next) ? next : '/plan';
}
