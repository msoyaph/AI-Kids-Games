// Verifies the production build: one self-contained HTML file under the size budget,
// with no external scripts/styles/fonts, dynamic imports or workers.
import { readdirSync, readFileSync, statSync } from 'node:fs';

const MAX = 2.5 * 1024 * 1024;
const files = readdirSync('dist');
const problems = [];
if (files.length !== 1 || files[0] !== 'index.html') problems.push(`dist/ should only contain index.html, found: ${files.join(', ')}`);
const html = readFileSync('dist/index.html', 'utf8');
const size = statSync('dist/index.html').size;
if (size > MAX) problems.push(`dist/index.html is ${(size / 1048576).toFixed(2)} MB (budget 2.5 MB)`);
const checks = [
  [/<script[^>]+src=/i, 'external <script src>'],
  [/<link[^>]+href=["'](?!data:)/i, 'external <link href>'],
  [/@import\s+url/i, 'CSS @import'],
  [/@font-face/i, 'web font'],
  [/\bimport\(\s*["'`]/, 'dynamic import()'],
  [/new\s+Worker\(/, 'Web Worker'],
  [/navigator\.sendBeacon/, 'sendBeacon'],
  [/new\s+WebSocket/, 'WebSocket'],
];
for (const [re, what] of checks) if (re.test(html)) problems.push(`found ${what}`);
console.log(`dist/index.html: ${(size / 1024).toFixed(1)} KB (${((size / MAX) * 100).toFixed(1)}% of budget)`);
if (problems.length) {
  console.error('Build check FAILED:\n - ' + problems.join('\n - '));
  process.exit(1);
}
console.log('Build check passed: single self-contained file.');
