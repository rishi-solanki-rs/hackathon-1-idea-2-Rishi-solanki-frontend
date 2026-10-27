import { describe, expect, it } from 'vitest';
import {
  clearUserData,
  decideAttach,
  deleteAccountData,
  deletePlanRow,
  safeNext,
  savePlanRow,
  type AccountClient,
} from '@/lib/accountData';

type Result = { data?: unknown; error: { message: string } | null };

/** Minimal chainable fake of the supabase-js query builder. */
function fakeClient(results: Record<string, Result>): AccountClient & { calls: string[] } {
  const calls: string[] = [];
  const builder = (table: string, op: string) => {
    const key = `${table}.${op}`;
    calls.push(key);
    const r = results[key] ?? { data: [], error: null };
    const chain: Record<string, unknown> = {};
    for (const m of ['eq', 'select']) chain[m] = () => chain;
    chain.then = (res: (v: Result) => unknown) => Promise.resolve(r).then(res);
    return chain;
  };
  return {
    calls,
    from: (table: string) => ({
      upsert: () => builder(table, 'upsert'),
      delete: () => builder(table, 'delete'),
    }),
  } as unknown as AccountClient & { calls: string[] };
}

describe('account data operations report real outcomes', () => {
  it('regression: a failed plan save is reported, not swallowed', async () => {
    const sb = fakeClient({ 'plans.upsert': { error: { message: 'permission denied' } } });
    expect(
      await savePlanRow(sb, 'u1', 'plan.abc1', {
        engineVersion: 'x',
        verdict: { outcome: 'BOOK_CASH_NOW' },
      }),
    ).toEqual({ ok: false, message: expect.stringMatching(/not saved/i) });
    const ok = fakeClient({});
    expect(
      await savePlanRow(ok, 'u1', 'plan.abc1', {
        engineVersion: 'x',
        verdict: { outcome: 'BOOK_CASH_NOW' },
      }),
    ).toEqual({ ok: true });
  });

  it('regression: deleting account data fails if either table fails', async () => {
    const sb = fakeClient({ 'planner_profiles.delete': { error: { message: 'boom' } } });
    expect((await deleteAccountData(sb, 'u1')).ok).toBe(false);
    expect((await deleteAccountData(fakeClient({}), 'u1')).ok).toBe(true);
  });

  it('regression: deleting a plan that matched no row (RLS) is not a success', async () => {
    expect(
      (await deletePlanRow(fakeClient({ 'plans.delete': { data: [], error: null } }), 'p1')).ok,
    ).toBe(false);
    expect(
      (
        await deletePlanRow(
          fakeClient({ 'plans.delete': { data: [{ id: 'p1' }], error: null } }),
          'p1',
        )
      ).ok,
    ).toBe(true);
  });
});

describe('cross-account safety', () => {
  it('regression: sign-out clears the plan, history, price watch and caches but keeps the theme', () => {
    const local = new Map([
      ['aum.plan.v1', '{}'],
      ['aum.plan.owner', 'u1'],
      ['aum.plan.last.v1', '{}'],
      ['aum.pricewatch.v1', '{}'],
      ['aumTheme', 'dark'],
    ]);
    const session = new Map([['aum.cache.plan.x', '{}']]);
    const store = (m: Map<string, string>) => ({
      get length() {
        return m.size;
      },
      key: (i: number) => [...m.keys()][i] ?? null,
      removeItem: (k: string) => void m.delete(k),
    });
    clearUserData(store(local), store(session));
    expect([...local.keys()]).toEqual(['aumTheme']);
    expect(session.size).toBe(0);
  });

  it("regression: another user's local draft is never pushed into this account", () => {
    expect(decideAttach({ userId: 'u2', localOwner: 'u1', localHasData: true, remote: null })).toBe(
      'reset',
    );
    expect(
      decideAttach({
        userId: 'u2',
        localOwner: 'u1',
        localHasData: true,
        remote: { updatedAt: '2026-10-27T10:00:00Z' },
      }),
    ).toBe('use_remote');
  });

  it('a guest draft goes into an empty account, but asks before replacing existing account data', () => {
    expect(decideAttach({ userId: 'u1', localOwner: null, localHasData: true, remote: null })).toBe(
      'push_local',
    );
    expect(
      decideAttach({
        userId: 'u1',
        localOwner: null,
        localHasData: true,
        remote: { updatedAt: '2026-10-27T10:00:00Z' },
      }),
    ).toBe('ask');
    expect(
      decideAttach({
        userId: 'u1',
        localOwner: null,
        localHasData: false,
        remote: { updatedAt: '2026-10-27T10:00:00Z' },
      }),
    ).toBe('use_remote');
  });

  it('same user: newer copy wins, compared as dates not strings', () => {
    const remote = { updatedAt: '2026-10-27T10:00:00+00:00' };
    expect(
      decideAttach({
        userId: 'u1',
        localOwner: 'u1',
        localHasData: true,
        localUpdatedAt: '2026-10-27T09:30:00.000Z',
        remote,
      }),
    ).toBe('use_remote');
    expect(
      decideAttach({
        userId: 'u1',
        localOwner: 'u1',
        localHasData: true,
        localUpdatedAt: '2026-10-27T10:30:00.000Z',
        remote,
      }),
    ).toBe('push_local');
  });

  it('regression: the login redirect only allows same-site paths', () => {
    expect(safeNext('/my-plans')).toBe('/my-plans');
    expect(safeNext('//evil.example')).toBe('/plan');
    expect(safeNext('/\\evil.example')).toBe('/plan');
    expect(safeNext('https://evil.example')).toBe('/plan');
    expect(safeNext(null)).toBe('/plan');
  });
});
