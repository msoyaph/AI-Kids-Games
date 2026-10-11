// Performance harness: runs a race in the BUILT game (vite preview on :4173) and reports frame stats.
// Usage: node scripts/perf.mjs [trackId] [--cpu 4] [--mobile] [--split] [--seconds 20] [--quality auto|low|medium|high]
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : d;
};
const track = args.find((a) => !a.startsWith('--') && !/^\d+$/.test(a) && !['auto', 'low', 'medium', 'high'].includes(a)) ?? 'coral-dome-dash';
const cpu = Number(opt('--cpu', '1'));
const seconds = Number(opt('--seconds', '20'));
const quality = opt('--quality', 'auto');
const mobile = args.includes('--mobile');
const split = args.includes('--split');
const swift = args.includes('--swiftshader');

const browser = await chromium.launch({ args: swift ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext(
  mobile
    ? { viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36' }
    : { viewport: { width: 1280, height: 720 } },
);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
if (cpu > 1) {
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
}
await page.goto('http://localhost:4173/');
await page.waitForFunction(() => !!window.__calex?.app, null, { timeout: 60000 });
const res = await page.evaluate(
  async ({ track, seconds, quality, split }) => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const a = window.__calex.app;
    a.saves.create(1, 'Perf');
    a.saves.settings.quality = quality;
    a.applySettings();
    a.flow.mode = 'versus';
    a.flow.players = split ? 2 : 1;
    a.flow.racers = ['calex', 'pip'];
    a.flow.vs.aiCount = split ? 6 : 7;
    a.flow.vs.items = true;
    a.screens.trackSelect();
    await sleep(200);
    // find the track button in any cup tab
    const tryClick = () => {
      const b = [...document.querySelectorAll('.screen [data-nav]')].find((x) => x.textContent.toLowerCase().replace(/[^a-z]/g, '').includes(track.replace(/-/g, '')));
      if (b) {
        b.click();
        return true;
      }
      return false;
    };
    let ok = tryClick();
    if (!ok) {
      for (const tab of [...document.querySelectorAll('.screen .tabs [data-nav]')]) {
        tab.click();
        await sleep(100);
        if ((ok = tryClick())) break;
      }
    }
    if (!ok) {
      // direct start (locked cups etc.)
      a.saves.data.unlocks.cups = ['sunrise', 'thunder', 'galaxy', 'legend'];
      a.screens.trackSelect();
      await sleep(100);
      for (const tab of [...document.querySelectorAll('.screen .tabs [data-nav]')]) {
        tab.click();
        await sleep(100);
        if ((ok = tryClick())) break;
      }
    }
    if (!ok) return { error: 'track not found' };
    await sleep(500);
    const s = a.session;
    for (let i = 0; i < (split ? 2 : 1); i++) {
      const k = s.world.karts[i];
      k.player = -1;
      s.ai.takeOver(k);
      k.player = i;
    }
    s.world.skipIntro();
    await sleep(4000); // countdown + settle
    const start = a.perf.frames;
    const t0 = performance.now();
    const times = [];
    let last = performance.now();
    let running = true;
    const tick = (t) => {
      times.push(t - last);
      last = t;
      if (running) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    let maxCalls = 0;
    let maxTris = 0;
    const qualitySeen = new Set();
    while (performance.now() - t0 < seconds * 1000) {
      await sleep(250);
      const st = a.gr.stats();
      maxCalls = Math.max(maxCalls, st.calls);
      maxTris = Math.max(maxTris, st.triangles);
      qualitySeen.add(`${a.gr.quality.level}@${a.gr.quality.renderScale}`);
    }
    running = false;
    const frames = a.perf.frames - start;
    const elapsed = (performance.now() - t0) / 1000;
    times.sort((x, y) => x - y);
    const p = (q) => times[Math.min(times.length - 1, Math.floor(times.length * q))];
    return {
      track,
      avgFps: +(frames / elapsed).toFixed(1),
      p50ms: +p(0.5).toFixed(1),
      p95ms: +p(0.95).toFixed(1),
      p99ms: +p(0.99).toFixed(1),
      simMs: +a.perf.step.toFixed(2),
      cpuRenderMs: +a.perf.render.toFixed(2),
      maxDrawCalls: maxCalls,
      maxTriangles: maxTris,
      quality: [...qualitySeen],
      dpr: a.gr.renderer.getPixelRatio(),
      gpu: a.gr.quality.device.gpu,
      phase: s.world.phase,
    };
  },
  { track, seconds, quality, split },
);
console.log(JSON.stringify({ cpuThrottle: cpu, mobile, split, ...res, errors }, null, 1));
await browser.close();
