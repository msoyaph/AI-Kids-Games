import { expect, test, type Page } from '@playwright/test';
import { Fingers } from './touchHelpers';

/**
 * A 5-minute run on a phone, touch only (real CDP touches), with the test-only no-damage option
 * (?nodamage=1 — never touches the save) so the run can't end early: hero select by tap, then
 * the stick in all eight directions, Jump, Slide, a slide-jump and Pause / Resume, then a thumb
 * steered by the bot's advice (converted to stick angles) with level-up cards and chests tapped
 * until five minutes have passed and a chest has been opened.
 */

type Snap = {
  time: number;
  state: string;
  paused: boolean;
  touch: boolean;
  p: { vx: number; vz: number; onGround: boolean; sliding: boolean };
  jumps: number;
  walk: number;
  /** The yaw the stick is read against (camera yaw minus the heading lock's held turn). */
  steerYaw: number;
};

const snap = (page: Page): Promise<Snap> =>
  page.evaluate(() => {
    type GG = {
      world: { time: number; state: string; player: Snap['p']; stats: { jumps: number }; tuning: { movement: { walkSpeed: number } } } | null;
      paused: boolean;
      input: { touchMode: boolean };
      renderer: { rig: { yaw: number } };
      steer: { yaw(y: number): number };
    };
    const g = (window as unknown as { __theabonk: GG }).__theabonk;
    const w = g.world;
    const p = w?.player;
    return {
      time: w?.time ?? 0,
      state: w?.state ?? 'none',
      paused: g.paused,
      touch: g.input.touchMode,
      p: { vx: p?.vx ?? 0, vz: p?.vz ?? 0, onGround: p?.onGround ?? true, sliding: p?.sliding ?? false },
      jumps: w?.stats.jumps ?? 0,
      walk: w?.tuning.movement.walkSpeed ?? 0,
      steerYaw: g.steer.yaw(g.renderer.rig.yaw),
    };
  });

/** World direction for a stick push at screen angle `a` (clockwise from up), CameraRig yaw convention. */
function worldDir(a: number, yaw: number): number {
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  return Math.atan2(-fz * Math.sin(a) + fx * Math.cos(a), fx * Math.sin(a) + fz * Math.cos(a));
}

test('a 5-minute run on a phone, touch only: every direction, jump, slide, slide-jump, pause, level-ups and a chest', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'real multi-touch needs CDP (Chromium)');
  test.setTimeout(14 * 60_000);
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`[error] ${m.text()}`);
  });
  await page.goto('/?seed=11&nodamage=1');
  await page.waitForFunction(() => (window as unknown as { __theabonk?: unknown }).__theabonk, null, { timeout: 60_000 });
  const f = await Fingers.attach(page);
  const vp = page.viewportSize()!;
  const centre = async (sel: string): Promise<[number, number]> => {
    const el = page.locator(sel).first();
    await el.waitFor({ state: 'visible', timeout: 15_000 });
    const b = (await el.boundingBox())!;
    return [b.x + b.width / 2, b.y + b.height / 2];
  };
  const tapEl = async (sel: string): Promise<void> => {
    const [x, y] = await centre(sel);
    await f.tap(x, y);
  };
  let levelUps = 0;
  let chests = 0;
  /** Tap through a level-up or chest screen if one is up (returns true if it did). */
  const screens = async (): Promise<boolean> => {
    if (await page.locator('.screen-levelup').isVisible()) {
      await page.waitForTimeout(450);
      if (await page.locator('.screen-levelup .card').first().isVisible()) {
        await tapEl('.screen-levelup .card');
        levelUps++;
      }
      return true;
    }
    if (await page.locator('.screen-chest').isVisible()) {
      await page.waitForTimeout(600);
      await tapEl('.screen-chest .btn');
      chests++;
      return true;
    }
    return false;
  };

  // title → hero select → Thea → Start run, all by tap
  await tapEl('button:has-text("Play")');
  await expect(page.locator('.select-screen')).toBeVisible();
  await tapEl('.char-card');
  // tapping the already-chosen hero starts the run by itself; otherwise tap Start run
  await page.waitForTimeout(400);
  if (await page.locator('.select-screen').isVisible()) await tapEl('button:has-text("Start run")');
  await expect(page.locator('.glass-ui:not(.preview)')).toBeVisible();
  await page.waitForTimeout(600);

  const home: [number, number] = [vp.width * 0.18, vp.height * 0.68];
  const reach = 52;

  // 1. the stick, in all eight directions (a fresh press each; Thea goes where it points)
  const directions: Record<number, boolean> = {};
  for (let deg = 0; deg < 360; deg += 45) {
    const a = (deg * Math.PI) / 180;
    for (let attempt = 0; attempt < 4 && !directions[deg]; attempt++) {
      while (await screens()) await page.waitForTimeout(300);
      await f.down(1, home[0], home[1]);
      await f.drag(1, home[0] + Math.sin(a) * reach, home[1] - Math.cos(a) * reach);
      await page.waitForTimeout(550);
      const s = await snap(page);
      await f.up(1);
      if (s.state !== 'playing') continue;
      const speed = Math.hypot(s.p.vx, s.p.vz);
      const off = Math.abs(Math.atan2(Math.sin(Math.atan2(s.p.vx, s.p.vz) - worldDir(a, s.steerYaw)), Math.cos(Math.atan2(s.p.vx, s.p.vz) - worldDir(a, s.steerYaw))));
      // a tree or cliff can deflect a try; another fresh press settles it
      directions[deg] = speed > s.walk * 0.6 && off < (35 * Math.PI) / 180;
      await page.waitForTimeout(200);
    }
  }

  // 2. Jump
  while (await screens()) await page.waitForTimeout(300);
  const j0 = (await snap(page)).jumps;
  await tapEl('.gbtn-jump');
  await page.waitForTimeout(500);
  const jumped = (await snap(page)).jumps > j0;

  // 3. Slide (held while running), then 4. a slide-jump: Jump with a third finger mid-slide
  while (await screens()) await page.waitForTimeout(300);
  await f.down(1, home[0], home[1]);
  await f.drag(1, home[0], home[1] - reach);
  await page.waitForTimeout(700);
  const [sx, sy] = await centre('.gbtn-slide');
  await f.down(2, sx, sy);
  await page.waitForTimeout(220);
  const sliding = await snap(page);
  const [jx, jy] = await centre('.gbtn-jump');
  await f.down(3, jx, jy);
  await page.waitForTimeout(120);
  const air = await snap(page);
  await f.up(3);
  await f.up(2);
  await f.up(1);
  const slid = sliding.p.sliding;
  const slideJumped = slid && !air.p.onGround && air.jumps > sliding.jumps && Math.hypot(air.p.vx, air.p.vz) > sliding.walk * 1.05;

  // 5. Pause and Resume by touch
  while (await screens()) await page.waitForTimeout(300);
  await tapEl('.gbtn-pause');
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  const pausedAt = await snap(page);
  await page.waitForTimeout(800);
  const stillPaused = await snap(page);
  await tapEl('button:has-text("Resume")');
  await page.waitForTimeout(800);
  const resumed = await snap(page);
  const pauseOk = pausedAt.paused && stillPaused.time === pausedAt.time && !resumed.paused && resumed.time > stillPaused.time;

  // 6. play on: the bot's advice → stick angles, until five minutes and a chest
  type Hint = { x: number; z: number; jump: boolean; fx: number; fz: number; time: number; state: string } | null;
  const hint = (): Promise<Hint> =>
    page.evaluate(() => {
      const g = (window as unknown as { __theabonk: { world: { time: number; state: string } | null; botHint(): { x: number; z: number; jump: boolean } | null; renderer: { rig: { yaw: number } }; steer: { yaw(y: number): number } } }).__theabonk;
      if (!g.world) return null;
      const h = g.botHint();
      const yaw = g.steer.yaw(g.renderer.rig.yaw);
      return { x: h?.x ?? 0, z: h?.z ?? 0, jump: h?.jump ?? false, fx: -Math.sin(yaw), fz: -Math.cos(yaw), time: g.world.time, state: g.world.state };
    });
  let thumbDown = false;
  let time = 0;
  const wallEnd = Date.now() + 11 * 60_000;
  while ((time < 300 || chests === 0) && time < 540 && Date.now() < wallEnd) {
    if ((await page.locator('.screen-levelup, .screen-chest').count()) > 0 && (await page.locator('.screen-levelup, .screen-chest').first().isVisible())) {
      if (thumbDown) await f.up(1);
      thumbDown = false;
      await screens();
      continue;
    }
    const h = await hint();
    if (!h) break;
    time = h.time;
    if (h.state !== 'playing') {
      await page.waitForTimeout(100);
      continue;
    }
    // the bot's world direction → stick (camera space: forward = up on the stick)
    const sxx = h.x * -h.fz + h.z * h.fx;
    const syy = h.x * h.fx + h.z * h.fz;
    const m = Math.min(1, Math.hypot(sxx, syy));
    if (!thumbDown) {
      await f.down(1, home[0], home[1]);
      thumbDown = true;
    }
    await f.move(1, m > 0.05 ? home[0] + sxx * reach : home[0], m > 0.05 ? home[1] - syy * reach : home[1]);
    if (h.jump) {
      await f.down(2, jx, jy);
      await f.up(2);
    }
    await page.waitForTimeout(90);
  }
  if (thumbDown) await f.up(1);

  const end = await snap(page);
  console.log(
    `touch playthrough: ${end.time.toFixed(0)} s, state ${end.state}, directions ${Object.values(directions).filter(Boolean).length}/8, ` +
      `jump ${jumped}, slide ${slid}, slide-jump ${slideJumped}, pause ${pauseOk}, ${levelUps} level-ups, ${chests} chests`,
  );
  expect(end.touch, 'stayed in touch mode the whole run').toBe(true);
  for (let deg = 0; deg < 360; deg += 45) expect(directions[deg], `the stick moves Thea at ${deg}°`).toBe(true);
  expect(jumped, 'the Jump button jumps').toBe(true);
  expect(slid, 'the Slide button slides').toBe(true);
  expect(slideJumped, 'Jump out of a slide keeps the slide speed').toBe(true);
  expect(pauseOk, 'Pause stops the run and Resume carries on').toBe(true);
  expect(end.time, 'played five minutes').toBeGreaterThanOrEqual(300);
  expect(end.state, 'no-damage run still going').toBe('playing');
  expect(levelUps, 'picked level-ups by tap').toBeGreaterThan(2);
  expect(chests, 'opened a chest by tap').toBeGreaterThan(0);
  expect(problems, problems.join('\n')).toEqual([]);
});
