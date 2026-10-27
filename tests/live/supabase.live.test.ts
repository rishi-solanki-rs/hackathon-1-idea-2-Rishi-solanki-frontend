import { createClient } from '@supabase/supabase-js';
import { afterAll, describe, expect, it } from 'vitest';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const REF = process.env.SUPABASE_PROJECT_REF;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const run = Date.now().toString(36);
const emailA = `aum-live-a-${run}@example.com`;
const emailB = `aum-live-b-${run}@example.com`;
const password = `Test-${run}-pass!`;

const fresh = () =>
  createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

afterAll(async () => {
  // Remove the throwaway test users (cascades their rows) via the Management API.
  if (!REF || !TOKEN) return;
  await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `delete from auth.users where email like 'aum-live-%@example.com'`,
    }),
  });
});

describe('LIVE: hosted Supabase', () => {
  it('catalogue is readable with the publishable key; private tables are not', async () => {
    const sb = fresh();
    const cards = await sb.from('card_products').select('id');
    expect(cards.error).toBeNull();
    expect(cards.data?.length).toBe(5);
    const priv = await sb.from('planner_profiles').select('user_id');
    expect(priv.error?.code).toBe('42501');
  });

  it('email sign-up → save → other user blocked → log out/in restores the data', async () => {
    const a = fresh();
    const b = fresh();
    const sa = await a.auth.signUp({ email: emailA, password });
    const sbb = await b.auth.signUp({ email: emailB, password });
    expect(sa.error).toBeNull();
    expect(sbb.error).toBeNull();
    expect(sa.data.session).not.toBeNull();
    const ua = sa.data.user!.id;
    const draft = {
      version: 1,
      profile: { balances: [{ program: 'iberia_club', kind: 'exact', points: 12345 }] },
    };
    expect(
      (await a.from('planner_profiles').upsert({ user_id: ua, draft }, { onConflict: 'user_id' }))
        .error,
    ).toBeNull();
    expect(
      (
        await a.from('plans').insert({
          user_id: ua,
          inputs_hash: `live-${run}`,
          engine_version: 'plan-test',
          verdict: 'CASH_BETTER',
          result: { ok: true },
        })
      ).error,
    ).toBeNull();

    expect((await b.from('planner_profiles').select('user_id').eq('user_id', ua)).data).toEqual([]);
    expect((await b.from('plans').select('id').eq('user_id', ua)).data).toEqual([]);
    expect(
      (
        await b
          .from('planner_profiles')
          .upsert({ user_id: ua, draft: { hacked: true } }, { onConflict: 'user_id' })
      ).error,
    ).not.toBeNull();

    await a.auth.signOut();
    const again = fresh();
    const login = await again.auth.signInWithPassword({ email: emailA, password });
    expect(login.error).toBeNull();
    const back = await again.from('planner_profiles').select('draft').eq('user_id', ua).single();
    expect(back.data?.draft).toEqual(draft);
    expect((await again.from('plans').select('verdict')).data).toEqual([
      { verdict: 'CASH_BETTER' },
    ]);
  });
});
