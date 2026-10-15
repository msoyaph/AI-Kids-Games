import { expect, test } from '@playwright/test';
import { open, snapshot, watch } from './helpers';

test('a new farm starts with Hattie, then the first goal and a tip that never blocks the farm', async ({ page }) => {
  const problems = watch(page);
  await open(page);
  await page.getByRole('button', { name: /farming/i }).click();
  const card = page.locator('.story-card');
  await expect(card).toContainText('Hattie');
  // the clock stops while she talks
  const t0 = (await snapshot(page)).t;
  await page.waitForTimeout(500);
  expect((await snapshot(page)).t).toBe(t0);
  for (let i = 0; i < 8 && (await card.count()); i++) await card.locator('button.primary').click();
  await expect(card).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Goals' })).toContainText('Clear 6 bits of old clutter');
  // a tip arrives as a small card; the farm keeps running under it
  await expect(page.locator('.tip-card')).toBeVisible({ timeout: 8000 });
  const t1 = (await snapshot(page)).t;
  await expect.poll(async () => (await snapshot(page)).t).toBeGreaterThan(t1 + 0.3);
  await page.locator('.tip-card button').click();
  await expect(page.locator('.tip-card')).toHaveCount(0);
  expect(problems).toEqual([]);
});

test('number keys pick the tool their label shows, and T moves focus into the tool bar', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard on computers');
  const problems = watch(page);
  await open(page);
  await page.getByRole('button', { name: /farming/i }).click();
  for (let i = 0; i < 8 && (await page.locator('.story-card').count()); i++) await page.locator('.story-card button.primary').click();
  await page.locator('#farm').focus();
  // Shop is labelled 7, Build 8 and Town 9
  await page.keyboard.press('Digit7');
  await expect(page.getByRole('dialog', { name: /Shop/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Digit9');
  await expect(page.getByRole('dialog', { name: /Town/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('#farm').focus();
  await page.keyboard.press('KeyT');
  await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('nav.toolbar'))).toBe(true);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await snapshot(page)).tool).toBe('plow');
  expect(problems).toEqual([]);
});
