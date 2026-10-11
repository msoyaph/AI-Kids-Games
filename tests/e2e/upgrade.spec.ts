import { test, expect } from '@playwright/test';
import { boot, quickRace, watch } from './helpers';

test('playtest mode: badge, records a race, export and clear', async ({ page }, info) => {
  test.skip(!info.project.name.endsWith('desktop'), 'runs once');
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
  test.skip(!info.project.name.endsWith('desktop'), 'runs once');
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

test('recovers from a lost WebGL context with "Tap to continue"', async ({ page }, info) => {
  const w = watch(page);
  await boot(page);
  await quickRace(page);
  await page.waitForFunction(() => window.__calex.app.session?.world.phase === 'race', null, { timeout: 20_000 });
  const lost = await page.evaluate(() => {
    const c = document.getElementById('gl') as HTMLCanvasElement;
    const gl = (c.getContext('webgl2') ?? c.getContext('webgl')) as WebGLRenderingContext | null;
    const ext = gl?.getExtension('WEBGL_lose_context');
    if (!ext) return false;
    (window as unknown as { __lose: WEBGL_lose_context }).__lose = ext;
    ext.loseContext();
    return true;
  });
  test.skip(!lost, 'WEBGL_lose_context not available in this browser');
  await expect(page.locator('.ctx-lost')).toBeVisible();
  expect(await page.evaluate(() => window.__calex.app.loop.simPaused)).toBe(true);
  const t0 = await page.evaluate(() => window.__calex.app.session.world.raceTime);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__calex.app.session.world.raceTime)).toBe(t0); // frozen while lost
  await page.evaluate(() => (window as unknown as { __lose: WEBGL_lose_context }).__lose.restoreContext());
  const btn = page.locator('.ctx-lost button');
  await expect(btn).toHaveText(/Tap to continue/);
  if (info.project.name.endsWith('desktop')) await btn.click();
  else await btn.tap();
  await expect(page.locator('.ctx-lost')).toHaveCount(0);
  await page.waitForFunction((t) => window.__calex.app.session.world.raceTime > t + 0.5, t0, { timeout: 10_000 });
  // still rendering: draw calls are being issued again
  await page.waitForFunction(() => window.__calex.app.gr.stats().calls > 5, null, { timeout: 10_000 });
  expect(w.errors.filter((e) => !/context/i.test(e))).toEqual([]);
});

test('performance test runs from the URL and reports numbers', async ({ page }) => {
  const w = watch(page);
  await page.goto('/?bench=1&seconds=4&quality=low');
  await expect(page.locator('.bench-card')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('.bench-card')).toContainText('average FPS');
  const r = await page.evaluate(() => (window.__calex as unknown as { lastBench: { avgFps: number; maxDraws: number; timeline: unknown[] } }).lastBench);
  expect(r.avgFps).toBeGreaterThan(5);
  expect(r.maxDraws).toBeGreaterThan(5);
  expect(r.timeline.length).toBeGreaterThanOrEqual(3);
  // nothing saved: no slot was created by the test
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('calexcart.slot')).length)).toBe(0);
  expect(w.errors).toEqual([]);
  expect(w.external).toEqual([]);
});
