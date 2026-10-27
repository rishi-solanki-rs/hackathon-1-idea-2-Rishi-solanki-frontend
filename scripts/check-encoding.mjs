// Fails if any tracked text file contains U+FFFD (a character destroyed by a wrong-encoding write).
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execSync('git ls-files --cached --others --exclude-standard', { encoding: 'utf8' })
  .split('\n')
  .filter((f) => /\.(ts|tsx|mjs|js|css|md|json|sql|ya?ml)$/.test(f));
const bad = files.filter((f) => {
  try {
    return readFileSync(f, 'utf8').includes('\uFFFD');
  } catch {
    return false;
  }
});
if (bad.length) {
  console.error(`Encoding check FAILED (U+FFFD found):\n${bad.join('\n')}`);
  process.exit(1);
}
console.log(`Encoding check passed: ${files.length} files.`);
