// The game contract, checked on every build: one self-contained HTML file under the size
// budget, with nothing loaded from anywhere else.
import { readdirSync, readFileSync, statSync } from 'node:fs';

const MAX = 2 * 1024 * 1024;
const files = readdirSync('dist');
const html = readFileSync('dist/index.html', 'utf8');
const size = statSync('dist/index.html').size;
const problems = [];
if (files.length !== 1 || files[0] !== 'index.html') problems.push(`dist/ must only contain index.html, found: ${files.join(', ')}`);
if (size > MAX) problems.push(`dist/index.html is ${(size / 1048576).toFixed(2)} MB (budget 2 MB)`);
const checks = [
  [/<script[^>]+src=/i, 'an external <script src>'],
  [/<link[^>]+href=["'](?!data:)/i, 'an external <link href>'],
  [/@import\s+url/i, 'a CSS @import'],
  [/url\(\s*["']?https?:/i, 'a CSS url() to another site'],
  [/\bimport\(\s*["'`]/, 'a dynamic import()'],
  [/new\s+Worker\(/, 'a Web Worker file'],
  [/navigator\.sendBeacon|new\s+WebSocket|new\s+EventSource/, 'a network channel'],
];
for (const [pattern, what] of checks) if (pattern.test(html)) problems.push(`found ${what}`);
console.log(`dist/index.html: ${(size / 1024).toFixed(1)} KB`);
if (problems.length) {
  console.error(`Build check failed:\n - ${problems.join('\n - ')}`);
  process.exit(1);
}
console.log('Build check passed: one self-contained file.');
