// Fails the build if the single-file game grows past the 2 MB budget (Ai Kids Games site rule).
import { statSync } from 'node:fs';

const LIMIT = 2 * 1000 * 1000; // bytes ("under 2 MB", counted strictly)
const file = process.argv[2] ?? 'dist/index.html';
const size = statSync(file).size;
const pct = ((size / LIMIT) * 100).toFixed(1);
console.log(`${file}: ${(size / 1000).toFixed(1)} kB of ${LIMIT / 1000} kB (${pct} %)`);
if (size >= LIMIT) {
  console.error(`✗ ${file} is over the 2 MB budget`);
  process.exit(1);
}
