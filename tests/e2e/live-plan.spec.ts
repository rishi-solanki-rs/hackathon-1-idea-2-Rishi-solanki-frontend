import { expect, test } from '@playwright/test';
import { future } from './helpers';

// Real providers through the UI (Duffel test mode + Gemini). Run only on purpose:
//   LIVE=1 BASE_URL=<server with real keys> pnpm exec playwright test tests/e2e/live-plan.spec.ts --project=desktop-1280
test.skip(!process.env.LIVE, 'live provider journey runs only with LIVE=1');
test.setTimeout(150_000);

test('LIVE: plan with real Duffel test fares, AI explanation, and a real Duffel TEST booking', async ({
  page,
}) => {
  await page.goto('/plan');
  await page.getByRole('combobox', { name: 'To', exact: true }).selectOption('LHR');
  await page.getByLabel('Earliest departure').fill(future(45));
  await page.getByLabel('Latest departure').fill(future(55));
  await page.getByRole('button', { name: /Next: Cards/ }).click();
  await page.getByLabel('I don’t have any cards that earn points').check();
  await page.getByRole('button', { name: /Next: Points/ }).click();
  await page.getByRole('button', { name: 'Add a points balance' }).click();
  await page.getByLabel('Programme', { exact: true }).first().selectOption('iberia_club');
  await page.getByLabel('Balance (Avios)').fill('20000');
  await page.getByLabel('I found an award on the programme’s site').check();
  await page.getByLabel('Points needed (all travellers)').fill('18000');
  await page.getByLabel('Taxes and charges (€)').fill('60');
  await page.getByRole('button', { name: /Next: Spending/ }).click();
  await page.getByLabel('Yes, always in full').check();
  await page.getByRole('button', { name: 'Build my plan' }).click();

  const fares = page.getByRole('region', { name: 'Cash fares across your dates' });
  await expect(fares.getByText('Duffel test data')).toBeVisible({ timeout: 90_000 });
  await expect(fares.getByText(/€\d/).first()).toBeVisible();
  const explain = page.getByRole('region', { name: 'In plain words' });
  await expect(explain.getByText(/AI-written|Rules-based explanation/)).toBeVisible({
    timeout: 60_000,
  });
  console.log(
    'explanation source:',
    await explain.getByText(/AI-written|Rules-based explanation/).textContent(),
  );
  await page.screenshot({ path: `test-results/screens/live-plan-result.png`, fullPage: true });

  await page.getByRole('link', { name: 'Book the cheapest in test mode' }).click();
  await page.getByRole('button', { name: 'Confirm test booking' }).click();
  const accept = page.getByRole('button', { name: /Accept .* and book \(test\)/ });
  const done = page.getByRole('heading', { name: 'Test booking created' });
  await expect(accept.or(done)).toBeVisible({ timeout: 60_000 });
  if (await accept.isVisible()) await accept.click();
  await expect(done).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText('TEST — no real ticket issued; no money charged')).toBeVisible();
  await expect(page.getByText('Duffel test mode (sandbox)')).toBeVisible();
});
