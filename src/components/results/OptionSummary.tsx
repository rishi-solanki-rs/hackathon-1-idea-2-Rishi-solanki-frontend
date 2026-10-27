import { ArrowRight, Plane } from 'lucide-react';
import type { OptionDto } from '@/contracts/search';
import { airportLabel, cityOf, dateOf, dayOffset, duration, eur, pts, timeOf } from '../format';

export function priceLabel(o: OptionDto, whole = false) {
  if (o.kind === 'award') {
    const p = o.points[0];
    return `${pts(p.amount, p.program)} + ${eur(o.cashToday, whole)}`;
  }
  if (o.excludedReason === 'FX_STALE' && o.costLines[0]?.original) {
    const m = o.costLines[0].original;
    return `${m.currency} ${(m.minor / 100).toFixed(2)}`;
  }
  return eur(o.cashTotal, whole);
}

export function optionTitle(o: OptionDto) {
  const parts: string[] = [o.kind === 'award' ? 'Award with points' : 'Cash fare'];
  if (o.variation?.dateShiftDays)
    parts.push(
      `${Math.abs(o.variation.dateShiftDays)} day${Math.abs(o.variation.dateShiftDays) > 1 ? 's' : ''} ${o.variation.dateShiftDays > 0 ? 'later' : 'earlier'}`,
    );
  if (o.variation?.altOrigin) parts.push(`via ${cityOf(o.variation.altOrigin)}`);
  if (o.legIndexes.length > 1) parts.push('one ticket for several flights');
  return parts.join(' · ');
}

export function Itinerary({ o }: { o: OptionDto }) {
  return (
    <ol className="grid gap-2">
      {o.slices.map((s, i) => {
        const stops = Math.max(0, s.segments.length - 1);
        return (
          <li key={i} className="grid grid-cols-[auto_1fr] items-center gap-x-3 text-sm">
            <Plane aria-hidden className="size-4 text-ink-muted" />
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-semibold tabular">
                {timeOf(s.departAt)} {s.from}
              </span>
              <ArrowRight aria-hidden className="size-3 self-center text-ink-muted" />
              <span className="font-semibold tabular">
                {timeOf(s.arriveAt)}
                <sup className="text-[10px] text-terracotta">
                  {dayOffset(s.departAt, s.arriveAt)}
                </sup>{' '}
                {s.to}
              </span>
              <span className="text-ink-muted">
                {dateOf(s.departAt)} · {duration(s.durationMin)} ·{' '}
                {stops === 0 ? 'Direct' : `${stops} stop${stops > 1 ? 's' : ''}`} ·{' '}
                {s.segments[0]?.carrier}
              </span>
              <span className="sr-only">
                {airportLabel(s.from)} to {airportLabel(s.to)}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
