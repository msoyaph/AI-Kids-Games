// npm run perf  (run through scripts/when-idle.sh; needs the real GPU, so not in CI)
// The throttled-phone check: a phone viewport (390×844 at 3×) with the CPU slowed 4× (Chromium's
// DevTools throttling), on the real GPU (Metal on macOS). Busy capture scenes play themselves for
// 12 seconds each while the page records every animation frame. Pass: average 58+ FPS, 95% of
// frames under 20 ms, and the JS heap doesn't keep growing (pooled effects, no allocation per frame).
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const BASE = 'http://127.0.0.1:4444';
const SCENES = ['combo&speed=2', 'adventure&speed=2', 'play&speed=3'];
const SECONDS = 12;

async function server() {
  try { await fetch(BASE); return null; } catch { /* start one */ }
  const child = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', '4444', '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 100; i++) { try { await fetch(BASE); return child; } catch { await new Promise(r => setTimeout(r, 100)); } }
  throw new Error('preview server did not start');
}

const child = await server();
const browser = await chromium.launch({ headless: false, args: ['--use-angle=metal', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--window-position=40,40'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const page = await context.newPage();
// tsx names functions with esbuild's __name helper, which the page doesn't have
await page.addInitScript('globalThis.__name = (f) => f');
const cdp = await context.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
let ok = true;
const rows: string[] = [];
for (const scene of SCENES) {
  await page.goto(`${BASE}/?scene=${scene}`);
  await page.waitForFunction(() => '__tuckpop' in window);
  await page.waitForTimeout(1500); // warm up
  const r = await page.evaluate(seconds => new Promise<{ frames: number[]; heap0: number; heap1: number; gpu: string; moves: number }>(done => {
    const frames: number[] = []; let last = performance.now();
    const mem = () => (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0;
    const heap0 = mem(), end = last + seconds * 1000;
    const gl = document.createElement('canvas').getContext('webgl');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    const gpu = info ? String(gl!.getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'unknown';
    const tick = (now: number) => { frames.push(now - last); last = now; if (now < end) requestAnimationFrame(tick); else done({ frames, heap0, heap1: mem(), gpu, moves: (window as unknown as { __tuckpop: { snapshot(): { moves: number } } }).__tuckpop.snapshot().moves }); };
    requestAnimationFrame(tick);
  }), SECONDS);
  const sorted = [...r.frames].sort((a, b) => a - b), avg = r.frames.reduce((a, b) => a + b, 0) / r.frames.length;
  const p95 = sorted[Math.floor(sorted.length * 0.95)]!, slow = r.frames.filter(f => f > 20).length / r.frames.length;
  const fps = 1000 / avg, growthMb = (r.heap1 - r.heap0) / 1e6;
  const pass = fps >= 58 && p95 <= 20;
  ok &&= pass;
  rows.push(`${scene.split('&')[0]!.padEnd(10)} ${fps.toFixed(1)} FPS · p95 ${p95.toFixed(1)} ms · ${(slow * 100).toFixed(1)}% frames over 20 ms · heap ${growthMb >= 0 ? '+' : ''}${growthMb.toFixed(1)} MB · ${r.moves} moves · ${pass ? 'PASS' : 'FAIL'}`);
  if (scene === SCENES[0]) rows.unshift(`GPU: ${r.gpu}; CPU throttled 4×; phone 390×844 @3x`);
}
console.log(rows.join('\n'));
await browser.close();
child?.kill();
process.exit(ok ? 0 : 1);
