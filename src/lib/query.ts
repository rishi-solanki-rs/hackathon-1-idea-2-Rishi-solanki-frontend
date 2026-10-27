import type { PlanSearchRequest, QuickSearchRequest } from '@/contracts/search';

export type QuickParams = Omit<QuickSearchRequest, 'wallet'>;
export type PlanParams = Omit<PlanSearchRequest, 'wallet'>;

export function quickToQuery(p: QuickParams): string {
  const q = new URLSearchParams({
    o: p.origin,
    d: p.destination,
    t: p.tripType === 'return' ? 'rt' : 'ow',
    dd: p.departDate,
    a: String(p.adults),
    c: p.cabin,
    f: String(p.flexDays),
    n: p.nearbyAirports ? '1' : '0',
    g: p.objective === 'A_CASH_TODAY' ? 'A' : 'B',
  });
  if (p.tripType === 'return' && p.returnDate) q.set('rd', p.returnDate);
  return q.toString();
}

export function queryToQuick(sp: URLSearchParams): Record<string, unknown> {
  return {
    origin: sp.get('o') ?? '',
    destination: sp.get('d') ?? '',
    tripType: sp.get('t') === 'rt' ? 'return' : 'one_way',
    departDate: sp.get('dd') ?? '',
    returnDate: sp.get('t') === 'rt' ? (sp.get('rd') ?? undefined) : undefined,
    adults: Number(sp.get('a') ?? '1'),
    cabin: sp.get('c') ?? 'economy',
    flexDays: Number(sp.get('f') ?? '0'),
    nearbyAirports: sp.get('n') === '1',
    objective: sp.get('g') === 'A' ? 'A_CASH_TODAY' : 'B_ECONOMIC_COST',
  };
}

export function planToQuery(p: PlanParams): string {
  return new URLSearchParams({
    legs: p.legs.map((l) => `${l.origin}-${l.destination}-${l.date}`).join(','),
    a: String(p.adults),
    c: p.cabin,
    g: p.objective === 'A_CASH_TODAY' ? 'A' : 'B',
  }).toString();
}

export function queryToPlan(sp: URLSearchParams): Record<string, unknown> {
  const legs = (sp.get('legs') ?? '')
    .split(',')
    .filter(Boolean)
    .map((s) => {
      const [origin, destination, ...date] = s.split('-');
      return { origin, destination, date: date.join('-') };
    });
  return {
    legs,
    adults: Number(sp.get('a') ?? '1'),
    cabin: sp.get('c') ?? 'economy',
    objective: sp.get('g') === 'A' ? 'A_CASH_TODAY' : 'B_ECONOMIC_COST',
  };
}

export function addDays(days: number, from = new Date()): string {
  const d = new Date(Date.UTC(from.getFullYear(), from.getMonth(), from.getDate()));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
