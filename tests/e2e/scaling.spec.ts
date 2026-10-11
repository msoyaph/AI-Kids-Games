import { expect, test } from '@playwright/test';

/**
 * Windows laptops usually run at 125% or 150% display scaling (devicePixelRatio 1.25 / 1.5).
 * The interface must fit and the canvas must render at a sensible resolution.
 */
for (const scale of [1.25, 1.5]) {
  test.describe(`display scaling ${scale * 100}%`, () => {
    test.use({ deviceScaleFactor: scale, viewport: { width: 1366, height: 768 } });

    test('menus fit, the canvas matches the scale, and a run starts cleanly', async ({ page }) => {
      const problems: string[] = [];
      page.on('pageerror', (e) => problems.push(e.message));
      page.on('console', (m) => {
        if (m.type() === 'error') problems.push(m.text());
      });
      // High pinned: 'auto' picks Low on CI's software renderer
      await page.goto('/?quality=high');
      const play = page.getByRole('button', { name: 'Play', exact: true });
      await expect(play).toBeVisible();
      const box = await play.boundingBox();
      expect(box && box.y + box.height).toBeLessThan(768);
      const canvas = await page.evaluate(() => {
        const c = document.querySelector('canvas#game') as HTMLCanvasElement;
        return { w: c.width, cw: c.clientWidth, dpr: window.devicePixelRatio };
      });
      expect(canvas.dpr).toBeCloseTo(scale, 2);
      // High quality renders at the device ratio (capped at 2)
      expect(canvas.w).toBe(Math.floor(canvas.cw * Math.min(scale, 2)));
      await play.click();
      await page.getByRole('button', { name: 'Start run' }).click();
      await expect(page.locator('.hud')).toBeVisible();
      await page.waitForTimeout(1500);
      // nothing in the HUD runs off-screen
      const overflow = await page.evaluate(() => [...document.querySelectorAll('.hud *')].some((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.right > window.innerWidth + 1 || r.bottom > window.innerHeight + 1);
      }));
      expect(overflow).toBe(false);
      expect(problems).toEqual([]);
    });
  });
}
