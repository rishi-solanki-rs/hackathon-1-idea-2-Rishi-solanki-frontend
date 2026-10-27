// Builds the app for the Playwright suite with Supabase switched off.
// Empty strings (not unset) are needed: Next only falls back to .env.local when a variable is absent.
import { spawnSync } from 'node:child_process';

const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: '',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
};
const r = spawnSync('pnpm', ['build'], {
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(r.status ?? 1);
