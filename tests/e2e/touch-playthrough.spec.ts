import { expect, test } from '@playwright/test';
import { Fingers } from './touchHelpers';

/**
 * A full 5-minute run on a phone, touch only (real CDP touches): hero select by tap, a thumb
 * on the floating stick steered by the bot's decisions (converted to stick angles in camera
 * space), jumps and slides on the buttons, level-up cards and chests tapped.
 */
test('a 5-minute run on a phone, touch only, through level-ups and a chest', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'real multi-touch needs CDP (Chromium)');
  test.setTimeout(14 * 60_000);
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`[error] ${m.text()}`);
  });
  await page.goto('/?seed=11');
  await page.waitForFunction(() => (window as unknown as { __theabonk?: unknown }).__theabonk, null, { timeout: 60_000 });
  const f = await Fingers.attach(page);
  const vp = page.viewportSize()!;
  const tapEl = async (sel: string): Promise<void> => {
    const el = page.locator(sel).first();
    await el.waitFor({ state: 'visible', timeout: 15_000 });
    const b = (await el.boundingBox())!;
    await f.tap(b.x + b.width / 2, b.y + b.height / 2);
  };

  // title → hero select → Thea → Start run, all by tap
  await tapEl('button:has-text("Play")');
  await expect(page.locator('.select-screen')).toBeVisible();
  await tapEl('.char-card');
  // tapping the already-chosen hero starts the run by itself; otherwise tap Start run
  await page.waitForTimeout(400);
  if (await page.locator('.select-screen').isVisible()) await tapEl('button:has-text("Start run")');
  await expect(page.locator('.glass-ui:not(.preview)')).toBeVisible();

  type Hint = { x: number; z: number; jump: boolean; slide: boolean; fx: number; fz: number; time: number; state: string } | null;
  const hint = (): Promise<Hint> =>
    page.evaluate(() => {
      const g = (window as unknown as { __theabonk: { world: { time: number; state: string } | null; botHint(): { x: number; z: number; jump: boolean; slide: boolean } | null; renderer: { rig: { forward(o: { x: number; z: number }): void } } } }).__theabonk;
      if (!g.world) return null;
      const h = g.botHint();
      const fw = { x: 0, z: 0 };
      g.renderer.rig.forward(fw);
      return { x: h?.x ?? 0, z: h?.z ?? 0, jump: h?.jump ?? false, slide: h?.slide ?? false, fx: fw.x, fz: fw.z, time: g.world.time, state: g.world.state };
    });

  const home: [number, number] = [vp.width * 0.18, vp.height * 0.68];
  const reach = 48;
  let thumbDown = false;
  let levelUps = 0;
  let chests = 0;
  let jumps = 0;
  const wallEnd = Date.now() + 12 * 60_000;
  let time = 0;
  // five minutes — and on until a chest has been opened (elites are random; the 5:00 boss drops one)
  while ((time < 300 || chests === 0) && time < 540 && Date.now() < wallEnd) {
    // menus that pop up mid-run: lift the thumb and tap through them
    if (await page.locator('.screen-levelup').isVisible()) {
      if (thumbDown) await f.up(1);
      thumbDown = false;
      await page.waitForTimeout(500);
      if (await page.locator('.screen-levelup .card').first().isVisible()) {
        await tapEl('.screen-levelup .card');
        levelUps++;
      }
      continue;
    }
    if (await page.locator('.screen-chest').isVisible()) {
      if (thumbDown) await f.up(1);
      thumbDown = false;
      await page.waitForTimeout(600);
      await tapEl('.screen-chest .btn');
      chests++;
      continue;
    }
    if (await page.locator('.screen-gameover').isVisible()) break;
    const h = await hint();
    if (!h) break;
    time = h.time;
    if (h.state !== 'playing') {
      await page.waitForTimeout(100);
      continue;
    }
    // the bot's world direction → stick (camera space: forward = up on the stick)
    const rx = -h.fz;
    const rz = h.fx;
    const sx = h.x * rx + h.z * rz;
    const sy = h.x * h.fx + h.z * h.fz;
    const m = Math.min(1, Math.hypot(sx, sy));
    const target: [number, number] = [home[0] + sx * reach, home[1] - sy * reach];
    if (!thumbDown) {
      await f.down(1, home[0], home[1]);
      thumbDown = true;
    }
    await f.move(1, m > 0.05 ? target[0] : home[0], m > 0.05 ? target[1] : home[1]);
    // the right thumb jumps when the bot would (hops rings, gaps)
    if (h.jump && jumps < 400) {
      const j = (await page.locator('.gbtn-jump').boundingBox())!;
      await f.down(2, j.x + j.width / 2, j.y + j.height / 2);
      await f.up(2);
      jumps++;
      thumbDown = true;
    }
    await page.waitForTimeout(90);
  }
  if (thumbDown) await f.up(1);

  const end = await page.evaluate(() => {
    const g = (window as unknown as { __theabonk: { world: { time: number; state: string; stats: { jumps: number } } | null; input: { touchMode: boolean } } }).__theabonk;
    return { time: g.world?.time ?? 0, state: g.world?.state ?? 'none', jumps: g.world?.stats.jumps ?? 0, touch: g.input.touchMode };
  });
  console.log(`touch playthrough: ${end.time.toFixed(0)} s, state ${end.state}, ${levelUps} level-ups, ${chests} chests, ${end.jumps} jumps`);
  expect(end.touch, 'stayed in touch mode the whole run').toBe(true);
  expect(end.time, 'played five minutes (or survived to the end of the test)').toBeGreaterThanOrEqual(300);
  expect(levelUps, 'picked level-ups by tap').toBeGreaterThan(0);
  expect(chests, 'opened a chest by tap').toBeGreaterThan(0);
  expect(problems, problems.join('\n')).toEqual([]);
});
