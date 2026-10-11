// Performance harness: runs a race in the BUILT game (vite preview on :4173) and reports frame stats.
// Usage: node scripts/perf.mjs [trackId] [--cpu 4] [--mobile|--tablet] [--split] [--seconds 20] [--quality auto|low|medium|high]
// --tablet = 1024×768 @ DPR 2 with touch (the "throttled tablet profile" when combined with --cpu 4).
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
const tablet = args.includes('--tablet');
const swift = args.includes('--swiftshader');
const url = opt('--url', 'http://localhost:4173/');

const browser = await chromium.launch({ args: swift ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext(
  tablet
    ? { viewport: { width: 1024, height: 768 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' }
    : mobile
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
await page.goto(url);
await page.waitForFunction(() => !!window.__calex?.app, null, { timeout: 60000 });
const res = await page.evaluate(
  async ({ track, seconds, quality, split }) => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const a = window.__calex.app;
    a.saves.create(1, 'Perf');
    a.saves.settings.quality = quality;
    a.applySettings();
    // start the race directly (the menus now show a one-time controls card and some cups are locked)
    const kart = (body, paint) => ({ body, wheels: 'standard', glider: 'kite', paint, decal: 'none' });
    const humans = (split ? ['calex', 'pip'] : ['calex']).map((id, i) => ({ racerId: id, kart: kart('zoomster', i ? 'ocean' : 'cherry'), source: split ? { kind: 'keyboard', scheme: i ? 'right' : 'left' } : { kind: 'any' } }));
    const ai = ['juno', 'mochi', 'grumbo', 'bo', 'fennel', 'luma', 'zing'].slice(0, split ? 6 : 7).map((id, i) => ({ racerId: id, kart: kart(['bubble', 'brick', 'pickup', 'scooter', 'royal', 'bubble', 'zoomster'][i], ['grape', 'lime', 'sunny', 'tangerine', 'gold', 'bubblegum', 'ocean'][i]) }));
    a.startSession({ mode: 'versus', trackId: track, speedClass: 'pro', mirror: false, items: true, itemSet: 'all', laps: 3, players: humans, ai, seed: 7, intro: true }, () => {});
    if (!a.session) return { error: 'track not found' };
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
    let sumCalls = 0;
    let sumTris = 0;
    let samples = 0;
    let maxTris = 0;
    const qualitySeen = new Set();
    while (performance.now() - t0 < seconds * 1000) {
      await sleep(250);
      const st = a.gr.stats();
      maxCalls = Math.max(maxCalls, st.calls);
      maxTris = Math.max(maxTris, st.triangles);
      sumCalls += st.calls;
      sumTris += st.triangles;
      samples++;
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
      avgDrawCalls: +(sumCalls / Math.max(1, samples)).toFixed(1),
      avgTriangles: Math.round(sumTris / Math.max(1, samples)),
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
console.log(JSON.stringify({ cpuThrottle: cpu, mobile, tablet, split, ...res, errors }, null, 1));
await browser.close();
