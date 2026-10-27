import { expect, test, type Page } from '@playwright/test';
import { future } from './helpers';

const draft = {
  version: 1,
  step: 4,
  trip: {
    origin: 'MAD',
    destination: 'LHR',
    tripType: 'one_way',
    earliestDepart: future(40),
    latestDepart: future(42),
    minNights: '7',
    maxNights: '10',
    adults: 2,
    cabin: 'economy',
    objective: 'B_ECONOMIC_COST',
    directOnly: false,
    bookBy: '',
  },
  profile: {
    cards: [],
    noCards: true,
    balances: [],
    noPoints: true,
    monthly: [],
    purchases: [],
    finance: { paysInFull: true, answered: true },
    valuations: [],
  },
  award: { mode: 'none', program: '', points: '', taxesEur: '', seenAvailable: false },
  exampleFares: true,
  updatedAt: new Date().toISOString(),
};

const itinerary = (n: number) => ({
  owner: 'Duffel Airways',
  sandboxAirline: true,
  passengers: 2,
  currency: 'EUR',
  refund: 'not_allowed',
  change: 'allowed',
  slices: [
    {
      from: 'MAD',
      to: 'LHR',
      durationMin: 140,
      segments: [
        {
          from: 'MAD',
          to: 'LHR',
          departAt: `${future(40)}T08:00:00`,
          arriveAt: `${future(40)}T09:20:00`,
          durationMin: 140,
          flightNumber: `ZZ ${n}`,
          carrier: 'Duffel Airways',
          cabin: 'Economy',
          checkedBags: 1,
        },
      ],
    },
  ],
});

async function mockBooking(page: Page) {
  await page.route('**/api/booking/reprice', async (route) => {
    const body = route.request().postDataJSON();
    await route.fulfill({
      json: {
        ok: true,
        status: 'ok',
        data: {
          offerRef: body.offerRef,
          mode: 'DUFFEL_TEST',
          total: body.quotedTotal,
          previousTotal: body.quotedTotal,
          priceChanged: false,
          itinerary: itinerary(body.offerRef === 'off_A' ? 100 : 200),
        },
      },
    });
  });
  await page.route('**/api/booking/test-order', async (route) => {
    const body = route.request().postDataJSON();
    await route.fulfill({
      json: {
        ok: true,
        status: 'ok',
        data: {
          reference: body.offerRef === 'off_A' ? 'REFAAA' : 'REFBBB',
          offerRef: body.offerRef,
          mode: 'DUFFEL_TEST',
          total: body.confirmTotal,
          label: 'TEST — no real ticket issued; no money charged',
          passengers: [
            'Lucia Demo (fictional test traveller)',
            'Mateo Demo (fictional test traveller)',
          ],
          createdAt: new Date().toISOString(),
        },
      },
    });
  });
  await page.route('**/api/plan/compute', async (route) => {
    const res = await route.fetch();
    const json = await res.json();
    const q = {
      ...json.data.flights.quotes[0],
      offerRef: 'off_B',
      totalMinor: 22222,
      provenance: 'LIVE_TEST_DUFFEL',
      carrier: 'Duffel Airways',
    };
    json.data.flights = {
      ...json.data.flights,
      status: 'ok',
      provider: 'duffel_test',
      quotes: [q],
      cheapest: q,
    };
    json.data.comparison.cashFareMinor = 22222;
    await route.fulfill({ response: res, json });
  });
}

test('regression: opening a new offer after a booking shows that offer, not the previous booking', async ({
  page,
}) => {
  await page.addInitScript(
    (d) => window.localStorage.setItem('aum.plan.v1', JSON.stringify(d)),
    draft,
  );
  await mockBooking(page);
  await page.goto(`/plan/book?ref=off_A&total=11111&dep=${future(40)}&carrier=Duffel+Airways`);
  await page.getByRole('button', { name: 'Confirm test booking' }).click();
  await expect(page.getByText('REFAAA')).toBeVisible();

  await page.getByRole('link', { name: 'Back to my plan' }).click();
  await page.getByRole('link', { name: /Book this fare in test mode/ }).click();
  await expect(page).toHaveURL(/ref=off_B/);
  await expect(page.getByText('REFAAA')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Confirm test booking' })).toBeVisible();
  await expect(page.getByText('€222.22').first()).toBeVisible();
});
