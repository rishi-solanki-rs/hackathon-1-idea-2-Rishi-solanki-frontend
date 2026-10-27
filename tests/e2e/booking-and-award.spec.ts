import { expect, test } from '@playwright/test';
import { LUCIA, pek, scl, seedWallet } from './helpers';

test('T-INT-004: test checkout reprices €702 → €719, then books with an unmistakable test label', async ({
  page,
}) => {
  await page.goto(pek());
  const best = page.getByRole('listitem').filter({ has: page.getByText('Best option') });
  await best.getByRole('link', { name: 'Book in test mode' }).click();
  await expect(page.getByText('Test mode: nothing real is booked or charged')).toBeVisible();
  await expect(page.getByText('Lucia Demo')).toBeVisible();
  await expect(page.getByLabel(/card number/i)).toHaveCount(0);
  await page.getByRole('button', { name: 'Confirm test booking' }).click();
  await expect(page.getByText('Price changed from €702.00 to €719.00')).toBeVisible();
  await page.getByRole('button', { name: /Accept €719\.00 and book \(test\)/ }).click();
  await expect(page.getByRole('heading', { name: 'Test booking created' })).toBeVisible();
  await expect(page.getByText('TEST BOOKING – no ticket issued, no money charged')).toBeVisible();
  await expect(page.getByText(/^SIM-/)).toBeVisible();
});

test('award steps: enough points → no transfer step; seat check comes first', async ({ page }) => {
  await seedWallet(page, LUCIA);
  await page.goto(scl());
  await page.getByRole('link', { name: 'How to book with points' }).first().click();
  await expect(
    page.getByRole('heading', { level: 1, name: /Book with 70,500 Avios/ }),
  ).toBeVisible();
  const steps = page.getByRole('heading', { level: 2 });
  await expect(steps.nth(0)).toHaveText('Check your points');
  await expect(steps.nth(1)).toHaveText('Find this exact seat on the programme’s site');
  await expect(page.getByRole('heading', { name: /^Transfer / })).toHaveCount(0);
});

test('award steps: a needed transfer stays locked until the seat is confirmed', async ({
  page,
}) => {
  await seedWallet(page, {
    profile: 'custom',
    balances: [
      { program: 'iberia_club', points: 60_000 },
      { program: 'amex_mr_es', points: 15_000 },
    ],
    valuations: [{ program: 'iberia_club', eurPerPoint: '0.012' }],
  });
  await page.goto(scl());
  await page.getByRole('link', { name: 'How to book with points' }).first().click();
  await expect(
    page.getByRole('heading', { name: 'Transfer 11,000 MR points to Iberia Club' }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'Points transfers usually cannot be reversed. Move points only after you have found the seat.',
    ),
  ).toBeVisible();
  await expect(
    page.getByText('Locked until you confirm the seat in the step above.'),
  ).toBeVisible();
  await page
    .getByLabel('I found this seat on the programme’s site and it is still available.')
    .check();
  await expect(page.getByText('Locked until you confirm the seat in the step above.')).toHaveCount(
    0,
  );
  await expect(page.getByText(/You will receive 11,000 Avios/)).toBeVisible();
});
