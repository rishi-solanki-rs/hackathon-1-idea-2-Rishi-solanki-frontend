// Read-only: counts leftover live-test users. Usage: node --env-file=.env.local scripts/live/sql-count-test-users.mjs
const res = await fetch(
  `https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/database/query`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: "select count(*)::int as n from auth.users where email like 'aum-live-%'",
    }),
  },
);
console.log('leftover test users:', JSON.stringify(await res.json()));
