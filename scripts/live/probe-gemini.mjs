// Diagnoses which Gemini endpoint/model the key works with. Prints error messages, never the key.
const key = process.env.GEMINI_API_KEY;
const strip = (s) =>
  String(s ?? '')
    .replaceAll(key, '[key]')
    .slice(0, 300);
async function get(url, headers = {}) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
  const j = await res.json().catch(() => ({}));
  return { status: res.status, j };
}
const list = await get('https://generativelanguage.googleapis.com/v1beta/models?pageSize=100', {
  'x-goog-api-key': key,
});
console.log('list models:', list.status, strip(list.j.error?.message));
if (list.j.models)
  console.log(
    list.j.models
      .map((m) => m.name)
      .filter((n) => /gemini/.test(n))
      .join(', '),
  );

const body = JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Reply with: ok' }] }] });
for (const model of [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-flash-latest',
  'gemini-3-flash-preview',
  'gemini-2.0-flash',
]) {
  for (const [label, url, headers] of [
    [
      'genlang',
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      { 'x-goog-api-key': key },
    ],
    [
      'vertex',
      `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:generateContent?key=${key}`,
      {},
    ],
  ]) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body,
      signal: AbortSignal.timeout(20000),
    });
    const j = await res.json().catch(() => ({}));
    console.log(
      label,
      model,
      res.status,
      j.error?.status ?? '',
      strip(j.error?.message) || JSON.stringify(j.candidates?.[0]?.content?.parts?.[0]?.text ?? ''),
    );
  }
}
