// Configures Supabase Auth for the demo via the Management API. Prints only non-secret fields.
// Usage: node --env-file=.env.local scripts/live/configure-auth.mjs [--apply]
const ref = process.env.SUPABASE_PROJECT_REF;
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!ref || !token) throw new Error('SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN are required');
const url = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
const show = (c) =>
  console.log(
    JSON.stringify(
      {
        site_url: c.site_url,
        uri_allow_list: c.uri_allow_list,
        mailer_autoconfirm: c.mailer_autoconfirm,
        external_email_enabled: c.external_email_enabled,
        external_anonymous_users_enabled: c.external_anonymous_users_enabled,
        password_min_length: c.password_min_length,
        disable_signup: c.disable_signup,
      },
      null,
      1,
    ),
  );

const before = await (await fetch(url, { headers })).json();
console.log('before:');
show(before);
if (process.argv.includes('--apply')) {
  const res = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      site_url: 'https://a-una-milla-demo.vercel.app',
      uri_allow_list:
        'http://localhost:3000/**,http://localhost:3200/**,http://localhost:3400/**,https://a-una-milla-demo.vercel.app/**,https://a-una-milla-demo-*-rishi-solankis-projects.vercel.app/**',
      mailer_autoconfirm: true,
      external_email_enabled: true,
      external_anonymous_users_enabled: false,
      password_min_length: 8,
      disable_signup: false,
    }),
  });
  console.log('PATCH status', res.status);
  if (!res.ok) console.log((await res.text()).slice(0, 300));
  console.log('after:');
  show(await (await fetch(url, { headers })).json());
}
