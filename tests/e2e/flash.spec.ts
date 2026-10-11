import { expect, test, type Page } from '@playwright/test';
import { expectClean, guard } from './helpers';

/**
 * Flash safety (WCAG 2.3.1) measured on real rendered frames: the game samples
 * its own canvas after every render (`?flashaudit=1`), and every screen block
 * must stay at ≤ 3 flashes in any one-second window.
 */

// full Chromium on the real GPU samples ~60 fps (the default headless shell renders in software)
test.use({ channel: 'chromium', launchOptions: { args: ['--ignore-gpu-blocklist'] } });

interface Frame {
  t: number;
  l: number[];
}

/**
 * WCAG 2.3.1 general-flash count per screen block: a flash is a pair of
 * opposing luminance changes of ≥ 0.1 where the darker state is < 0.8.
 * Returns the most flashes seen in any one-second window, over all blocks.
 */
function maxFlashesPerSecond(frames: Frame[]): {
  max: number;
  block: number;
  at: number;
} {
  let worst = { max: 0, block: -1, at: 0 };
  const blocks = frames[0]?.l.length ?? 0;
  for (let b = 0; b < blocks; b++) {
    const times: number[] = [];
    let dir = 0;
    let lo = frames[0]!.l[b]!;
    let hi = lo;
    let ref = lo;
    for (const f of frames) {
      const L = f.l[b]!;
      if (dir === 0) {
        lo = Math.min(lo, L);
        hi = Math.max(hi, L);
        if (L - lo >= 0.1 && lo < 0.8) [dir, ref] = [1, L];
        else if (hi - L >= 0.1 && L < 0.8) [dir, ref] = [-1, L];
        if (dir) times.push(f.t);
      } else if (dir === 1) {
        if (L > ref) ref = L;
        else if (ref - L >= 0.1 && L < 0.8) (([dir, ref] = [-1, L]), times.push(f.t));
      } else {
        if (L < ref) ref = L;
        else if (L - ref >= 0.1 && ref < 0.8) (([dir, ref] = [1, L]), times.push(f.t));
      }
    }
    for (let i = 0; i < times.length; i++) {
      let n = 0;
      while (i + n < times.length && times[i + n]! < times[i]! + 1) n++;
      const flashes = Math.floor(n / 2);
      if (flashes > worst.max) worst = { max: flashes, block: b, at: times[i]! - frames[0]!.t };
    }
  }
  return worst;
}

async function audit(page: Page, query: string, seconds: number): Promise<{ frames: number; worst: ReturnType<typeof maxFlashesPerSecond> }> {
  await page.goto(`/?${query}&flashaudit=1`);
  await page.waitForFunction(() => !!(window as unknown as { __vanexFlash?: unknown }).__vanexFlash && !document.getElementById('boot'), null, { timeout: 30_000 });
  await page.waitForTimeout(1500); // let the scene fill up
  await page.evaluate(() => (window as unknown as { __vanexFlash: { clear(): void } }).__vanexFlash.clear());
  await page.waitForTimeout(seconds * 1000);
  const frames = await page.evaluate(() => (window as unknown as { __vanexFlash: { frames(): Frame[] } }).__vanexFlash.frames().slice());
  return { frames: frames.length, worst: maxFlashesPerSecond(frames) };
}

test('the flash counter itself catches flicker (self-test)', () => {
  const at = (hz: number, square: boolean): Frame[] =>
    Array.from({ length: 180 }, (_, i) => {
      const t = i / 60;
      const v = square ? (Math.floor(t * hz * 2) % 2 ? 0.6 : 0.05) : 0.3 + 0.25 * Math.sin(t * hz * Math.PI * 2);
      return { t, l: [0.05, v] };
    });
  expect(maxFlashesPerSecond(at(5, true)).max).toBeGreaterThanOrEqual(4);
  expect(maxFlashesPerSecond(at(2, false)).max).toBeLessThanOrEqual(3);
  expect(maxFlashesPerSecond(at(1, true)).max).toBeLessThanOrEqual(1);
});

test('flash safety: no screen area flashes more than 3 times a second', async ({ page, baseURL }, info) => {
  test.skip(info.project.name !== 'desktop');
  test.setTimeout(120_000);
  const g = guard(page, baseURL!);
  // a packed battlefield (every tower, 150 constructs) …
  const busy = await audit(page, 'stress=150&quality=high', 6);
  console.log(`flash audit, busy: ${busy.frames} frames, worst ${JSON.stringify(busy.worst)}`);
  expect(busy.frames).toBeGreaterThan(60);
  expect(busy.worst.max, JSON.stringify(busy.worst)).toBeLessThanOrEqual(3);
  // … and a storm of meteor strikes (≈7 big bursts a second, far beyond real play)
  const storm = await audit(page, 'stress=60&quality=high&storm=1', 6);
  console.log(`flash audit, meteor storm: ${storm.frames} frames, worst ${JSON.stringify(storm.worst)}`);
  expect(storm.frames).toBeGreaterThan(60);
  expect(storm.worst.max, JSON.stringify(storm.worst)).toBeLessThanOrEqual(3);
  expectClean(g);
});
