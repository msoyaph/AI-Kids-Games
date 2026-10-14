import { expect, test, type Page } from '@playwright/test';
import { open, snapshot, startFarming, tileOnScreen, watch } from './helpers';

async function tapTile(page: Page, x: number, z: number, isMobile: boolean) {
  const p = await tileOnScreen(page, x, z);
  if (isMobile) await page.touchscreen.tap(p.x, p.y);
  else await page.mouse.click(p.x, p.y);
}

test('plant a field, plant a row by dragging, pick the harvest and sell it', async ({ page, isMobile }) => {
  const problems = watch(page);
  await open(page, 'speed=40');
  await startFarming(page);
  // the hand on an empty field opens the seeds
  await tapTile(page, 41, 47, isMobile);
  await expect(page.getByRole('dialog', { name: 'Seeds' })).toBeVisible();
  await page.getByRole('button', { name: /^Wheat\./ }).click();
  await expect.poll(async () => (await snapshot(page)).fields.find(f => f.x === 41 && f.z === 47)?.crop).toBe('wheat');
  expect((await snapshot(page)).tool).toBe('seeds');
  // drag along the row: seeds go into every empty field under the finger
  const a = await tileOnScreen(page, 41, 48), b = await tileOnScreen(page, 43, 48);
  if (isMobile) {
    const cdp = await page.context().newCDPSession(page).catch(() => null);
    if (cdp) {
      const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
      await touch('touchStart', a.x, a.y);
      for (let i = 1; i <= 12; i++) await touch('touchMove', a.x + ((b.x - a.x) * i) / 12, a.y + ((b.y - a.y) * i) / 12);
      await touch('touchEnd', b.x, b.y);
    } else {
      for (const x of [41, 42, 43]) await tapTile(page, x, 48, isMobile);
    }
  } else {
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    for (let i = 1; i <= 12; i++) await page.mouse.move(a.x + ((b.x - a.x) * i) / 12, a.y + ((b.y - a.y) * i) / 12);
    await page.mouse.up();
  }
  await expect.poll(async () => (await snapshot(page)).fields.filter(f => f.z === 48 && f.crop === 'wheat').length).toBe(3);
  // back to the hand, wait for the wheat, pick it
  await page.getByRole('button', { name: /^Farm/ }).click();
  await expect.poll(async () => (await snapshot(page)).fields.find(f => f.x === 41 && f.z === 47)?.ready, { timeout: 30_000 }).toBe(true);
  await tapTile(page, 41, 47, isMobile);
  await expect.poll(async () => (await snapshot(page)).inv.wheat?.reduce((s, n) => s + n, 0) ?? 0).toBeGreaterThan(0);
  // sell it in the barn
  const coins = (await snapshot(page)).coins;
  await page.getByRole('button', { name: /^Barn/ }).click();
  await page.getByRole('button', { name: /^Sell all|^Sell one Wheat/ }).first().click();
  await expect.poll(async () => (await snapshot(page)).coins).toBeGreaterThan(coins);
  expect(problems).toEqual([]);
});
