import { expect, test } from '@playwright/test';
import { STORE, expectNoHorizontalOverflow, trip } from './helpers';

test('T-FUN-002: CS-05 multi-city example → open-jaw cash €970, per-leg awards rejected with a reason', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('link', { name: /Multi-city: Madrid → Beijing → Shanghai → Madrid/ })
    .click();
  await expect(page).toHaveURL(/\/trips\/multi\/results\?/);
  await expect(
    page.getByRole('heading', { level: 2, name: 'No saving vs paying cash' }),
  ).toBeVisible();
  const tickets = page.getByRole('region', { name: 'Tickets to book' });
  await expect(tickets.getByText(/One cash ticket \(open-jaw or multi-city\)/)).toBeVisible();
  await expect(
    page
      .getByRole('region', { name: 'Other combinations we checked' })
      .getByText(/rejected.*Needs 50,000 Avios; you have 30,000/),
  ).toBeVisible();
  await expect(page.getByText('€60 more overall')).toBeVisible();
  // The example wallet is used for this search only; the user's own data is untouched.
  expect(await page.evaluate((k) => window.localStorage.getItem(k), STORE)).toBeNull();
  await expectNoHorizontalOverflow(page);
});

test('multi-city builder validates, adds flights and searches', async ({ page }) => {
  await page.goto('/trips/multi');
  const form = page.getByRole('form', { name: 'Full Trip Plan' });
  await form.getByRole('button', { name: 'Plan my trip' }).click();
  const to1 = form.getByRole('combobox', { name: 'To', exact: true }).first();
  await expect(to1).toHaveAttribute('aria-invalid', 'true');
  await expect(form.locator('#plan-legs-0-destination-error')).toHaveText('Choose an airport');
  await to1.selectOption('LIS');
  await form.getByRole('combobox', { name: 'From', exact: true }).nth(1).selectOption('LIS');
  await form.getByRole('button', { name: 'Add a flight' }).click();
  await expect(form.getByRole('heading', { name: 'Flight 3' })).toBeVisible();
  await form.getByRole('button', { name: 'Remove flight 3' }).click();
  await form.getByRole('button', { name: 'Plan my trip' }).click();
  await expect(page).toHaveURL(/\/trips\/multi\/results\?legs=MAD-LIS/);
  await expect(page.getByRole('region', { name: 'Every flight, every option' })).toBeVisible();
});

test('approximate search notice is shown when the limit is hit', async ({ page }) => {
  await page.route('**/api/search/plan', async (route) => {
    const res = await route.fetch();
    const json = await res.json();
    json.data.approximate = true;
    json.data.nodes = 50000;
    return route.fulfill({ response: res, json });
  });
  await page.goto(trip());
  await expect(
    page.getByText('Approximate: search limit reached after 50,000 combinations'),
  ).toBeVisible();
});

test('the old wallet address goes to Plan my trip', async ({ page }) => {
  await page.goto('/wallet');
  await expect(page).toHaveURL(/\/plan$/);
  await expect(page.getByRole('heading', { name: '1. Your trip' })).toBeVisible();
});
