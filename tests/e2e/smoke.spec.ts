import { expect, test } from '@playwright/test';
import { boot, watchErrors } from './helpers';

test('boots to the 3D title screen without errors or network requests', async ({ page }) => {
  const errors: string[] = [];
  const external: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('request', (r) => {
    const url = r.url();
    if (!url.startsWith('http://localhost:4392') && !url.startsWith('data:') && !url.startsWith('blob:')) external.push(url);
  });
  const start = Date.now();
  await page.goto('/?debug');
  await expect(page.getByTestId('btn-play')).toBeVisible();
  const elapsed = Date.now() - start;
  console.log(`[${test.info().project.name}] title visible after ${elapsed} ms`);
  expect(elapsed).toBeLessThan(15000);
  // The world is drawn by Three.js on a WebGL2 canvas.
  const gl = await page.evaluate(() => {
    const c = document.getElementById('stage3') as HTMLCanvasElement | null;
    const S = (window as unknown as { __spacesky: { game: { r3: { renderer: { getContext: () => WebGL2RenderingContext }; tier: string }; sceneName: string } } }).__spacesky;
    return { visible: !!c && c.style.display !== 'none' && c.width > 0, webgl2: S.game.r3.renderer.getContext() instanceof WebGL2RenderingContext, tier: S.game.r3.tier, scene: S.game.sceneName };
  });
  expect(gl).toMatchObject({ visible: true, webgl2: true, scene: 'title' });
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('shows a friendly screen when WebGL 2 is not available', async ({ page }) => {
  const errors = watchErrors(page);
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (type === 'webgl2') return null;
      return (orig as (...a: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof orig;
  });
  await page.goto('/');
  await expect(page.getByTestId('no-webgl')).toBeVisible();
  await expect(page.getByTestId('no-webgl')).toContainText("can’t run Space Sky");
  await page.waitForTimeout(500);
  await expect(page.getByTestId('btn-play')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('graphics quality can be switched in settings', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page);
  const tier = () => page.evaluate(() => (window as unknown as { __spacesky: { game: { r3: { tier: string } } } }).__spacesky.game.r3.tier);
  for (const q of ['low', 'medium', 'high']) {
    await page.getByTestId('btn-settings').click({ force: true });
    await page.getByTestId(`set-quality-${q}`).click({ force: true });
    await page.getByTestId('btn-settings-done').click({ force: true });
    expect(await tier()).toBe(q);
    await page.waitForTimeout(300);
  }
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('spacesky.settings') ?? '{}').quality);
  expect(saved).toBe('high');
  expect(errors).toEqual([]);
});
