// Quick smoke check: open dist/index.html via file:// and over http (like the
// site's iframe) and report errors / network requests. Uses full Chromium,
// which (unlike the headless shell) also makes browser-initiated requests
// such as /favicon.ico.
import { chromium } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';

const files = readdirSync('dist');
if (files.length !== 1 || files[0] !== 'index.html') {
  console.error('dist/ must contain exactly one file (index.html), found:', files);
  process.exit(1);
}
const html = readFileSync('dist/index.html');
// size budget: the whole game is one file and must stay under 2 MB
const MAX_BYTES = 2 * 1024 * 1024;
if (html.length > MAX_BYTES) {
  console.error(`dist/index.html is ${(html.length / 1024).toFixed(0)} KB — over the ${MAX_BYTES / 1024} KB budget`);
  process.exit(1);
}
// tiny static server: only the page itself exists
const served = [];
const server = createServer((req, res) => {
  served.push(req.url);
  if (req.url === '/' || req.url?.startsWith('/?')) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);
  } else {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ channel: 'chromium' });
const errors = [];
const requests = [];
for (const url of ['file://' + process.cwd() + '/dist/index.html', origin + '/']) {
  const page = await browser.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(`${url}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${url}: ${e}`));
  page.on('request', (r) => {
    const u = r.url();
    if (u === new URL(url).href || u.startsWith('data:') || u.startsWith('blob:')) return;
    requests.push(u);
  });
  await page.goto(url);
  await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 20000 });
  await page.waitForTimeout(800);
  await page.close();
}
await browser.close();
server.close();
console.log(JSON.stringify({ sizeKB: Math.round(html.length / 1024), errors, externalRequests: requests, httpPathsServed: served }, null, 2));
process.exit(errors.length || requests.length ? 1 : 0);
