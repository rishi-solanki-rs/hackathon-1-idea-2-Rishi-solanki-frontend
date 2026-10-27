// Real-provider connectivity check. Prints status codes and shapes only, never secret values.
// Usage: node --env-file=.env.local scripts/live/check-connections.mjs
const env = process.env;
const present = (k) => (env[k] ? `set (length ${env[k].length})` : 'MISSING');
for (const k of [
  'DUFFEL_ACCESS_TOKEN',
  'GEMINI_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_DB_PASSWORD',
])
  console.log(`${k}: ${present(k)}`);

async function timed(label, fn) {
  const t = Date.now();
  try {
    const r = await fn();
    console.log(`${label}: ${r} (${Date.now() - t} ms)`);
  } catch (e) {
    console.log(`${label}: ERROR ${e.name}: ${e.message} (${Date.now() - t} ms)`);
  }
}

const day = new Date(Date.now() + 45 * 864e5).toISOString().slice(0, 10);

await timed('duffel offer_request', async () => {
  const res = await fetch(
    'https://api.duffel.com/air/offer_requests?return_offers=true&supplier_timeout=8000',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.DUFFEL_ACCESS_TOKEN}`,
        'Duffel-Version': 'v2',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        data: {
          cabin_class: 'economy',
          slices: [{ origin: 'MAD', destination: 'LHR', departure_date: day }],
          passengers: [{ type: 'adult' }],
        },
      }),
      signal: AbortSignal.timeout(25000),
    },
  );
  const j = await res.json();
  const offers = j.data?.offers ?? [];
  return `HTTP ${res.status}, live_mode=${j.data?.live_mode}, offers=${offers.length}, owners=${[...new Set(offers.map((o) => o.owner?.name))].slice(0, 5).join('|')}, currency=${offers[0]?.total_currency}, err=${j.errors?.[0]?.code ?? ''}`;
});

const prompt = {
  contents: [{ role: 'user', parts: [{ text: 'Reply with the single word: ok' }] }],
  generationConfig: { maxOutputTokens: 20 },
};
for (const model of ['gemini-2.5-flash']) {
  await timed(`gemini generativelanguage ${model}`, async () => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'x-goog-api-key': env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(prompt),
        signal: AbortSignal.timeout(20000),
      },
    );
    const j = await res.json();
    return `HTTP ${res.status} ${j.error?.status ?? ''} text=${JSON.stringify(j.candidates?.[0]?.content?.parts?.[0]?.text ?? '').slice(0, 30)}`;
  });
  await timed(`gemini vertex-express ${model}`, async () => {
    const res = await fetch(
      `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prompt),
        signal: AbortSignal.timeout(20000),
      },
    );
    const j = await res.json();
    return `HTTP ${res.status} ${j.error?.status ?? ''} text=${JSON.stringify(j.candidates?.[0]?.content?.parts?.[0]?.text ?? '').slice(0, 30)}`;
  });
}

const sb = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
await timed('supabase auth health', async () => {
  const res = await fetch(`${sb}/auth/v1/health`, {
    headers: { apikey: key },
    signal: AbortSignal.timeout(15000),
  });
  return `HTTP ${res.status}`;
});
await timed('supabase auth settings', async () => {
  const res = await fetch(`${sb}/auth/v1/settings`, {
    headers: { apikey: key },
    signal: AbortSignal.timeout(15000),
  });
  const j = await res.json();
  return `HTTP ${res.status} anonymous_users=${j.external?.anonymous_users} email=${j.external?.email} mailer_autoconfirm=${j.mailer_autoconfirm}`;
});
await timed('supabase rest airports', async () => {
  const res = await fetch(`${sb}/rest/v1/airports?select=iata&limit=1`, {
    headers: { apikey: key },
    signal: AbortSignal.timeout(15000),
  });
  const t = await res.text();
  return `HTTP ${res.status} body=${t.slice(0, 120)}`;
});
