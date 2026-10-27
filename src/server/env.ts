import 'server-only';
import { z } from 'zod';

const EnvSchema = z.object({
  AUTH_MODE: z.enum(['guest', 'supabase']).default('guest'),
  PROVIDER_MODE: z.enum(['fixture', 'duffel_test']).default('fixture'),
  DUFFEL_ACCESS_TOKEN: z.string().optional(),
  FX_LIVE: z.enum(['on', 'off']).default('on'),
});

export type ServerEnv = z.infer<typeof EnvSchema> & { duffelEnabled: boolean };

/** Reads server env once per call; secrets never leave this module except to provider factories. */
export function serverEnv(): ServerEnv {
  const parsed = EnvSchema.parse({
    AUTH_MODE: process.env.AUTH_MODE || undefined,
    PROVIDER_MODE: process.env.PROVIDER_MODE || undefined,
    DUFFEL_ACCESS_TOKEN: process.env.DUFFEL_ACCESS_TOKEN || undefined,
    FX_LIVE: process.env.FX_LIVE || undefined,
  });
  const duffelEnabled =
    parsed.PROVIDER_MODE === 'duffel_test' &&
    !!parsed.DUFFEL_ACCESS_TOKEN?.startsWith('duffel_test_');
  return { ...parsed, duffelEnabled };
}
