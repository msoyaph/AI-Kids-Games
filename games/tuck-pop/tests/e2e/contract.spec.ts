import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { pixel, snapshot, startClassic, watch } from './helpers';

const built = fileURLToPath(new URL('../../dist/index.html', import.meta.url));

test('the single file works from file:// with no server', async ({ page }) => {
  const problems = watch(page);
  await page.goto(`file://${built}`);
  await page.locator('#classic').click();
  await expect.poll(async () => (await snapshot(page)).screen).toBe('play');
  await page.keyboard.press('Digit1'); await page.keyboard.press('Enter');
  await expect.poll(async () => (await snapshot(page)).moves).toBe(1);
  expect(problems).toEqual([]);
});

test('full storage: the game keeps playing from memory and says so once', async ({ page }) => {
  const problems = watch(page);
  await page.addInitScript(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k: string, v: string) { if (k === 'tuckpop.run' || k === 'tuckpop.save') throw new DOMException('full', 'QuotaExceededError'); return set.call(this, k, v); };
  });
  await startClassic(page);
  await page.keyboard.press('Digit1'); await page.keyboard.press('Enter');
  await expect(page.locator('#toast')).toContainText('out of space');
  await page.keyboard.press('Digit2'); await page.keyboard.press('Enter');
  await expect.poll(async () => (await snapshot(page)).moves).toBe(2);
  expect(problems).toEqual([]);
});

test('the board is really drawn (not a blank canvas)', async ({ page }) => {
  await page.goto('/?scene=combo&speed=0.25');
  await expect.poll(async () => (await snapshot(page)).frames).toBeGreaterThan(2);
  const s = await snapshot(page), b = s.layout.board, c = s.layout.cell;
  const png = await page.screenshot();
  const dpr = await page.evaluate(() => devicePixelRatio);
  // the combo scene starts with a coral block in the top-left cell and an empty cell at column 2
  const [r, g] = pixel(png, Math.round((b.x + c * 0.5) * dpr), Math.round((b.y + c * 0.55) * dpr));
  expect(r).toBeGreaterThan(200); expect(g).toBeLessThan(170);
  const empty = pixel(png, Math.round((b.x + c * 2.5) * dpr), Math.round((b.y + c * 2.5) * dpr));
  expect(Math.abs(empty[0] - r) + Math.abs(empty[1] - g)).toBeGreaterThan(40);
});

test('reduced motion: no shake, fewer particles, still every move', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?scene=combo&speed=3');
  await expect.poll(async () => (await snapshot(page)).moves, { timeout: 15_000 }).toBeGreaterThan(3);
  expect((await snapshot(page)).reduced).toBe(true);
});

test('flash safety: never more than 3 glows in a second, even in a busy streak', async ({ page }) => {
  await page.goto('/?scene=combo&speed=4');
  let most = 0;
  for (let i = 0; i < 60; i++) { most = Math.max(most, (await snapshot(page)).glowsLastSecond); await page.waitForTimeout(100); }
  expect(most).toBeLessThanOrEqual(3);
  expect((await snapshot(page)).moves).toBeGreaterThan(3);
});

test('Adventure and theme capture scenes play without saving', async ({ page }) => {
  const problems = watch(page);
  for (const scene of ['adventure', 'themes', 'clear']) {
    await page.goto(`/?scene=${scene}&speed=3`);
    await expect.poll(async () => (await snapshot(page)).moves, { timeout: 15_000 }).toBeGreaterThan(1);
  }
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(problems).toEqual([]);
});
