/**
 * In-browser benchmark matrix: runs the game's `?bench=1` benchmark (scripted run, fixed seed)
 * headless under several profiles and prints the result cards.
 *
 *   desktop: native GPU tiers · software renderer (worst case) · "laptop" (4× CPU throttle,
 *            incl. the 1000-enemy stress) · 1000-enemy stress on both maps
 *   touch:   Chromium phone + tablet at 4× CPU × every tier × no controls / fake glass /
 *            real blur (the touch controller's cost), plus WebKit phone + tablet (Safari's
 *            compositor; WebKit can't be CPU-throttled)
 *
 * Usage: npm run bench-browser -- [seconds=30] [group|profile ...]   (default group: desktop)
 * Builds first (npm script). Uses the single-file build from file://, nothing on the network.
 * CDP throttles the CPU only — a phone's GPU is far weaker than this machine's, so treat any
 * GPU-side cost (like real blur) here as a lower bound.
 */
import { chromium, devices, webkit, type BrowserContextOptions } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

interface Profile {
  name: string;
  group: 'desktop' | 'touch';
  browser: 'chromium' | 'webkit';
  args: string[];
  context: BrowserContextOptions;
  cpuThrottle?: number;
  query: string;
}

const argv = process.argv.slice(2);
// --repeat N: run the chosen profiles N times, interleaved (load drifts on a busy machine), and report medians
const ri = argv.indexOf('--repeat');
const repeat = ri >= 0 ? Math.max(1, Number(argv[ri + 1]) || 1) : 1;
const args = ri >= 0 ? argv.filter((_, i) => i !== ri && i !== ri + 1) : argv;
const seconds = Number(args[0]) || 30;
const only = args.slice(Number(args[0]) ? 1 : 0);
const gpu = process.platform === 'darwin' ? ['--use-angle=metal', '--ignore-gpu-blocklist'] : [];
const desktop: BrowserContextOptions = { viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 };
const device = (name: string): BrowserContextOptions => {
  const { defaultBrowserType: _, ...d } = devices[name];
  return d;
};
const PROFILES: Profile[] = [
  { name: 'native-high', group: 'desktop', browser: 'chromium', args: gpu, context: desktop, query: 'quality=high' },
  { name: 'native-medium', group: 'desktop', browser: 'chromium', args: gpu, context: desktop, query: 'quality=medium' },
  { name: 'native-low', group: 'desktop', browser: 'chromium', args: gpu, context: desktop, query: 'quality=low' },
  { name: 'software-low', group: 'desktop', browser: 'chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'], context: { viewport: { width: 1280, height: 720 } }, query: 'quality=low' },
  { name: 'laptop-cpu4x-medium', group: 'desktop', browser: 'chromium', args: gpu, context: desktop, cpuThrottle: 4, query: 'quality=medium' },
  { name: 'laptop-cpu4x-stress1000', group: 'desktop', browser: 'chromium', args: gpu, context: desktop, cpuThrottle: 4, query: 'quality=medium&enemies=1000' },
  { name: 'stress1000-meadow', group: 'desktop', browser: 'chromium', args: gpu, context: desktop, query: 'quality=high&enemies=1000&map=meadow' },
  { name: 'stress1000-rimewood', group: 'desktop', browser: 'chromium', args: gpu, context: desktop, query: 'quality=high&enemies=1000&map=rimewood' },
];
for (const [dev, desc] of [['phone', 'Pixel 7 landscape'], ['tablet', 'Galaxy Tab S9 landscape']] as const) {
  for (const tier of ['low', 'medium', 'high', 'tablet']) {
    for (const controls of ['none', 'fake', 'blur']) {
      PROFILES.push({ name: `${dev}-cpu4x-${tier}-${controls}`, group: 'touch', browser: 'chromium', args: gpu, context: device(desc), cpuThrottle: 4, query: `quality=${tier}&controls=${controls}` });
    }
  }
}
// High + touch in real life: a touchscreen laptop (or a strong tablet) on a full GPU
for (const controls of ['none', 'fake', 'blur']) {
  PROFILES.push({ name: `laptop-high-${controls}`, group: 'touch', browser: 'chromium', args: gpu, context: { ...desktop, hasTouch: true }, query: `quality=high&controls=${controls}` });
}
for (const [dev, desc] of [['iphone', 'iPhone 15 landscape'], ['ipad', 'iPad Pro 11 landscape']] as const) {
  for (const controls of ['none', 'fake', 'blur']) {
    PROFILES.push({ name: `webkit-${dev}-tablet-${controls}`, group: 'touch', browser: 'webkit', args: [], context: device(desc), query: `quality=tablet&controls=${controls}` });
  }
}

// BENCH_FILE: benchmark a frozen copy of a build (keep working while a long matrix runs)
const file = resolve(process.env.BENCH_FILE ?? 'dist/index.html');
if (!existsSync(file)) {
  console.error('dist/index.html missing — run npm run build first');
  process.exit(2);
}

interface R {
  avgFps: number;
  low1Fps: number;
  avgFrameMs: number;
  p99FrameMs: number;
  cpuFrameMs: number;
  simMs: number;
  drawCalls: { avg: number; max: number };
  triangles: { avg: number; max: number };
  quality: string;
  controls: string;
  resolution: string;
  gpu: string;
  enemiesMax: number;
  budget: { ok: boolean };
}
const runs = new Map<string, R[]>();
const wanted = (p: Profile): boolean => (only.length === 0 ? p.group === 'desktop' : only.includes(p.name) || only.includes(p.group) || only.some((o) => p.name.startsWith(o + '-')));
const order: Profile[] = [];
for (let k = 0; k < repeat; k++) for (const p of PROFILES) if (wanted(p)) order.push(p);
for (const p of order) {
  const browser = await (p.browser === 'webkit' ? webkit : chromium).launch({ args: p.args });
  try {
    const context = await browser.newContext(p.context);
    const page = await context.newPage();
    if (p.cpuThrottle) {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: p.cpuThrottle });
    }
    await page.goto(`${pathToFileURL(file).href}?bench=1&seconds=${seconds}&${p.query}`, { waitUntil: 'domcontentloaded', timeout: 180_000 });
    await page.waitForFunction(() => (window as unknown as { __benchResult?: unknown }).__benchResult, null, { timeout: (seconds * 6 + 120) * 1000, polling: 1000 });
    const r = (await page.evaluate(() => (window as unknown as { __benchResult: unknown }).__benchResult)) as R;
    runs.set(p.name, [...(runs.get(p.name) ?? []), r]);
    console.log(
      `${p.name.padEnd(30)} ${String(r.avgFps).padStart(4)} fps avg · ${String(r.low1Fps).padStart(4)} 1% low · ${r.avgFrameMs.toFixed(2)} ms (p99 ${r.p99FrameMs.toFixed(1)}) · cpu ${r.cpuFrameMs.toFixed(2)} ms · sim ${r.simMs.toFixed(2)} ms · ` +
        `${r.drawCalls.max} calls · ${(r.triangles.max / 1000).toFixed(0)}k tris · ${r.enemiesMax} enemies · ${r.quality} ${r.resolution} · budget ${r.budget.ok ? 'ok' : 'OVER'} · ${r.gpu}`,
    );
  } catch (e) {
    console.log(`${p.name.padEnd(30)} failed: ${(e as Error).message.split('\n')[0]}`);
  } finally {
    await browser.close();
  }
}

// medians over the repeats
const median = (v: number[]): number => {
  const s = [...v].sort((a, b) => a - b);
  return s.length % 2 ? s[s.length >> 1] : Math.round((s[s.length / 2 - 1] + s[s.length / 2]) / 2);
};
const results = new Map<string, R>();
for (const [name, list] of runs) results.set(name, { ...list[0], avgFps: median(list.map((r) => r.avgFps)), low1Fps: median(list.map((r) => r.low1Fps)), cpuFrameMs: median(list.map((r) => r.cpuFrameMs)) });
if (repeat > 1) console.log(`\n(medians of ${repeat} interleaved runs each)`);
// touch controller comparison: no controls vs fake glass vs real blur
const rows = [...new Set(PROFILES.filter((p) => p.group === 'touch').map((p) => p.name.replace(/-(none|fake|blur)$/, '')))];
const cell = (r: R | undefined): string => (r ? `${r.avgFps} / ${r.low1Fps} (${r.cpuFrameMs.toFixed(1)} ms)` : '—');
if (rows.some((row) => results.has(`${row}-none`))) {
  console.log('\nTouch controls: avg FPS / 1% low');
  console.log(`${'profile'.padEnd(26)} ${'no controls'.padStart(20)} ${'fake glass'.padStart(20)} ${'real blur'.padStart(20)}   (avg / 1% low (CPU ms/frame))`);
  for (const row of rows) {
    if (!['none', 'fake', 'blur'].some((c) => results.has(`${row}-${c}`))) continue;
    console.log(`${row.padEnd(26)} ${cell(results.get(`${row}-none`)).padStart(20)} ${cell(results.get(`${row}-fake`)).padStart(20)} ${cell(results.get(`${row}-blur`)).padStart(20)}`);
  }
}
