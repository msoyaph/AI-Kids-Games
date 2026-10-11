import { expect, test, type Frame, type Page } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

type Ctx = Page | Frame;

/**
 * Chrome's GPU process logs this when the *headless software compositor* reads back a
 * SwiftShader WebGL canvas. It is emitted by the browser, not by the game (which never
 * calls readPixels), and does not occur with a real GPU — so it is the one message we
 * tolerate, and only on the SwiftShader fallback used by Linux CI.
 */
const SWIFTSHADER_COMPOSITOR_NOISE = /GL Driver Message \(OpenGL, Performance, GL_CLOSE_PATH_NV, High\): GPU stall due to ReadPixels/;
const usingSwiftShader = process.platform !== 'darwin';
/**
 * Firefox-only browser notices, not game errors: a one-time note that hardware shadow-map
 * filtering is "implementation-defined" (three.js PCF shadows), and headless Firefox refusing
 * pointer lock (the game falls back to drag-to-look).
 */
const FIREFOX_NOTICES = [/Depth texture comparison requests .* Filtering, but behavior is implementation-defined/, /Request for pointer lock was denied/];

/** Collect every console error/warning and uncaught page error. */
function watchConsole(page: Page): string[] {
  const problems: string[] = [];
  const firefox = page.context().browser()?.browserType().name() === 'firefox';
  page.on('console', (msg) => {
    if (msg.type() !== 'error' && msg.type() !== 'warning') return;
    if (usingSwiftShader && SWIFTSHADER_COMPOSITOR_NOISE.test(msg.text())) return;
    if (firefox && FIREFOX_NOTICES.some((r) => r.test(msg.text()))) return;
    problems.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => problems.push(`[pageerror] ${err.message}`));
  return problems;
}

async function startRun(ctx: Ctx): Promise<void> {
  await ctx.getByRole('button', { name: 'Play', exact: true }).click();
  await ctx.getByRole('button', { name: 'Start run' }).click();
  await expect(ctx.locator('.hud')).toBeVisible();
}

/** Keep the run going: take level-ups, close chests, resume from auto-pause. */
async function babysit(ctx: Ctx, seconds: number): Promise<void> {
  const end = Date.now() + seconds * 1000;
  while (Date.now() < end) {
    const card = ctx.locator('.screen-levelup .card').first();
    if (await card.isVisible().catch(() => false)) await card.click().catch(() => undefined);
    const chest = ctx.locator('.screen-chest .btn').first();
    if (await chest.isVisible().catch(() => false)) await chest.click().catch(() => undefined);
    const resume = ctx.getByRole('button', { name: 'Resume' });
    if (await resume.isVisible().catch(() => false)) await resume.click().catch(() => undefined);
    await new Promise((r) => setTimeout(r, 500));
  }
}

async function gameTime(ctx: Ctx): Promise<number> {
  return ctx.evaluate(() => {
    const g = (window as unknown as { __theabonk?: { world: { time: number } | null } }).__theabonk;
    return g?.world?.time ?? -1;
  });
}

test('loads, starts a run and plays 30s without console errors', async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto('/');
  await expect(page).toHaveTitle('TheaBonk');
  await expect(page.locator('.logo')).toContainText('TheaBonk');
  await startRun(page);
  await babysit(page, 30);
  expect(await gameTime(page)).toBeGreaterThan(5);
  // the HUD is alive
  await expect(page.locator('.timer')).not.toHaveText('0:00');
  expect(problems, problems.join('\n')).toEqual([]);
});

test('an old save with a win unlocks Rimewood, which plays without console errors', async ({ page }) => {
  const problems = watchConsole(page);
  const fs = await import('node:fs');
  const v1 = JSON.parse(fs.readFileSync('tests/fixtures/save-v1.json', 'utf8'));
  v1.stats.wins = 1;
  const raw = JSON.stringify(v1);
  await page.addInitScript((s) => {
    if (!localStorage.getItem('theabonk.save')) localStorage.setItem('theabonk.save', s);
  }, raw);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.locator('.map-tab', { hasText: 'Rimewood' }).click();
  await page.getByRole('button', { name: 'Start run' }).click();
  await expect(page.locator('.hud')).toBeVisible();
  await babysit(page, 20);
  const info = await page.evaluate(() => {
    const g = (window as unknown as { __theabonk: { world: { map: { id: string }; time: number } } }).__theabonk;
    return { map: g.world.map.id, time: g.world.time, backup: localStorage.getItem('theabonk.save.bak'), save: JSON.parse(localStorage.getItem('theabonk.save') ?? '{}') };
  });
  expect(info.map).toBe('rimewood');
  expect(info.time).toBeGreaterThan(5);
  // the upgrade kept a copy of the original save and wrote the new format
  expect(info.backup).toBe(raw);
  expect(info.save.version).toBe(2);
  expect(info.save.lastMap).toBe('rimewood');
  // nothing lost (a live achievement — 'Dawnbringer' for the existing win — may add gold)
  expect(info.save.gold).toBeGreaterThanOrEqual(v1.gold);
  expect(info.save.achievements).toEqual(expect.arrayContaining(v1.achievements));
  expect(problems, problems.join('\n')).toEqual([]);
});

test('Escape pauses and stays paused; Escape again resumes', async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto('/');
  await startRun(page);
  await page.waitForTimeout(800);
  await page.keyboard.press('Escape');
  await expect(page.locator('.screen-pause')).toBeVisible();
  await page.waitForTimeout(500);
  await expect(page.locator('.screen-pause')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __theabonk: { paused: boolean } }).__theabonk.paused)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.locator('.screen-pause')).toBeHidden();
  expect(problems, problems.join('\n')).toEqual([]);
});

test('the tuning panel only exists with ?tune=1', async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto('/');
  await expect(page.locator('.logo')).toBeVisible();
  await expect(page.locator('.tune-panel')).toHaveCount(0);
  await page.goto('/?tune=1');
  await expect(page.locator('.tune-panel')).toBeVisible();
  // F2 hides and shows it
  await page.keyboard.press('F2');
  await expect(page.locator('.tune-panel')).toBeHidden();
  await page.keyboard.press('F2');
  await expect(page.locator('.tune-panel')).toBeVisible();
  expect(problems, problems.join('\n')).toEqual([]);
});

test('?playtest=1 records a run on the device and offers export', async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto('/?playtest=1');
  await expect(page.locator('.playtest-badge')).toBeVisible();
  await expect(page.locator('.playtest-row')).toContainText('Playtest runs on this device: 0');
  await startRun(page);
  await babysit(page, 4);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Quit run' }).click();
  await page.getByRole('button', { name: 'Yes' }).click();
  await expect(page.locator('.playtest-row')).toContainText('Playtest runs on this device: 1');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('theabonk.playtest') ?? '{}'));
  expect(stored.runs[0].player).toBe('human');
  expect(stored.runs[0].result).toBe('quit');
  expect(problems, problems.join('\n')).toEqual([]);
});

test('menus open and close without errors', async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto('/');
  for (const name of ['Workshop', 'Collection', 'Records', 'How to play', 'Settings']) {
    await page.getByRole('button', { name, exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  }
  expect(problems, problems.join('\n')).toEqual([]);
});

test('the daily run starts the day’s hero and map with no shop bonuses', async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto('/');
  await page.getByRole('button', { name: /Daily run/ }).click();
  await expect(page.locator('.hud')).toBeVisible();
  await babysit(page, 6);
  const info = await page.evaluate(() => {
    const g = (window as unknown as { __theabonk: { world: { options: { daily: boolean }; difficulty: string; player: { character: { id: string } }; map: { id: string } } } }).__theabonk;
    return { daily: g.world.options.daily, difficulty: g.world.difficulty, hero: g.world.player.character.id, map: g.world.map.id };
  });
  expect(info.daily).toBe(true);
  expect(info.difficulty).toBe('normal');
  expect(problems, problems.join('\n')).toEqual([]);
});

test('remapped keys work in a run; accessibility options apply', async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  // larger text applies at once
  await page.locator('.setting', { hasText: 'Larger text' }).getByRole('button').click();
  await expect(page.locator('html')).toHaveClass(/large-text/);
  // remap: add J to Jump
  await page.getByRole('button', { name: 'Remap…' }).click();
  await page.locator('.remap-row', { hasText: 'Jump' }).locator('.chip.add').click();
  await page.keyboard.press('KeyJ');
  await expect(page.locator('.remap-row', { hasText: 'Jump' })).toContainText('J');
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'Done' }).click();
  await startRun(page);
  // press J until a jump registers (a slow machine may still be warming up)
  await expect
    .poll(
      async () => {
        await page.keyboard.press('KeyJ');
        return page.evaluate(() => (window as unknown as { __theabonk: { world: { stats: { jumps: number } } } }).__theabonk.world.stats.jumps);
      },
      { timeout: 15_000, intervals: [400] },
    )
    .toBeGreaterThan(0);
  expect(problems, problems.join('\n')).toEqual([]);
});

test('runs inside a sandboxed iframe (no storage, no pointer lock)', async ({ page, baseURL }) => {
  const problems = watchConsole(page);
  await page.setContent(`<!doctype html><html><body style="margin:0"><iframe id="g" sandbox="allow-scripts" src="${baseURL}/" style="width:1280px;height:720px;border:0"></iframe></body></html>`);
  const frame = page.frameLocator('#g');
  await expect(frame.locator('.logo')).toContainText('TheaBonk', { timeout: 30_000 });
  await expect(frame.locator('.corner-br.warn')).toBeVisible(); // storage-unavailable notice
  await frame.getByRole('button', { name: 'Play', exact: true }).click();
  await frame.getByRole('button', { name: 'Start run' }).click();
  await expect(frame.locator('.hud')).toBeVisible();
  const f = page.frames().find((x) => x !== page.mainFrame())!;
  await babysit(f, 10);
  expect(await gameTime(f)).toBeGreaterThan(2);
  expect(problems, problems.join('\n')).toEqual([]);
});

test('the single-file build works from file://', async ({ page }) => {
  const problems = watchConsole(page);
  // software WebGL is slow: use low graphics so the sim keeps up
  await page.addInitScript(() => {
    try {
      localStorage.setItem('theabonk.save', JSON.stringify({ settings: { quality: 'low' } }));
    } catch {
      /* ignore */
    }
  });
  const url = pathToFileURL(path.resolve('dist/index.html')).href;
  await page.goto(url);
  await expect(page.locator('.logo')).toContainText('TheaBonk');
  await startRun(page);
  await babysit(page, 12);
  expect(await gameTime(page)).toBeGreaterThan(1);
  expect(problems, problems.join('\n')).toEqual([]);
});
