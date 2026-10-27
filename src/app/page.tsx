import Image from 'next/image';
import Link from 'next/link';
import { CalendarClock, CreditCard, Scale } from 'lucide-react';
import { ButtonLink, Card } from '@/components/ui';
import hero from '../../public/images/hero-andalusia.jpg';

const steps = [
  {
    icon: Scale,
    title: 'Points or cash?',
    body: 'We price your dates with Duffel test fares and value your Avios and Membership Rewards honestly, never as free.',
  },
  {
    icon: CreditCard,
    title: 'Which card, and whether to get one',
    body: 'The best card you hold for groceries, bills and fuel, and a new Spanish card only when its official terms really help.',
  },
  {
    icon: CalendarClock,
    title: 'When to book',
    body: 'Your safe booking date, Spanish peak periods like Semana Santa and August, and a price watch for your trip.',
  },
];

export default function Home() {
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <Image
          src={hero}
          alt=""
          priority
          placeholder="blur"
          sizes="100vw"
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0b1420]/80 via-[#0b1420]/55 to-[#0b1420]/30"
          aria-hidden
        />
        <div className="mx-auto max-w-5xl px-4 py-14 sm:py-24">
          <div className="max-w-xl text-white">
            <p className="text-xs font-semibold tracking-[0.2em] text-[#f6ecd2] uppercase">
              Travel points, from Spain
            </p>
            <h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">
              Your trip, your cards, one clear plan.
            </h1>
            <p className="mt-4 text-lg text-white/90">
              Tell us where you want to go, the cards you hold and the points you have. In two
              minutes you know whether to use points or pay cash, which card to use, and when to
              book.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/plan" className="px-7 text-base">
                Plan my trip
              </ButtonLink>
              <Link
                href="/compare"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/60 px-5 text-sm font-semibold text-white hover:bg-white/10"
              >
                Just compare a flight
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10" aria-label="What you get">
        <ul className="grid gap-3 md:grid-cols-3">
          {steps.map((s) => (
            <li key={s.title}>
              <Card className="h-full p-5">
                <s.icon aria-hidden className="size-6 text-terracotta" />
                <h2 className="mt-3 font-semibold">{s.title}</h2>
                <p className="mt-1 text-sm text-ink-soft">{s.body}</p>
              </Card>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-center text-sm text-ink-muted">
          Fares are Duffel test data and bookings are test orders: no money is charged.{' '}
          <Link href="/how-it-works" className="underline">
            How it works
          </Link>
        </p>
      </section>
    </>
  );
}
