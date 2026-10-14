/**
 * The town in a real browser: booting, a new story town, drawing a street and zoning homes with the
 * mouse or a finger, tap picking, the keyboard camera, saving and reloading, the capture routes, the
 * friendly no-3D card, and running in the website's sandboxed iframe — with no console errors and no
 * requests anywhere.
 */
import { expect, test, type Page } from '@playwright/test';
import { dragTiles, newStoryTown, open, pickAt, PREFIX, snapshot, tileOnScreen, watch } from './helpers';

/** Zoom out until every tile is well inside the open part of the screen. */
async function inView(page: Page, tiles: [number, number][]) {
  for (let i = 0; i < 4; i++) {
    const area = await page.evaluate(() => (window as unknown as { __breezeport: { openArea(): { x: number; y: number; w: number; h: number } } }).__breezeport.openArea());
    const pts = await Promise.all(tiles.map(([x, z]) => tileOnScreen(page, x, z)));
    if (pts.every(p => p.x > area.x + 24 && p.x < area.x + area.w - 24 && p.y > area.y + 24 && p.y < area.y + area.h - 24)) return;
    await page.getByRole('button', { name: 'Zoom out' }).click();
    await page.waitForTimeout(700);
  }
}

test('boots into a new story town, with no errors and no network', async ({ page }) => {
  const problems = watch(page);
  await open(page);
  await expect(page.getByRole('heading', { name: 'Breezeport' })).toBeVisible();
  await newStoryTown(page);
  const s = await snapshot(page);
  expect(s.drawCalls).toBeGreaterThan(0);
  expect(s.chapter).toBe(0);
  expect(s.slot).toBe(1);
  // town time moves while playing
  await expect.poll(async () => (await snapshot(page)).t).toBeGreaterThan(s.t + 0.5);
  expect(problems).toEqual([]);
});

test('draws a street and zones homes, and a family moves in', async ({ page, hasTouch }) => {
  const problems = watch(page);
  await open(page, 'speed=30');
  await newStoryTown(page);
  await inView(page, [[40, 17], [40, 20], [38, 17], [39, 20]]);
  const before = await snapshot(page);
  await page.getByRole('button', { name: /^Roads/ }).click();
  await dragTiles(page, [40, 17], [40, 20], hasTouch);
  await expect.poll(async () => (await snapshot(page)).roads).toBe(before.roads + 4);
  expect((await snapshot(page)).coins).toBeLessThan(before.coins);
  await page.getByRole('button', { name: /^Zones/ }).click();
  await page.getByRole('button', { name: 'Homes' }).click();
  await dragTiles(page, [38, 17], [39, 20], hasTouch);
  // homes grow on the new lots (town time runs fast here)
  await expect.poll(async () => (await snapshot(page)).things, { timeout: 30_000 }).toBeGreaterThan(before.things);
  expect(problems).toEqual([]);
});

test('a tap picks the tile under it, and a building’s card opens', async ({ page, hasTouch }) => {
  const problems = watch(page);
  await open(page);
  await newStoryTown(page);
  const p = await tileOnScreen(page, 40, 13);
  expect(await pickAt(page, p.x, p.y)).toMatchObject({ x: 40, z: 13 });
  // City Hall (41–44, 8–10) opens its card
  const hall = await tileOnScreen(page, 42.5, 9.5);
  if (hasTouch) await page.touchscreen.tap(hall.x, hall.y); else await page.mouse.click(hall.x, hall.y);
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(problems).toEqual([]);
});

test('the keyboard turns and zooms the view', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard on computers');
  const problems = watch(page);
  await open(page);
  await newStoryTown(page);
  await page.keyboard.press('KeyE');
  await expect.poll(async () => (await snapshot(page)).camera.yawStep).toBe(1);
  await page.keyboard.press('KeyQ');
  await page.keyboard.press('KeyQ');
  await expect.poll(async () => (await snapshot(page)).camera.yawStep).toBe(7);
  const z0 = (await snapshot(page)).camera.zoom;
  await page.keyboard.press('Minus');
  await expect.poll(async () => (await snapshot(page)).camera.zoom).toBeLessThan(z0);
  expect(problems).toEqual([]);
});

test('the town saves under the game prefix and comes back after a reload', async ({ page }) => {
  const problems = watch(page);
  await open(page);
  await newStoryTown(page);
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: /Save and go to the title screen/ }).click();
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.every(k => k.startsWith(PREFIX))).toBe(true);
  expect(keys).toContain(`${PREFIX}slot1`);
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), `${PREFIX}slot1`);
  await page.reload();
  await page.getByRole('button', { name: /^Continue / }).click();
  await expect.poll(async () => (await snapshot(page)).screen).toBe('city');
  expect((await snapshot(page)).t).toBeGreaterThanOrEqual(saved.t - 0.5);
  expect(problems).toEqual([]);
});

for (const scene of ['town', 'showcase', 'styleframe', 'title']) {
  test(`the ${scene} capture route never touches saves`, async ({ page }) => {
    const problems = watch(page);
    await open(page, `scene=${scene}&seed=7`);
    await expect.poll(async () => (await snapshot(page)).capture).toBe(true);
    await page.waitForTimeout(1200);
    expect(await page.evaluate(() => localStorage.length)).toBe(0);
    expect(problems).toEqual([]);
  });
}

test('a device without WebGL 2 gets a friendly card', async ({ page }) => {
  const problems = watch(page);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (type === 'webgl2') return null;
      return (original as (...a: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof original;
  });
  await open(page);
  await expect(page.getByTestId('no-webgl')).toBeVisible();
  await expect(page.getByRole('heading', { name: /can’t show the town/ })).toBeVisible();
  expect(problems).toEqual([]);
});

test('runs inside a sandboxed iframe like on the website', async ({ page }) => {
  const problems = watch(page);
  await page.route('**/host.html', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><iframe src="/?quality=low" sandbox="allow-scripts allow-same-origin allow-pointer-lock" allow="fullscreen; gamepad" style="width:960px;height:540px;border:0"></iframe>' }));
  await page.goto('/host.html');
  const frame = page.frameLocator('iframe');
  await expect(frame.getByRole('heading', { name: 'Breezeport' })).toBeVisible();
  await frame.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(frame.getByRole('button', { name: 'New town' }).first()).toBeVisible();
  expect(problems).toEqual([]);
});

test('works opened straight from the file (file://)', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'one engine is enough for the file check');
  const problems: string[] = [];
  page.on('pageerror', e => problems.push(e.message));
  const { pathToFileURL } = await import('node:url');
  const { resolve } = await import('node:path');
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await expect(page.getByRole('heading', { name: 'Breezeport' })).toBeVisible();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('button', { name: 'New town' }).first()).toBeVisible();
  expect(problems).toEqual([]);
});
