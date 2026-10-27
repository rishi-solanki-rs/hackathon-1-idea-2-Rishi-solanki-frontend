import { formatMoney, formatPoints } from './money';
import type { Comparison } from './savings';
import type { Evaluated } from './evaluate';
import type { Valuation } from './types';

export type ExplainCtx = {
  programName: (id: string) => string;
  programUnit: (id: string) => string;
  valuations: Record<string, Valuation | undefined>;
  dataSources: string[];
};

const describe = (e: Evaluated, ctx: ExplainCtx) => {
  const o = e.option;
  const parts: string[] = [];
  if (o.kind === 'award') {
    const p = o.points[0];
    parts.push(
      `${formatPoints(p.amount)} ${ctx.programUnit(p.program)} + ${formatMoney(e.cashToday)} taxes`,
    );
  } else parts.push(`${formatMoney(e.cashTotal)} cash`);
  if (o.variation?.dateShiftDays)
    parts.push(
      `${Math.abs(o.variation.dateShiftDays)} day${Math.abs(o.variation.dateShiftDays) > 1 ? 's' : ''} ${o.variation.dateShiftDays > 0 ? 'later' : 'earlier'}`,
    );
  if (o.variation?.altOrigin) parts.push(`from ${o.variation.altOrigin}`);
  return parts.join(', ');
};

/** Template explanation from computed values only. */
export function explainQuick(c: Comparison, ctx: ExplainCtx) {
  const why: string[] = [];
  const assumptions: string[] = [];
  const notCounted: string[] = [
    'Points you could earn from this booking (not counted: they are not guaranteed).',
  ];
  const risks: string[] = [];
  let summary: string;

  const N = c.normal;
  const H = c.hacked;
  const goal = c.objective === 'A_CASH_TODAY' ? 'least cash paid today' : 'lowest overall cost';

  if (!N)
    summary =
      'No comparable cash price was found for your exact dates and airports, so no saving is shown.';
  else if (c.headline === 'SAVING' && H && c.economicSaving) {
    summary = `Normal ${formatMoney(N.cashTotal, { whole: true })} · Best option ${describe(H, ctx)} · Save ${formatMoney(c.economicSaving, { whole: true })} (${c.savingPct}%).`;
    why.push(
      `Ranked by ${goal}. The normal price is the cheapest cash ticket for your exact airports and dates.`,
    );
    if (H.option.kind === 'award')
      why.push(
        `The award uses ${formatPoints(H.points)} ${ctx.programUnit(H.option.points[0].program)}, valued at €${ctx.valuations[H.option.points[0].program]?.eurPerPoint} each, plus ${formatMoney(H.cashToday)} in taxes.`,
      );
    if (H.option.variation?.dateShiftDays)
      why.push('Moving your dates is what makes this cheaper.');
  } else if (c.headline === 'CASH_BETTER' && c.awardExtraCost && c.bestAward) {
    summary = `Paying cash is better by ${formatMoney(c.awardExtraCost, { whole: true })}.`;
    why.push(
      `The best award costs ${formatMoney(c.bestAward.ec!, { whole: true })} in economic terms against ${formatMoney(N.cashTotal, { whole: true })} cash.`,
    );
  } else if (c.headline === 'LESS_CASH_TODAY' && H) {
    summary = `This option needs the least cash today (${formatMoney(H.cashToday, { whole: true })}), but it costs ${c.economicSaving ? formatMoney({ ...c.economicSaving, minor: -c.economicSaving.minor }, { whole: true }) : 'more'} more overall once your points are valued.`;
    why.push('Ranked by least cash paid today (Goal A), as you chose.');
  } else summary = 'No saving found: the normal cash price is already the best option.';

  if (c.breakEven) {
    const unit = ctx.programUnit(c.breakEven.program);
    if ('never' in c.breakEven)
      why.push(
        `Points never beat the cheapest cash fare here: the award's taxes alone cost as much.`,
      );
    else
      why.push(
        `Points only make sense if you value ${unit} above €${c.breakEven.eurPerPoint} each (break-even).`,
      );
  }

  for (const [program, v] of Object.entries(ctx.valuations)) {
    if (!v) continue;
    assumptions.push(
      `${ctx.programName(program)}: ${unit(ctx, program)} valued at €${v.eurPerPoint} each (${v.method === 'user' ? 'your value' : 'reference value, editable in your wallet'}).`,
    );
  }
  for (const x of c.excluded) {
    if (x.reason === 'NOT_ENOUGH_POINTS' && x.e.shortfall)
      why.push(
        `Award not bookable with your current points: needs ${formatPoints(x.e.shortfall.needed)} ${ctx.programUnit(x.e.shortfall.program)}; you have ${formatPoints(x.e.shortfall.usable)}.`,
      );
  }
  if (H?.option.kind === 'award') {
    risks.push(
      'Award seats can disappear. Confirm the seat on the programme’s site before moving any points.',
    );
    if (H.needsTransfer)
      risks.push('This needs a points transfer. Transfers usually cannot be reversed.');
  }
  if (H?.option.variation?.altOrigin)
    risks.push('Separate train and flight bookings are not protected if one is delayed.');
  risks.push('All prices are illustrative or test data. Check the real price before you book.');

  return { summary, why, assumptions, notCounted, risks, dataSources: ctx.dataSources };
}

const unit = (ctx: ExplainCtx, program: string) => ctx.programUnit(program);
