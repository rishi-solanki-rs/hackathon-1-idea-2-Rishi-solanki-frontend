import type { Metadata } from 'next';
import { Card, SectionTitle } from '@/components/ui';
import { REFERENCE_EUR_PER_POINT } from '@/fixtures/catalogue';

export const metadata: Metadata = { title: 'How it works' };

const flow = [
  [
    'Your answers',
    'Trip, cards, points and spending. Saved in this browser while you type; if you log in, also in your account (Supabase, only you can read it).',
  ],
  [
    'Flight prices',
    'Our server asks Duffel in test mode for up to 7 departure dates in your range. These are sandbox fares, not real prices.',
  ],
  [
    'The plan engine',
    'Fixed rules on our server (no AI) work out your usable points, which card to use for each spend, whether points beat cash, a new card idea and when to book. Same answers always give the same plan.',
  ],
  [
    'Plain-words explanation',
    'Only if you open it, Google Gemini rewrites the finished plan in simple language. We check every number and date it writes against the plan; if anything does not match, we show a rules-based text instead.',
  ],
  [
    'Booking',
    'Book the cheapest fare as a Duffel test order. No money is charged and no real ticket is issued.',
  ],
];

const data = [
  [
    'Real, from official pages',
    'Card earn rates and fees, the Amex Gold welcome offer (each with a link and check date).',
  ],
  ['Test data', 'Flight prices and bookings from Duffel test mode.'],
  ['Your input', 'Balances, award prices you found, spending, card details you typed.'],
  [
    'Estimates (always labelled)',
    `Award prices when you did not enter one, the value of a point (€${REFERENCE_EUR_PER_POINT} unless you change it), and booking-time guidance.`,
  ],
];

export default function HowItWorks() {
  return (
    <div className="mx-auto grid max-w-3xl gap-5 px-4 py-8">
      <SectionTitle as="h1" eyebrow="How it works" title="How your plan is made">
        Numbers come from rules you can check. AI never sets a price, a points amount or the
        recommendation.
      </SectionTitle>

      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-xl">From your answers to a plan</h2>
        <ol className="mt-3 grid gap-3">
          {flow.map(([k, v], i) => (
            <li key={k} className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sea text-xs font-bold text-sea-ink">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold">{k}</p>
                <p className="text-sm text-ink-soft">{v}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-xl">What is real, test or estimated</h2>
        <dl className="mt-3 grid gap-3">
          {data.map(([k, v]) => (
            <div key={k}>
              <dt className="font-semibold">{k}</dt>
              <dd className="text-sm text-ink-soft">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-xl">How the recommendation is decided</h2>
        <ul className="mt-3 grid list-disc gap-2 pl-5 text-sm text-ink-soft">
          <li>
            <strong className="text-ink">Overall cost</strong> of an award = taxes + points × value
            per point. If that is lower than the cash fare (or, with the “least cash” goal, if the
            taxes are lower), points win.
          </li>
          <li>
            <strong className="text-ink">Safe booking date</strong> = your book-by date (or 21 days
            before departure) minus a 3-day buffer.
          </li>
          <li>
            If you are short of points, we only count spending you already plan, on the 15th of each
            month, and only if you pay your card in full. If that closes the gap before the safe
            date, we say so; otherwise we say book cash.
          </li>
          <li>
            Award seats are usually released about 355 days before departure; before that we say
            wait and do not transfer.
          </li>
        </ul>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-xl">Card advice</h2>
        <ul className="mt-3 grid list-disc gap-2 pl-5 text-sm text-ink-soft">
          <li>
            <strong className="text-ink">Everyday card:</strong> for each monthly spend, the card
            you hold that earns the most points for this trip’s programme (after a transfer where
            one exists).
          </li>
          <li>
            <strong className="text-ink">New card:</strong> we check Spanish cards you don’t hold.
            Points = your existing monthly spending moved to that card for the months left before
            your safe date (about 14 days to get the card, about 30 days for points to post), minus
            what your current cards already earn. A welcome offer counts only if your normal
            spending already meets its minimum; the fee is pro-rated. We show the latest date to
            apply.
          </li>
          <li>
            Never suggested if you carry a card balance. Approval is up to the bank. This is not
            financial advice.
          </li>
        </ul>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-xl">When to book</h2>
        <p className="mt-3 text-sm text-ink-soft">
          Nobody can forecast fares, so we use common rules of thumb: about 3 to 8 weeks ahead
          within Europe and 2 to 6 months for long haul, earlier for Spanish peak periods (Christmas
          and Reyes, Semana Santa, puentes, July and August). We also show the price for each date
          we checked and, when you come back, whether the cheapest fare went up or down since your
          last check.
        </p>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-xl">What we never do</h2>
        <ul className="mt-3 grid list-disc gap-2 pl-5 text-sm text-ink-soft">
          <li>Suggest spending more, buying points or carrying a balance to earn points.</li>
          <li>Ask for card numbers, PINs or bank logins.</li>
          <li>
            Say a seat is available: always check it on the programme’s own site before moving
            points.
          </li>
          <li>Take commissions or sponsored rankings.</li>
        </ul>
      </Card>
    </div>
  );
}
