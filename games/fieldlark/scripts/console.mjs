// Open the built game and print console errors and warnings (a quick check after shader changes).
//   node scripts/console.mjs "<query>"
import { chromium } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const query = process.argv[2] ?? 'scene=styleframe&quality=low';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
const seen = new Set();
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') { const t = m.text().slice(0, 1500); if (!seen.has(t)) { seen.add(t); console.log(`[${m.type()}] ${t}`); } } });
page.on('pageerror', e => console.log(`[pageerror] ${e.message}`));
await page.goto(`${pathToFileURL(resolve('dist/index.html')).href}?${query}`);
await page.waitForTimeout(4000);
console.log('done', JSON.stringify(await page.evaluate(() => { const s = window.__fieldlark?.snapshot?.(); return s && { draws: s.drawCalls, tris: s.triangles, programs: s.programs }; })));
await browser.close();
