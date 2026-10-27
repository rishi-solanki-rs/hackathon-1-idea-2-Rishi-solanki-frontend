import 'server-only';
import type { ExplainSections } from '@/domain/explainGuard';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
/** Verified working on 27 Oct 2026 for this key; the 2.5 family is closed to new users. */
export const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash'];
const TIMEOUT_MS = 12_000;

export type GeminiResult =
  | { ok: true; paragraphs: string[]; sections: ExplainSections; model: string }
  | { ok: false; reason: string };

const cleanArr = (x: unknown): string[] | null =>
  Array.isArray(x) && x.every((i) => typeof i === 'string')
    ? (x as string[]).map((s) => s.trim()).filter(Boolean)
    : null;

/** Server-only call. The key is read here and never returned, logged or sent to the browser. */
export async function generateExplanation(
  prompt: { system: string; user: string },
  fetchImpl: typeof fetch = fetch,
): Promise<GeminiResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, reason: 'not configured' };
  let lastReason = 'no model answered';
  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetchImpl(`${ENDPOINT}/${model}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: prompt.system }] },
          contents: [{ role: 'user', parts: [{ text: prompt.user }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1200,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                summary: { type: 'string' },
                why: { type: 'array', items: { type: 'string' } },
                doNow: { type: 'array', items: { type: 'string' } },
                later: { type: 'array', items: { type: 'string' } },
                caveats: { type: 'array', items: { type: 'string' } },
              },
              required: ['summary', 'why', 'doNow', 'later', 'caveats'],
            },
          },
        }),
      });
      if (!res.ok) {
        lastReason = `HTTP ${res.status}`;
        if (res.status === 429 || res.status >= 500 || res.status === 404) continue;
        return { ok: false, reason: lastReason };
      }
      const j = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
      const parsed = JSON.parse(text) as {
        summary?: unknown;
        why?: unknown;
        doNow?: unknown;
        later?: unknown;
        caveats?: unknown;
        paragraphs?: unknown;
      };
      if (typeof parsed.summary === 'string') {
        const why = cleanArr(parsed.why) ?? [];
        const doNow = cleanArr(parsed.doNow) ?? [];
        const later = cleanArr(parsed.later) ?? [];
        const caveats = cleanArr(parsed.caveats) ?? [];
        const summary = parsed.summary.trim();
        const paragraphs = [summary, ...why, ...doNow, ...later, ...caveats].filter(Boolean);
        if (!summary || !paragraphs.length) return { ok: false, reason: 'malformed output' };
        return {
          ok: true,
          paragraphs,
          sections: { summary, why, doNow, later, caveats },
          model,
        };
      }
      const paras = cleanArr(parsed.paragraphs);
      if (!paras || !paras.length) return { ok: false, reason: 'malformed output' };
      return {
        ok: true,
        paragraphs: paras,
        sections: {
          summary: paras[0]!,
          why: paras.slice(1, 2),
          doNow: paras.slice(2, 3),
          later: [],
          caveats: paras.slice(3),
        },
        model,
      };
    } catch (e) {
      lastReason =
        (e as Error).name === 'TimeoutError' || (e as Error).name === 'AbortError'
          ? 'timeout'
          : (e as Error).name === 'SyntaxError'
            ? 'malformed output'
            : 'network error';
      if (lastReason === 'malformed output') return { ok: false, reason: lastReason };
    }
  }
  return { ok: false, reason: lastReason };
}
