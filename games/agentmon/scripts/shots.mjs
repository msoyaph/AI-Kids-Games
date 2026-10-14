// Several screenshots of the built game from file:// in one browser (review helper, not a test):
//   node scripts/shots.mjs "<query>" out.png ["<query>" out.png …]
// Env: W, H (viewport, default 1280×720), WAIT (ms after the capture is ready, default 400).
// Capture routes report `ready` in the hook; other pages just wait for a few frames.
// Run `npm run build` first; run it through `sh scripts/when-quiet.sh shots …`.
import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const width = Number(process.env.W ?? 1280), height = Number(process.env.H ?? 720), wait = Number(process.env.WAIT ?? 400);
const browser = await chromium.launch();
for (let i = 0; i + 1 < args.length; i += 2) {
  const [query, out] = [args[i], args[i + 1]];
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(pathToFileURL(resolve('dist/index.html')).href + (query ? `?${query.replace(/^\?/, '')}` : ''));
  await page.waitForFunction(() => (window.__agentmon?.snapshot().frames ?? 0) > 5, null, { timeout: 20000 }).catch(() => {});
  await page.waitForFunction(() => window.__agentmon?.snapshot().ready !== false, null, { timeout: 15000 }).catch(() => errors.push('never ready'));
  await page.waitForTimeout(wait);
  await page.screenshot({ path: out });
  const s = await page.evaluate(() => window.__agentmon?.snapshot());
  console.log(out, s?.scene, s?.capture ?? '', errors.length ? `errors: ${errors.join(' | ')}` : 'ok');
  await page.close();
}
await browser.close();
