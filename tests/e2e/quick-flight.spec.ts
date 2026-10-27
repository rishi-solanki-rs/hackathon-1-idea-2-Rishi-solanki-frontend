import { expect, test } from '@playwright/test';
import { LUCIA, expectNoHorizontalOverflow, jfk, pek, scl, seedWallet } from './helpers';

test.describe('Quick Flight journey (TASK-015..017)', () => {
  test('T-FUN-003: demo trip → results → detail → reload keeps the detail', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Madrid → Santiago de Chile, business/ }).click();
    await expect(page).toHaveURL(/\/results\?/);
    const hero = page.getByRole('heading', { level: 2, name: /Save €1,674 \(57\.7%\)/ });
    await expect(hero).toBeVisible();
    await expect(page.getByText('Example saving · illustrative data')).toBeVisible();
    await expect(page.getByText('Illustrative award').first()).toBeVisible();
    await expect(
      page.getByText(
        /Points used for this comparison: Example wallet: Lucía \(demo\) \(fictional\)/,
      ),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole('link', { name: 'See how this was calculated' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Award with points' })).toBeVisible();
    const breakdown = page.getByRole('table', { name: 'Cost breakdown' });
    await expect(breakdown.getByRole('row', { name: /Estimated overall cost/ })).toContainText(
      '€1,226.00',
    );
    await expect(breakdown.getByRole('row', { name: /70,500 Avios/ })).toContainText('€846.00');
    await expect(page.getByText('€1,674.00 less overall')).toBeVisible();

    await page.reload();
    await expect(page.getByRole('table', { name: 'Cost breakdown' })).toContainText('€1,226.00');
    await expectNoHorizontalOverflow(page);
  });

  test('T-FUN-001: no points, flexible dates → save €78 (10.0%); award not bookable', async ({
    page,
  }) => {
    await page.goto(pek());
    await expect(
      page.getByRole('heading', { level: 2, name: /Save €78 \(10\.0%\)/ }),
    ).toBeVisible();
    const notRanked = page.getByRole('region', { name: 'Not ranked, and why' });
    await expect(notRanked.getByText('Not bookable with your current points')).toBeVisible();
    await expect(notRanked.getByText(/Needs 50,000 Avios; you have 0 Avios/)).toBeVisible();
    await expect(page.getByText(/\+ €60\.00 paid separately/)).toBeVisible();
  });

  test('CS-04: award looks cheaper but cash is better by €98, with break-even €0.0091', async ({
    page,
  }) => {
    await seedWallet(page, LUCIA);
    await page.goto(jfk());
    await expect(
      page.getByRole('heading', { level: 2, name: 'Paying cash is better by €98' }),
    ).toBeVisible();
    await expect(
      page.getByText(/Break-even: points beat cash only if you value .* above €0\.0091 each/),
    ).toBeVisible();
    await expect(
      page
        .getByRole('region', { name: /All options/ })
        .getByRole('listitem')
        .first(),
    ).toContainText('Cash fare');
  });

  test('form validation: missing destination is announced and focused; valid search navigates', async ({
    page,
  }) => {
    await page.goto('/');
    const form = page.getByRole('form', { name: 'Quick Flight search' });
    await form.getByRole('button', { name: 'Compare cash and points' }).click();
    await expect(form.getByText('Choose where you want to go')).toBeVisible();
    const to = form.getByRole('combobox', { name: 'To', exact: true });
    await expect(to).toBeFocused();
    await expect(to).toHaveAttribute('aria-invalid', 'true');
    await to.selectOption('JFK');
    await form.getByRole('button', { name: 'Compare cash and points' }).click();
    await expect(page).toHaveURL(/d=JFK/);
    await expect(
      page.getByRole('heading', { level: 1, name: /Madrid \(MAD\) → New York \(JFK\)/ }),
    ).toBeVisible();
    await expect(page.getByRole('region', { name: /All options/ })).toBeVisible();
  });

  test('an incomplete link explains what is wrong instead of searching', async ({ page }) => {
    await page.goto('/results?o=XX&d=SCL');
    await expect(page.getByText('This search is incomplete')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Start a new search' })).toBeVisible();
  });

  test('provider failure shows an error with a working retry', async ({ page }) => {
    let fail = true;
    await page.route('**/api/search/quick', async (route) => {
      if (fail) {
        fail = false;
        return route.fulfill({
          status: 500,
          json: {
            ok: false,
            error: { code: 'INTERNAL', message: 'Something went wrong while comparing prices.' },
          },
        });
      }
      return route.continue();
    });
    await seedWallet(page, LUCIA);
    await page.goto(scl());
    await expect(
      page.getByRole('alert').filter({ hasText: 'We could not complete this search' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByRole('heading', { level: 2, name: /Save €1,674/ })).toBeVisible();
  });

  test('fixture fallback is labelled and never presented as live', async ({ page }) => {
    await page.route('**/api/search/quick', async (route) => {
      const res = await route.fetch();
      const json = await res.json();
      json.status = 'fixture_fallback';
      return route.fulfill({ response: res, json });
    });
    await page.goto(pek());
    await expect(page.getByText('Live test search unavailable')).toBeVisible();
    await expect(page.getByText(/Nothing here is a live price/)).toBeVisible();
  });

  test('empty results offer next steps', async ({ page }) => {
    await page.route('**/api/search/quick', async (route) => {
      const res = await route.fetch();
      const json = await res.json();
      json.status = 'empty';
      json.data.options = [];
      return route.fulfill({ response: res, json });
    });
    await page.goto(pek());
    await expect(page.getByText('No flights found for these dates')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Change search' })).toBeVisible();
  });

  test('validation error from the API is shown, not swallowed', async ({ page }) => {
    await page.route('**/api/search/quick', (route) =>
      route.fulfill({
        status: 400,
        json: {
          ok: false,
          error: { code: 'VALIDATION_ERROR', message: 'Some fields need attention.' },
        },
      }),
    );
    await page.goto(pek());
    await expect(
      page.getByRole('alert').filter({ hasText: 'Some search details need attention' }),
    ).toBeVisible();
  });
});
