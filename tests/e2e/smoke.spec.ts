import { expect, test } from '@playwright/test';
import { scl } from './helpers';

// Run against a deployment: BASE_URL=https://<demo-domain> pnpm test:smoke
test('health reports guest mode and an engine version', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.ok()).toBe(true);
  const body = await res.json();
  expect(body.mode.auth).toBe('guest');
  expect(body.version).toMatch(/^engine-/);
});

test('security headers are set and the framework is not advertised', async ({ request }) => {
  const res = await request.get('/');
  const h = res.headers();
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['x-frame-options']).toBe('DENY');
  expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(h['x-powered-by']).toBeUndefined();
});

test('landing shows the demo disclosure and search form', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/Demo · test mode · illustrative prices/)).toBeVisible();
  await expect(page.getByRole('form', { name: 'Quick Flight search' })).toBeVisible();
});

test('a demo search returns a labelled comparison', async ({ page }) => {
  await page.goto(scl());
  await expect(page.getByText(/Example saving · illustrative data/)).toBeVisible();
  await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible();
});
