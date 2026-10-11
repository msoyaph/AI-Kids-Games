import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { cellCenter, pickTower, expectClean, guard, isTouch, testState, waitForGame } from './helpers';

// The Ai Kids Games site embeds the single HTML file like this.
const SANDBOX = 'allow-scripts allow-pointer-lock allow-same-origin';

test('runs inside a sandboxed iframe (touch, storage, fullscreen permission)', async ({ page, baseURL }, info) => {
  const g = guard(page, baseURL!);
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#000">
    <iframe id="host-frame" src="${baseURL}/" sandbox="${SANDBOX}" allow="fullscreen; autoplay" style="border:0;width:100vw;height:100vh"></iframe></body></html>`);
  const frame = page.frameLocator('#host-frame');
  await expect(frame.locator('.logo')).toBeVisible({ timeout: 30_000 });
  const f = page.frames().find((x) => x.url().startsWith(baseURL!))!;
  expect(await f.evaluate(() => document.fullscreenEnabled)).toBe(true);
  expect(await f.evaluate(() => { localStorage.setItem('probe', '1'); return localStorage.getItem('probe'); })).toBe('1');
  // play inside the frame
  await f.goto(`${baseURL}/?map=w1m1`);
  await waitForGame(f);
  await frame.getByRole('button', { name: 'Light', exact: true }).click();
  await pickTower(frame, /Arrow Post/);
  const c = await cellCenter(f, 6, 4);
  const box = await page.locator('#host-frame').boundingBox();
  const x = box!.x + c.x;
  const y = box!.y + c.y;
  if (isTouch(info)) {
    await page.touchscreen.tap(x, y);
    await frame.getByRole('button', { name: 'Build here' }).click();
  } else await page.mouse.click(x, y);
  await expect.poll(async () => (await testState(f)).towers).toBe(1);
  expectClean(g);
});

test('dist/index.html works when opened from disk (file://)', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'one browser is enough');
  const files = readFileSync('dist/index.html', 'utf8');
  expect(files.length).toBeGreaterThan(100_000);
  const g = guard(page, 'file://');
  await page.goto('file://' + process.cwd() + '/dist/index.html');
  await expect(page.locator('.logo')).toBeVisible();
  await page.getByRole('button', { name: /Book/ }).click();
  await expect(page.getByText('Arrow Post')).toBeVisible();
  expectClean(g);
});
