import { chromium } from '@playwright/test';

export const SHARE_STATE = 'test-results/.auth/share.json';

/** For protected Vercel previews: open the share link once and reuse its auth cookie in smoke tests. */
export default async function globalSetup() {
  const share = process.env.SHARE_URL;
  if (!share) return;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(share);
  await page.context().storageState({ path: SHARE_STATE });
  await browser.close();
}
