// npm run shots [-- <name-filter>]  (run through scripts/when-idle.sh)
// Screenshots of moments for the visual review, from the built game (vite preview on 4444, which
// it starts if needed): every theme, mode and celebration on a phone and a computer. Moments are
// reached through the capture route and timed with the read-only hook. Output: reports/shots/.
import { chromium, type Page } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const BASE = 'http://127.0.0.1:4444';
const filter = process.argv[2] ?? '';
type Snap = { moves: number; screen: string; over: boolean };
const snap = (page: Page) => page.evaluate(() => (window as unknown as { __tuckpop: { snapshot(): Snap } }).__tuckpop.snapshot());
async function until(page: Page, test: (s: Snap) => boolean, timeout = 20000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (test(await snap(page))) return; await page.waitForTimeout(16); }
  throw new Error('moment never came');
}

export interface Shot { name: string; url: string; size: 'phone' | 'desktop' | 'landscape'; at?: (page: Page) => Promise<void> }
const SIZES = { phone: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, desktop: { width: 1280, height: 800, deviceScaleFactor: 1 }, landscape: { width: 844, height: 390, deviceScaleFactor: 2, isMobile: true, hasTouch: true } };

export const SHOTS: Shot[] = [];
for (const size of ['phone', 'desktop'] as const) {
  SHOTS.push(
    { name: `${size}-home`, url: '/', size, at: async p => { await p.waitForTimeout(400); } },
    { name: `${size}-play`, url: '/?scene=play&hud=1&speed=2', size, at: async p => { await until(p, s => s.moves >= 6); await p.waitForTimeout(500); } },
    { name: `${size}-combo`, url: '/?scene=combo&hud=1', size, at: async p => { await until(p, s => s.moves >= 2); await p.waitForTimeout(330); } },
    { name: `${size}-board-clear`, url: '/?scene=clear&hud=1', size, at: async p => { await until(p, s => s.moves >= 1); await p.waitForTimeout(420); } },
  );
}
SHOTS.push({ name: 'landscape-play', url: '/?scene=play&hud=1&speed=2', size: 'landscape', at: async p => { await until(p, s => s.moves >= 6); await p.waitForTimeout(500); } });

async function server() {
  try { await fetch(BASE); return null; } catch { /* start one */ }
  const child = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', '4444', '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 100; i++) { try { await fetch(BASE); return child; } catch { await new Promise(r => setTimeout(r, 100)); } }
  throw new Error('preview server did not start');
}

const child = await server();
const browser = await chromium.launch({ args: process.platform === 'darwin' ? ['--use-angle=metal', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] : [] });
mkdirSync('reports/shots', { recursive: true });
for (const shot of SHOTS.filter(s => s.name.includes(filter))) {
  const context = await browser.newContext({ viewport: { width: SIZES[shot.size].width, height: SIZES[shot.size].height }, ...SIZES[shot.size] });
  const page = await context.newPage();
  await page.goto(BASE + shot.url);
  await page.waitForFunction(() => '__tuckpop' in window);
  await shot.at?.(page);
  await page.screenshot({ path: `reports/shots/${shot.name}.png` });
  await context.close();
  console.log(`reports/shots/${shot.name}.png`);
}
await browser.close();
child?.kill();
