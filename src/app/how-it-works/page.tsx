import type { Metadata } from 'next';
import { Card, SectionTitle } from '@/components/ui';
import { REFERENCE_EUR_PER_POINT } from '@/fixtures/catalogue';
import { t } from '@/i18n/en';

export const metadata: Metadata = { title: 'How we calculate and rank' };

const terms = [
  [
    'Normal price',
    'The cheapest cash ticket for your exact airports, dates, cabin and travellers. Fares you would not buy (other dates, other airports) never set the normal price.',
  ],
  [
    'Cash paid today',
    'Everything you pay in this booking: fare, taxes and fees as one all-in amount, or award taxes and charges.',
  ],
  [
    'Paid separately',
    'Costs caused by the option but paid elsewhere, such as a train to another airport. They count in the overall cost.',
  ],
  [
    'Overall cost',
    `Cash paid today + paid separately + points × your value per point. If you have not set a value we use €${REFERENCE_EUR_PER_POINT} as a reference, and you can change it.`,
  ],
  [
    'Saving',
    'Normal price minus the overall cost of the best option, in euros and as a percentage of the normal price. If it is zero or negative, we say paying cash is better.',
  ],
  [
    'Break-even',
    'The value per point at which an award costs the same as the cheapest cash fare. Below it, cash is better.',
  ],
];

export default function HowItWorks() {
  return (
    <div className="mx-auto grid max-w-4xl gap-8 px-4 py-8">
      <SectionTitle as="h1" eyebrow="Transparency" title="How we calculate and rank">
        Every number comes from deterministic rules you can check. No AI invents prices, balances or
        savings.
      </SectionTitle>

      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-xl">The terms we use</h2>
        <dl className="mt-4 grid gap-4">
          {terms.map(([k, v]) => (
            <div key={k}>
              <dt className="font-semibold">{k}</dt>
              <dd className="text-sm text-ink-soft">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-xl">How options are ranked</h2>
        <ol className="mt-3 grid list-decimal gap-2 pl-5 text-sm text-ink-soft">
          <li>
            Options you cannot book (not enough points, out-of-date exchange rate) are listed
            separately with the reason.
          </li>
          <li>
            <strong className="text-ink">{t.objective.B_ECONOMIC_COST}</strong> (default) sorts by
            overall cost. <strong className="text-ink">{t.objective.A_CASH_TODAY}</strong> sorts by
            cash paid today, then overall cost.
          </li>
          <li>
            Ties are broken the same way every time: overall cost or cash today, then fewer points,
            then a fixed option order.
          </li>
          <li>
            For multi-flight trips we compare one-way, open-jaw and multi-city tickets with a
            bounded search, sharing one points balance across the trip. If the search hits its
            limit, we say “approximate”.
          </li>
          <li>
            No airline, bank or card pays us to rank. There are no commissions or sponsored results.
          </li>
        </ol>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-xl">Where numbers come from</h2>
        <ul className="mt-3 grid gap-2 text-sm text-ink-soft">
          {Object.entries(t.provenance).map(([k, v]) => (
            <li key={k}>
              <strong className="text-ink">{v}</strong>
              {descriptions[k] ? `: ${descriptions[k]}` : ''}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-xl">What we never count as a saving</h2>
        <ul className="mt-3 grid list-disc gap-2 pl-5 text-sm text-ink-soft">
          <li>
            Points you might earn in the future, sign-up bonuses you have not received, or
            illustrative card rewards.
          </li>
          <li>
            Spending you would not otherwise do. We never suggest extra spending or carrying a card
            balance to earn points.
          </li>
          <li>
            Points you do not have today. Transfers are shown only from points already in your
            wallet.
          </li>
        </ul>
      </Card>
    </div>
  );
}

const descriptions: Record<string, string> = {
  LIVE_TEST_DUFFEL:
    'returned by the Duffel sandbox in test mode. Sandbox airlines and prices are not real.',
  FIXTURE_FLIGHT: 'a fixed example fare built into the demo. Not a market price.',
  FIXTURE_AWARD: 'an example award price. Seat availability is not checked.',
  USER_ENTERED: 'something you typed in.',
  VERIFIED_OFFICIAL_RULE:
    'checked against an official page on a stated date (none in this demo yet).',
  EXTERNAL_FX_SNAPSHOT:
    'European Central Bank reference rate via Frankfurter, with its date. Older than 7 days is never used.',
  FIXTURE_FX: 'a bundled ECB rate from 26 Oct 2026, used when the live rate is unavailable.',
  CACHED: 'seen earlier and possibly out of date.',
  ESTIMATE: 'a rough estimate, such as a train fare.',
};
