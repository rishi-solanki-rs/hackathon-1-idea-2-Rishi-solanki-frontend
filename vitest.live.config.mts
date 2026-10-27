import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Real-provider tests (Duffel test mode, Gemini, Supabase). Never part of CI; needs .env.local.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'server-only': fileURLToPath(new URL('./tests/stubs/server-only.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/live/**/*.live.test.ts'],
    testTimeout: 90_000,
    fileParallelism: false,
  },
});
