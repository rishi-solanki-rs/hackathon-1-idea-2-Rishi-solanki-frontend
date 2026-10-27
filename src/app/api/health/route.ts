import { connection, NextResponse } from 'next/server';
import { serverEnv } from '@/server/env';
import { ENGINE_VERSION } from '@/server/search';

export async function GET() {
  await connection();
  const env = serverEnv();
  return NextResponse.json(
    {
      ok: true,
      mode: { auth: env.AUTH_MODE, provider: env.duffelEnabled ? 'duffel_test' : 'fixture' },
      version: ENGINE_VERSION,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
