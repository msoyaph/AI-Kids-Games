// Screenshots of the built game (dist/index.html, opened from file://) on the real GPU, for visual
// reviews: every tier on a phone and a desktop.
//   node scripts/shots.mjs <out-dir> "<query>" [tiers=low,medium,high] [devices=phone,desktop]
// Run it through when-quiet.sh ("shots"), never alongside another session's tests.
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [out = 'reports/visual/tmp', query = 'scene=styleframe', tiersArg = 'low,medium,high', devicesArg = 'phone,desktop'] = process.argv.slice(2);
const DEVICES = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
};
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const file = pathToFileURL(resolve('dist/index.html')).href;
const stats = {};
for (const device of devicesArg.split(',')) {
  const ctx = await browser.newContext(DEVICES[device]);
  for (const tier of tiersArg.split(',')) {
    // the starting view, then zoomed all the way out over the same spot
    for (const [suffix, extra] of [['', ''], ['-out', '&zoom=32']]) {
      const page = await ctx.newPage();
      await page.goto(`${file}?${query}${extra}&quality=${tier}`);
      await page.waitForFunction(() => window.__farmwip?.snapshot?.().screen === 'farm', null, { timeout: 20000 });
      await page.waitForTimeout(2500);
      // frame rate over two seconds, measured here rather than the game's smoothed number
      const fps = await page.evaluate(() => new Promise(done => { let n = 0; const t0 = performance.now(); const tick = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(tick); else done(Math.round((n * 1000) / (performance.now() - t0))); }; requestAnimationFrame(tick); }));
      const s = await page.evaluate(() => window.__farmwip.snapshot());
      const heap = await page.evaluate(() => Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1e6));
      const path = `${out}/${device}-${tier}${suffix}.png`;
      await page.screenshot({ path });
      // steady frames (the shadow map is only redrawn now and then; the busiest frame includes it)
      const d = s.drawn ?? { calls: [s.drawCalls, s.drawCalls], triangles: [s.triangles, s.triangles] };
      console.log(`${path}  tier=${s.quality} zoom=${Math.round(s.camera.zoom)} draws=${d.calls[0]}(max ${d.calls[1]}) tris=${Math.round(d.triangles[0] / 1000)}k(max ${Math.round(d.triangles[1] / 1000)}k) fps=${fps} geometries=${s.geometries} textures=${s.textures} programs=${s.programs} gpuMB≈${s.gpuMB} heapMB=${heap}`);
      stats[`${device}-${tier}${suffix}`] = { tier: s.quality, zoom: Math.round(s.camera.zoom), draws: d.calls[0], drawsMax: d.calls[1], tris: d.triangles[0], trisMax: d.triangles[1], fps, geometries: s.geometries, textures: s.textures, programs: s.programs, gpuMB: s.gpuMB, heapMB: heap };
      await page.close();
    }
  }
  await ctx.close();
}
await browser.close();
writeFileSync(`${out}/stats.json`, JSON.stringify(stats, null, 2));
