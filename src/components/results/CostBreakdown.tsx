import type { OptionDto } from '@/contracts/search';
import { ProvenanceBadge } from '../Badges';
import { eur, programName, pts } from '../format';

export function CostBreakdown({
  o,
  valuation,
}: {
  o: OptionDto;
  valuation?: { eurPerPoint: string; method: 'user' | 'reference' } | null;
}) {
  const today = o.costLines.filter((l) => l.timing === 'today');
  const later = o.costLines.filter((l) => l.timing === 'later');
  const p = o.points[0];
  const pointsValueMinor = o.ec ? o.ec.minor - o.cashTotal.minor : null;
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Cost breakdown</caption>
      <tbody className="divide-y divide-line">
        {today.map((l) => (
          <tr key={l.key}>
            <th scope="row" className="py-2 pr-3 text-left font-normal">
              {l.label} <ProvenanceBadge p={l.provenance} />
            </th>
            <td className="py-2 text-right tabular">{eur(l.amount)}</td>
          </tr>
        ))}
        <tr>
          <th scope="row" className="py-2 pr-3 text-left font-semibold">
            Cash paid today
          </th>
          <td className="py-2 text-right font-semibold tabular">{eur(o.cashToday)}</td>
        </tr>
        {later.map((l) => (
          <tr key={l.key}>
            <th scope="row" className="py-2 pr-3 text-left font-normal">
              {l.label} <span className="text-ink-muted">(paid separately)</span>{' '}
              <ProvenanceBadge p={l.provenance} />
            </th>
            <td className="py-2 text-right tabular">{eur(l.amount)}</td>
          </tr>
        ))}
        {p ? (
          <tr>
            <th scope="row" className="py-2 pr-3 text-left font-normal">
              {pts(p.amount, p.program)} from {programName(p.program)}
              {valuation ? (
                <span className="text-ink-muted">
                  {' '}
                  × €{valuation.eurPerPoint} (
                  {valuation.method === 'user' ? 'your value' : 'reference value'})
                </span>
              ) : (
                <span className="text-ink-muted"> (no value set: break-even only)</span>
              )}
            </th>
            <td className="py-2 text-right tabular">
              {pointsValueMinor !== null ? eur({ minor: pointsValueMinor, currency: 'EUR' }) : '—'}
            </td>
          </tr>
        ) : null}
        <tr className="bg-sand/60">
          <th scope="row" className="px-2 py-2.5 text-left font-semibold">
            Estimated overall cost
          </th>
          <td className="px-2 py-2.5 text-right font-semibold tabular">
            {o.ec ? eur(o.ec) : 'Needs a points value'}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
