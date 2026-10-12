// Runs the in-game benchmark (?bench=1) in Chromium on desktop, tablet and phone profiles.
// Tablet/phone use 4x CPU throttling (a mid-range device profile). Usage: node scripts/perf.mjs [--gpu]
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = 'file://' + resolve('dist/index.html');
const gpu = process.argv.includes('--gpu');
const cpuArg = process.argv.find((a) => a.startsWith('--cpu='));
const throttle = cpuArg ? Number(cpuArg.slice(6)) : 4;
const profiles = [
  { name: 'desktop', viewport: { width: 1280, height: 800 }, dpr: 1, cpu: 1 },
  { name: `tablet (${throttle}x CPU throttle)`, viewport: { width: 1024, height: 768 }, dpr: 2, cpu: throttle },
  { name: `phone (${throttle}x CPU throttle)`, viewport: { width: 390, height: 844 }, dpr: 3, cpu: throttle },
];
const args = gpu ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const browser = await chromium.launch({ args });
const results = [];
for (const p of profiles) {
  const ctx = await browser.newContext({ viewport: p.viewport, deviceScaleFactor: p.dpr, hasTouch: p.name.startsWith('phone') || p.name.startsWith('tablet') });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  if (p.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: p.cpu });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(file);
  await page.waitForFunction(() => window.__cliffvalley?.ready, null, { timeout: 60000 });
  const gl = await page.evaluate(() => {
    try {
      const c = document.createElement('canvas').getContext('webgl');
      const ext = c.getExtension('WEBGL_debug_renderer_info');
      return ext ? c.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
    } catch { return 'none'; }
  });
  const r = await page.evaluate(() => window.__cliffvalley.bench(6));
  results.push({ profile: p.name, gl, ...r, errors });
  console.log(`\n${p.name} — ${gl}`);
  for (const s of r.scenes) console.log(`  ${s.name.padEnd(36)} avg ${String(s.avgFps).padStart(3)} fps   1% low ${s.lowFps}`);
  await ctx.close();
}
await browser.close();
writeFileSync('reports/bench.json', JSON.stringify(results, null, 2));
