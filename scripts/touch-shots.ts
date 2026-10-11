/**
 * Screenshots of the real in-game glass controls, driven by real touches (CDP), on a phone
 * and a tablet: dusk, night, a big wave and a boss fight, per quality tier. Used for the
 * visual review of the touch controller.
 *
 * Usage: npm run build && npx tsx scripts/touch-shots.ts [outDir=test-results/touch-shots] [tier ...]
 */
import { chromium, devices, type CDPSession, type Page } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const out = resolve(process.argv[2] ?? 'test-results/touch-shots');
const tiers = process.argv.slice(3).length ? process.argv.slice(3) : ['tablet'];
mkdirSync(out, { recursive: true });
const dist = resolve('dist/index.html');
if (!existsSync(dist)) {
  console.error('dist/index.html missing — run npm run build first');
  process.exit(2);
}
const url = pathToFileURL(dist).href;
const strip = <T extends { defaultBrowserType?: unknown }>({ defaultBrowserType: _, ...d }: T): Omit<T, 'defaultBrowserType'> => d;
const DEVICES = {
  phone: { ...strip(devices['iPhone 15 landscape']), deviceScaleFactor: 2 },
  tablet: { ...strip(devices['iPad Pro 11 landscape']), deviceScaleFactor: 2 },
};

type Scene = 'dusk' | 'night' | 'wave' | 'boss';
const SCENES: Scene[] = ['dusk', 'night', 'wave', 'boss'];

async function touch(cdp: CDPSession, type: 'touchStart' | 'touchMove' | 'touchEnd', points: Array<{ x: number; y: number; id: number }>): Promise<void> {
  await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
}

async function setScene(page: Page, scene: Scene, tier: string): Promise<void> {
  const q = scene === 'wave' ? `?seed=7&quality=${tier}&stress=500` : `?seed=7&quality=${tier}`;
  await page.goto(url + q, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.waitForFunction(() => (window as unknown as { __theabonk?: unknown }).__theabonk, null, { timeout: 60_000 });
  await page.evaluate((scene) => {
    type W = { time: number; director: { eventIndex: number }; map: { events: Array<{ time: number }> } };
    const g = (window as unknown as { __theabonk: { world: W | null; startRun(c: string, m: string): void; advance(s: number): void } }).__theabonk;
    g.startRun('thea', 'meadow');
    const w = g.world!;
    const at = (t: number, keepEvents: boolean): void => {
      w.time = t;
      if (!keepEvents) w.director.eventIndex = w.map.events.filter((e) => e.time <= t).length;
    };
    if (scene === 'night') at(640, false);
    if (scene === 'wave') at(420, true);
    // the 5:00 boss arrives from the scripted events
    if (scene === 'boss') at(298, false);
    g.advance(scene === 'boss' ? 10 : 6);
  }, scene);
}

const browser = await chromium.launch({ args: process.platform === 'darwin' ? ['--use-angle=metal', '--ignore-gpu-blocklist'] : [] });
for (const [dev, opts] of Object.entries(DEVICES)) {
  const context = await browser.newContext(opts);
  await context.addInitScript('window.__name = (f) => f');
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const vp = page.viewportSize()!;
  for (const tier of tiers) {
    for (const scene of SCENES) {
      await setScene(page, scene, tier);
      // thumb on the stick (pushing up-right), a finger on Jump
      const sx = vp.width * 0.16;
      const sy = vp.height * 0.72;
      await touch(cdp, 'touchStart', [{ x: sx, y: sy, id: 1 }]);
      for (let k = 1; k <= 5; k++) await touch(cdp, 'touchMove', [{ x: sx + k * 7, y: sy - k * 9, id: 1 }]);
      const jump = await page.locator('.gbtn-jump').boundingBox();
      if (scene === 'wave' && jump) await touch(cdp, 'touchStart', [{ x: sx + 35, y: sy - 45, id: 1 }, { x: jump.x + jump.width * 0.45, y: jump.y + jump.height * 0.5, id: 2 }]);
      await page.waitForTimeout(scene === 'wave' ? 180 : 400);
      await page.screenshot({ path: `${out}/${dev}-${tier}-${scene}.png` });
      await touch(cdp, 'touchEnd', []);
      console.log(`${dev} ${tier} ${scene}`);
    }
  }
  await context.close();
}
await browser.close();
