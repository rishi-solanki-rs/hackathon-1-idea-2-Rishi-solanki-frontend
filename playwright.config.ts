import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 3200);
const baseURL = process.env.BASE_URL ?? `http://localhost:${PORT}`;
const external = !!process.env.BASE_URL;

const viewports = {
  'mobile-360': { width: 360, height: 800 },
  'tablet-768': { width: 768, height: 1024 },
  'desktop-1280': { width: 1280, height: 800 },
};

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    ...Object.entries(viewports).map(([name, viewport]) => ({
      name,
      testIgnore: /smoke\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport,
        hasTouch: name === 'mobile-360',
        isMobile: false,
        storageState: process.env.SHARE_URL ? 'test-results/.auth/share.json' : undefined,
      },
    })),
    {
      name: 'smoke',
      testMatch: /smoke\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: process.env.SHARE_URL ? 'test-results/.auth/share.json' : undefined,
      },
    },
  ],
  globalSetup: './tests/e2e/global-setup.ts',
  webServer: external
    ? undefined
    : {
        command: `pnpm start --port ${PORT}`,
        url: `${baseURL}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        // Every parallel test shares one IP, so the e2e server gets a higher per-minute limit.
        // Deterministic: no live providers even if .env.local exists (process env wins over .env files).
        env: {
          PROVIDER_MODE: 'fixture',
          AUTH_MODE: 'guest',
          FX_LIVE: 'off',
          RATE_LIMIT_PER_MIN: '2000',
          DUFFEL_ACCESS_TOKEN: '',
          GEMINI_API_KEY: '',
        },
      },
});
