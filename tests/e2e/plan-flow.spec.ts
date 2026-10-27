import { expect, test, type Page } from '@playwright/test';
import { expectAccessible, expectNoHorizontalOverflow, future } from './helpers';

async function tripStep(page: Page) {
  await page.goto('/plan');
  await expect(page.getByRole('heading', { name: '1. Your trip' })).toBeVisible();
  await page.getByRole('combobox', { name: 'To', exact: true }).selectOption('LHR');
  await page.getByLabel('Earliest departure').fill(future(40));
  await page.getByLabel('Latest departure').fill(future(52));
  await page.getByRole('button', { name: /Next: Cards/ }).click();
  await expect(page.getByRole('heading', { name: '2. Your cards' })).toBeVisible();
}

async function buildWithExamples(page: Page) {
  await page.getByRole('button', { name: 'Build my plan' }).click();
  await expect(page.getByRole('heading', { name: 'Cash fares across your dates' })).toBeVisible();
  await expect(page.getByText('Flight prices unavailable')).toBeVisible();
  await page.getByRole('button', { name: 'Show labelled example fares' }).click();
  await expect(page.getByText('Example data').first()).toBeVisible();
}

test.describe('Plan my trip: main journey', () => {
  test('no cards and no points: explicit answers are required, then an honest cash plan', async ({
    page,
  }) => {
    await tripStep(page);
    await page.getByRole('button', { name: /Next: Points/ }).click();
    await expect(
      page.getByRole('alert').filter({ hasText: 'Please check this step' }),
    ).toContainText('tick “I don’t have any cards that earn points”');
    await page.getByLabel('I don’t have any cards that earn points').check();
    await page.getByRole('button', { name: /Next: Points/ }).click();
    await page.getByLabel('I don’t have any loyalty points').check();
    await page.getByRole('button', { name: /Next: Spending/ }).click();
    await page.getByRole('button', { name: 'Build my plan' }).click();
    await expect(
      page.getByRole('alert').filter({ hasText: 'Please check this step' }),
    ).toContainText('pay your full card statement');
    await page.getByLabel('Yes, always in full').check();
    await buildWithExamples(page);
    await expect(page.getByRole('heading', { level: 2, name: 'Book the cash fare' })).toBeVisible();
    const next = page.getByRole('region', { name: 'What to do next' });
    await expect(next).toContainText('Do not spend extra or buy points to close a gap');
    await expect(page.getByText('Rules-based explanation')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectAccessible(page);
  });

  test('cards + points + purchase: allocation, shortfall, and "What changed" after editing the balance', async ({
    page,
  }) => {
    await tripStep(page);
    await page.getByLabel('Add a card from our list').selectOption('iberia_aire');
    await page.getByRole('button', { name: 'Add card' }).click();
    await expect(page.getByLabel('Card name')).toHaveValue('Iberia Aire (Iberia Cards)');
    await expect(page.getByText('Official source').first()).toBeVisible();
    await page.getByLabel('Days until points appear').fill('30');
    await page.getByRole('button', { name: /Next: Points/ }).click();

    await page.getByRole('button', { name: 'Add a points balance' }).click();
    await page.getByLabel('Programme', { exact: true }).first().selectOption('iberia_club');
    await page.getByLabel('Balance (Avios)').fill('20000');
    await page.getByLabel('I found an award on the programme’s site').check();
    await page.getByLabel('Points needed (all travellers)').fill('20500');
    await page.getByLabel('Taxes and charges (€)').fill('40');
    await page.getByRole('button', { name: /Next: Spending/ }).click();

    await page.getByLabel('Yes, always in full').check();
    await page.getByRole('button', { name: 'Add a planned purchase' }).click();
    await page.getByLabel('What').first().fill('New laptop');
    await page.getByLabel('Amount (€)').fill('900');
    await page.getByLabel('When').fill(future(10));
    await page.getByLabel('Already committed').check();
    await page.screenshot({
      path: `test-results/screens/${test.info().project.name}-plan-spending.png`,
      fullPage: true,
    });
    await buildWithExamples(page);

    const cardPlan = page.getByRole('region', { name: 'Which card for which purchase' });
    await expect(cardPlan.getByRole('row', { name: /New laptop/ })).toContainText('Iberia Aire');
    await expect(cardPlan.getByRole('row', { name: /New laptop/ })).toContainText('300');
    await expect(page.getByRole('region', { name: /Points for this trip/ })).toContainText(
      '20,500',
    );

    await page.getByRole('button', { name: 'Edit answers' }).click();
    const steps = page.getByRole('navigation', { name: 'Plan steps' });
    await steps.getByRole('button', { name: /Points/ }).click();
    await page.getByLabel('Balance (Avios)').fill('21000');
    await steps.getByRole('button', { name: /Your plan/ }).click();
    const changed = page.getByRole('region', { name: 'What changed' });
    await expect(changed).toBeVisible();
    await page.screenshot({
      path: `test-results/screens/${test.info().project.name}-plan-result.png`,
      fullPage: true,
    });
    await expect(changed).toContainText('Points balance changed');
    await expect(changed.getByRole('row', { name: /Points shortfall/ })).toBeVisible();
    // Regression: the example-fare choice survives the edit, so the fare itself did not "change".
    await expect(changed.getByRole('row', { name: /Cheapest cash fare/ })).toHaveCount(0);
  });

  test('carrying a card balance blocks card-earning advice', async ({ page }) => {
    await tripStep(page);
    await page.getByLabel('Add a card from our list').selectOption('amex_es_gold');
    await page.getByRole('button', { name: 'Add card' }).click();
    await page.getByRole('button', { name: /Next: Points/ }).click();
    await page.getByLabel('I don’t have any loyalty points').check();
    await page.getByRole('button', { name: /Next: Spending/ }).click();
    await page.getByLabel('No, I sometimes carry a balance').check();
    await expect(page.getByText('We won’t plan card points for you')).toBeVisible();
    await buildWithExamples(page);
    await expect(page.getByText('Card points are not planned')).toBeVisible();
    await expect(page.getByRole('region', { name: 'What to do next' })).toContainText(
      'Do not use cards to earn points while you carry a balance',
    );
  });

  test('inputs survive a reload; Clear demo data really clears them', async ({ page }) => {
    await tripStep(page);
    await page.getByLabel('Add a card from our list').selectOption('iberia_zenit');
    await page.getByRole('button', { name: 'Add card' }).click();
    await page.reload();
    await expect(page.getByLabel('Card name')).toHaveValue('Iberia Zenit (Iberia Cards)');
    await page.getByRole('button', { name: 'Clear demo data' }).click();
    await expect(page.getByText('Demo data cleared from this browser.')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: '1. Your trip' })).toBeVisible();
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
});
