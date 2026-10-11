/**
 * In-browser benchmark matrix: runs the game's `?bench=1` benchmark (scripted run, fixed seed)
 * in headless Chromium under several profiles and prints the result cards.
 *
 *   native GPU · software renderer (worst case) · "laptop" (4× CPU throttle) ·
 *   tablet tier (touch device, 4× CPU throttle) · 1000-enemy stress on both maps
 *
 * Usage: npm run bench-browser -- [seconds=30] [profile ...]
 * Builds first (npm script). Uses the single-file build from file://, nothing on the network.
 */
import { chromium, devices, type BrowserContextOptions } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

interface Profile {
  name: string;
  args: string[];
  context: BrowserContextOptions;
  cpuThrottle?: number;
  query: string;
}

const seconds = Number(process.argv[2]) || 30;
const only = process.argv.slice(3);
const gpu = process.platform === 'darwin' ? ['--use-angle=metal', '--ignore-gpu-blocklist'] : [];
const desktop: BrowserContextOptions = { viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 };
const PROFILES: Profile[] = [
  { name: 'native-high', args: gpu, context: desktop, query: 'quality=high' },
  { name: 'native-medium', args: gpu, context: desktop, query: 'quality=medium' },
  { name: 'native-low', args: gpu, context: desktop, query: 'quality=low' },
  { name: 'software-low', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'], context: { viewport: { width: 1280, height: 720 } }, query: 'quality=low' },
  { name: 'laptop-cpu4x-medium', args: gpu, context: desktop, cpuThrottle: 4, query: 'quality=medium' },
  { name: 'tablet-cpu4x', args: gpu, context: { ...devices['iPad Pro 11 landscape'], defaultBrowserType: undefined } as BrowserContextOptions, cpuThrottle: 4, query: 'quality=tablet' },
  { name: 'stress1000-meadow', args: gpu, context: desktop, query: 'quality=high&enemies=1000&map=meadow' },
  { name: 'stress1000-rimewood', args: gpu, context: desktop, query: 'quality=high&enemies=1000&map=rimewood' },
];

const file = resolve('dist/index.html');
if (!existsSync(file)) {
  console.error('dist/index.html missing — run npm run build first');
  process.exit(2);
}

for (const p of PROFILES) {
  if (only.length && !only.includes(p.name)) continue;
  const browser = await chromium.launch({ args: p.args });
  try {
    const context = await browser.newContext(p.context);
    const page = await context.newPage();
    if (p.cpuThrottle) {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: p.cpuThrottle });
    }
    await page.goto(`${pathToFileURL(file).href}?bench=1&seconds=${seconds}&${p.query}`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.waitForFunction(() => (window as unknown as { __benchResult?: unknown }).__benchResult, null, { timeout: (seconds * 6 + 120) * 1000, polling: 1000 });
    const r = (await page.evaluate(() => (window as unknown as { __benchResult: Record<string, unknown> }).__benchResult)) as {
      avgFps: number;
      low1Fps: number;
      avgFrameMs: number;
      p99FrameMs: number;
      simMs: number;
      drawCalls: { avg: number; max: number };
      triangles: { avg: number; max: number };
      quality: string;
      resolution: string;
      gpu: string;
      enemiesMax: number;
      budget: { ok: boolean };
    };
    console.log(
      `${p.name.padEnd(22)} ${String(r.avgFps).padStart(4)} fps avg · ${String(r.low1Fps).padStart(4)} 1% low · ${r.avgFrameMs.toFixed(2)} ms (p99 ${r.p99FrameMs.toFixed(1)}) · sim ${r.simMs.toFixed(2)} ms · ` +
        `${r.drawCalls.max} calls · ${(r.triangles.max / 1000).toFixed(0)}k tris · ${r.enemiesMax} enemies · ${r.quality} ${r.resolution} · budget ${r.budget.ok ? 'ok' : 'OVER'} · ${r.gpu}`,
    );
  } catch (e) {
    console.log(`${p.name.padEnd(22)} failed: ${(e as Error).message.split('\n')[0]}`);
  } finally {
    await browser.close();
  }
}
