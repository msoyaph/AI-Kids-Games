/**
 * Build guard: dist/index.html must be a single self-contained file under 1.5 MB that makes
 * no network requests (no external script/link/img/fetch URLs).
 * Usage: npm run build && npm run check-size
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';

const LIMIT = 1_500_000;
const html = readFileSync('dist/index.html', 'utf8');
const bytes = statSync('dist/index.html').size;
const extra = readdirSync('dist').filter((f) => f !== 'index.html');
const problems: string[] = [];

if (bytes > LIMIT) problems.push(`dist/index.html is ${bytes} bytes (limit ${LIMIT})`);
if (extra.length) problems.push(`dist/ contains extra files: ${extra.join(', ')}`);
// External resource references: <script src>, <link href>, <img src>, CSS url(), fetch/import of http(s)
const external = [
  ...html.matchAll(/\b(?:src|href)\s*=\s*["']?(https?:)?\/\/[^"'\s>]+/gi),
  ...html.matchAll(/url\(\s*["']?https?:\/\/[^)]+\)/gi),
  ...html.matchAll(/\b(?:fetch|import)\s*\(\s*["'`]https?:\/\/[^"'`]+/gi),
].map((m) => m[0]);
if (external.length) problems.push(`external references found:\n  ${external.slice(0, 10).join('\n  ')}`);

const kb = (bytes / 1024).toFixed(1);
if (problems.length) {
  console.error(`✗ build check failed (${kb} KB):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`✓ dist/index.html ${kb} KB (limit ${(LIMIT / 1024).toFixed(0)} KB), single file, no external references`);
