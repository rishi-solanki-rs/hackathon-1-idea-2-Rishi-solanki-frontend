'use client';

import { useSyncExternalStore } from 'react';
import type { Profile, TripInput } from '@/domain/profile';

export const PLAN_KEY = 'aum.plan.v1';

export type AwardDraft = {
  mode: 'none' | 'entered' | 'estimate';
  program: string;
  points: string;
  taxesEur: string;
  seenAvailable: boolean;
};

export type TripDraft = Omit<TripInput, 'minNights' | 'maxNights' | 'bookBy'> & {
  minNights: string;
  maxNights: string;
  bookBy: string;
};

export type PlanDraft = {
  version: 1;
  step: number;
  trip: TripDraft;
  profile: Profile;
  award: AwardDraft;
  /** The user explicitly asked to see labelled example fares when live test fares are unavailable. */
  exampleFares?: boolean;
  updatedAt: string;
};

export const emptyProfile = (): Profile => ({
  cards: [],
  noCards: false,
  balances: [],
  noPoints: false,
  monthly: [],
  purchases: [],
  finance: { paysInFull: null, cashReserveEur: null, tripBudgetEur: null },
  valuations: [],
});

const initial = (): PlanDraft => ({
  version: 1,
  step: 0,
  trip: {
    origin: 'MAD',
    destination: '',
    tripType: 'return',
    earliestDepart: '',
    latestDepart: '',
    minNights: '7',
    maxNights: '10',
    adults: 1,
    cabin: 'economy',
    objective: 'B_ECONOMIC_COST',
    directOnly: false,
    bookBy: '',
  },
  profile: emptyProfile(),
  award: { mode: 'none', program: '', points: '', taxesEur: '', seenAvailable: false },
  updatedAt: new Date(0).toISOString(),
});

const SERVER = initial();
let cached: PlanDraft | null = null;
let cachedRaw: string | null | undefined;
const listeners = new Set<() => void>();

function read(): PlanDraft {
  if (typeof window === 'undefined') return SERVER;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(PLAN_KEY);
  } catch {
    raw = null;
  }
  if (raw === cachedRaw && cached) return cached;
  cachedRaw = raw;
  try {
    const p = raw ? (JSON.parse(raw) as PlanDraft) : null;
    cached =
      p && p.version === 1 && p.trip && p.profile
        ? { ...initial(), ...p, profile: { ...emptyProfile(), ...p.profile } }
        : initial();
  } catch {
    cached = initial();
  }
  return cached;
}

const emit = () => listeners.forEach((l) => l());

export function writePlan(update: (d: PlanDraft) => PlanDraft) {
  const next = { ...update(read()), updatedAt: new Date().toISOString() };
  const raw = JSON.stringify(next);
  try {
    window.localStorage.setItem(PLAN_KEY, raw);
  } catch {
    /* storage unavailable: keep in memory */
  }
  cached = next;
  cachedRaw = raw;
  emit();
  for (const s of syncListeners) s(next);
}

export function resetPlanCache() {
  cached = null;
  cachedRaw = undefined;
  emit();
}

/** Remote sync hooks (Supabase) register here; local storage stays the source while typing. */
const syncListeners = new Set<(d: PlanDraft) => void>();
export const onPlanWrite = (fn: (d: PlanDraft) => void) => {
  syncListeners.add(fn);
  return () => syncListeners.delete(fn);
};

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === PLAN_KEY) {
      cachedRaw = undefined;
      cb();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

export const usePlanDraft = () => useSyncExternalStore(subscribe, read, () => SERVER);

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 12)
    : Math.random().toString(36).slice(2, 14);
