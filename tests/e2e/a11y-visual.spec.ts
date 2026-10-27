import { expect, test } from '@playwright/test';
import {
  LUCIA,
  expectAccessible,
  expectNoHorizontalOverflow,
  pek,
  scl,
  seedWallet,
  trip,
} from './helpers';

const pages: { name: string; path: () => string; ready: RegExp | string }[] = [
  { name: 'landing', path: () => '/', ready: 'Your trip, your cards, one clear plan.' },
  { name: 'plan-wizard', path: () => '/plan', ready: 'Where and when?' },
  { name: 'compare', path: () => '/compare', ready: 'Cash or points for a flight' },
  {
    name: 'compare-multi',
    path: () => '/compare?mode=multi',
    ready: 'Cash or points for a flight',
  },
  { name: 'results', path: scl, ready: /Save €1,674/ },
  { name: 'results-flex', path: pek, ready: /Save €78/ },
  { name: 'detail', path: () => `${scl()}`, ready: /Save €1,674/ },
  { name: 'multi-results', path: trip, ready: 'Tickets to book' },
  { name: 'how', path: () => '/how-it-works', ready: 'How your plan is made' },
  { name: 'login', path: () => '/login', ready: 'Your account' },
  { name: 'my-plans', path: () => '/my-plans', ready: /plans/i },
  { name: 'settings', path: () => '/settings', ready: 'Privacy and your data' },
  { name: 'not-found', path: () => '/nope', ready: 'This page took a different flight' },
];

for (const theme of ['light', 'dark'] as const) {
  for (const p of pages) {
    test(`a11y + layout (${theme}): ${p.name}`, async ({ page }, info) => {
      await seedWallet(page, LUCIA);
      await page.addInitScript((t) => window.localStorage.setItem('aumTheme', t), theme);
      await page.goto(p.path());
      if (theme === 'dark') await expect(page.locator('html')).toHaveClass(/dark/);
      if (p.name === 'detail') {
        await expect(page.getByRole('heading', { level: 2, name: p.ready })).toBeVisible();
        await page.getByRole('link', { name: 'See how this was calculated' }).click();
        await expect(page.getByRole('table', { name: 'Cost breakdown' })).toBeVisible();
      } else {
        await expect(page.getByRole('heading', { name: p.ready }).first()).toBeVisible();
      }
      await page.waitForLoadState('networkidle');
      await expectNoHorizontalOverflow(page);
      await expectAccessible(page);
      await page.screenshot({
        path: `test-results/screens/${info.project.name}-${theme}-${p.name}.png`,
        fullPage: true,
      });
    });
  }
}

test('award steps and checkout pass axe', async ({ page }, info) => {
  await seedWallet(page, LUCIA);
  await page.goto(scl());
  await page.getByRole('link', { name: 'How to book with points' }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: /Book with/ })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectAccessible(page);
  await page.screenshot({
    path: `test-results/screens/${info.project.name}-award.png`,
    fullPage: true,
  });

  await page.goto(scl());
  await page.getByRole('link', { name: 'Book in test mode' }).first().click();
  await expect(page.getByText('Test mode: nothing real is booked or charged')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectAccessible(page);
  await page.screenshot({
    path: `test-results/screens/${info.project.name}-checkout.png`,
    fullPage: true,
  });
});

test('keyboard: skip link and visible focus reach the content', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
});
