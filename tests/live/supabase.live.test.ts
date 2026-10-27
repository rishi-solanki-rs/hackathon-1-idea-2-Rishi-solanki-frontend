import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const settings = await fetch(`${URL}/auth/v1/settings`, { headers: { apikey: KEY } }).then((r) =>
  r.json(),
);
const anonymousEnabled = settings.external?.anonymous_users === true;
console.log('anonymous sign-ins enabled on the hosted project:', anonymousEnabled);

const fresh = () =>
  createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

describe('LIVE: hosted Supabase', () => {
  it('catalogue is readable with the publishable key; private tables are not', async () => {
    const sb = fresh();
    const cards = await sb.from('card_products').select('id');
    expect(cards.error).toBeNull();
    expect(cards.data?.length).toBe(5);
    const priv = await sb.from('planner_profiles').select('user_id');
    expect(priv.error?.code).toBe('42501');
  });

  it.skipIf(!anonymousEnabled)(
    'anonymous user A saves and reads back; user B cannot see or overwrite it',
    async () => {
      const a = fresh();
      const b = fresh();
      const sa = await a.auth.signInAnonymously();
      const sbb = await b.auth.signInAnonymously();
      expect(sa.error).toBeNull();
      expect(sbb.error).toBeNull();
      const ua = sa.data.user!.id;
      const draft = {
        version: 1,
        profile: { balances: [{ program: 'iberia_club', kind: 'exact', points: 12345 }] },
      };
      const up = await a
        .from('planner_profiles')
        .upsert({ user_id: ua, draft }, { onConflict: 'user_id' });
      expect(up.error).toBeNull();
      const back = await a.from('planner_profiles').select('draft').eq('user_id', ua).single();
      expect(back.data?.draft).toEqual(draft);
      const seenByB = await b.from('planner_profiles').select('user_id').eq('user_id', ua);
      expect(seenByB.data).toEqual([]);
      const spoof = await b
        .from('planner_profiles')
        .upsert({ user_id: ua, draft: { hacked: true } }, { onConflict: 'user_id' });
      expect(spoof.error).not.toBeNull();
      const still = await a.from('planner_profiles').select('draft').eq('user_id', ua).single();
      expect(still.data?.draft).toEqual(draft);
      await a.from('planner_profiles').delete().eq('user_id', ua);
    },
  );
});
