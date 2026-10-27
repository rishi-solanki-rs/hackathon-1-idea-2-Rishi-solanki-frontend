import { expect, test, type Page } from '@playwright/test';
import { expectAccessible, expectNoHorizontalOverflow, future } from './helpers';

const shot = (page: Page, name: string) =>
  page.screenshot({
    path: `test-results/screens/${test.info().project.name}-${name}.png`,
    fullPage: true,
  });

async function tripStep(page: Page) {
  await page.goto('/plan');
  await expect(page.getByRole('heading', { name: 'Where and when?' })).toBeVisible();
  await page.getByRole('combobox', { name: 'To', exact: true }).selectOption('LHR');
  await page.getByLabel('Earliest departure').fill(future(40));
  await page.getByLabel('Latest departure').fill(future(52));
  await page.getByRole('button', { name: /Next: Cards/ }).click();
  await expect(page.getByRole('heading', { name: 'Your cards', exact: true })).toBeVisible();
}

async function addCard(page: Page, id: string) {
  await page.getByLabel('Add a card').selectOption(id);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
}

async function buildWithExamples(page: Page) {
  await page.getByRole('button', { name: 'Build my plan' }).click();
  await expect(page.getByRole('region', { name: 'When to book' })).toBeVisible();
  await expect(page.getByText('No test fare for these dates right now')).toBeVisible();
  await page.getByRole('button', { name: 'Show labelled example fares' }).click();
  await expect(page.getByText('Example data').first()).toBeVisible();
}

test.describe('Plan my trip: main journey', () => {
  test('errors appear under the exact field and block Next until fixed', async ({ page }) => {
    await page.goto('/plan');
    await page.getByLabel('Earliest departure').fill(future(40));
    await page.getByLabel('Latest departure').fill(future(30));
    await page.getByRole('button', { name: /Next: Cards/ }).click();
    await expect(page.getByText('Fix 2 fields to continue.')).toBeVisible();
    const to = page.getByRole('combobox', { name: 'To', exact: true });
    await expect(to).toHaveAttribute('aria-invalid', 'true');
    await expect(to).toBeFocused();
    await expect(page.getByText('Choose where you are going.')).toBeVisible();
    await expect(page.getByLabel('Latest departure')).toHaveAccessibleDescription(
      'Must be on or after the earliest departure.',
    );
    await expect(page.getByRole('heading', { name: 'Where and when?' })).toBeVisible();
    await shot(page, 'plan-errors');
    await expectAccessible(page);

    await to.selectOption('LHR');
    await expect(page.getByText('Fix 1 field to continue.')).toBeVisible();
    await page.getByLabel('Latest departure').fill(future(45));
    await expect(page.getByText(/Fix \d field/)).toHaveCount(0);
    await page.getByRole('button', { name: /Next: Cards/ }).click();
    await expect(page.getByRole('heading', { name: 'Your cards', exact: true })).toBeVisible();
  });

  test('no cards and no points: explicit answers are required, then an honest cash plan', async ({
    page,
  }) => {
    await tripStep(page);
    await page.getByRole('button', { name: /Next: Points/ }).click();
    await expect(page.getByLabel('Add a card')).toHaveAccessibleDescription(
      /tick “I don’t have any cards that earn points”/,
    );
    await page.getByLabel('I don’t have any cards that earn points').check();
    await page.getByRole('button', { name: /Next: Points/ }).click();
    await page.getByLabel('I don’t have any loyalty points').check();
    await page.getByRole('button', { name: /Next: Spending/ }).click();
    await page.getByRole('button', { name: 'Build my plan' }).click();
    await expect(page.getByText('Choose one answer.')).toBeVisible();
    await page.getByLabel('Yes, always').check();
    await buildWithExamples(page);
    await expect(page.getByRole('heading', { level: 2, name: 'Book the cash fare' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Next steps' })).toContainText(
      'Do not spend extra or buy points to close a gap',
    );
    await page.getByText('Explain this plan in plain words (AI)').click();
    await expect(page.getByText('Rules-based explanation')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectAccessible(page);
  });

  test('cards + points + spending: daily card, card plan, booking advice and "What changed"', async ({
    page,
  }) => {
    await tripStep(page);
    await addCard(page, 'iberia_aire');
    await expect(page.getByRole('listitem').getByText('Iberia Aire (Iberia Cards)')).toBeVisible();
    await expect(page.getByText('Official source').first()).toBeVisible();
    await page.getByLabel('Points appear after (days)').fill('30');
    await shot(page, 'plan-cards');
    await page.getByRole('button', { name: /Next: Points/ }).click();

    await page.getByRole('button', { name: 'Add a points balance' }).click();
    await page.getByLabel('Programme', { exact: true }).first().selectOption('iberia_club');
    await page.getByLabel('Avios today').fill('20000');
    await page.getByLabel('I found an award price on the programme’s site').check();
    await page.locator('#aw-program').selectOption('iberia_club');
    await page.getByLabel('Points (all travellers)').fill('20500');
    await page.getByLabel('Taxes and charges (€)').fill('40');
    await page.getByRole('button', { name: /Next: Spending/ }).click();

    await page.getByLabel('Yes, always').check();
    await page.getByRole('button', { name: 'Groceries' }).click();
    await page.getByLabel('€ per month').fill('400');
    await page.getByRole('button', { name: 'Add a planned purchase' }).click();
    await page.getByLabel('What').last().fill('New laptop');
    await page.getByLabel('Amount (€)').fill('900');
    await page.getByLabel('When').fill(future(10));
    await page.getByLabel('Already committed').check();
    await shot(page, 'plan-spending');
    await buildWithExamples(page);

    const cards = page.getByRole('region', { name: 'Your cards' });
    await expect(cards).toContainText('Groceries');
    await expect(cards).toContainText('Iberia Aire');
    await expect(cards).toContainText('Should you get a new card?');
    await expect(page.getByRole('region', { name: 'When to book' })).toContainText(
      'not a price forecast',
    );
    await expect(page.getByRole('region', { name: /Your points/ })).toContainText('20,500');
    await page.getByText('How this was calculated').click();
    await expect(page.getByRole('row', { name: /New laptop/ })).toContainText('Iberia Aire');
    await expect(page.getByRole('row', { name: /New laptop/ })).toContainText('300');

    await page.getByRole('button', { name: 'Edit answers' }).click();
    const steps = page.getByRole('navigation', { name: 'Plan steps' });
    await steps.getByRole('button', { name: /Points/ }).click();
    await page.getByLabel('Avios today').fill('21000');
    await steps.getByRole('button', { name: /Plan/ }).click();
    const changed = page.getByText('What changed since your last plan').locator('..');
    await expect(changed).toBeVisible();
    await shot(page, 'plan-result');
    await expect(changed).toContainText('Points balance changed');
    await expect(changed).toContainText('Points shortfall');
    // Regression: the example-fare choice survives the edit, so the fare itself did not "change".
    await expect(changed).not.toContainText('Cheapest cash fare');
    await expectNoHorizontalOverflow(page);
  });

  test('carrying a card balance blocks card-earning advice and new cards', async ({ page }) => {
    await tripStep(page);
    await addCard(page, 'amex_es_gold');
    await page.getByRole('button', { name: /Next: Points/ }).click();
    await page.getByLabel('I don’t have any loyalty points').check();
    await page.getByRole('button', { name: /Next: Spending/ }).click();
    await page.getByLabel('No, I carry a balance').check();
    await expect(page.getByText('We won’t plan card points for you')).toBeVisible();
    await buildWithExamples(page);
    await expect(page.getByText('Card points are not planned').first()).toBeVisible();
    await expect(page.getByRole('region', { name: 'Next steps' })).toContainText(
      'Do not use cards to earn points while you carry a balance',
    );
    await expect(page.getByRole('region', { name: 'Your cards' })).toContainText(
      'No new card helps this trip right now',
    );
  });

  test('inputs survive a reload; "Clear my data" really clears them', async ({ page }) => {
    await tripStep(page);
    await addCard(page, 'iberia_zenit');
    await page.reload();
    await expect(page.getByRole('listitem').getByText('Iberia Zenit (Iberia Cards)')).toBeVisible();
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Clear my data' }).click();
    await expect(page.getByText('Your data was cleared.')).toBeVisible();
    await page.goto('/plan');
    await expect(page.getByRole('heading', { name: 'Where and when?' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'To', exact: true })).toHaveValue('');
  });

  test('theme choice persists across navigation and reload', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.goto('/plan');
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expectAccessible(page);
    await page.getByRole('button', { name: 'Switch to light theme' }).click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('compare page: one trip and multi-city tabs; old multi-city URL redirects', async ({
    page,
  }) => {
    await page.goto('/compare');
    await expect(page.getByRole('tab', { name: 'One trip' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByRole('form', { name: 'Quick Flight search' })).toBeVisible();
    await page.getByRole('tab', { name: 'Multi-city' }).click();
    await expect(page.getByRole('tabpanel')).toContainText(/flight/i);
    await expectAccessible(page);
    await page.goto('/trips/multi');
    await expect(page).toHaveURL(/\/compare\?mode=multi/);
    await expect(page.getByRole('tab', { name: 'Multi-city' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('login page shows the form (or explains that accounts are off)', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Your account' })).toBeVisible();
    await expect(
      page.getByLabel('Email').or(page.getByText('Login is not configured on this site')).first(),
    ).toBeVisible();
    await page.goto('/my-plans');
    await expect(page.getByRole('main')).toBeVisible();
  });
});
