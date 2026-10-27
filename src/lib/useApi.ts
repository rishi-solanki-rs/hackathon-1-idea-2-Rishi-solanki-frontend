'use client';

import { useEffect, useState } from 'react';
import type { z } from 'zod';

export type ApiError = { code: string; message: string; details?: unknown };
export type ApiState<T> =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; error: ApiError }
  | { kind: 'success'; data: T; fromCache: boolean };

const CACHE_TTL_MS = 10 * 60_000;

/** POSTs `body` to `url` once per `key`, validates the response, and caches it in sessionStorage. */
export function useCachedPost<S extends z.ZodTypeAny>(
  key: string | null,
  url: string,
  body: unknown,
  schema: S,
  expiresAt: (data: z.infer<S>) => number | null,
): [ApiState<z.infer<S>>, () => void] {
  const [state, setState] = useState<ApiState<z.infer<S>>>({ kind: 'idle' });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!key) return;
    const cacheKey = `aum.cache.${key}`;
    let cancelled = false;
    try {
      const raw = window.sessionStorage.getItem(cacheKey);
      if (raw && nonce === 0) {
        const { at, value } = JSON.parse(raw) as { at: number; value: unknown };
        const parsed = schema.safeParse(value);
        const exp = parsed.success ? expiresAt(parsed.data) : null;
        if (
          parsed.success &&
          Date.now() - at < CACHE_TTL_MS &&
          (exp === null || exp - 60_000 > Date.now())
        ) {
          queueMicrotask(
            () => !cancelled && setState({ kind: 'success', data: parsed.data, fromCache: true }),
          );
          return () => {
            cancelled = true;
          };
        }
      }
    } catch {
      /* ignore cache errors */
    }
    queueMicrotask(() => !cancelled && setState({ kind: 'loading' }));
    const ctrl = new AbortController();
    fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !json?.ok) {
          setState({
            kind: 'error',
            error: json?.error ?? {
              code: 'INTERNAL',
              message: `Request failed (HTTP ${res.status}).`,
            },
          });
          return;
        }
        const parsed = schema.safeParse(json);
        if (!parsed.success) {
          setState({
            kind: 'error',
            error: { code: 'INTERNAL', message: 'The server sent an unexpected response.' },
          });
          return;
        }
        try {
          window.sessionStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), value: json }));
        } catch {
          /* storage full or unavailable */
        }
        setState({ kind: 'success', data: parsed.data, fromCache: false });
      })
      .catch((e: Error) => {
        if (cancelled || e.name === 'AbortError') return;
        setState({
          kind: 'error',
          error: {
            code: 'NETWORK',
            message: 'We could not reach the server. Check your connection and try again.',
          },
        });
      });
    return () => {
      cancelled = true;
      ctrl.abort();
    };
    // body is derived from key; re-running on key/nonce change is intended
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce]);

  return [
    state,
    () => {
      try {
        if (key) window.sessionStorage.removeItem(`aum.cache.${key}`);
      } catch {
        /* ignore */
      }
      setNonce((n) => n + 1);
    },
  ];
}
