import 'server-only';
import { NextResponse } from 'next/server';
import type { z } from 'zod';
import type { ErrorCode } from '@/contracts/common';

const STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNPROCESSABLE: 422,
  RATE_LIMITED: 429,
  OFFER_EXPIRED: 410,
  OFFER_NOT_FOUND: 404,
  PRICE_CHANGED: 409,
  PROVIDER_ERROR: 502,
  TEST_MODE_REQUIRED: 503,
  BOOKING_REJECTED: 422,
  OUTCOME_UNKNOWN: 504,
  INTERNAL: 500,
};

export function errorResponse(
  code: ErrorCode,
  message: string,
  details?: unknown,
  headers?: HeadersInit,
) {
  return NextResponse.json(
    { ok: false, error: { code, message, ...(details === undefined ? {} : { details }) } },
    { status: STATUS[code], headers: { 'Cache-Control': 'no-store', ...headers } },
  );
}

export const okResponse = (body: unknown) =>
  NextResponse.json(body, { status: 200, headers: { 'Cache-Control': 'no-store' } });

export async function readJson(
  req: Request,
): Promise<{ ok: true; value: unknown } | { ok: false }> {
  try {
    const text = await req.text();
    if (text.length > 50_000) return { ok: false };
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

export function zodIssues(e: z.ZodError) {
  return e.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
}

/** Best effort, per instance (doc 04: in-memory windows are per serverless instance). */
const windows = new Map<string, { start: number; count: number }>();
const DEFAULT_LIMIT = Math.max(1, Number(process.env.RATE_LIMIT_PER_MIN) || 20);

export function rateLimit(
  key: string,
  limit = DEFAULT_LIMIT,
  windowMs = 60_000,
): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const w = windows.get(key);
  if (!w || now - w.start > windowMs) {
    windows.set(key, { start: now, count: 1 });
    if (windows.size > 5000) windows.clear();
    return { ok: true };
  }
  w.count++;
  if (w.count > limit)
    return { ok: false, retryAfter: Math.ceil((w.start + windowMs - now) / 1000) };
  return { ok: true };
}

export const clientKey = (req: Request) =>
  req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
  req.headers.get('x-real-ip') ||
  'local';
