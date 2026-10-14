import { expect, test } from '@playwright/test';
import { HOOK, open, snapshot, startFarming, tileOnScreen, watch } from './helpers';

interface Frame { open: { x: number; y: number; w: number; h: number }; points: { x: number; y: number }[]; tilePx: number }
const startView = (page: import('@playwright/test').Page) => page.evaluate(hook => (window as unknown as Record<string, { startView(): Frame }>)[hook]!.startView(), HOOK);

test('a new farm starts close, with the farmhouse and every field fully on screen', async ({ page, isMobile }) => {
  const problems = watch(page);
  await open(page);
  await startFarming(page);
  // let the camera settle
  await page.waitForTimeout(400);
  const f = await startView(page);
  for (const p of f.points) {
    expect(p.x).toBeGreaterThanOrEqual(f.open.x - 1);
    expect(p.x).toBeLessThanOrEqual(f.open.x + f.open.w + 1);
    expect(p.y).toBeGreaterThanOrEqual(f.open.y - 1);
    expect(p.y).toBeLessThanOrEqual(f.open.y + f.open.h + 1);
  }
  // big tiles: 64 px on phones, 80 px on tablets and computers
  const vp = page.viewportSize()!;
  expect(f.tilePx).toBeGreaterThanOrEqual(Math.min(vp.width, vp.height) < 600 ? 63.5 : 79.5);
  // the view is remembered in the save's camera
  const cam = (await snapshot(page)).camera;
  expect(cam.zoom).toBeGreaterThan(0);
  void isMobile;
  expect(problems).toEqual([]);
});

test('tapping the goal pill glides to what it is about', async ({ page, isMobile }) => {
  test.skip(isMobile, 'pans with the keyboard');
  const problems = watch(page);
  await open(page);
  await startFarming(page);
  const vp = page.viewportSize()!;
  const onScreen = async () => {
    const p = await tileOnScreen(page, 38, 37);
    return p.x > 0 && p.x < vp.width && p.y > 0 && p.y < vp.height;
  };
  expect(await onScreen()).toBe(true);
  // look somewhere else: hold D to pan right until the fields are off screen
  await page.keyboard.down('KeyD');
  await expect.poll(onScreen, { timeout: 8000 }).toBe(false);
  await page.keyboard.up('KeyD');
  // "Plant your 6 empty fields": the pill brings them back
  await page.getByRole('button', { name: 'Goals' }).click();
  await expect.poll(onScreen, { timeout: 4000 }).toBe(true);
  expect(problems).toEqual([]);
});

test('a phone held sideways gets a tool rail down the side (or the left), and the farm keeps the height', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phones');
  await page.setViewportSize({ width: 844, height: 390 });
  const problems = watch(page);
  await open(page);
  await startFarming(page);
  await page.waitForTimeout(300);
  const rail = (await page.locator('nav.toolbar').boundingBox())!;
  expect(rail.height).toBeGreaterThan(rail.width * 3);
  expect(rail.x + rail.width).toBeGreaterThan(844 - 100);
  for (const b of await page.locator('nav.toolbar .tool').all()) {
    const box = (await b.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(48);
    expect(box.height).toBeGreaterThanOrEqual(48);
  }
  // the farmhouse and fields fit, with big tiles, in nearly the whole height
  const f = await startView(page);
  expect(f.open.h).toBeGreaterThanOrEqual(390 * 0.78);
  expect(f.tilePx).toBeGreaterThanOrEqual(63.5);
  for (const p of f.points) {
    expect(p.x).toBeGreaterThanOrEqual(f.open.x - 1);
    expect(p.x).toBeLessThanOrEqual(f.open.x + f.open.w + 1);
    expect(p.y).toBeGreaterThanOrEqual(f.open.y - 1);
    expect(p.y).toBeLessThanOrEqual(f.open.y + f.open.h + 1);
  }
  // Settings → Tools on the left moves the rail
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: /Settings/ }).click();
  await page.locator('.setting', { hasText: 'Tools on the left' }).getByRole('switch').click();
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await page.locator('nav.toolbar').boundingBox())!.x).toBeLessThan(100);
  const g = await startView(page);
  expect(g.open.x).toBeGreaterThanOrEqual(64);
  expect(problems).toEqual([]);
});
