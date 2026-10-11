import { expect, test, type Page } from '@playwright/test';
import { Fingers } from './touchHelpers';

/** Touch devices (run under the webkit-tablet, webkit-phone and chromium-tablet projects). */

type G = {
  world: {
    player: { x: number; z: number; vx: number; vz: number; character: { id: string } };
    stats: { jumps: number };
    mods: { crowd: number };
    difficulty: string;
    time: number;
  } | null;
  paused: boolean;
  renderer: { quality: string };
};

function watch(page: Page): string[] {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`[error] ${m.text()}`);
  });
  return problems;
}

/** A synthetic finger (Pointer Events with pointerType 'touch') on an element. */
async function finger(page: Page, selector: string, path: Array<[number, number]>, holdMs = 600): Promise<void> {
  await page.evaluate(
    async ({ selector, path, holdMs }) => {
      const el = document.querySelector(selector) as HTMLElement;
      const r = el.getBoundingClientRect();
      const at = (k: number): { clientX: number; clientY: number } => ({ clientX: r.left + path[k][0], clientY: r.top + path[k][1] });
      const opts = (k: number): PointerEventInit => ({ pointerId: 7, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true, ...at(k) });
      el.dispatchEvent(new PointerEvent('pointerdown', opts(0)));
      for (let k = 1; k < path.length; k++) {
        await new Promise((res) => setTimeout(res, 30));
        el.dispatchEvent(new PointerEvent('pointermove', opts(k)));
      }
      await new Promise((res) => setTimeout(res, holdMs));
      el.dispatchEvent(new PointerEvent('pointerup', opts(path.length - 1)));
    },
    { selector, path, holdMs },
  );
}

/** Open the game and wait until it has started (WebKit can take a while on a busy machine). */
async function open(page: Page, url = '/'): Promise<void> {
  await page.goto(url);
  // a failed start reports why (window.__theabonkError) instead of just timing out
  await page.waitForFunction(() => (window as unknown as { __theabonk?: unknown; __theabonkError?: string }).__theabonk || (window as unknown as { __theabonkError?: string }).__theabonkError, null, { timeout: 60_000 });
  const err = await page.evaluate(() => (window as unknown as { __theabonkError?: string }).__theabonkError ?? null);
  expect(err, 'the game failed to start').toBeNull();
}

const game = (page: Page): Promise<G> => page.evaluate(() => {
  const g = (window as unknown as { __theabonk: G }).__theabonk;
  return { world: g.world ? { player: { ...g.world.player, character: { id: g.world.player.character.id } }, stats: { jumps: g.world.stats.jumps }, mods: { crowd: g.world.mods.crowd }, difficulty: g.world.difficulty, time: g.world.time } : null, paused: g.paused, renderer: { quality: g.renderer.quality } };
});

test('a first run on a touch device: tablet tier, Relaxed, twin-stick controls', async ({ page }) => {
  const problems = watch(page);
  await open(page);
  await expect(page.locator('html')).toHaveClass(/touch/);
  await page.getByRole('button', { name: 'Play', exact: true }).tap();
  // Relaxed is preselected the first time on a touch device
  await expect(page.locator('.diff-tab.sel')).toHaveText('Relaxed');
  await page.getByRole('button', { name: 'Start run' }).tap();
  await expect(page.locator('.touch-ui')).toBeVisible();
  await page.waitForTimeout(500);
  let g = await game(page);
  expect(g.renderer.quality).toBe('tablet');
  expect(g.world!.mods.crowd).toBeCloseTo(0.65);
  expect(g.world!.difficulty).toBe('relaxed');
  const x0 = g.world!.player.x;
  const z0 = g.world!.player.z;
  // left thumb: push the stick forward
  await finger(page, '.tzone-stick', [[120, 200], [120, 170], [120, 130]], 1600);
  g = await game(page);
  expect(Math.hypot(g.world!.player.x - x0, g.world!.player.z - z0)).toBeGreaterThan(1.2);
  // jump button
  await page.locator('.gbtn-jump').dispatchEvent('pointerdown', { pointerId: 8, pointerType: 'touch' });
  await page.waitForTimeout(200);
  await page.locator('.gbtn-jump').dispatchEvent('pointerup', { pointerId: 8, pointerType: 'touch' });
  await page.waitForTimeout(400);
  expect((await game(page)).world!.stats.jumps).toBeGreaterThan(0);
  // pause button
  await page.locator('.gbtn-pause').dispatchEvent('pointerdown', { pointerId: 9, pointerType: 'touch' });
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  expect(problems, problems.join('\n')).toEqual([]);
});

test('portrait shows the rotate hint and pauses the run', async ({ page }) => {
  const problems = watch(page);
  await open(page);
  await page.getByRole('button', { name: 'Play', exact: true }).tap();
  await page.getByRole('button', { name: 'Start run' }).tap();
  await expect(page.locator('.touch-ui')).toBeVisible();
  const vp = page.viewportSize()!;
  await page.setViewportSize({ width: vp.height, height: vp.width });
  await expect(page.locator('.rotate-hint')).toBeVisible();
  await page.waitForTimeout(300);
  expect((await game(page)).paused).toBe(true);
  await page.setViewportSize(vp);
  await expect(page.locator('.rotate-hint')).toBeHidden();
  expect(problems, problems.join('\n')).toEqual([]);
});

/** Position, camera yaw and jump count, for the real-touch tests. */
const probe = (page: Page): Promise<{ x: number; z: number; yaw: number; jumps: number }> =>
  page.evaluate(() => {
    const g = (window as unknown as { __theabonk: { world: { player: { x: number; z: number }; stats: { jumps: number } }; renderer: { rig: { yaw: number } } } }).__theabonk;
    return { x: g.world.player.x, z: g.world.player.z, yaw: g.renderer.rig.yaw, jumps: g.world.stats.jumps };
  });

async function startTouchRun(page: Page): Promise<void> {
  await open(page, '/?seed=7');
  await page.getByRole('button', { name: 'Play', exact: true }).tap();
  await page.getByRole('button', { name: 'Start run' }).tap();
  await expect(page.locator('.touch-ui')).toBeVisible();
  await page.waitForTimeout(400);
}

test('real multi-touch: moving, turning the camera and jumping all at once', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'real multi-touch needs CDP (Chromium)');
  const problems = watch(page);
  await startTouchRun(page);
  const f = await Fingers.attach(page);
  const vp = page.viewportSize()!;
  const a = await probe(page);
  // left thumb pushes forward and keeps holding
  await f.down(1, vp.width * 0.2, vp.height * 0.7);
  await f.drag(1, vp.width * 0.2, vp.height * 0.7 - 80);
  // right finger drags the camera while the thumb holds
  await f.down(2, vp.width * 0.62, vp.height * 0.45);
  await f.drag(2, vp.width * 0.62 + 120, vp.height * 0.45, 8);
  // a third finger taps Jump with both still down
  const jump = (await page.locator('.gbtn-jump').boundingBox())!;
  await f.down(3, jump.x + jump.width / 2, jump.y + jump.height / 2);
  await page.waitForTimeout(900);
  const b = await probe(page);
  await f.up(3);
  await f.up(2);
  await f.up(1);
  expect(Math.hypot(b.x - a.x, b.z - a.z), 'the stick kept moving Thea').toBeGreaterThan(1);
  expect(Math.abs(b.yaw - a.yaw), 'the camera turned').toBeGreaterThan(0.2);
  expect(b.jumps, 'the jump registered').toBeGreaterThan(a.jumps);
  expect(problems, problems.join('\n')).toEqual([]);
});

test('auto camera swings behind the movement; a drag takes over and it resumes after', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'real multi-touch needs CDP (Chromium)');
  const problems = watch(page);
  await startTouchRun(page);
  // fixed stick: the thumb's deflection survives the test harness lifting / re-pressing it
  await page.evaluate(() => (window as unknown as { __theabonk: { touch: { setLook(l: object): void } } }).__theabonk.touch.setLook({ fixedStick: true }));
  const f = await Fingers.attach(page);
  const vp = page.viewportSize()!;
  // hold the stick up-right: Thea runs diagonally, the camera follows round
  await f.down(1, vp.width * 0.2, vp.height * 0.72);
  await f.drag(1, vp.width * 0.2 + 55, vp.height * 0.72 - 55);
  const y0 = (await probe(page)).yaw;
  await page.waitForTimeout(1500);
  const y1 = (await probe(page)).yaw;
  expect(Math.abs(y1 - y0), 'auto camera turns while moving diagonally').toBeGreaterThan(0.15);
  // a resting camera finger holds the view still
  await f.down(2, vp.width * 0.62, vp.height * 0.45);
  const ya = (await probe(page)).yaw;
  await page.waitForTimeout(800);
  const yb = (await probe(page)).yaw;
  expect(Math.abs(yb - ya), 'no auto turn while a finger is on the camera').toBeLessThan(0.03);
  // lift it: a short wait first, then auto camera eases back in
  await f.up(2);
  const yc = (await probe(page)).yaw;
  await page.waitForTimeout(400);
  const yd = (await probe(page)).yaw;
  expect(Math.abs(yd - yc), 'auto camera waits after a drag').toBeLessThan(0.05);
  await page.waitForTimeout(2600);
  const ye = (await probe(page)).yaw;
  expect(Math.abs(ye - yd), 'auto camera resumed').toBeGreaterThan(0.1);
  await f.up(1);
  expect(problems, problems.join('\n')).toEqual([]);
});

test('slide-jumping by touch keeps the slide speed, as on a keyboard', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'real multi-touch needs CDP (Chromium)');
  const problems = watch(page);
  await startTouchRun(page);
  await page.evaluate(() => (window as unknown as { __theabonk: { touch: { setLook(l: object): void } } }).__theabonk.touch.setLook({ fixedStick: true }));
  const move = (): Promise<{ speed: number; sliding: boolean; onGround: boolean; walk: number }> =>
    page.evaluate(() => {
      const g = (window as unknown as { __theabonk: { world: { player: { vx: number; vz: number; sliding: boolean; onGround: boolean }; tuning: { movement: { walkSpeed: number } } } } }).__theabonk;
      const p = g.world.player;
      return { speed: Math.hypot(p.vx, p.vz), sliding: p.sliding, onGround: p.onGround, walk: g.world.tuning.movement.walkSpeed };
    });
  const f = await Fingers.attach(page);
  const vp = page.viewportSize()!;
  // run forward at full stick
  await f.down(1, vp.width * 0.12, vp.height * 0.6);
  await f.drag(1, vp.width * 0.12, vp.height * 0.6 - 120);
  await page.waitForTimeout(700);
  // slide (held), then jump out of it with another finger
  const slide = (await page.locator('.gbtn-slide').boundingBox())!;
  await f.down(2, slide.x + slide.width / 2, slide.y + slide.height / 2);
  await page.waitForTimeout(220);
  const sliding = await move();
  const jump = (await page.locator('.gbtn-jump').boundingBox())!;
  await f.down(3, jump.x + jump.width / 2, jump.y + jump.height / 2);
  await page.waitForTimeout(120);
  const air = await move();
  await f.up(3);
  await f.up(2);
  await f.up(1);
  expect(sliding.sliding, 'the Slide button slides').toBe(true);
  expect(sliding.speed, 'the slide boost kicked in').toBeGreaterThan(sliding.walk * 1.1);
  expect(air.onGround, 'the Jump button jumped out of the slide').toBe(false);
  expect(air.speed, 'the jump kept the slide speed').toBeGreaterThan(sliding.walk * 1.1);
  expect(problems, problems.join('\n')).toEqual([]);
});

test('menus and the level-up screen are easy to tap; the controls come back after a pick', async ({ page }) => {
  const problems = watch(page);
  await open(page, '/?seed=7');
  const vp = page.viewportSize()!;
  /** Every visible button on screen is at least 48 px tall and inside the viewport. */
  const checkTargets = async (scope: string): Promise<void> => {
    const boxes = await page.locator(`${scope} button:visible`).evaluateAll((els) => els.map((e) => {
      const r = e.getBoundingClientRect();
      return { text: (e.textContent ?? '').trim().slice(0, 20), h: r.height, top: r.top, bottom: r.bottom };
    }));
    expect(boxes.length).toBeGreaterThan(0);
    for (const b of boxes) expect(b.h, `${scope}: "${b.text}" is tall enough`).toBeGreaterThanOrEqual(47.5);
  };
  await page.getByRole('button', { name: 'Settings', exact: true }).tap();
  await checkTargets('.settings');
  await page.getByRole('button', { name: 'Done' }).tap();
  await page.getByRole('button', { name: 'Play', exact: true }).tap();
  await checkTargets('.select-screen');
  // Start run stays reachable (pinned at the bottom) even on a phone
  const start = (await page.getByRole('button', { name: 'Start run' }).boundingBox())!;
  expect(start.y + start.height).toBeLessThanOrEqual(vp.height + 1);
  await page.getByRole('button', { name: 'Start run' }).tap();
  await expect(page.locator('.touch-ui')).toBeVisible();
  // a level-up with every option available
  await page.evaluate(() => {
    const g = (window as unknown as { __theabonk: { world: { player: { rerolls: number; skips: number; banishes: number; xp: number; xpNext: number } } } }).__theabonk;
    const p = g.world.player;
    // just enough for one level-up
    Object.assign(p, { rerolls: 2, skips: 2, banishes: 2, xp: p.xpNext });
  });
  await expect(page.locator('.screen-levelup')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.touch-ui')).toBeHidden();
  // no keyboard wording on a touch screen (phones hide the hint line to make room)
  await expect(page.locator('.hint-keys')).toBeHidden();
  await checkTargets('.screen-levelup');
  for (const name of [/Reroll/, /Skip/]) {
    const b = (await page.getByRole('button', { name }).boundingBox())!;
    expect(b.y + b.height, 'level-up actions fit on screen').toBeLessThanOrEqual(vp.height + 1);
  }
  // pick cards until the run resumes
  for (let k = 0; k < 12 && (await page.locator('.screen-levelup').isVisible()); k++) {
    await page.locator('.screen-levelup .card').first().tap();
    await page.waitForTimeout(250);
  }
  await expect(page.locator('.touch-ui')).toBeVisible();
  expect(problems, problems.join('\n')).toEqual([]);
});

type Placed = { x: number; y: number; d: number };
const placement = (page: Page): Promise<Record<'stick' | 'jump' | 'slide' | 'pause', Placed>> =>
  page.evaluate(() => (window as unknown as { __theabonk: { touch: { placement: Record<'stick' | 'jump' | 'slide' | 'pause', Placed> } } }).__theabonk.touch.placement);

/** A synthetic finger drag on an element (works in every engine). */
async function dragOn(page: Page, selector: string, from: [number, number], to: [number, number], steps = 8): Promise<void> {
  await page.evaluate(
    async ({ selector, from, to, steps }) => {
      const el = document.querySelector(selector) as HTMLElement;
      const ev = (type: string, x: number, y: number): boolean => el.dispatchEvent(new PointerEvent(type, { pointerId: 21, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true, clientX: x, clientY: y }));
      ev('pointerdown', from[0], from[1]);
      for (let k = 1; k <= steps; k++) {
        await new Promise((r) => setTimeout(r, 16));
        ev('pointermove', from[0] + ((to[0] - from[0]) * k) / steps, from[1] + ((to[1] - from[1]) * k) / steps);
      }
      ev('pointerup', to[0], to[1]);
    },
    { selector, from, to, steps },
  );
}

async function openTouchSettings(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Settings', exact: true }).tap();
  await page.locator('.setting', { hasText: 'Touch controls' }).getByRole('button').tap();
  await expect(page.locator('.touch-settings')).toBeVisible();
  // the real controls are previewed around the panel
  await expect(page.locator('.glass-ui.preview')).toBeVisible();
}

test('Touch controls settings preview live; Large and left-handed apply in the run', async ({ page }) => {
  const problems = watch(page);
  await open(page, '/?seed=7');
  const vp = page.viewportSize()!;
  await openTouchSettings(page);
  const before = await placement(page);
  await page.locator('.setting', { hasText: 'Size' }).getByRole('button').tap();
  await expect(page.locator('.setting', { hasText: 'Size' }).getByRole('button')).toHaveText('Large');
  await expect(page.locator('.glass-ui')).toHaveAttribute('data-size', 'l');
  expect((await placement(page)).jump.d).toBeGreaterThan(before.jump.d);
  await page.locator('.setting', { hasText: 'Left-handed' }).getByRole('button').tap();
  const lefty = await placement(page);
  expect(lefty.jump.x, 'buttons move to the left').toBeLessThan(vp.width / 2);
  expect(lefty.stick.x, 'the stick moves to the right').toBeGreaterThan(vp.width / 2);
  expect(lefty.pause.x, 'Pause stays top-right').toBeGreaterThan(vp.width / 2);
  await page.getByRole('button', { name: 'Done' }).first().tap();
  await page.getByRole('button', { name: 'Done' }).first().tap();
  await page.getByRole('button', { name: 'Play', exact: true }).tap();
  await page.getByRole('button', { name: 'Start run' }).tap();
  await expect(page.locator('.glass-ui:not(.preview)')).toBeVisible();
  const zone = (await page.locator('.tzone-stick').boundingBox())!;
  expect(zone.x, 'the stick side is on the right').toBeGreaterThanOrEqual(vp.width / 2 - 1);
  expect(problems, problems.join('\n')).toEqual([]);
});

test('Edit layout: drag a button, no overlaps or HUD cover, size limits, and it survives a reload', async ({ page }) => {
  const problems = watch(page);
  await open(page, '/?seed=7');
  const vp = page.viewportSize()!;
  await openTouchSettings(page);
  await page.getByRole('button', { name: 'Edit layout…' }).tap();
  await expect(page.locator('.layout-editor')).toBeVisible();
  const p0 = await placement(page);
  // move Jump up and left a little
  const target: [number, number] = [p0.jump.x - 70, p0.jump.y - 60];
  await dragOn(page, '.le-surface', [p0.jump.x, p0.jump.y], target);
  let p = await placement(page);
  expect(p.jump.x).toBeCloseTo(target[0], 0);
  expect(p.jump.y).toBeCloseTo(target[1], 0);
  // onto Slide: refused, Jump stays where it was
  await dragOn(page, '.le-surface', [p.jump.x, p.jump.y], [p0.slide.x, p0.slide.y]);
  await expect(page.locator('.le-status.bad')).toBeVisible();
  let q = await placement(page);
  expect(Math.hypot(q.jump.x - q.slide.x, q.jump.y - q.slide.y), 'never overlaps Slide').toBeGreaterThanOrEqual((q.jump.d + q.slide.d) / 2);
  // over the timer: refused
  await dragOn(page, '.le-surface', [q.jump.x, q.jump.y], [vp.width / 2, 30]);
  q = await placement(page);
  expect(q.jump.y, 'never covers the timer').toBeGreaterThan(80);
  // bigger, up to the limit
  const d0 = q.jump.d;
  for (let k = 0; k < 8; k++) await page.getByRole('button', { name: 'Bigger' }).tap();
  q = await placement(page);
  expect(q.jump.d).toBeGreaterThan(d0);
  expect(q.jump.d).toBeLessThanOrEqual(p0.jump.d * 1.25 + 0.5);
  const saved = q.jump;
  await page.getByRole('button', { name: 'Done' }).first().tap();
  await expect(page.locator('.touch-settings')).toBeVisible();
  // the layout is stored in the save and comes back after a reload
  await open(page, '/?seed=7');
  p = await placement(page);
  expect(p.jump.x).toBeCloseTo(saved.x, 0);
  expect(p.jump.y).toBeCloseTo(saved.y, 0);
  expect(p.jump.d).toBeCloseTo(saved.d, 0);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('theabonk.save') ?? '{}').settings?.touch?.layout);
  expect(stored?.jump).toBeTruthy();
  // Reset to default puts everything back
  await openTouchSettings(page);
  await page.getByRole('button', { name: 'Edit layout…' }).tap();
  await page.getByRole('button', { name: 'Reset to default' }).tap();
  await page.getByRole('button', { name: 'Done' }).first().tap();
  p = await placement(page);
  expect(p.jump.x).toBeCloseTo(p0.jump.x, 0);
  expect(problems, problems.join('\n')).toEqual([]);
});
