import { expect, test, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

/** Low-quality CI mode (software rendering): ?quality=low and longer waits. */
const LOW = !!process.env.E2E_LOW;
const Q = LOW ? '?quality=low' : '';
const wait = (page: Page, ms: number) => page.waitForTimeout(LOW ? ms * 3 : ms);

/** Software GL is only used for headless CI; its "slow readPixels" warnings are not game errors. */
const IGNORE = [/GPU stall due to ReadPixels/i, /swiftshader/i, /WebGL.*performance/i];

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !IGNORE.some((re) => re.test(m.text()))) errors.push(m.text());
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
  await page.goto(`/${Q}`);
  await expect(page.locator('.logo')).toContainText('Light Crossing');
  await newGame(page);
  // dismiss the opening narration
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Enter');
    await wait(page, 400);
  }
  const before = await page.evaluate(() => {
    const p = (window as unknown as { __lc: { game: { state: { player: { x: number; z: number } } } } }).__lc.game.state.player;
    return { x: p.x, z: p.z };
  });
  await page.keyboard.down('KeyW');
  await wait(page, 1500);
  if (LOW)
    await page.waitForFunction(
      (b) => {
        const p = (window as unknown as { __lc: { game: { state: { player: { x: number; z: number } } } } }).__lc.game.state.player;
        return Math.hypot(p.x - b.x, p.z - b.z) > 1;
      },
      before,
      { timeout: 120_000 },
    );
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
    await wait(page, 1200);
    await page.keyboard.up(k);
    if (s === 3) {
      await page.keyboard.press('Tab');
      await wait(page, 800);
      await page.keyboard.press('Escape');
    }
    if (s === 6) {
      await page.keyboard.press('KeyI');
      await wait(page, 800);
      await page.keyboard.press('Escape');
    }
    await wait(page, 1800);
  }
  expect(errors).toEqual([]);
});

test('the single-file build runs from file:// and inside a sandboxed iframe', async ({ page }) => {
  const errors = collectErrors(page);
  const file = pathToFileURL(resolve('dist/index.html')).href + Q;
  await page.goto(file);
  await expect(page.locator('.logo')).toContainText('Light Crossing');
  await newGame(page);
  await wait(page, 1500);
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
  await wait(page, 3000);
  expect(errors).toEqual([]);
});

test('a save made inside Lantern Hall comes back inside after a reload, under lightcrossing.* keys', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(`/${Q}`);
  await newGame(page);
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Enter');
    await wait(page, 300);
  }
  type G = { state: { player: Record<string, unknown> & { x: number; z: number }; clock: { day: number } }; runtime: { interior?: { room: { kind: string } } } };
  type A = { game: G; saveNow(quiet?: boolean): boolean; debugStep(n: number): void };
  // step inside Lantern Hall (as the door would) and save
  const saved = await page.evaluate(() => {
    const app = (window as unknown as { __lc: A }).__lc;
    const p = app.game.state.player;
    p.location = 'hall';
    p.indoor = { x: 3.5, z: 5.5, facing: 0, ret: { x: p.x, z: p.z, facing: 0 } };
    return app.saveNow(true);
  });
  expect(saved).toBe(true);
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.length).toBeGreaterThan(0);
  expect(keys.filter((k) => !k.startsWith('lightcrossing.'))).toEqual([]);
  expect(keys).toContain('lightcrossing.slot0');
  const size = await page.evaluate(() => localStorage.getItem('lightcrossing.slot0')!.length);
  expect(size).toBeLessThan(300 * 1024);

  await page.reload();
  await page.getByRole('button', { name: /Start|Continue/ }).click();
  await page.getByRole('button', { name: 'Continue' }).first().click();
  await page.waitForFunction(() => !!(window as unknown as { __lc: A }).__lc.game);
  await wait(page, 1500);
  const back = await page.evaluate(() => {
    const g = (window as unknown as { __lc: A }).__lc.game;
    return { location: g.state.player.location, room: g.runtime.interior?.room.kind ?? null };
  });
  expect(back).toEqual({ location: 'hall', room: 'hall' });
  expect(errors).toEqual([]);
});
