import type { PlanDraft } from './planStore';

/** Field id → message. Ids match the input ids in each step so errors sit under the right field. */
export type FieldErrors = Record<string, string>;

const today = () => new Date().toISOString().slice(0, 10);
const days = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
const int = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s) : NaN);

export function validateStep(d: PlanDraft, step: number): FieldErrors {
  const e: FieldErrors = {};
  const t = d.trip;
  const p = d.profile;
  if (step === 0) {
    if (!t.origin) e['pt-origin'] = 'Choose where you leave from.';
    if (!t.destination) e['pt-destination'] = 'Choose where you are going.';
    else if (t.destination === t.origin) e['pt-destination'] = 'Choose a different destination.';
    if (!t.earliestDepart) e['pt-earliest'] = 'Choose your earliest departure date.';
    else if (t.earliestDepart < today()) e['pt-earliest'] = 'This date is in the past.';
    if (t.latestDepart && t.earliestDepart) {
      if (t.latestDepart < t.earliestDepart)
        e['pt-latest'] = 'Must be on or after the earliest departure.';
      else if (days(t.earliestDepart, t.latestDepart) > 60)
        e['pt-latest'] = 'Keep the range within 60 days.';
    }
    if (t.tripType === 'return') {
      const mn = int(t.minNights);
      const mx = int(t.maxNights);
      if (!(mn >= 1 && mn <= 60)) e['pt-min-nights'] = 'Enter 1 to 60 nights.';
      if (!(mx >= 1 && mx <= 60)) e['pt-max-nights'] = 'Enter 1 to 60 nights.';
      else if (mn >= 1 && mx < mn) e['pt-max-nights'] = 'Must be at least the shortest stay.';
    }
    if (t.bookBy) {
      if (t.bookBy < today()) e['pt-bookby'] = 'This date is in the past.';
      else if (t.earliestDepart && t.bookBy > t.earliestDepart)
        e['pt-bookby'] = 'Must be before your earliest departure.';
    }
  }
  if (step === 1) {
    if (!p.noCards && p.cards.length === 0)
      e['card-pick'] = 'Add a card you hold, or tick “I don’t have any cards that earn points”.';
    p.cards.forEach((c, i) => {
      if (!c.name.trim()) e[`card-${i}-name`] = 'Give this card a name.';
      c.earn.forEach((r, j) => {
        const v = r.pointsPerEuro.value;
        if (v !== null && !(v >= 0 && v <= 50))
          e[`card-${i}-r${j}-rate`] = 'Enter 0 to 50 points per €1.';
        const cap = r.monthlyCapEur?.value;
        if (cap !== null && cap !== undefined && !(cap >= 0))
          e[`card-${i}-r${j}-cap`] = 'Enter a positive amount or leave empty.';
      });
      const dl = c.postingDelayDays.value;
      if (dl !== null && !(dl >= 0 && dl <= 120))
        e[`card-${i}-delay`] = 'Enter 0 to 120 days or leave empty.';
    });
  }
  if (step === 2) {
    if (!p.noPoints && p.balances.length === 0)
      e['bal-add'] = 'Add a points balance, or tick “I don’t have any loyalty points”.';
    p.balances.forEach((b, i) => {
      if (!b.program) e[`bal-${i}-program`] = 'Choose the programme.';
      if (b.kind === 'exact' && !(Number.isInteger(b.points) && (b.points ?? -1) >= 0))
        e[`bal-${i}-points`] = 'Enter your balance, or choose “I don’t know”.';
      if (b.kind === 'range') {
        if (!(Number.isInteger(b.min) && (b.min ?? -1) >= 0))
          e[`bal-${i}-min`] = 'Enter the lowest likely balance.';
        if (!(Number.isInteger(b.max) && (b.max ?? -1) >= 0))
          e[`bal-${i}-max`] = 'Enter the highest likely balance.';
        else if ((b.min ?? 0) > (b.max ?? 0))
          e[`bal-${i}-max`] = 'Must be at least the lowest balance.';
      }
    });
    if (d.award.mode === 'entered') {
      if (!(Number(d.award.points) >= 1))
        e['aw-points'] = 'Enter the points the programme asks for.';
      if (d.award.taxesEur === '' || !(Number(d.award.taxesEur) >= 0))
        e['aw-taxes'] = 'Enter the taxes in euros (0 if none).';
    }
    for (const v of p.valuations)
      if (!/^0(\.\d{1,5})?$/.test(v.eurPerPoint)) e[`val-${v.program}`] = 'Use a value like 0.012.';
  }
  if (step === 3) {
    if (!p.finance.answered) e['pay-yes'] = 'Choose one answer.';
    p.monthly.forEach((m, i) => {
      if (!m.label.trim()) e[`m-${i}-label`] = 'Name this spending.';
      if (!(m.amountEur > 0)) e[`m-${i}-amt`] = 'Enter a monthly amount.';
    });
    p.purchases.forEach((x, i) => {
      if (!x.label.trim()) e[`p-${i}-label`] = 'Name this purchase.';
      if (!(x.amountEur > 0)) e[`p-${i}-amt`] = 'Enter the amount.';
      if (!x.date) e[`p-${i}-date`] = 'Choose a date.';
      else if (x.date < today()) e[`p-${i}-date`] = 'This date is in the past.';
    });
  }
  return e;
}
