import { test, expect } from '@playwright/test';
import { boot, quickRace, watch } from './helpers';

test('playtest mode: badge, records a race, export and clear', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'runs once');
  const w = watch(page);
  await boot(page, '/?playtest=1');
  await expect(page.locator('.playtest-badge')).toBeVisible();
  await expect(page.locator('.playtest-badge')).toHaveText(/Playtest recording on/);
  await quickRace(page);
  await page.evaluate(() => (window.__calex.app.loop.timeScale = 4));
  await page.waitForFunction(() => window.__calex.app.session?.world.raceTime > 8, null, { timeout: 30_000 });
  await page.evaluate(() => window.__calex.app.quitToMenu());
  const log = await page.evaluate(() => JSON.parse(localStorage.getItem('calexcart.playtest') ?? '[]'));
  expect(log.length).toBe(1);
  expect(log[0].quit).toBe(true);
  expect(log[0].track).toBe('seashell-boardwalk');
  expect(log[0].p[0].racer).toBe('calex');
  expect(JSON.stringify(log)).not.toContain('E2E'); // no save names
  // Settings → Playtest tab
  await page.evaluate(() => window.__calex.app.screens.settings(() => window.__calex.app.screens.mainMenu()));
  await page.locator('.ui-root [data-nav]').filter({ hasText: 'Playtest' }).first().click();
  await expect(page.getByText(/1 races/)).toBeVisible();
  const download = page.waitForEvent('download');
  await page.locator('.ui-root [data-nav]').filter({ hasText: 'Export playtest data' }).click();
  const d = await download;
  expect(d.suggestedFilename()).toMatch(/^calex-cart-playtest-\d{8}\.json$/);
  await page.locator('.ui-root [data-nav]').filter({ hasText: 'Clear playtest data' }).click();
  await page.locator('.ui-root [data-nav]').filter({ hasText: /^Yes$/ }).click();
  expect(await page.evaluate(() => localStorage.getItem('calexcart.playtest'))).toBeNull();
  // turning it off hides the badge
  await page.evaluate(() => {
    const a = window.__calex.app;
    a.saves.settings.playtest = false;
    a.saveSettings();
  });
  await expect(page.locator('.playtest-badge')).toBeHidden();
  expect(w.errors).toEqual([]);
  expect(w.external).toEqual([]);
});

test('playtest export inside the sandboxed iframe shows a copy box', async ({ browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'runs once');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const host = await ctx.newPage();
  await host.route('http://localhost:4173/__host.html', (r) =>
    r.fulfill({
      contentType: 'text/html',
      body: `<html><body style="margin:0;background:#000"><iframe id="g" src="http://localhost:4173/?playtest=1" sandbox="allow-scripts allow-pointer-lock allow-same-origin" style="width:1000px;height:600px;border:0"></iframe></body></html>`,
    }),
  );
  await host.goto('http://localhost:4173/__host.html');
  const frame = host.frameLocator('#g');
  await expect(frame.locator('.big-logo')).toBeVisible({ timeout: 20_000 });
  await expect(frame.locator('.playtest-badge')).toBeVisible();
  const g = host.frames().find((f) => f.url().startsWith('http://localhost:4173/?playtest'))!;
  await g.evaluate(() => {
    const a = window.__calex.app;
    a.saves.create(1, 'Frame');
    a.screens.settings(() => a.screens.mainMenu(), 'playtest');
  });
  await frame.locator('.ui-root [data-nav]').filter({ hasText: 'Export playtest data' }).click();
  const area = frame.locator('.playtest-export textarea');
  await expect(area).toBeVisible();
  const text = await area.inputValue();
  expect(JSON.parse(text).game).toBe('calex-cart');
  await ctx.close();
});
