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

test('High-tier shaders (water, road sheen, pod shimmer, rim light, skinned drivers, speed blur) compile', async ({ page }, info) => {
  test.skip(!info.project.name.endsWith('desktop') && !info.project.name.endsWith('phone'), 'one desktop + one phone per engine');
  const w = watch(page);
  await boot(page);
  for (const track of ['neon-nightway', 'seashell-boardwalk', 'canyon-run']) {
    await page.evaluate((t) => {
      const a = window.__calex.app;
      if (!a.saves.data) a.saves.create(3, 'E2E');
      a.saves.settings.quality = 'high';
      a.applySettings();
      a.gr.quality.setSetting('high');
      void t;
    }, track);
    await quickRace(page, { track, ai: 3 });
    await page.evaluate(() => {
      const a = window.__calex.app;
      a.gr.quality.adaptive = false;
      a.gr.quality.setSetting('high');
    });
    await page.waitForFunction(() => window.__calex.app.session?.world.phase === 'race', null, { timeout: 20_000 });
    await page.evaluate(() => window.__calex.app.session.world.karts[0].startBoost(2)); // speed blur on
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => window.__calex.app.gr.stats().calls)).toBeGreaterThan(5);
    await page.evaluate(() => window.__calex.app.quitToMenu());
  }
  expect(w.errors).toEqual([]);
});

test('instant replay: watch the race again with every camera, then back to the results', async ({ page }, info) => {
  test.skip(!info.project.name.endsWith('desktop') && !info.project.name.endsWith('phone'), 'one desktop + one phone per engine');
  const touch = info.project.name.endsWith('phone');
  const w = watch(page);
  await boot(page);
  // a real Versus race through the menus, driven by the autopilot at 8× speed
  await page.evaluate(() => {
    const a = window.__calex.app;
    a.saves.create(1, 'Replay');
    a.flow.mode = 'versus';
    a.flow.players = 1;
    a.flow.racers = ['calex'];
    a.flow.vs.aiCount = 3;
    a.flow.vs.laps = 1;
    a.screens.trackSelect();
  });
  const track = page.locator('.ui-root [data-nav]').filter({ hasText: 'Seashell Boardwalk' }).first();
  if (touch) await track.tap();
  else await track.click();
  await page.waitForFunction(() => window.__calex.app.session?.world.phase === 'race', null, { timeout: 30_000 });
  await page.evaluate(() => {
    const a = window.__calex.app;
    const k = a.session.world.karts[0];
    k.player = -1;
    a.session.ai.takeOver(k);
    k.player = 0;
    a.loop.timeScale = 8;
  });
  const replayBtn = page.locator('.ui-root [data-nav]').filter({ hasText: 'Replay' }).first();
  await expect(replayBtn).toBeVisible({ timeout: 90_000 });
  await page.evaluate(() => (window.__calex.app.loop.timeScale = 1));
  if (touch) await replayBtn.tap();
  else await replayBtn.click();
  await expect(page.locator('.replay-ui')).toBeVisible();
  const x0 = await page.evaluate(() => window.__calex.app.session.world.karts[0].x);
  await page.waitForTimeout(1200);
  const x1 = await page.evaluate(() => window.__calex.app.session.world.karts[0].x);
  expect(Math.abs(x1 - x0)).toBeGreaterThan(1); // karts move during playback
  for (let i = 0; i < 4; i++) {
    const cam = page.locator('.replay-ui [data-nav]').filter({ hasText: /Auto|Chase|Trackside|Overhead/ }).first();
    if (touch) await cam.tap();
    else await cam.click();
    await page.waitForTimeout(400);
  }
  const fwd = page.locator('.replay-ui [data-nav]').filter({ hasText: '10s ⏩' }).first();
  if (touch) await fwd.tap();
  else await fwd.click();
  const t = await page.evaluate(() => window.__calex.app.session.replay.t);
  expect(t).toBeGreaterThan(9);
  await page.screenshot({ path: `test-results/replay-${info.project.name}.png` });
  const done = page.locator('.replay-ui [data-nav]').filter({ hasText: 'Done' }).first();
  if (touch) await done.tap();
  else await done.click();
  await expect(page.locator('.replay-ui')).toHaveCount(0);
  await expect(replayBtn).toBeVisible();
  expect(w.errors).toEqual([]);
});

test('Driving School: new-player prompt, lesson intro, a lesson to the medal screen', async ({ page }, info) => {
  test.skip(!info.project.name.endsWith('desktop') && !info.project.name.endsWith('phone'), 'one desktop + one phone per engine');
  const touch = info.project.name.endsWith('phone');
  const tap = async (text: string | RegExp): Promise<void> => {
    const b = page.locator('.ui-root [data-nav]').filter({ hasText: text }).first();
    await expect(b).toBeVisible();
    if (touch) await b.tap();
    else await b.click();
  };
  const w = watch(page);
  await boot(page);
  await page.evaluate(() => {
    const a = window.__calex.app;
    a.saves.create(1, 'Newbie');
    a.screens.mainMenu();
  });
  await tap(/New here\? Driving School/);
  await expect(page.getByText('6 gold', { exact: false }).or(page.getByText('0/6 gold'))).toBeVisible();
  await tap(/Glider Rings/);
  await expect(page.locator('.lesson-steps')).toBeVisible();
  await tap(/Let's go!/);
  await page.waitForFunction(() => window.__calex.app.session?.lessonSim, null, { timeout: 20_000 });
  await expect(page.locator('.lesson-status')).toContainText('Rings');
  await page.evaluate(() => {
    const a = window.__calex.app;
    const k = a.session.world.karts[0];
    k.player = -1;
    a.session.ai.takeOver(k, 0.8, 'balanced');
    k.player = 0;
    a.loop.timeScale = 6;
  });
  await expect(page.locator('.ui-root [data-nav]').filter({ hasText: 'Retry' }).first()).toBeVisible({ timeout: 60_000 });
  await page.evaluate(() => (window.__calex.app.loop.timeScale = 1));
  const school = await page.evaluate(() => window.__calex.app.save.school);
  expect(school.gliders).toBeTruthy();
  expect(school.gliders.best).toBeGreaterThanOrEqual(1);
  await tap('Lessons');
  await expect(page.locator('.lesson-card').first()).toBeVisible();
  expect(w.errors).toEqual([]);
});

test('Coin Rush in Coin Carnival: pick the rule, coins on the HUD, coin results', async ({ page }, info) => {
  test.skip(!info.project.name.endsWith('desktop') && !info.project.name.endsWith('tablet'), 'one desktop + one tablet per engine');
  const touch = info.project.name.endsWith('tablet');
  const tap = async (text: string | RegExp): Promise<void> => {
    const b = page.locator('.ui-root [data-nav]').filter({ hasText: text }).first();
    await expect(b).toBeVisible();
    if (touch) await b.tap();
    else await b.click();
  };
  const w = watch(page);
  await boot(page);
  await page.evaluate(() => {
    const a = window.__calex.app;
    a.saves.create(1, 'Coins');
    a.flow.mode = 'battle';
    a.flow.players = 1;
    a.flow.racers = ['calex'];
    a.flow.battle.aiCount = 3;
    a.screens.battleSetup();
  });
  await tap(/Coin Rush/);
  await expect(page.locator('.title-h').filter({ hasText: 'Coin Rush' })).toBeVisible();
  await tap(/Coin Carnival/);
  await tap(/^2 min$/);
  await tap(/Start!/);
  await page.waitForFunction(() => window.__calex.app.session?.coinRush && window.__calex.app.session.world.phase === 'race', null, { timeout: 30_000 });
  await expect(page.locator('.hud-battle.coins')).toBeVisible();
  // the player's kart just sits there; the AI racers play the match at 8× speed
  await page.evaluate(() => (window.__calex.app.loop.timeScale = 8));
  await expect(page.locator('.ui-root [data-nav]').filter({ hasText: 'Rematch' }).first()).toBeVisible({ timeout: 90_000 });
  await page.evaluate(() => (window.__calex.app.loop.timeScale = 1));
  await expect(page.locator('.screen .table').first()).toContainText('🪙');
  const total = await page.evaluate(() => window.__calex.app.session.world.karts.reduce((s: number, k: { raceStats: { coins: number } }) => s + k.raceStats.coins, 0));
  expect(total).toBeGreaterThan(5);
  expect(w.errors).toEqual([]);
});
