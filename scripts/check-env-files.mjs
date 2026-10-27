// .env.example must be tracked (not ignored); every other .env* file must be ignored.
import { execSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

const isIgnored = (f) => {
  try {
    execSync(`git check-ignore -q "${f}"`);
    return true;
  } catch {
    return false;
  }
};

const errors = [];
if (isIgnored('.env.example')) errors.push('.env.example is ignored by .gitignore');
for (const probe of ['.env', '.env.local', '.env.production', '.env.development.local']) {
  if (!isIgnored(probe)) errors.push(`${probe} would NOT be ignored`);
}
for (const f of readdirSync('.').filter((n) => n.startsWith('.env') && n !== '.env.example')) {
  if (!isIgnored(f)) errors.push(`${f} exists and is not ignored`);
}

if (errors.length) {
  console.error(`Env file check FAILED:\n${errors.join('\n')}`);
  process.exit(1);
}
console.log('Env file check passed: .env.example tracked-eligible; all other .env* ignored.');
