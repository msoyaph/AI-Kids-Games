import { expect, test } from '@playwright/test';
import path from 'node:path';
import { watchErrors } from './helpers';

test('runs inside a sandboxed iframe like on Ai Kids Games', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#000">
    <iframe id="g" src="http://localhost:4392/index.html" sandbox="allow-scripts allow-pointer-lock allow-same-origin" allow="fullscreen; gamepad; autoplay" style="width:100vw;height:100vh;border:0"></iframe>
  </body></html>`);
  const frame = page.frameLocator('#g');
  await expect(frame.getByTestId('btn-play')).toBeVisible({ timeout: 30_000 });
  await frame.getByTestId('btn-play').click();
  await expect(frame.getByTestId('slot-0')).toBeVisible();
  await frame.getByTestId('slot-0').click();
  await expect(frame.getByTestId('name-input')).toBeVisible();
  expect(errors).toEqual([]);
});

test('works when the file is opened directly (double-click)', async ({ page }) => {
  const errors = watchErrors(page);
  const file = path.resolve('dist/index.html');
  await page.goto(`file://${file}`);
  await expect(page.getByTestId('btn-play')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('btn-play').click();
  await expect(page.getByTestId('slot-0')).toBeVisible();
  expect(errors).toEqual([]);
});
