// Screenshot the built game from file:// (review helper, not a test):
//   node scripts/shot.mjs "<query>" out.png [width] [height] [waitMs]
// Run `npm run build` first. Uses Playwright's Chromium; check scripts/quiet-check.mjs first.
import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const [query = '', out = 'reports/tmp/shot.png', width = '1280', height = '720', wait = '1500'] = process.argv.slice(2);
const url = pathToFileURL(resolve('dist/index.html')).href + (query ? `?${query.replace(/^\?/, '')}` : '');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Number(width), height: Number(height) }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(url);
await page.waitForFunction(() => (window.__agentmon?.snapshot().frames ?? 0) > 5, null, { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(Number(wait));
await page.screenshot({ path: out });
console.log(JSON.stringify(await page.evaluate(() => window.__agentmon?.snapshot())), errors.length ? `errors: ${errors.join(' | ')}` : 'no errors');
await browser.close();
