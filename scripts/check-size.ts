// Fail when the single-file build is over the 2 MB limit (run after `npm run build`).
import { statSync } from 'node:fs';

const LIMIT = 2 * 1024 * 1024;
const bytes = statSync('dist/index.html').size;
const mb = (n: number) => (n / 1024 / 1024).toFixed(2);
console.log(`dist/index.html: ${(bytes / 1024).toFixed(1)} KB (${mb(bytes)} MB of ${mb(LIMIT)} MB)`);
if (bytes > LIMIT) {
  console.error('Build is over the 2 MB limit.');
  process.exit(1);
}
