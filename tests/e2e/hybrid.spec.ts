import { expect, test } from '@playwright/test';
import { emulateTouchLaptop, Fingers } from './touchHelpers';

/**
 * Hybrid devices (touchscreen laptop / iPad with a keyboard): the glass controls show when
 * the player touches the screen and hide as soon as they use a key, the mouse or a pad —
 * back and forth mid-run, without pausing or leaving anything held.
 */
test.use({ hasTouch: true });

type G = {
  world: { time: number; player: { x: number; z: number } } | null;
  paused: boolean;
  renderer: { quality: string };
  input: { touchMode: boolean };
};
const game = (page: import('@playwright/test').Page): Promise<G> =>
  page.evaluate(() => {
    const g = (window as unknown as { __theabonk: G }).__theabonk;
    return { world: g.world ? { time: g.world.time, player: { x: g.world.player.x, z: g.world.player.z } } : null, paused: g.paused, renderer: { quality: g.renderer.quality }, input: { touchMode: g.input.touchMode } };
  });

test('a touchscreen laptop switches between touch and keyboard / mouse mid-run', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'real touches need Chromium (CDP)');
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(m.text());
  });
  await emulateTouchLaptop(page);
  await page.goto('/?seed=7');
  await page.waitForFunction(() => (window as unknown as { __theabonk?: unknown }).__theabonk, null, { timeout: 60_000 });
  const html = page.locator('html');
  // a laptop starts as a laptop: desktop tier, no touch styling
  await expect(html).not.toHaveClass(/\btouch\b/);
  expect((await game(page)).renderer.quality).not.toBe('tablet');

  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByRole('button', { name: 'Start run' }).click();
  await expect(page.locator('.hud')).toBeVisible();
  const controls = page.locator('.touch-ui');
  await expect(controls).toBeHidden();

  // touch the screen: the controls appear and the run keeps going
  const f = await Fingers.attach(page);
  const vp = page.viewportSize()!;
  await f.tap(vp.width * 0.5, vp.height * 0.5);
  await expect(html).toHaveClass(/\btouch\b/);
  await expect(controls).toBeVisible();
  expect((await game(page)).paused).toBe(false);

  // the left-side stick works with a real finger
  const before = (await game(page)).world!.player;
  await f.down(1, vp.width * 0.18, vp.height * 0.7);
  await f.drag(1, vp.width * 0.18, vp.height * 0.7 - 90);
  await page.waitForTimeout(700);
  await f.up(1);
  const after = (await game(page)).world!.player;
  expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(1);

  // a key: back to keyboard — controls hide, still running, the key moves Thea
  await page.keyboard.down('KeyW');
  await expect(html).not.toHaveClass(/\btouch\b/);
  await expect(controls).toBeHidden();
  const k0 = (await game(page)).world!.player;
  await page.waitForTimeout(600);
  await page.keyboard.up('KeyW');
  const k1 = (await game(page)).world!.player;
  expect(Math.hypot(k1.x - k0.x, k1.z - k0.z)).toBeGreaterThan(1);
  expect((await game(page)).paused).toBe(false);

  // touch again, then a real mouse move (after the emulated-mouse window) → desktop
  await f.tap(vp.width * 0.5, vp.height * 0.4);
  await expect(controls).toBeVisible();
  await page.waitForTimeout(900);
  await page.mouse.move(400, 300);
  await page.mouse.move(460, 330, { steps: 4 });
  await expect(controls).toBeHidden();
  expect((await game(page)).input.touchMode).toBe(false);
  expect((await game(page)).paused).toBe(false);
  expect(problems, problems.join('\n')).toEqual([]);
});
