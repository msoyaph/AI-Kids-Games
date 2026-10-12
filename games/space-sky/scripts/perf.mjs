// Performance runs: frame rate, p95 frame time, draw calls, triangles, GPU objects and JS heap for the
// heaviest scenes at each quality tier and CPU throttle (Chrome DevTools Protocol), on the tablet profile
// (1024x768, DPR 2). Also checks that memory stays flat across 10 scene changes, and boot time.
//
//   npm run build && node scripts/perf.mjs [--q low,medium,high] [--cpu 1,4,6] [--secs 5] [--base URL]
//
// Without --base it serves dist/ with `vite preview` on :4393. Writes perf-results/latest.{json,md}.
import { chromium } from '@playwright/test';
import { spawn } from 'child_process';
import fs from 'fs';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const tiers = arg('q', 'low,medium,high').split(',');
const cpus = arg('cpu', '1,4,6').split(',').map(Number);
const secs = Number(arg('secs', '5'));
let base = arg('base', '');
let server = null;
if (!base) {
  base = 'http://localhost:4393';
  server = spawn('npx', ['vite', 'preview', '--port', '4393', '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
}

/** The heaviest moments of the game. */
const SCENES = {
  hub: ['hub', {}],
  belt: ['flight', { from: 'mars', to: 'jupiter' }, 'belt'],
  rings: ['flight', { from: 'saturn', to: 'saturn', course: 'race_ripple' }],
  level: ['explore', { area: 'zephyra_village' }],
  finale: ['cutscene', { id: 'finale' }],
};

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const results = [];

async function newGame(page, q) {
  await page.goto(`${base}/?debug&stress&q=${q}`);
  await page.getByTestId('btn-play').waitFor({ timeout: 30000 });
  await page.evaluate(() => localStorage.clear());
  await page.waitForTimeout(800);
  await page.getByTestId('btn-play').click({ force: true });
  await page.getByTestId('slot-0').waitFor();
  await page.waitForTimeout(400);
  await page.getByTestId('slot-0').click({ force: true });
  await page.getByTestId('name-input').waitFor();
  await page.getByTestId('name-input').fill('Perf');
  await page.getByTestId('btn-start').click({ force: true });
  await page.getByTestId('hub-banner').waitFor({ timeout: 30000 });
  await page.waitForTimeout(1200);
  for (let i = 0; i < 40; i++) {
    const d = page.getByTestId('dialogue');
    if (!(await d.isVisible().catch(() => false))) break;
    await d.click({ force: true }).catch(() => {});
    await page.waitForTimeout(80);
  }
  await page.evaluate(() => {
    const S = window.__spacesky;
    S.settings.tips = false;
    S.state.setFlag('zibboJoined');
  });
}

async function go(page, scene, params, extra) {
  await page.evaluate(([s, p]) => {
    const S = window.__spacesky;
    if (s === 'explore') S.state.setFlag(`intro:${p.area}`);
    return S.game.go(s, p);
  }, [scene, params]);
  if (extra === 'belt') {
    await page.evaluate(() => {
      const sc = window.__spacesky.game.current;
      const a = sc.getLayout().world.asteroids;
      if (!a?.length) return;
      const m = a[Math.floor(a.length / 2)];
      const s = sc.getShip();
      s.x = m.x - 600;
      s.y = m.y;
      s.h = m.h ?? 0;
      s.vx = s.vy = s.vh = 0;
      s.yaw = 0;
      s.pitch = 0;
    });
  }
}

async function measure(page) {
  return page.evaluate(async (ms) => {
    const S = window.__spacesky;
    // Dialogue freezes nothing here; just count real frames.
    const times = [];
    await new Promise((resolve) => {
      let last = performance.now();
      const end = last + ms;
      const tick = (now) => {
        times.push(now - last);
        last = now;
        if (now < end) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
    times.shift();
    const sorted = [...times].sort((a, b) => a - b);
    const avg = times.reduce((a, b) => a + b, 0) / Math.max(1, times.length);
    const st = S.game.r3.stats();
    return {
      fps: Math.round(1000 / avg),
      p95: Math.round(sorted[Math.floor(sorted.length * 0.95)] * 10) / 10,
      calls: st.calls,
      tris: st.triangles,
      geometries: st.geometries,
      textures: st.textures,
      heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
      tier: S.game.r3.tier,
    };
  }, secs * 1000);
}

for (const q of tiers) {
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 2 });
  const cdp = await page.context().newCDPSession(page);
  await newGame(page, q);
  for (const [name, [scene, params, extra]] of Object.entries(SCENES)) {
    await go(page, scene, params, extra);
    await page.waitForTimeout(2000);
    for (const rate of cpus) {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate });
      await page.waitForTimeout(600);
      const r = await measure(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      results.push({ tier: q, scene: name, cpu: rate, ...r });
      console.log(`${q.padEnd(6)} ${name.padEnd(7)} cpu×${rate}  ${String(r.fps).padStart(3)} fps  p95 ${String(r.p95).padStart(5)} ms  ${r.calls} calls  ${Math.round(r.tris / 1000)}k tris  heap ${r.heapMB} MB`);
    }
    // Skip any cutscene dialogue that is still open.
    await page.evaluate(() => document.querySelector('[data-testid="btn-skip"]')?.click());
  }
  await page.close();
}

// Memory: the same 11-scene tour twice. Caches (planet bakes, skies, detail textures) fill up on the first
// lap; a leak would keep growing on the second, so lap 2 must end where lap 1 ended.
const memPage = await browser.newPage({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 2 });
await newGame(memPage, 'medium');
const snap = () => memPage.evaluate(() => {
  const S = window.__spacesky;
  const i = S.game.r3.renderer.info.memory;
  return { geometries: i.geometries, textures: i.textures, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null };
});
const tour = [['map', {}], ['flight', { from: 'earth', to: 'mars' }], ['landing', { body: 'mars' }], ['explore', { area: 'mars_landing' }], ['hub', {}], ['codex', {}], ['hangar', {}], ['flight', { from: 'saturn', to: 'saturn' }], ['explore', { area: 'europa_ice' }], ['cutscene', { id: 'finale' }], ['hub', {}]];
const mem = [];
await go(memPage, 'hub', {});
await memPage.waitForTimeout(1500);
mem.push({ scene: 'hub (start)', ...(await snap()) });
for (const lap of [1, 2]) {
  for (const [s, p] of tour) {
    await go(memPage, s, p);
    await memPage.waitForTimeout(1500);
    await memPage.evaluate(() => document.querySelector('[data-testid="btn-skip"]')?.click());
    if (lap === 2 || s === 'hub') mem.push({ scene: `lap ${lap}: ${s}`, ...(await snap()) });
  }
}
// Let the heap settle (GC) before the final reading.
await memPage.waitForTimeout(3000);
mem.push({ scene: 'hub (end, settled)', ...(await snap()) });
for (const m of mem) console.log(`mem ${m.scene.padEnd(20)} ${m.geometries} geo  ${m.textures} tex  ${m.heapMB} MB`);
await memPage.close();

// Boot: time until the title's Play button shows (fresh page, cold caches).
const bootPage = await browser.newPage({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 2 });
const t0 = Date.now();
await bootPage.goto(`${base}/`);
await bootPage.getByTestId('btn-play').waitFor({ timeout: 30000 });
const bootMs = Date.now() - t0;
console.log(`boot to title: ${bootMs} ms`);
await bootPage.close();
await browser.close();
server?.kill();

fs.mkdirSync('perf-results', { recursive: true });
const size = fs.statSync('dist/index.html').size;
fs.writeFileSync('perf-results/latest.json', JSON.stringify({ date: new Date().toISOString(), profile: 'tablet 1024x768 @2x', results, memory: mem, bootMs, buildBytes: size }, null, 2));
const md = [
  '# Space Sky performance (latest run)',
  '',
  `Tablet profile 1024×768 at DPR 2, headless Chromium (ANGLE/Metal) on the dev Mac; CPU throttled with DevTools; \`?stress\` keeps each tier fixed. Build ${(size / 1048576).toFixed(2)} MB. Boot to title ${bootMs} ms.`,
  '',
  '| Tier | Scene | CPU | FPS | p95 ms | Draw calls | Triangles | Heap MB |',
  '|---|---|---|---|---|---|---|---|',
  ...results.map((r) => `| ${r.tier} | ${r.scene} | ×${r.cpu} | ${r.fps} | ${r.p95} | ${r.calls} | ${Math.round(r.tris / 1000)}k | ${r.heapMB ?? '-'} |`),
  '',
  '## Memory across 10 scene changes (Medium)',
  '',
  '| After | Geometries | Textures | Heap MB |',
  '|---|---|---|---|',
  ...mem.map((m) => `| ${m.scene} | ${m.geometries} | ${m.textures} | ${m.heapMB ?? '-'} |`),
  '',
].join('\n');
fs.writeFileSync('perf-results/latest.md', md);
console.log('wrote perf-results/latest.md');
