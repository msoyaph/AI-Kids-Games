// Performance benchmark: boot time + stress-test frame times on throttled
// phone / tablet profiles, using the built single-file game.
//   npm run build && npm run perf            (default 300 creatures)
//   node scripts/perf.mjs --count 300 --seconds 12
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const COUNT = Number(opt('count', 300));
const SECONDS = Number(opt('seconds', 12));
const ONLY = opt('only', '');

if (!existsSync('dist/index.html')) {
  console.error('Build first: npm run build');
  process.exit(1);
}
const url = 'file://' + process.cwd() + '/dist/index.html';

// gpu: full Chromium with the real GPU (ANGLE/Metal on macOS).
// swiftshader: Playwright's headless shell renders WebGL in software on the CPU —
// a deliberately pessimistic stand-in for a weak phone GPU.
const PROFILES = [
  { name: 'phone (4x CPU throttle)', viewport: { width: 915, height: 412 }, dpr: 2.625, touch: true, cpu: 4, gpu: 'gpu' },
  // the heaviest new map (two worlds of gates, bridges and bosses) on the weakest profile
  { name: 'phone (6x CPU, low-end) w6m3', viewport: { width: 800, height: 360 }, dpr: 2, touch: true, cpu: 6, gpu: 'gpu', map: 'w6m3' },
  { name: 'tablet (2x CPU throttle)', viewport: { width: 1180, height: 820 }, dpr: 2, touch: true, cpu: 2, gpu: 'gpu' },
  { name: 'desktop', viewport: { width: 1440, height: 900 }, dpr: 2, touch: false, cpu: 1, gpu: 'gpu' },
  { name: 'phone, software GPU', viewport: { width: 915, height: 412 }, dpr: 2.625, touch: true, cpu: 4, gpu: 'swiftshader' },
  { name: 'phone, software GPU, Low', viewport: { width: 915, height: 412 }, dpr: 2.625, touch: true, cpu: 4, gpu: 'swiftshader', quality: 'low' },
].filter((p) => !ONLY || p.name.startsWith(ONLY));

const browsers = {
  gpu: await chromium.launch({ channel: 'chromium', args: ['--ignore-gpu-blocklist', '--enable-gpu-rasterization'] }),
  swiftshader: await chromium.launch(),
};
const results = [];
for (const p of PROFILES) {
  const browser = browsers[p.gpu];
  const ctx = await browser.newContext({ viewport: p.viewport, deviceScaleFactor: p.dpr, hasTouch: p.touch, isMobile: p.touch });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: p.cpu });

  // 1) cold boot to the title screen
  const t0 = Date.now();
  await page.goto(url);
  await page.waitForFunction(() => !document.getElementById('boot') || document.getElementById('boot').style.opacity === '0', null, { timeout: 60000 });
  const bootMs = Date.now() - t0;

  // 2) stress test
  await page.goto(`${url}?stress=${COUNT}${p.quality ? `&quality=${p.quality}` : ''}${p.map ? `&map=${p.map}` : ''}`);
  await page.waitForFunction(() => !!window.__perf, null, { timeout: 60000 });
  await page.waitForTimeout(4000); // warm-up: let creatures fill in and the governor settle
  const m = await page.evaluate(async (seconds) => {
    const times = [];
    const samples = { sim: 0, view: 0, enemies: 0, projectiles: 0, particles: 0, n: 0 };
    let last = performance.now();
    const end = last + seconds * 1000;
    await new Promise((resolve) => {
      const loop = (t) => {
        times.push(t - last);
        last = t;
        const s = window.__perf;
        samples.sim += s.simMs;
        samples.view += s.viewMs;
        samples.enemies += s.enemies;
        samples.projectiles += s.projectiles;
        samples.particles += s.particles;
        samples.n++;
        if (t < end) requestAnimationFrame(loop);
        else resolve();
      };
      requestAnimationFrame(loop);
    });
    times.shift();
    const sorted = [...times].sort((a, b) => a - b);
    const q = (f) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * f))];
    const total = times.reduce((a, b) => a + b, 0);
    return {
      fps: (times.length / total) * 1000,
      p50: q(0.5),
      p95: q(0.95),
      p99: q(0.99),
      over20: times.filter((x) => x > 20).length / times.length,
      simMs: samples.sim / samples.n,
      viewMs: samples.view / samples.n,
      enemies: samples.enemies / samples.n,
      projectiles: samples.projectiles / samples.n,
      particles: samples.particles / samples.n,
      overlay: document.querySelector('[style*="ui-monospace"]')?.textContent ?? '',
    };
  }, SECONDS);
  const gl = await page.evaluate(() => {
    const c = document.createElement('canvas');
    const g = c.getContext('webgl2') || c.getContext('webgl');
    const ext = g && g.getExtension('WEBGL_debug_renderer_info');
    return g ? String(ext ? g.getParameter(ext.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER)) : 'none';
  });
  results.push({ profile: p.name, gl, bootMs, ...m, errors });
  await ctx.close();
}
await browsers.gpu.close();
await browsers.swiftshader.close();

mkdirSync('perf-results', { recursive: true });
writeFileSync('perf-results/perf.json', JSON.stringify(results, null, 2));
for (const r of results) {
  console.log(
    `${r.profile.padEnd(26)} boot ${String(r.bootMs).padStart(5)}ms | ${r.fps.toFixed(1)} fps | p50 ${r.p50.toFixed(1)} p95 ${r.p95.toFixed(1)} p99 ${r.p99.toFixed(1)}ms | >20ms ${(r.over20 * 100).toFixed(1)}% | sim ${r.simMs.toFixed(2)} draw ${r.viewMs.toFixed(2)}ms | creatures ${r.enemies.toFixed(0)} shots ${r.projectiles.toFixed(0)} fx ${r.particles.toFixed(0)}${r.errors.length ? ' | ERRORS: ' + r.errors.join('; ') : ''}`,
  );
  console.log(`   ${r.gl.slice(0, 70)}\n   overlay: ${r.overlay}`);
}
