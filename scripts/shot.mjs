// Quick screenshot helper for visual review.
// usage: node scripts/shot.mjs <url-path-and-query> <out.png> [width] [height] [waitMs] [js-to-run]
import { chromium } from '@playwright/test';

const [, , path = '/?debug', out = 'shot.png', w = '1280', h = '720', waitMs = '4000', js = ''] = process.argv;
const base = process.env.BASE ?? 'http://localhost:5391';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(base + path);
if (process.env.NEWGAME) {
  // Start a fresh game in slot 0 so a real session (missions, state) exists.
  await page.getByTestId('btn-play').waitFor({ timeout: 30000 });
  await page.evaluate(() => localStorage.clear());
  await page.getByTestId('btn-play').click({ force: true });
  await page.getByTestId('slot-0').waitFor();
  await page.waitForTimeout(400);
  await page.getByTestId('slot-0').click({ force: true });
  await page.getByTestId('name-input').waitFor();
  await page.waitForTimeout(300);
  await page.getByTestId('name-input').fill('Nova');
  await page.getByTestId('btn-start').click({ force: true });
  await page.getByTestId('hub-banner').waitFor({ timeout: 30000 });
  for (let i = 0; i < 30; i++) {
    const d = page.getByTestId('dialogue');
    if (!(await d.isVisible().catch(() => false))) break;
    await d.click({ force: true }).catch(() => {});
    await page.waitForTimeout(80);
  }
}
await page.waitForTimeout(Number(waitMs));
if (js) {
  const r = await page.evaluate(js);
  if (r !== undefined) console.log('js:', JSON.stringify(r));
  await page.waitForTimeout(600);
}
await page.screenshot({ path: out });
if (errors.length) console.log(errors.slice(0, 10).join('\n'));
await browser.close();
