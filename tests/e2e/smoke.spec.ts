import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

declare global {
  interface Window {
    __calex: { app: any };
  }
}

/** Collect console errors and any request that leaves localhost/file/data. */
function watch(page: Page): { errors: string[]; external: string[] } {
  const errors: string[] = [];
  const external: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    const u = r.url();
    if (!/^(http:\/\/localhost|file:|data:|blob:|about:)/.test(u)) external.push(u);
  });
  return { errors, external };
}

async function boot(page: Page, url = '/'): Promise<void> {
  await page.goto(url);
  await page.waitForFunction(() => !!window.__calex?.app);
  await expect(page.locator('#boot')).toBeHidden({ timeout: 15_000 });
}

/** Tap/click a menu button by visible text. */
async function press(page: Page, text: string | RegExp, isTouch: boolean): Promise<void> {
  const b = page.locator('.ui-root [data-nav]').filter({ hasText: text }).first();
  await expect(b).toBeVisible();
  if (isTouch) await b.tap();
  else await b.click();
}

test('boots to the title with no errors or network requests', async ({ page }) => {
  const w = watch(page);
  await boot(page);
  await expect(page.locator('.big-logo')).toBeVisible();
  await page.waitForTimeout(1000);
  expect(w.errors).toEqual([]);
  expect(w.external).toEqual([]);
});

test('menus → versus race → pause → quit', async ({ page }, info) => {
  const touch = !info.project.name.endsWith('desktop');
  const w = watch(page);
  await boot(page);
  if (touch) await page.locator('.title-screen').tap();
  else await page.keyboard.press('Enter');
  await press(page, 'New Game', touch);
  await press(page, "Let's go!", touch);
  await expect(page.locator('.ui-root').getByText('Grand Prix')).toBeVisible();
  await press(page, /^Versus/, touch);
  await press(page, /^1 Player/, touch);
  await press(page, /^Rookie/, touch);
  await press(page, 'Calex', touch);
  await press(page, /Next/, touch);
  await press(page, 'Seashell Boardwalk', touch);
  // race HUD up
  await expect(page.locator('.hud')).toBeVisible();
  await expect(page.locator('.hud-minimap')).toBeVisible();
  if (touch) await expect(page.locator('.touch-controls')).toBeVisible();
  await page.waitForFunction(() => window.__calex.app.session?.world.phase === 'race', null, { timeout: 20_000 });
  // drive: hold accelerate
  if (touch) {
    const accel = page.locator('.tc-drift');
    await expect(accel).toBeVisible();
  } else {
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(2500);
    await page.keyboard.up('ArrowUp');
  }
  await page.waitForTimeout(touch ? 3000 : 200);
  const speed = await page.evaluate(() => window.__calex.app.session.world.karts[0].progress);
  expect(speed).toBeGreaterThan(5); // touch uses auto-accelerate
  const fps = await page.evaluate(() => window.__calex.app.gr.quality.fps);
  expect(fps).toBeGreaterThan(10);
  await page.screenshot({ path: `test-results/race-${info.project.name}.png` });
  // pause
  if (touch) await page.locator('.tc-pause').tap();
  else await page.keyboard.press('Escape');
  await expect(page.locator('.overlay').getByText('Paused')).toBeVisible();
  await press(page, /Quit to menu/, touch);
  await press(page, /^Yes$/, touch);
  await expect(page.locator('.ui-root').getByText('Grand Prix')).toBeVisible();
  expect(w.errors).toEqual([]);
  expect(w.external).toEqual([]);
});

test('saves survive a reload', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const a = window.__calex.app;
    a.saves.create(2, 'Persisto');
    a.save.trophies['sunrise:rookie'] = 'gold';
    a.saves.save();
  });
  await page.reload();
  await page.waitForFunction(() => !!window.__calex?.app);
  const slot = await page.evaluate(() => window.__calex.app.saves.readSlot(2));
  expect(slot.name).toBe('Persisto');
  expect(slot.trophies['sunrise:rookie']).toBe('gold');
});

test('gamepad navigates menus and drives', async ({ page }, info) => {
  test.skip(!info.project.name.endsWith('desktop'), 'gamepad check runs once');
  await page.addInitScript(() => {
    const pad = { id: 'Test Pad', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })), timestamp: 0 };
    (window as unknown as { __pad: typeof pad }).__pad = pad;
    navigator.getGamepads = () => [pad as unknown as Gamepad];
  });
  await boot(page);
  const tapButton = async (b: number): Promise<void> => {
    await page.evaluate((i) => ((window as unknown as { __pad: { buttons: Array<{ pressed: boolean; value: number }> } }).__pad.buttons[i].pressed = true), b);
    await page.waitForTimeout(120);
    await page.evaluate((i) => ((window as unknown as { __pad: { buttons: Array<{ pressed: boolean; value: number }> } }).__pad.buttons[i].pressed = false), b);
    await page.waitForTimeout(150);
  };
  await tapButton(0); // title → slots
  await expect(page.getByText('Choose a save')).toBeVisible();
  await page.evaluate(() => {
    const a = window.__calex.app;
    a.saves.create(1, 'Pad');
    a.flow.players = 1;
    a.flow.mode = 'versus';
    a.screens.trackSelect();
  });
  await tapButton(13); // D-pad down from the cup tabs to the first track
  await expect(page.locator('.ui-root .focus')).toContainText('Seashell');
  await tapButton(0); // confirm
  await page.waitForFunction(() => window.__calex.app.session?.world.phase === 'race', null, { timeout: 20_000 });
  await page.evaluate(() => {
    const p = (window as unknown as { __pad: { buttons: Array<{ pressed: boolean; value: number }> } }).__pad;
    p.buttons[0].pressed = true;
    p.buttons[0].value = 1;
  });
  await page.waitForTimeout(2500);
  const prog = await page.evaluate(() => window.__calex.app.session.world.karts[0].progress);
  expect(prog).toBeGreaterThan(10);
});

test('runs from file:// (double-click) and inside a sandboxed iframe', async ({ page, browser }, info) => {
  test.skip(!info.project.name.endsWith('desktop'), 'embedding check runs once');
  // file://
  const fileUrl = pathToFileURL(resolve('dist/index.html')).href;
  const w = watch(page);
  await page.goto(fileUrl);
  await page.waitForFunction(() => !!window.__calex?.app);
  await expect(page.locator('.big-logo')).toBeVisible({ timeout: 15_000 });
  expect(w.errors).toEqual([]);
  // sandboxed iframe, as on the Ai Kids Games site
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const host = await ctx.newPage();
  // Serve a tiny host page (like the Ai Kids Games game page) on the same local server.
  await host.route('http://localhost:4173/__host.html', (r) =>
    r.fulfill({
      contentType: 'text/html',
      body: `<html><body style="margin:0;background:#000"><iframe id="g" src="http://localhost:4173/" sandbox="allow-scripts allow-pointer-lock allow-same-origin" allow="fullscreen; gamepad; autoplay" style="width:1000px;height:600px;border:0"></iframe></body></html>`,
    }),
  );
  const hw = watch(host);
  await host.goto('http://localhost:4173/__host.html');
  const frame = host.frameLocator('#g');
  await expect(frame.locator('.big-logo')).toBeVisible({ timeout: 20_000 });
  await frame.locator('.title-screen').click();
  await expect(frame.getByText('Choose a save')).toBeVisible();
  // keyboard reaches the game inside the iframe
  await frame.locator('.ui-root [data-nav]').first().click();
  await expect(frame.getByText('Pick a racer name')).toBeVisible();
  // localStorage works in the sandbox (allow-same-origin)
  const g = host.frames().find((f) => f.url().startsWith('http://localhost:4173'))!;
  const ok = await g.evaluate(() => {
    localStorage.setItem('probe', '1');
    return localStorage.getItem('probe');
  });
  expect(ok).toBe('1');
  expect(hw.errors).toEqual([]);
  await ctx.close();
});
