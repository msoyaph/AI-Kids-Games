import { expect, test } from './fixtures';
import { check, open } from './layout';
import { cellCenter, expectClean, guard, isTouch, tap, testState, waitForGame } from './helpers';

/**
 * Layout check for every language: no clipped, cut-off or ellipsised text on
 * any menu, modal or HUD, on phones and desktop. The pseudo-locale (accented,
 * +40 % longer) stands in for future languages and also reveals any text that
 * skipped translation.
 */
const LOCALES = ['en', 'fil', 'pseudo'] as const;
const PROJECTS = ['desktop', 'phone-landscape', 'phone-portrait'];

for (const locale of LOCALES) {
  test(`menus fit [${locale}]`, async ({ page, baseURL }, info) => {
    test.skip(!PROJECTS.includes(info.project.name));
    const g = guard(page, baseURL!);
    await open(page, `lang=${locale}`);
    await check(page, 'title', locale);
    for (const screen of ['worlds', 'encyclopedia', 'badges', 'settings', 'research', 'daily', 'workshop']) {
      await open(page, `lang=${locale}&screen=${screen}`);
      await check(page, screen, locale);
    }
    // every codex tab
    await open(page, `lang=${locale}&screen=encyclopedia`);
    const tabs = page.getByRole('tab');
    for (let i = 1; i < (await tabs.count()); i++) {
      await tabs.nth(i).click();
      await check(page, `codex tab ${i}`, locale);
    }
    // map workshop editor
    await open(page, `lang=${locale}&screen=workshop`);
    await page.locator('.row.left .btn.green').click();
    await expect(page.locator('.ws-grid')).toBeVisible();
    await check(page, 'workshop editor', locale);
    // mission briefing
    await open(page, `lang=${locale}&brief=w1m2`);
    await expect(page.locator('.modal')).toBeVisible();
    await check(page, 'briefing', locale);
    expectClean(g);
  });

  test(`battle HUD fits [${locale}]`, async ({ page, baseURL }, info) => {
    test.skip(!PROJECTS.includes(info.project.name));
    const g = guard(page, baseURL!);
    await page.goto(`/?lang=${locale}&map=w1m1&diff=normal`);
    await waitForGame(page);
    // the first element pick opens on its own
    await expect(page.locator('.el-grid button').first()).toBeVisible();
    await check(page, 'element pick', locale);
    await page.locator('.el-grid button').first().click();
    await check(page, 'hud', locale);
    // build drawer (behind the Build button on short screens)
    const fab = page.locator('.build-fab button');
    if (await fab.isVisible()) await fab.click();
    await page.locator('.drawer button.card').first().click({ timeout: 10_000 });
    await check(page, 'build selected', locale);
    // place it, then open the tower panel (stat table with upgrade deltas)
    const c = await cellCenter(page, 6, 4);
    await tap(page, info, c.x, c.y);
    if (isTouch(info)) await page.locator('.confirm .btn.green').click();
    await expect.poll(async () => (await testState(page)).towers).toBe(1);
    await page.keyboard.press('Escape').catch(() => {});
    await tap(page, info, c.x, c.y);
    await expect(page.locator('.tpanel')).toBeVisible();
    await check(page, 'tower panel', locale);
    await page.keyboard.press('Escape').catch(() => {});
    await page.keyboard.press('p');
    await expect(page.getByRole('dialog')).toBeVisible();
    await check(page, 'pause', locale);
    expectClean(g);
  });
}

test('the language picker switches, remembers and follows the device', async ({ page, baseURL }, info) => {
  test.skip(info.project.name !== 'desktop');
  const g = guard(page, baseURL!);
  await open(page, 'screen=settings');
  await expect(page.locator('h2')).toHaveText('Settings');
  await page.locator('button[lang="fil"]').click();
  await expect(page.locator('h2')).toHaveText('Mga Setting');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fil');
  // saved: a fresh load comes back in Filipino
  await open(page, '');
  await expect(page.getByRole('button', { name: /Kampanya/ })).toBeVisible();
  // back to the device language (English in this browser)
  await open(page, 'screen=settings');
  await page.locator('.seg button').first().click();
  await expect(page.locator('h2')).toHaveText('Settings');
  expectClean(g);
});
