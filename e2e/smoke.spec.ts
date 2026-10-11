import { expect, test, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

async function newGame(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Start|Continue/ }).click();
  await page.getByText('New Game').first().click();
  await page.getByRole('button', { name: 'Set sail!' }).click();
  await page.waitForFunction(() => {
    const app = (window as unknown as { __lc: { game: unknown } }).__lc;
    return !!app && !!app.game;
  });
}

test('new game starts, the player walks, and there are no console errors for 30s', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.locator('.logo')).toContainText('Light Crossing');
  await newGame(page);
  // dismiss the opening narration
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
  }
  const before = await page.evaluate(() => {
    const p = (window as unknown as { __lc: { game: { state: { player: { x: number; z: number } } } } }).__lc.game.state.player;
    return { x: p.x, z: p.z };
  });
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(1500);
  await page.keyboard.up('KeyW');
  const after = await page.evaluate(() => {
    const p = (window as unknown as { __lc: { game: { state: { player: { x: number; z: number } } } } }).__lc.game.state.player;
    return { x: p.x, z: p.z };
  });
  expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(1);
  // keep playing for 30 seconds: wander around, open the Glowpad and pockets
  const keys = ['KeyA', 'KeyD', 'KeyS', 'KeyW'];
  for (let s = 0; s < 10; s++) {
    const k = keys[s % keys.length]!;
    await page.keyboard.down(k);
    await page.waitForTimeout(1200);
    await page.keyboard.up(k);
    if (s === 3) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(800);
      await page.keyboard.press('Escape');
    }
    if (s === 6) {
      await page.keyboard.press('KeyI');
      await page.waitForTimeout(800);
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(1800);
  }
  expect(errors).toEqual([]);
});

test('the single-file build runs from file:// and inside a sandboxed iframe', async ({ page }) => {
  const errors = collectErrors(page);
  const file = pathToFileURL(resolve('dist/index.html')).href;
  await page.goto(file);
  await expect(page.locator('.logo')).toContainText('Light Crossing');
  await newGame(page);
  await page.waitForTimeout(1500);
  expect(errors).toEqual([]);

  // sandboxed iframe without allow-same-origin: localStorage throws, saving falls back to memory
  const html = await (await page.request.get('/')).text();
  await page.setContent(`<!doctype html><html><body style="margin:0"><iframe id="f" sandbox="allow-scripts" style="width:1000px;height:680px;border:0"></iframe></body></html>`);
  await page.evaluate((src) => {
    (document.getElementById('f') as HTMLIFrameElement).srcdoc = src;
  }, html);
  const frame = page.frameLocator('#f');
  await expect(frame.locator('.logo')).toContainText('Light Crossing', { timeout: 30_000 });
  await frame.getByRole('button', { name: /Start|Continue/ }).click();
  await expect(frame.getByText('Saving is unavailable')).toBeVisible();
  await frame.getByText('New Game').first().click();
  await frame.getByRole('button', { name: 'Set sail!' }).click();
  await page.waitForTimeout(3000);
  expect(errors).toEqual([]);
});
