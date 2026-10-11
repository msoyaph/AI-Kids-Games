import { expect, test } from '@playwright/test';

test('boots to the title screen without errors or network requests', async ({ page }) => {
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
  await page.goto('/');
  await expect(page.getByTestId('btn-play')).toBeVisible();
  const elapsed = Date.now() - start;
  console.log(`[${test.info().project.name}] title visible after ${elapsed} ms`);
  // Headless Chromium renders WebGL in software, so this is far slower than a real tablet.
  expect(elapsed).toBeLessThan(15000);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
