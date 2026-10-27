import 'server-only';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
/** Verified working on 27 Oct 2026 for this key; the 2.5 family is closed to new users. */
export const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash'];
const TIMEOUT_MS = 12_000;

export type GeminiResult =
  { ok: true; paragraphs: string[]; model: string } | { ok: false; reason: string };

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
              properties: { paragraphs: { type: 'array', items: { type: 'string' } } },
              required: ['paragraphs'],
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
      const parsed = JSON.parse(text) as { paragraphs?: unknown };
      if (
        !Array.isArray(parsed.paragraphs) ||
        !parsed.paragraphs.every((p) => typeof p === 'string')
      )
        return { ok: false, reason: 'malformed output' };
      return {
        ok: true,
        paragraphs: (parsed.paragraphs as string[]).map((p) => p.trim()).filter(Boolean),
        model,
      };
    } catch (e) {
      lastReason =
        (e as Error).name === 'TimeoutError'
          ? 'timeout'
          : (e as Error).name === 'SyntaxError'
            ? 'malformed output'
            : 'network error';
      if (lastReason === 'malformed output') return { ok: false, reason: lastReason };
    }
  }
  return { ok: false, reason: lastReason };
}
