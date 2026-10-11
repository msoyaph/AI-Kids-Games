// Quick smoke check: open dist/index.html via file:// and report errors / network requests.
import { chromium } from '@playwright/test';
import { readdirSync } from 'node:fs';

const files = readdirSync('dist');
if (files.length !== 1 || files[0] !== 'index.html') {
  console.error('dist/ must contain exactly one file (index.html), found:', files);
  process.exit(1);
}
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
const requests = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
page.on('request', (r) => {
  const u = r.url();
  if (!u.startsWith('file://') && !u.startsWith('data:') && !u.startsWith('blob:')) requests.push(u);
});
await page.goto('file://' + process.cwd() + '/dist/index.html');
await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 20000 });
await page.waitForTimeout(500);
await browser.close();
console.log(JSON.stringify({ errors, externalRequests: requests }, null, 2));
process.exit(errors.length || requests.length ? 1 : 0);
