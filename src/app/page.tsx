import Image from 'next/image';
import { Calculator, ListChecks, ShieldCheck } from 'lucide-react';
import { QuickSearchForm } from '@/components/QuickSearchForm';
import { DemoTrips } from '@/components/DemoTrips';
import { ButtonLink, Card, SectionTitle } from '@/components/ui';
import hero from '../../public/images/hero-andalusia.jpg';
import madrid from '../../public/images/dest-madrid.jpg';
import barcelona from '../../public/images/dest-barcelona.jpg';
import seville from '../../public/images/dest-seville.jpg';

const steps = [
  {
    icon: Calculator,
    title: 'One honest number',
    body: 'We compare the normal cash price with the best cash or points option and show the saving in euros and %. Points are valued, never treated as free.',
  },
  {
    icon: ListChecks,
    title: 'Steps you can follow',
    body: 'Book a cash fare in test mode, or follow ordered award-booking steps with every precondition and warning before you move a single point.',
  },
  {
    icon: ShieldCheck,
    title: 'No surprises',
    body: 'Every price shows where it came from. No card numbers, no spending you would not otherwise do, and no debt to chase points.',
  },
];

const places = [
  {
    img: madrid,
    alt: 'An ornate domed building on a Madrid boulevard at dusk',
    city: 'Madrid',
    note: 'Long-haul hub for Iberia Club awards',
  },
  {
    img: barcelona,
    alt: 'A palm-lined seafront promenade and beach in Barcelona',
    city: 'Barcelona',
    note: 'Often worth checking against Madrid',
  },
  {
    img: seville,
    alt: 'A Seville courtyard with blue azulejo tiles, orange trees and a fountain',
    city: 'Seville',
    note: 'Nearby-airport ideas via Málaga',
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
          className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0b1420]/75 via-[#0b1420]/45 to-ivory"
          aria-hidden
        />
        <div className="mx-auto max-w-6xl px-4 pt-12 pb-10 sm:pt-16">
          <div className="max-w-2xl text-white">
            <p className="text-xs font-semibold tracking-[0.2em] text-[#f6ecd2] uppercase">
              Travel hacking from Spain, made honest
            </p>
            <h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">
              Same trip. Much less money.
            </h1>
            <p className="mt-4 text-lg text-white/90">
              Tell us your trip, the cards you hold and the points you have. We build a personal
              plan: which card to use for spending you already planned, whether points beat cash,
              and when to book.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/plan" className="px-6 text-base">
                Plan my trip
              </ButtonLink>
              <a
                href="#quick"
                className="inline-flex min-h-11 items-center rounded-full border border-white/60 px-5 text-sm font-semibold text-white hover:bg-white/10"
              >
                Just compare one flight
              </a>
            </div>
          </div>
          <Card id="quick" className="mt-8 scroll-mt-4 p-5 sm:p-6">
            <h2 className="mb-1 font-display text-xl">Quick Flight</h2>
            <p className="mb-4 text-sm text-ink-soft">
              Compare cash and points for one trip using the points you saved in Plan my trip.
            </p>
            <QuickSearchForm />
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10" aria-labelledby="demo-trips">
        <SectionTitle id="demo-trips" eyebrow="Labelled examples" title="Try an example">
          Each example uses a fictional wallet for that search only; your own data is never changed.
          Cash fares come from Duffel test mode when it is configured, otherwise from labelled
          example fares.
        </SectionTitle>
        <div className="mt-6">
          <DemoTrips />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10" aria-label="How A Una Milla works">
        <ul className="grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <li key={s.title}>
              <Card className="h-full p-5">
                <s.icon aria-hidden className="size-6 text-terracotta" />
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-ink-soft">{s.body}</p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10" aria-labelledby="from-spain">
        <SectionTitle
          id="from-spain"
          eyebrow="Spain first"
          title="Start from the airports you know"
        />
        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
          {places.map((p) => (
            <li key={p.city}>
              <Card className="overflow-hidden">
                <Image
                  src={p.img}
                  alt={p.alt}
                  placeholder="blur"
                  sizes="(min-width: 640px) 33vw, 100vw"
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="p-4">
                  <p className="font-display text-lg">{p.city}</p>
                  <p className="text-sm text-ink-soft">{p.note}</p>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
