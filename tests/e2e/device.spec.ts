import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { expectClean, guard, testState, waitForGame } from './helpers';

/** Device & playtest tools: playtest recording/export, performance test, GPU context loss. */

const only = (name: string) => (info: { project: { name: string } }) => test.skip(info.project.name !== name);

async function startMatch(page: Page, query: string): Promise<void> {
  await page.goto(`/?${query}`);
  await waitForGame(page);
  await page.locator('.el-grid button').first().click();
}

test('playtest mode records runs on the device and exports them', async ({ page, baseURL }, info) => {
  only('desktop')(info);
  const g = guard(page, baseURL!);
  await page.goto('/?playtest=1');
  const chip = page.locator('.playtest-btn');
  await expect(chip).toHaveText('Playtest · 0 runs');
  // play a little, then leave from the pause menu (a "quit" run)
  await startMatch(page, 'map=w1m1&diff=easy');
  await page.getByRole('button', { name: 'Send next wave' }).click();
  await expect.poll(async () => (await testState(page)).wave).toBe(1);
  await page.keyboard.press('p');
  await page.getByRole('button', { name: 'Sector map' }).click();
  await page.goto('/');
  await expect(chip).toHaveText('Playtest · 1 run');
  await chip.click();
  const box = page.locator('textarea.share-code');
  await expect(box).toBeVisible();
  const json = JSON.parse(await box.inputValue()) as { format: string; runs: { map: string; result: string; wave: number }[] };
  expect(json.format).toBe('vanex-defense-playtest');
  expect(json.runs[0]).toMatchObject({ map: 'w1m1', result: 'quit', wave: 1 });
  // only vanex-defense- keys in storage
  const keys = await page.evaluate(() => Object.keys(localStorage));
  for (const k of keys) expect(k.startsWith('vanex-defense-')).toBe(true);
  expect(keys).toContain('vanex-defense-playtest');
  // delete + stop removes the key again
  await page.getByRole('button', { name: 'Delete recorded runs' }).click();
  await chip.click();
  await page.getByRole('button', { name: 'Stop recording' }).click();
  await expect(chip).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('vanex-defense-playtest'))).toBeNull();
  expectClean(g);
});

test('Settings → Test performance measures this device', async ({ page, baseURL }, info) => {
  only('desktop')(info);
  test.setTimeout(90_000);
  const g = guard(page, baseURL!);
  await page.goto('/?screen=settings');
  await page.getByRole('button', { name: 'Test performance' }).click();
  await expect(page.locator('.perf-run')).toBeVisible();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Performance results', { timeout: 40_000 });
  await expect(dialog).toContainText('fps');
  await expect(dialog).toContainText('constructs');
  // benchmarks never earn badges
  expect(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('vanex-defense-save') ?? '{"achievements":{}}').achievements ?? {}).length)).toBe(0);
  await dialog.getByRole('button', { name: 'OK' }).click();
  await expect(page.locator('h2')).toHaveText('Settings');
  expectClean(g);
});

test('losing the GPU context pauses the match and recovers', async ({ page, baseURL }, info) => {
  only('desktop')(info);
  const g = guard(page, baseURL!);
  await startMatch(page, 'map=w1m1&diff=easy');
  const lose = (fn: 'loseContext' | 'restoreContext') =>
    page.evaluate((f) => {
      const c = document.querySelector('#game canvas') as HTMLCanvasElement;
      const gl = (c.getContext('webgl2') ?? c.getContext('webgl')) as WebGLRenderingContext;
      const ext = gl.getExtension('WEBGL_lose_context')!;
      (window as unknown as { __ext: WEBGL_lose_context }).__ext ??= ext;
      (window as unknown as { __ext: WEBGL_lose_context }).__ext[f]();
    }, fn);
  await lose('loseContext');
  await expect(page.locator('.gfx-overlay')).toBeVisible();
  await expect(page.locator('.gfx-overlay')).toContainText('Graphics paused');
  expect((await testState(page)).modal).toBe(true); // the match is paused under the overlay
  await lose('restoreContext');
  await page.getByRole('button', { name: 'Tap to continue' }).click();
  await expect(page.locator('.gfx-overlay')).toHaveCount(0);
  // the board still renders and plays: resume and send a wave
  await page.getByRole('button', { name: /Resume/ }).click();
  await page.getByRole('button', { name: 'Send next wave' }).click();
  await expect.poll(async () => (await testState(page)).enemies, { timeout: 20_000 }).toBeGreaterThan(0);
  expectClean(g);
});
