// Run the in-game performance benchmark headlessly (GPU Chromium on macOS) and save the results.
//
//   npm run bench                      → Low, Medium and High at 1280×800 on a 2× (Retina) screen,
//                                        frame rate uncapped, writes bench-results.json
//   npm run bench -- --size 1024x768 --dpr 1 --vsync --out my-results.json
//   npm run bench -- --profile phone    → a phone (390×844 @3x, touch, iPhone user agent) with the
//                                         CPU 4× slower, at Auto quality (the tier a phone starts on)
//   npm run bench -- --profile tablet   → a tablet (820×1180 @2x, Android tablet), CPU 4× slower, Auto
//   (--throttle N changes the CPU slowdown; --tiers all benchmarks every tier instead of Auto's)
//
// Uses the built single file (npm run build first), served by vite preview.
import { chromium } from '@playwright/test';
import { preview } from 'vite';
import { appendFileSync, writeFileSync } from 'node:fs';

const arg = (k: string, d: string) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1]! : d;
};
const PROFILES: Record<string, { size: string; dpr: number; ua: string; throttle: number }> = {
  phone: { size: '390x844', dpr: 3, throttle: 4, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' },
  tablet: { size: '820x1180', dpr: 2, throttle: 4, ua: 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' },
};
const profile = PROFILES[arg('--profile', '')];
const [w, h] = arg('--size', profile?.size ?? '1280x800').split('x').map(Number) as [number, number];
const out = arg('--out', profile ? `bench-${arg('--profile', '')}.json` : 'bench-results.json');
const dpr = Number(arg('--dpr', String(profile?.dpr ?? 2)));
const throttle = Number(arg('--throttle', String(profile?.throttle ?? 1)));
// a profile runs at Auto quality (what that device would start on) unless --tiers all
const tiers = arg('--tiers', profile ? 'auto' : 'all');
// headless Chromium is capped at 60 fps by vsync; uncapped shows how much headroom each tier has
// (device profiles keep vsync: a phone screen tops out at 60)
const vsync = process.argv.includes('--vsync') || !!profile;

const server = await preview({ preview: { port: 0, host: '127.0.0.1' } });
const url = server.resolvedUrls?.local[0] ?? 'http://127.0.0.1:4173/';
const args = process.platform === 'darwin' ? ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'] : ['--ignore-gpu-blocklist'];
if (!vsync) args.push('--disable-gpu-vsync', '--disable-frame-rate-limit');
const browser = await chromium.launch({ channel: 'chromium', args });
try {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, ...(profile ? { isMobile: true, hasTouch: true, userAgent: profile.ua } : {}) });
  if (throttle > 1) await (await page.context().newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: throttle });
  await page.goto(`${url}?bench=${tiers === 'auto' ? '1' : 'all'}`);
  console.log(`benchmarking at ${w}×${h} @${dpr}x, ${vsync ? 'vsync on' : 'uncapped'}${throttle > 1 ? `, CPU ${throttle}× slower` : ''}, ${tiers === 'auto' ? 'Auto quality' : 'every tier'}…`);
  await page.waitForFunction(() => !!(window as unknown as { __benchResults?: unknown }).__benchResults, null, { timeout: 15 * 60_000, polling: 1000 });
  const results = await page.evaluate(() => (window as unknown as { __benchResults: unknown }).__benchResults);
  const gpu = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
    return dbg ? String(gl!.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : 'unknown';
  });
  // memory: JS heap (Chromium) and what's on the GPU (three.js counts)
  const memory = await page.evaluate(() => {
    const m = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    const info = (window as unknown as { __lc: { view: { renderer: { info: { memory: { geometries: number; textures: number }; programs?: unknown[] } } } } }).__lc.view.renderer.info;
    return { jsHeapMB: m ? Math.round(m.usedJSHeapSize / 1048576) : null, geometries: info.memory.geometries, textures: info.memory.textures, programs: info.programs?.length ?? null };
  });
  const report = { date: new Date().toISOString().slice(0, 10), profile: arg('--profile', '') || null, viewport: `${w}×${h}`, deviceScaleFactor: dpr, cpuThrottle: throttle, vsync, gpu, memory, results };
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.table(results);
  // CI: show the table on the run's summary page
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary && Array.isArray(results)) {
    const rows = (results as Record<string, unknown>[]).map((r) => `| ${r.tier} | ${r.avgFps} | ${r.low1Fps} | ${r.drawCalls} | ${r.triangles} | ${r.size} |`);
    appendFileSync(summary, [`### Benchmark (${w}×${h} @${dpr}x, ${vsync ? 'vsync' : 'uncapped'}, ${gpu})`, '', '| Tier | Avg FPS | 1% low | Draw calls | Triangles | Canvas |', '|---|---|---|---|---|---|', ...rows, ''].join('\n'));
  }
  console.log(`saved ${out} (GPU: ${gpu})`);
} finally {
  await browser.close();
  server.httpServer.close();
}
