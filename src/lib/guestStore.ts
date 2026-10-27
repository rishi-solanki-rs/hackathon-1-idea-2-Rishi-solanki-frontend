'use client';

import { useSyncExternalStore } from 'react';

export const STORE_KEY = 'aum.guest.v1';

export type GuestWallet = {
  profile: string;
  balances: { program: string; points: number }[];
  valuations: { program: string; eurPerPoint: string }[];
  noValuePrograms: string[];
};

export type GuestState = {
  version: 1;
  wallet: GuestWallet;
  objective: 'A_CASH_TODAY' | 'B_ECONOMIC_COST';
  updatedAt: string;
};

/** Fictional demo profiles. No real person, balance or account is represented. */
export const PRESETS: Record<string, { label: string; description: string; wallet: GuestWallet }> =
  {
    empty: {
      label: 'No points yet',
      description: 'Start from zero and see cash-only savings.',
      wallet: { profile: 'empty', balances: [], valuations: [], noValuePrograms: [] },
    },
    lucia: {
      label: 'Lucía (demo)',
      description: '120,000 Iberia Club Avios and 15,000 Amex MR points; values Avios at €0.012.',
      wallet: {
        profile: 'lucia',
        balances: [
          { program: 'iberia_club', points: 120_000 },
          { program: 'amex_mr_es', points: 15_000 },
        ],
        valuations: [{ program: 'iberia_club', eurPerPoint: '0.012' }],
        noValuePrograms: [],
      },
    },
    marc: {
      label: 'Marc (demo)',
      description: '30,000 Iberia Club Avios at the €0.010 reference value.',
      wallet: {
        profile: 'marc',
        balances: [{ program: 'iberia_club', points: 30_000 }],
        valuations: [],
        noValuePrograms: [],
      },
    },
  };

const initial = (): GuestState => ({
  version: 1,
  wallet: PRESETS.empty.wallet,
  objective: 'B_ECONOMIC_COST',
  updatedAt: new Date(0).toISOString(),
});

let cached: GuestState | null = null;
let cachedRaw: string | null | undefined;
const listeners = new Set<() => void>();

function read(): GuestState {
  if (typeof window === 'undefined') return SERVER_SNAPSHOT;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORE_KEY);
  } catch {
    raw = null;
  }
  if (raw === cachedRaw && cached) return cached;
  cachedRaw = raw;
  try {
    const parsed = raw ? (JSON.parse(raw) as GuestState) : null;
    cached = parsed && parsed.version === 1 && parsed.wallet ? parsed : initial();
  } catch {
    cached = initial();
  }
  return cached;
}

const SERVER_SNAPSHOT = initial();

function emit() {
  for (const l of listeners) l();
}

export function writeGuest(update: (s: GuestState) => GuestState) {
  const next = { ...update(read()), updatedAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable (private mode): keep in memory only */
  }
  cached = next;
  cachedRaw = JSON.stringify(next);
  emit();
}

export function applyPreset(id: keyof typeof PRESETS) {
  writeGuest((s) => ({ ...s, wallet: structuredClone(PRESETS[id].wallet) }));
}

/** Removes every A Una Milla key from this browser (localStorage and sessionStorage). */
export function clearDemoData() {
  try {
    for (const store of [window.localStorage, window.sessionStorage]) {
      for (const k of Object.keys(store)) if (k.startsWith('aum.')) store.removeItem(k);
    }
  } catch {
    /* ignore */
  }
  cached = null;
  cachedRaw = undefined;
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === STORE_KEY) cb();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

export function useGuest(): GuestState {
  return useSyncExternalStore(subscribe, read, () => SERVER_SNAPSHOT);
}

/** True after hydration; avoids showing server defaults as if they were the user's data. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function walletForRequest(w: GuestWallet) {
  return {
    balances: w.balances.filter((b) => b.points > 0),
    valuations: w.valuations,
    noValuePrograms: w.noValuePrograms,
  };
}
