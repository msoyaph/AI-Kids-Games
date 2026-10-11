// Screenshots of every preview scene via the ?scene= route (the same URLs the Ai Kids Games
// `npm run capture-previews` step can use). Usage: node scripts/capture.mjs [--gpu] [--hud=0] [--zoom=-1] [--out=docs/screenshots]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const gpu = process.argv.includes('--gpu');
const out = resolve(arg('out', 'docs/screenshots'));
const hud = arg('hud', '1');
const zoom = arg('zoom', '-1');
const scenes = ['spring', 'summer', 'autumn', 'winter', 'farmHarvest', 'town', 'festival', 'mine', 'fishingSunset', 'title'];
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: gpu ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
for (const s of scenes) {
  await page.goto(`${pathToFileURL(resolve('dist/index.html')).href}?scene=${s}${hud === '0' ? '&hud=0' : ''}${zoom !== '0' ? `&zoom=${zoom}` : ''}`);
  await page.waitForFunction((n) => window.__cliffvalley?.ready && (n === 'title' || window.__cliffvalley.info?.mode === 'play'), s, { timeout: 60000 });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${out}/${s}.png` });
  console.log(`captured ${s}`);
}
await browser.close();
if (errors.length) {
  console.error(errors);
  process.exit(1);
}
