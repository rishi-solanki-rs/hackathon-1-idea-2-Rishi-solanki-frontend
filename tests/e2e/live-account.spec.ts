import { expect, test } from '@playwright/test';
import { future } from './helpers';

// Real Supabase login + plan saving through the UI. Run only on purpose (deletes its own test user afterwards):
//   LIVE=1 BASE_URL=<url> node --env-file=.env.local node_modules/@playwright/test/cli.js test tests/e2e/live-account.spec.ts --project=desktop-1280
test.skip(!process.env.LIVE, 'live account journey runs only with LIVE=1');
test.setTimeout(150_000);

const email = `aum-live-ui-${Date.now()}@example.com`;
const password = `Ui-${Date.now()}-pass!`;

test.afterAll(async () => {
  const ref = process.env.SUPABASE_PROJECT_REF;
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!ref || !token) return;
  await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `delete from auth.users where email like 'aum-live-ui-%@example.com'`,
    }),
  });
});

test('LIVE: create an account, build a plan, see it in My plans, log out and back in', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByRole('tab', { name: 'Create account' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page
    .getByRole('form', { name: 'Create account' })
    .getByRole('button', { name: 'Create account' })
    .click();
  await expect(page).toHaveURL(/\/plan$/);
  await expect(page.getByRole('link', { name: `Account: ${email}` })).toBeVisible();
  await expect(page.getByText(/Saved to your account/)).toBeVisible();

  await page.getByRole('combobox', { name: 'To', exact: true }).selectOption('LHR');
  await page.getByLabel('Earliest departure').fill(future(45));
  await page.getByLabel('Latest departure').fill(future(50));
  await page.getByRole('button', { name: /Next: Cards/ }).click();
  await page.getByLabel('I don’t have any cards that earn points').check();
  await page.getByRole('button', { name: /Next: Points/ }).click();
  await page.getByLabel('I don’t have any loyalty points').check();
  await page.getByRole('button', { name: /Next: Spending/ }).click();
  await page.getByLabel('Yes, always').check();
  // A full page load would cancel the save in flight, so wait for it before leaving.
  const saved = page.waitForResponse(
    (r) => r.url().includes('/rest/v1/plans') && r.request().method() === 'POST',
    { timeout: 90_000 },
  );
  await page.getByRole('button', { name: 'Build my plan' }).click();
  await expect(
    page.getByRole('region', { name: 'When to book' }).getByText('Duffel test data'),
  ).toBeVisible({ timeout: 90_000 });
  expect((await saved).status()).toBeLessThan(300);

  await page.getByRole('link', { name: 'My plans' }).first().click();
  await expect(page.getByText(/London/).first()).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/live-my-plans.png', fullPage: true });

  await page.goto('/login');
  await page.getByRole('button', { name: 'Log out' }).click();
  await page.goto('/my-plans');
  await expect(page.getByText('Log in to see your saved plans')).toBeVisible();

  await page.evaluate(() => window.localStorage.clear());
  await page.goto('/login?next=/my-plans');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('form', { name: 'Log in' }).getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/my-plans$/);
  await expect(page.getByText(/London/).first()).toBeVisible();
});
