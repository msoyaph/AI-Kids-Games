import { expect, test } from '@playwright/test';
import { expectClean, guard, waitForGame } from './helpers';
import { check, open } from './layout';

/**
 * Accessibility: large text + high contrast layouts, remapped keys, reduced
 * motion. (Flash safety: flash.spec.ts.)
 */

const PROJECTS = ['desktop', 'phone-landscape', 'phone-portrait'];

for (const locale of ['en', 'fil'] as const) {
  test(`largest text + high contrast still fit [${locale}]`, async ({ page, baseURL }, info) => {
    test.skip(!PROJECTS.includes(info.project.name));
    const g = guard(page, baseURL!);
    await open(page, `lang=${locale}&screen=settings`);
    await page.getByRole('radio', { name: '130%' }).click();
    // high contrast: the On button of the contrast row
    await page
      .locator('.setting', {
        has: page.locator('label', {
          hasText: locale === 'en' ? 'High contrast' : 'Mataas na contrast',
        }),
      })
      .getByRole('radio')
      .first()
      .click();
    await expect(page.locator('html')).toHaveClass(/large-text/);
    await expect(page.locator('html')).toHaveClass(/\bhc\b/);
    await check(page, 'settings', locale);
    for (const screen of ['worlds', 'encyclopedia', 'research', 'workshop']) {
      await open(page, `lang=${locale}&screen=${screen}`);
      await check(page, screen, locale);
    }
    await open(page, `lang=${locale}&brief=w1m2`);
    await check(page, 'briefing', locale);
    await page.goto(`/?lang=${locale}&map=w1m1&diff=normal`);
    await waitForGame(page);
    await page.locator('.el-grid button').first().click();
    await check(page, 'hud', locale);
    expectClean(g);
  });
}

test('remapped keys work in a match and show on the HUD', async ({ page, baseURL }, info) => {
  test.skip(info.project.name !== 'desktop');
  const g = guard(page, baseURL!);
  await open(page, 'screen=settings');
  // Pause: P → O
  await page.getByRole('button', { name: /^Pause:/ }).click();
  await expect(page.getByRole('button', { name: /^Pause:/ })).toHaveText('Press a key…');
  await page.keyboard.press('o');
  await expect(page.getByRole('button', { name: /^Pause:/ })).toHaveText('O');
  // Build slot 1: 1 → B
  await page.getByRole('button', { name: /^Build slot 1:/ }).click();
  await page.keyboard.press('b');
  await expect(page.getByRole('button', { name: /^Build slot 1:/ })).toHaveText('B');
  // reserved keys are refused
  await page.getByRole('button', { name: /^Sell tower:/ }).click();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: /^Sell tower:/ })).toHaveText('S');

  await page.goto('/?map=w1m1&diff=normal');
  await waitForGame(page);
  await page.locator('.el-grid button').first().click();
  await expect(page.locator('.drawer button.card').first().locator('.key')).toHaveText('B');
  await page.keyboard.press('p'); // no longer pause
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.keyboard.press('o');
  await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible();
  await page.keyboard.press('o');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expectClean(g);
});

test('reduced motion follows the system by default and can be overridden', async ({ page, baseURL }, info) => {
  test.skip(info.project.name !== 'desktop');
  const g = guard(page, baseURL!);
  // Playwright runs with prefers-reduced-motion: reduce (see playwright.config.ts)
  await open(page, 'screen=settings');
  await expect(page.locator('html')).toHaveClass(/\brm\b/);
  const row = page.locator('.setting', {
    has: page.locator('label', { hasText: 'Reduced motion' }),
  });
  await row.getByRole('radio', { name: 'Off' }).click();
  await expect(page.locator('html')).not.toHaveClass(/\brm\b/);
  await row.getByRole('radio', { name: /System/ }).click();
  await expect(page.locator('html')).toHaveClass(/\brm\b/);
  expectClean(g);
});
