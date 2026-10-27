import { expect, test } from '@playwright/test';
import { scl } from './helpers';

// Run against a deployment: BASE_URL=https://<demo-domain> pnpm test:smoke
// Set EXPECT_PROVIDER=duffel_test to assert the deployed provider mode.
test('health reports a known auth/provider mode and an engine version (no secrets)', async ({
  request,
}) => {
  const res = await request.get('/api/health');
  expect(res.ok()).toBe(true);
  const body = await res.json();
  expect(['guest', 'supabase']).toContain(body.mode.auth);
  expect(['fixture', 'duffel_test']).toContain(body.mode.provider);
  if (process.env.EXPECT_PROVIDER) expect(body.mode.provider).toBe(process.env.EXPECT_PROVIDER);
  expect(body.version).toMatch(/^engine-/);
  expect(JSON.stringify(body)).not.toMatch(/duffel_test_|AQ\.|sb_secret/);
});

test('security headers are set and the framework is not advertised', async ({ request }) => {
  const res = await request.get('/');
  const h = res.headers();
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['x-frame-options']).toBe('DENY');
  expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(h['x-powered-by']).toBeUndefined();
});

test('landing shows the demo disclosure, the main CTA and the search form', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/Demo · Duffel test mode · no real bookings/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Plan my trip' }).first()).toBeVisible();
  await expect(page.getByRole('form', { name: 'Quick Flight search' })).toBeVisible();
});

test('the planner opens on the first step', async ({ page }) => {
  await page.goto('/plan');
  await expect(page.getByRole('heading', { name: '1. Your trip' })).toBeVisible();
});

test('a quick search returns a labelled comparison', async ({ page }) => {
  await page.goto(scl());
  await expect(page.getByText(/Example saving · illustrative data/)).toBeVisible();
  await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible();
});
