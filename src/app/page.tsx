import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Scale,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Card } from '@/components/ui';
import hero from '../../public/images/hero-andalusia.jpg';

const steps = [
  {
    icon: Scale,
    step: '01',
    title: 'Points or cash?',
    body: 'We price your dates with Duffel test fares and value your Avios and Membership Rewards honestly, never as free.',
  },
  {
    icon: CreditCard,
    step: '02',
    title: 'Which card, and whether to get one',
    body: 'The best card you hold for groceries, bills and fuel, and a new Spanish card only when its official terms really help.',
  },
  {
    icon: CalendarClock,
    step: '03',
    title: 'When to book',
    body: 'Your safe booking date, Spanish peak periods like Semana Santa and August, and a price watch for your trip.',
  },
];

const highlights = [
  'Official Iberia Club distance chart (off-peak & peak)',
  'Sourced Spanish card terms (Amex ES, Iberia Cards, Revolut)',
  'Zero card numbers or bank logins — deterministic math',
];

export default function Home() {
  return (
    <div className="grid gap-10 pb-6 sm:gap-14">
      <section className="relative isolate overflow-hidden border-b border-line/60">
        <Image
          src={hero}
          alt=""
          priority
          placeholder="blur"
          sizes="100vw"
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-r from-[#1c1e36]/92 via-[#1c1e36]/78 to-[#1c1e36]/45"
          aria-hidden
        />
        <div className="mx-auto grid max-w-5xl items-center gap-8 px-4 py-14 sm:py-20 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="max-w-xl text-[#faf8ef]">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-[#eeebda]/30 bg-[#1c1e36]/60 px-3.5 py-1 text-xs font-semibold tracking-[0.18em] text-[#eeebda] uppercase backdrop-blur-xs">
              <Sparkles aria-hidden className="size-3.5 text-[#f0cf80]" /> Travel points, from Spain
            </p>
            <h1 className="mt-4 font-display text-4xl leading-[1.12] tracking-tight sm:text-5xl">
              Your trip, your cards, one clear plan.
            </h1>
            <p className="mt-4 text-base leading-relaxed text-[#faf8ef]/90 sm:text-lg">
              Tell us where you want to go, the cards you hold and the points you have. In two
              minutes you know whether to use points or pay cash, which card to use, and when to
              book.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/plan"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#eeebda] px-7 py-3 text-base font-semibold text-[#1c1e36] shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#faf8ef] hover:shadow-lg"
              >
                Plan my trip <ArrowRight aria-hidden className="size-4" />
              </Link>
              <Link
                href="/compare"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#eeebda]/70 bg-[#1c1e36]/40 px-6 py-3 text-sm font-semibold text-[#faf8ef] backdrop-blur-xs transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#faf8ef]/15"
              >
                Just compare a flight
              </Link>
            </div>
            <ul className="mt-7 grid gap-2 border-t border-[#eeebda]/20 pt-5 text-xs text-[#eeebda]/90 sm:grid-cols-3">
              {highlights.map((h) => (
                <li key={h} className="flex items-start gap-1.5">
                  <CheckCircle2 aria-hidden className="mt-0.5 size-3.5 shrink-0 text-[#6be0a6]" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="hidden lg:block">
            <div className="rounded-2xl border border-[#eeebda]/25 bg-[#1c1e36]/85 p-5 text-[#faf8ef] shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-[#eeebda]/15 pb-3">
                <span className="text-xs font-semibold tracking-wider text-[#f0cf80] uppercase">
                  Sample plan preview
                </span>
                <span className="rounded-full bg-[#123321] px-2.5 py-0.5 text-xs font-semibold text-[#6be0a6]">
                  Save €412 vs cash
                </span>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <div>
                  <p className="font-display text-2xl">MAD → JFK</p>
                  <p className="text-xs text-[#dad6c2]">Return · 2 adults · Economy</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl tabular">68,000 Avios</p>
                  <p className="text-xs text-[#dad6c2]">+ €214 taxes · Off-peak</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2.5 rounded-xl bg-[#282b4a]/90 p-3 text-xs">
                <div>
                  <p className="text-[#dad6c2]">Everyday spend card</p>
                  <p className="mt-0.5 font-semibold text-[#faf8ef]">Amex Gold ES · +1,150 MR/mo</p>
                </div>
                <div>
                  <p className="text-[#dad6c2]">Safe booking date</p>
                  <p className="mt-0.5 font-semibold text-[#faf8ef]">Fri 8 Jan 2027</p>
                </div>
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-[#dad6c2]">
                <ShieldCheck aria-hidden className="size-3.5 text-[#f0cf80]" /> Checked against
                official Iberia & card rules
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4" aria-label="What you get">
        <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-terracotta uppercase">
              How it helps you
            </p>
            <h2 className="mt-1 font-display text-2xl sm:text-3xl">
              Built for Spanish cards, Avios and real travel dates
            </h2>
          </div>
          <Link
            href="/how-it-works"
            className="inline-flex items-center gap-1 text-sm font-semibold text-sea-dark underline-offset-4 hover:underline"
          >
            Read our full methodology <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
        <ul className="grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <li key={s.title}>
              <Card className="group flex h-full flex-col justify-between p-6 transition-all duration-200 hover:-translate-y-1">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="grid size-11 place-items-center rounded-2xl border border-terracotta/20 bg-terracotta-soft text-terracotta transition-transform duration-200 group-hover:scale-105">
                      <s.icon aria-hidden className="size-5" />
                    </span>
                    <span className="font-mono text-xs font-semibold text-ink-muted">{s.step}</span>
                  </div>
                  <h2 className="mt-4 font-display text-xl">{s.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.body}</p>
                </div>
              </Card>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-center text-sm text-ink-muted">
          Fares are Duffel test data and bookings are test orders: no money is charged.{' '}
          <Link href="/how-it-works" className="font-semibold text-sea-dark underline">
            How it works
          </Link>
        </p>
      </section>
    </div>
  );
}
