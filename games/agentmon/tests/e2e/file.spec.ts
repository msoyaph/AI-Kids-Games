import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { snap, watch } from './helpers';

test('works opened straight from the file (file://), with no network', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium-desktop' && info.project.name !== 'webkit-desktop', 'one check per browser');
  const problems = watch(page);
  await page.goto(pathToFileURL(resolve('dist/index.html')).href + '?fasttext');
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible({ timeout: 20_000 });
  await page.goto(pathToFileURL(resolve('dist/index.html')).href + '?scene=battle&seed=7');
  await expect.poll(async () => (await snap(page)).ready, { timeout: 20_000 }).toBe(true);
  expect(problems).toEqual([]);
});
