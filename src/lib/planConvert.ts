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

export function toAward(
  d: PlanDraft['award'],
  holdsPoints = true,
): {
  award: AwardInput | null;
  estimateAward: boolean;
} {
  if (d.mode === 'entered' && num(d.points) && num(d.taxesEur) !== undefined)
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
  // No award price entered: if the user holds points, a labelled rough estimate keeps points comparable with cash.
  return { award: null, estimateAward: holdsPoints };
}

/** Only exact/range/unknown balances the user actually entered; rows with no programme are dropped. */
export function cleanProfile(p: Profile): Profile {
  return {
    ...p,
    balances: p.balances.filter((b) => b.program),
    monthly: p.monthly.filter((m) => m.label.trim() && m.amountEur > 0),
    purchases: p.purchases.filter((x) => x.label.trim() && x.amountEur > 0 && x.date),
  };
}

export function buildRequest(d: PlanDraft, useExample = false) {
  const { award, estimateAward } = toAward(
    d.award,
    d.profile.balances.some((b) => b.program),
  );
  const req = {
    trip: toTripInput(d.trip),
    profile: cleanProfile(d.profile),
    award,
    estimateAward,
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
