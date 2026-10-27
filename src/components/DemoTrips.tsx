'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { applyPreset, PRESETS } from '@/lib/guestStore';
import { addDays, planToQuery, quickToQuery } from '@/lib/query';

type Demo = { title: string; detail: string; preset: keyof typeof PRESETS; href: () => string };

const demos: Demo[] = [
  {
    title: 'Madrid → Santiago de Chile, business',
    detail: 'With Lucía’s demo Avios: does an award beat €2,900 cash?',
    preset: 'lucia',
    href: () =>
      `/results?${quickToQuery({ origin: 'MAD', destination: 'SCL', tripType: 'one_way', departDate: addDays(60), adults: 1, cabin: 'business', flexDays: 0, nearbyAirports: false, objective: 'B_ECONOMIC_COST' })}`,
  },
  {
    title: 'Madrid → Beijing, flexible dates',
    detail: 'No points at all: what do ±2 days and nearby airports save?',
    preset: 'empty',
    href: () =>
      `/results?${quickToQuery({ origin: 'MAD', destination: 'PEK', tripType: 'return', departDate: addDays(50), returnDate: addDays(64), adults: 1, cabin: 'economy', flexDays: 2, nearbyAirports: true, objective: 'B_ECONOMIC_COST' })}`,
  },
  {
    title: 'Barcelona → New York',
    detail: 'An award that looks cheaper but is not. See the break-even value.',
    preset: 'lucia',
    href: () =>
      `/results?${quickToQuery({ origin: 'BCN', destination: 'JFK', tripType: 'return', departDate: addDays(70), returnDate: addDays(80), adults: 1, cabin: 'economy', flexDays: 0, nearbyAirports: false, objective: 'B_ECONOMIC_COST' })}`,
  },
  {
    title: 'Full trip: Madrid → Beijing → Shanghai → Madrid',
    detail: 'Marc’s 30,000 Avios: points per leg or one open-jaw ticket?',
    preset: 'marc',
    href: () =>
      `/plan/results?${planToQuery({
        legs: [
          { origin: 'MAD', destination: 'PEK', date: addDays(90) },
          { origin: 'PEK', destination: 'PVG', date: addDays(95) },
          { origin: 'PVG', destination: 'MAD', date: addDays(101) },
        ],
        adults: 1,
        cabin: 'economy',
        objective: 'B_ECONOMIC_COST',
      })}`,
  },
];

export function DemoTrips() {
  const router = useRouter();
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {demos.map((d) => (
        <li key={d.title}>
          <button
            type="button"
            onClick={() => {
              applyPreset(d.preset);
              router.push(d.href());
            }}
            className="group flex h-full w-full items-start justify-between gap-3 rounded-2xl border border-line bg-white p-4 text-left shadow-[var(--shadow-card)] transition hover:border-sea"
          >
            <span>
              <span className="block font-semibold text-ink">{d.title}</span>
              <span className="mt-1 block text-sm text-ink-soft">{d.detail}</span>
              <span className="mt-2 inline-block text-xs font-semibold text-terracotta">
                Uses demo wallet: {PRESETS[d.preset].label}
              </span>
            </span>
            <ArrowRight
              aria-hidden
              className="mt-1 size-5 shrink-0 text-sea transition group-hover:translate-x-0.5"
            />
          </button>
        </li>
      ))}
    </ul>
  );
}
