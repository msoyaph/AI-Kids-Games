import { expect, test } from '@playwright/test';
import { open, pickAt, PREFIX, snapshot, startFarming, tileOnScreen, watch } from './helpers';

test('boots into a 3D farm, with no errors and no network', async ({ page }) => {
  const problems = watch(page);
  await open(page);
  await expect(page.getByRole('heading', { name: /Farm WIP/ })).toBeVisible();
  await startFarming(page);
  const s = await snapshot(page);
  expect(s.drawCalls).toBeGreaterThan(0);
  expect(s.unlocked).toEqual(['home']);
  // farm time moves while playing
  const t0 = s.t;
  await expect.poll(async () => (await snapshot(page)).t).toBeGreaterThan(t0 + 0.5);
  expect(problems).toEqual([]);
});

test('a tap on a tile picks that tile', async ({ page, isMobile }) => {
  const problems = watch(page);
  await open(page);
  await startFarming(page);
  // the farm starts close: step back a little so the cottage's yard is in view
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Zoom out' }).click();
  await page.waitForTimeout(800);
  // open ground in the cottage's yard says where it is
  const p = await tileOnScreen(page, 36, 41);
  expect(await pickAt(page, p.x, p.y)).toEqual({ x: 36, z: 41 });
  if (isMobile) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
  await expect(page.locator('.toast').last()).toContainText('Home Plot');
  // an empty field opens the seeds, and the tap's own click doesn't choose any
  const f = await tileOnScreen(page, 39, 38);
  expect(await pickAt(page, f.x, f.y)).toEqual({ x: 39, z: 38 });
  if (isMobile) await page.touchscreen.tap(f.x, f.y); else await page.mouse.click(f.x, f.y);
  await expect(page.getByRole('dialog', { name: 'Seeds' })).toBeVisible();
  await page.waitForTimeout(600);
  await expect(page.getByRole('dialog', { name: 'Seeds' })).toBeVisible();
  expect((await snapshot(page)).fields.every(x => !x.crop)).toBe(true);
  expect(problems).toEqual([]);
});

test('the keyboard turns and zooms the view', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard on computers');
  const problems = watch(page);
  await open(page);
  await startFarming(page);
  await page.keyboard.press('KeyE');
  await expect.poll(async () => (await snapshot(page)).camera.yawStep).toBe(1);
  await page.keyboard.press('KeyQ');
  await page.keyboard.press('KeyQ');
  await expect.poll(async () => (await snapshot(page)).camera.yawStep).toBe(7);
  const z0 = (await snapshot(page)).camera.zoom;
  await page.keyboard.press('Equal');
  await expect.poll(async () => (await snapshot(page)).camera.zoom).toBeGreaterThan(z0);
  expect(problems).toEqual([]);
});

test('the farm saves under the game prefix and survives a reload', async ({ page }) => {
  const problems = watch(page);
  await open(page);
  await startFarming(page);
  await page.waitForTimeout(800);
  // the menu → title screen saves
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Title screen' }).click();
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.every(k => k.startsWith(PREFIX))).toBe(true);
  expect(keys).toContain(`${PREFIX}save`);
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), `${PREFIX}save`);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Keep farming' })).toBeVisible();
  await page.getByRole('button', { name: 'Keep farming' }).click();
  expect((await snapshot(page)).t).toBeGreaterThanOrEqual(saved.t);
  expect(problems).toEqual([]);
});

test('the capture route shows the farm without touching saves', async ({ page }) => {
  const problems = watch(page);
  await open(page, 'scene=farm&seed=7&yaw=1');
  await expect.poll(async () => (await snapshot(page)).screen).toBe('farm');
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect((await snapshot(page)).capture).toBe(true);
  expect(problems).toEqual([]);
});

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
  await expect(page.getByRole('heading', { name: /can’t show the farm/ })).toBeVisible();
  expect(problems).toEqual([]);
});

test('runs inside a sandboxed iframe like on the website', async ({ page }) => {
  const problems = watch(page);
  await page.route('**/host.html', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><iframe src="/?quality=low" sandbox="allow-scripts allow-same-origin allow-pointer-lock" allow="fullscreen; gamepad" style="width:960px;height:540px;border:0"></iframe>' }));
  await page.goto('/host.html');
  const frame = page.frameLocator('iframe');
  await expect(frame.getByRole('heading', { name: /Farm WIP/ })).toBeVisible();
  await frame.getByRole('button', { name: /farming/i }).click();
  await expect(frame.locator('#hud')).toBeVisible();
  expect(problems).toEqual([]);
});
