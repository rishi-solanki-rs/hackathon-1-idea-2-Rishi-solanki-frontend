import type { AwardInput, Profile, TripInput } from '@/domain/profile';
import { PlanRequestSchema, type PlanRequest } from '@/contracts/plan';
import type { PlanDraft } from './planStore';

const num = (s: string) => (s.trim() === '' ? undefined : Number(s));

export function toTripInput(d: PlanDraft['trip']): TripInput {
  return {
    origin: d.origin,
    destination: d.destination,
    tripType: d.tripType,
    earliestDepart: d.earliestDepart,
    latestDepart: d.latestDepart || d.earliestDepart,
    minNights: d.tripType === 'return' ? num(d.minNights) : undefined,
    maxNights: d.tripType === 'return' ? num(d.maxNights) : undefined,
    adults: d.adults,
    cabin: d.cabin,
    objective: d.objective,
    directOnly: d.directOnly,
    bookBy: d.bookBy || undefined,
  };
}

/**
 * Award input from the draft. An estimate is only requested when the user explicitly asked for one and chose
 * the programme; there is no default programme.
 */
export function toAward(d: PlanDraft['award']): {
  award: AwardInput | null;
  estimateAward: boolean;
  estimateProgram?: string;
} {
  if (d.mode === 'entered' && d.program && num(d.points) && num(d.taxesEur) !== undefined)
    return {
      award: {
        program: d.program,
        points: Math.round(num(d.points)!),
        taxesEur: num(d.taxesEur)!,
        source: 'USER_ENTERED',
        seenAvailable: d.seenAvailable,
      },
      estimateAward: false,
    };
  if (d.mode === 'estimate' && d.program)
    return { award: null, estimateAward: true, estimateProgram: d.program };
  return { award: null, estimateAward: false };
}

/** Only rows the user completed; card references to removed cards are dropped. */
export function cleanProfile(p: Profile): Profile {
  const ids = new Set(p.cards.map((c) => c.id));
  const card = (id?: string) => (id && ids.has(id) ? id : undefined);
  return {
    ...p,
    balances: p.balances.filter((b) => b.program),
    monthly: p.monthly
      .filter((m) => m.label.trim() && m.amountEur > 0)
      .map((m) => ({ ...m, currentCardId: card(m.currentCardId) })),
    purchases: p.purchases
      .filter((x) => x.label.trim() && x.amountEur > 0 && x.date)
      .map((x) => ({ ...x, currentCardId: card(x.currentCardId) })),
  };
}

export function buildRequest(d: PlanDraft, useExample = false) {
  const { award, estimateAward, estimateProgram } = toAward(d.award);
  const req = {
    trip: toTripInput(d.trip),
    profile: cleanProfile(d.profile),
    award,
    estimateAward,
    ...(estimateProgram ? { estimateProgram } : {}),
    useExample,
  };
  return PlanRequestSchema.safeParse(req) as ReturnType<typeof PlanRequestSchema.safeParse> & {
    data?: PlanRequest;
  };
}

export function issuesFor(d: PlanDraft, prefix: 'trip' | 'profile' | 'award'): string[] {
  const r = buildRequest(d);
  if (r.success) return [];
  return r.error.issues
    .filter((i) => i.path[0] === prefix)
    .map((i) => `${i.path.slice(1).join(' ')}: ${i.message}`.replace(/^: /, ''));
}
