// The game contract, checked on every build: one self-contained HTML file under 2,500,000 bytes
// (Agentmon's budget; a warning from 2,200,000), with nothing loaded from anywhere else.
import { readdirSync, readFileSync, statSync } from 'node:fs';

const MAX = 2_500_000, WARN = 2_200_000;
const files = readdirSync('dist');
const html = readFileSync('dist/index.html', 'utf8');
const size = statSync('dist/index.html').size;
const problems = [];
if (files.length !== 1 || files[0] !== 'index.html') problems.push(`dist/ must only contain index.html, found: ${files.join(', ')}`);
if (size >= MAX) problems.push(`dist/index.html is ${size} bytes (budget: under 2,500,000)`);
else if (size >= WARN) console.warn(`Warning: dist/index.html is ${size} bytes, close to the 2,500,000-byte budget.`);
const checks = [
  [/<script[^>]+src=/i, 'an external <script src>'],
  [/<link[^>]+href=["'](?!data:)/i, 'an external <link href>'],
  [/@import\s+url/i, 'a CSS @import'],
  [/url\(\s*["']?https?:/i, 'a CSS url() to another site'],
  [/\bimport\(\s*["'`]/, 'a dynamic import()'],
  [/new\s+Worker\(/, 'a Web Worker file'],
  [/navigator\.sendBeacon|new\s+WebSocket|new\s+EventSource|\bfetch\(\s*["'`]https?:/, 'a network channel'],
];
for (const [pattern, what] of checks) if (pattern.test(html)) problems.push(`found ${what}`);
console.log(`dist/index.html: ${size} bytes (${(size / 1048576).toFixed(2)} MiB)`);
if (problems.length) {
  console.error(`Build check failed:\n - ${problems.join('\n - ')}`);
  process.exit(1);
}
console.log('Build check passed: one self-contained file.');
