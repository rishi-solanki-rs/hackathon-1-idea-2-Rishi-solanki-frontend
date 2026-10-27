// Fails if server-only secrets or server env names leak into the client bundle.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = '.next/static';
if (!existsSync(root)) {
  console.error('No .next/static found. Run `pnpm build` first.');
  process.exit(1);
}

const banned = [
  /duffel_(test|live)_[A-Za-z0-9]/,
  /DUFFEL_ACCESS_TOKEN/,
  /GEMINI_API_KEY/,
  /AQ\.[A-Za-z0-9_-]{40,}/,
  /AIza[0-9A-Za-z_-]{30,}/,
  /sb_secret_[A-Za-z0-9_-]{16,}/,
  /SUPABASE_DB_PASSWORD/,
];
// Also fail if any server-only value from the local env file ended up in the client bundle.
for (const k of ['DUFFEL_ACCESS_TOKEN', 'GEMINI_API_KEY', 'SUPABASE_DB_PASSWORD']) {
  const v = process.env[k];
  if (v && v.length >= 8) banned.push(new RegExp(v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}
const findings = [];
let count = 0;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|css|html|json|map)$/.test(name)) {
      count++;
      const text = readFileSync(p, 'utf8');
      for (const re of banned) if (re.test(text)) findings.push(`${p}: ${re}`);
    }
  }
}
walk(root);

if (findings.length) {
  console.error(`Client bundle check FAILED:\n${findings.join('\n')}`);
  process.exit(1);
}
console.log(`Client bundle check passed: ${count} files, no server secrets or server env names.`);
