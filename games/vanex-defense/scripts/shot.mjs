// Dev tool: screenshot the running dev server with an optional setup script.
// usage: node scripts/shot.mjs <url> <out.png> [width] [height] [setupJsFile] [waitMs] [--touch]
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const [url, out, w = '1280', h = '720', setup, wait = '1500', ...flags] = process.argv.slice(2);
const touch = flags.includes('--touch');
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: Number(w), height: Number(h) },
  deviceScaleFactor: 2,
  hasTouch: touch,
  isMobile: touch,
});
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && logs.push(`${m.type()}: ${m.text()}`));
page.on('pageerror', (e) => logs.push(`pageerror: ${e}`));
await page.goto(url);
await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 30000 });
if (setup && setup !== '-') {
  const code = readFileSync(setup, 'utf8');
  const result = await page.evaluate(code);
  if (result !== undefined) console.log('setup:', JSON.stringify(result));
}
await page.waitForTimeout(Number(wait));
await page.screenshot({ path: out });
if (logs.length) console.log(logs.join('\n'));
await browser.close();
