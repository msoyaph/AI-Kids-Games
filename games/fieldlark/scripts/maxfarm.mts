// The biggest farm a player could build (tests/support/maxFarm.ts), loaded into the real build on the
// GPU at every tier: frame rate, draw calls and triangles at the starting zoom and zoomed right out.
//   npx tsx scripts/maxfarm.mts [out-dir]   (through the quiet check: never alongside other tests)
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { encodeFarm } from '../src/save/save';
import { maxFarm } from '../tests/support/maxFarm';

const out = process.argv[2] ?? 'reports/visual/maxfarm';
mkdirSync(out, { recursive: true });
const farm = maxFarm();
farm.story.introSeen = true;
farm.flags.levelSeen = 40;
for (const k of Object.keys(farm.flags)) if (k.startsWith('tip:')) delete farm.flags[k];
farm.cam = { x: 30, z: 36, yawStep: 0, zoom: 0 };
const save = JSON.stringify(encodeFarm(farm, Date.now()));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const file = pathToFileURL(resolve('dist/index.html')).href;
const rows: string[] = [];
for (const [device, ctxOpts] of [['phone', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }], ['desktop', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }]] as const) {
  for (const tier of ['low', 'medium', 'high']) {
    for (const [suffix, zoom] of [['', null], ['-out', 32]] as const) {
      const ctx = await browser.newContext(ctxOpts);
      // tsx names inner functions with a helper the page doesn't have (Tuck Pop's pitfall): give it one
      await ctx.addInitScript('globalThis.__name = (f) => f;');
      await ctx.addInitScript(text => { try { localStorage.setItem('fieldlark.save', text); } catch { /* ignore */ } }, save);
      const page = await ctx.newPage();
      await page.goto(`${file}?quality=${tier}`);
      await page.getByRole('button', { name: /farming/i }).click();
      await page.waitForFunction(() => (window as unknown as { __fieldlark?: { snapshot(): { screen: string } } }).__fieldlark?.snapshot().screen === 'farm', null, { timeout: 30000 });
      for (let i = 0; i < 6; i++) { const b = page.locator('.story-card button.primary, .tip-card button'); if (await b.count()) await b.first().click(); else break; }
      if (zoom) for (let i = 0; i < 6; i++) await page.getByRole('button', { name: 'Zoom out' }).click();
      await page.waitForTimeout(3000);
      const fps = await page.evaluate(() => new Promise<number>(done => { let n = 0; const t0 = performance.now(); const tick = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(tick); else done(Math.round((n * 1000) / (performance.now() - t0))); }; requestAnimationFrame(tick); }));
      const s = await page.evaluate(() => (window as unknown as { __fieldlark: { snapshot(): Record<string, unknown> } }).__fieldlark.snapshot()) as { drawn: { calls: number[]; triangles: number[] }; camera: { zoom: number } };
      await page.screenshot({ path: `${out}/${device}-${tier}${suffix}.png` });
      const line = `${device.padEnd(7)} ${tier.padEnd(6)} ${suffix || 'start'}  zoom=${Math.round(s.camera.zoom)}  fps=${fps}  draws=${s.drawn.calls[0]} (max ${s.drawn.calls[1]})  tris=${Math.round(s.drawn.triangles[0] / 1000)}k (max ${Math.round(s.drawn.triangles[1] / 1000)}k)`;
      console.log(line);
      rows.push(line);
      await ctx.close();
    }
  }
}
writeFileSync(`${out}/stats.txt`, rows.join('\n') + '\n');
await browser.close();
