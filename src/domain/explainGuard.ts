import type { PlanResult } from './plan';

export type ExplainFacts = {
  numbers: Set<string>;
  dates: Set<string>;
  names: string[];
  text: string;
};

const norm = (s: string) =>
  s
    .replace(/[€,\s]/g, '')
    .replace(/\.0+$/, '')
    .replace(/(\.\d*?)0+$/, '$1');

/** The only facts an AI explanation may state. Built from the deterministic plan. */
export function planFacts(r: PlanResult, programName: (id: string) => string): ExplainFacts {
  const nums = new Set<string>();
  const add = (n: number | null | undefined) => {
    if (n === null || n === undefined || !Number.isFinite(n)) return;
    nums.add(norm(String(n)));
    nums.add(norm(n.toFixed(2)));
    nums.add(norm(String(Math.round(n))));
  };
  const addMinor = (m: number | null | undefined) =>
    m === null || m === undefined ? undefined : add(m / 100);
  addMinor(r.comparison.cashFareMinor);
  addMinor(r.comparison.awardCashTodayMinor);
  addMinor(r.comparison.awardEconomicMinor);
  if (r.comparison.cashFareMinor !== null && r.comparison.awardEconomicMinor !== null)
    addMinor(Math.abs(r.comparison.cashFareMinor - r.comparison.awardEconomicMinor));
  add(r.award?.points);
  add(r.award?.taxesEur);
  add(r.pointsNow.usable);
  add(r.pointsNow.direct);
  add(r.pointsNow.viaTransfer);
  add(r.verdict.shortfall);
  add(r.allocation.totalTargetPoints);
  add(r.allocation.incrementalTargetPoints);
  add(r.pointsNow.transferDelayDays);
  nums.add(norm(r.valuation.eurPerPoint));
  for (const a of r.allocation.assignments) {
    add(a.unit.amountEur);
    add(a.targetPoints);
  }
  for (const q of r.flights.quotes) addMinor(q.totalMinor);
  for (const b of r.allocation.bonuses) add(b.points);
  add(r.trip.adults);
  add(r.gapAfterPlan);
  for (const d of r.dailyCards) {
    add(d.amountEur);
    add(d.gainPerMonth);
  }
  for (const c of r.newCards) {
    add(c.extraPoints);
    add(c.welcomePoints);
    add(c.feeEur);
    add(c.netValueEur);
    add(c.months);
    add(c.monthlySpendEur);
  }
  add(r.booking.daysToDeparture);
  add(r.booking.window.fromDays);
  add(r.booking.window.toDays);
  if (r.booking.spreadMinor !== null) addMinor(r.booking.spreadMinor);
  for (const p of r.booking.peaks) for (const n of p.name.match(/\d+/g) ?? []) add(Number(n));
  const dates = new Set<string>([
    r.verdict.lsbd,
    r.trip.earliestDepart,
    r.trip.latestDepart,
    ...r.flights.quotes.flatMap((q) => [q.depart, q.ret ?? '']),
  ]);
  if (r.pointsReady && r.pointsReady !== 'now') dates.add(r.pointsReady);
  dates.add(r.booking.window.startDate);
  dates.add(r.booking.window.endDate);
  for (const c of r.newCards) if (c.applyBy) dates.add(c.applyBy);
  for (const a of r.allocation.assignments) if (a.postsOn) dates.add(a.postsOn);
  dates.delete('');
  const names = [
    ...new Set([
      ...r.allocation.assignments.map((a) => a.cardName ?? '').filter(Boolean),
      ...r.dailyCards.map((d) => d.cardName ?? '').filter(Boolean),
      ...r.newCards.filter((c) => c.status !== 'not_suitable').map((c) => c.name),
      programName(r.target),
      r.trip.origin,
      r.trip.destination,
    ]),
  ];
  const text = JSON.stringify({
    outcome: r.verdict.outcome,
    reasons: r.verdict.reasons,
    actions: r.actions.map((a) => a.title),
    missing: r.missing,
    booking: [r.booking.headline, r.booking.detail],
    newCards: r.newCards.map((c) => c.reasons),
  });
  return { numbers: nums, dates, names, text };
}

const BANNED =
  /\b(guarantee[ds]?|definitely available|seat is available|seats are available|confirmed (seat|availability)|real (market )?price|live price|risk[- ]free|you will save|prices? will (drop|fall|go down|rise|go up)|will (get|be) cheaper)\b/i;

/** Rejects any explanation that states a number, date or claim not present in the plan's facts. */
export function checkExplanation(
  paragraphs: string[],
  facts: ExplainFacts,
  knownBrands: string[],
): { ok: true } | { ok: false; reason: string } {
  if (!paragraphs.length || paragraphs.length > 6) return { ok: false, reason: 'wrong length' };
  const all = paragraphs.join('\n');
  if (all.length > 2500) return { ok: false, reason: 'too long' };
  // "approval is not guaranteed" is a caveat we ask for, not a claim.
  const banned = all
    .replace(/\b(not|never|no|isn['’]t|aren['’]t)\s+(be\s+)?guarantee[ds]?\b/gi, ' ')
    .match(BANNED);
  if (banned) return { ok: false, reason: `unsupported claim "${banned[0].toLowerCase()}"` };
  for (const d of all.match(/\b\d{4}-\d{2}-\d{2}\b/g) ?? [])
    if (!facts.dates.has(d)) return { ok: false, reason: `unknown date ${d}` };
  const stripped = all.replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ');
  for (const raw of stripped.match(/€?\d[\d,]*(\.\d+)?%?/g) ?? []) {
    if (raw.endsWith('%')) return { ok: false, reason: `percentage ${raw}` };
    const n = norm(raw);
    if (/^\d+$/.test(n) && Number(n) <= 10) continue; // counting words like "2 steps"
    if (!facts.numbers.has(n)) return { ok: false, reason: `unknown number ${raw}` };
  }
  const lower = all.toLowerCase();
  for (const brand of knownBrands) {
    const b = brand.toLowerCase();
    if (
      lower.includes(b) &&
      !facts.names.some((n) => n.toLowerCase().includes(b) || b.includes(n.toLowerCase())) &&
      !facts.text.toLowerCase().includes(b)
    )
      return { ok: false, reason: `unsupported name ${brand}` };
  }
  return { ok: true };
}

/** Deterministic explanation used when AI is unavailable or rejected. */
export function rulesExplanation(r: PlanResult): string[] {
  const out = [...r.verdict.reasons];
  const doNow = r.actions
    .filter((a) => a.kind === 'do' || a.kind === 'verify')
    .slice(0, 2)
    .map((a) => `${a.when}: ${a.title}.`);
  if (doNow.length) out.push(doNow.join(' '));
  if (r.confidenceReasons.length)
    out.push(`Confidence is ${r.verdict.confidence} because: ${r.confidenceReasons.join(' ')}`);
  return out;
}
