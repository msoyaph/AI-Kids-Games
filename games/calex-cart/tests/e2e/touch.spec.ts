import type { Page, TestInfo } from '@playwright/test';
import { test, expect, slow } from './fixtures';
import { boot, watch } from './helpers';
import { stickResponse } from '../../src/input/touch/stick';
import { hudRects, layoutProblems, type Layout, type Viewport } from '../../src/input/touch/layout';

// Glass touch controller (docs/touch/design.md). Chromium gets REAL multi-touch through the DevTools protocol
// (Input.dispatchTouchEvent: several fingers at once). Playwright has no multi-touch API for WebKit, so there the
// same finger script is played as multi-pointer events dispatched in the page (documented limitation).

const touchProject = (info: TestInfo): boolean => !info.project.name.endsWith('desktop');

interface Fingers {
  down(id: number, x: number, y: number): Promise<void>;
  move(id: number, x: number, y: number): Promise<void>;
  up(id: number): Promise<void>;
}

async function fingers(page: Page, info: TestInfo): Promise<Fingers> {
  const active = new Map<number, [number, number]>();
  if (info.project.use.browserName === 'chromium') {
    const cdp = await page.context().newCDPSession(page);
    const send = (type: string): Promise<unknown> =>
      cdp.send('Input.dispatchTouchEvent', { type: type as 'touchStart', touchPoints: [...active].map(([id, [x, y]]) => ({ x, y, id, radiusX: 6, radiusY: 6, force: 1 })) });
    return {
      down: async (id, x, y) => {
        active.set(id, [x, y]);
        await send('touchStart');
      },
      move: async (id, x, y) => {
        active.set(id, [x, y]);
        await send('touchMove');
      },
      // CDP: touchEnd ends every finger, so lifting one of several = a touchMove without it
      up: async (id) => {
        active.delete(id);
        await send(active.size ? 'touchMove' : 'touchEnd');
      },
    };
  }
  // WebKit: pointer events with distinct pointerIds, dispatched where a finger would land
  const fire = (type: string, id: number, x: number, y: number): Promise<void> =>
    page.evaluate(
      ({ type, id, x, y }) => {
        const el = (document.elementFromPoint(x, y) ?? document.body) as Element;
        el.dispatchEvent(new PointerEvent(type, { pointerId: 100 + id, pointerType: 'touch', isPrimary: id === 1, clientX: x, clientY: y, bubbles: true, cancelable: true, composed: true }));
      },
      { type, id, x, y },
    );
  return {
    down: async (id, x, y) => {
      active.set(id, [x, y]);
      await fire('pointerdown', id, x, y);
    },
    move: async (id, x, y) => {
      active.set(id, [x, y]);
      await fire('pointermove', id, x, y);
    },
    up: async (id) => {
      const p = active.get(id) ?? [0, 0];
      active.delete(id);
      await fire('pointerup', id, p[0], p[1]);
    },
  };
}

/** A race with the touch controls up; the player's kart is held at the start unless `drive`. */
async function touchRace(page: Page, settings: Record<string, unknown> = {}, opts: { drive?: boolean } = {}): Promise<void> {
  await page.evaluate(
    async ({ settings, drive }) => {
      const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
      const a = window.__calex.app;
      if (!a.saves.data) a.saves.create(3, 'Touch');
      Object.assign(a.saves.settings, settings);
      a.saves.settings.controlsSeen = { keyboard: true, gamepad: true, touch: true };
      a.applySettings();
      a.startSession(
        {
          mode: 'versus',
          trackId: 'seashell-boardwalk',
          speedClass: 'rookie',
          mirror: false,
          items: true,
          itemSet: 'all',
          laps: 3,
          players: [{ racerId: 'calex', kart: { body: 'zoomster', wheels: 'standard', glider: 'kite', paint: 'cherry', decal: 'none' }, source: { kind: 'any' } }],
          ai: ['pip', 'juno', 'mochi'].map((id) => ({ racerId: id, kart: { body: 'bubble', wheels: 'standard', glider: 'kite', paint: 'ocean', decal: 'none' } })),
          seed: 3,
          intro: false,
        },
        () => {},
      );
      while (a.session.world.phase !== 'race') await sleep(30);
      if (!drive) a.loop.simPaused = true; // input still flows; the race just doesn't move
    },
    { settings, drive: !!opts.drive },
  );
  await expect(page.locator('.touch-controls')).toBeVisible();
}

const state = (page: Page): Promise<{ steer: number; drift: boolean; item: boolean; brake: boolean; accel: boolean }> => page.evaluate(() => ({ ...window.__calex.app.input.touch.state }));
const layout = (page: Page): Promise<Layout> => page.evaluate(() => window.__calex.app.input.touch.layout);
const viewport = (page: Page): Promise<Viewport> => page.evaluate(() => window.__calex.app.input.touch.viewport());
const zoneRect = (page: Page): Promise<{ x: number; y: number; w: number; h: number }> =>
  page.evaluate(() => {
    const r = document.querySelector('.tc-zone')!.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });

test.describe('glass touch controller', () => {
  test.beforeEach(async ({ page }, info) => {
    test.skip(!touchProject(info), 'touch projects only');
    await boot(page);
  });

  test('analog steering follows the stick at several angles (dead zone, curve, full lock)', async ({ page }, info) => {
    await touchRace(page);
    const f = await fingers(page, info);
    const z = await zoneRect(page);
    const L = await layout(page);
    const travel = L.stick.d * 0.3;
    // thumb lands in the middle of the zone (the floating stick appears under it)
    const o = { x: z.x + z.w * 0.5, y: z.y + z.h * 0.5 };
    await f.down(1, o.x, o.y);
    const origin = await page.evaluate(() => {
      const r = document.querySelector('.tc-stick')!.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    for (const [deg, r] of [[0, 0.04], [0, 0.3], [0, 0.6], [180, 0.6], [30, 0.8], [-60, 0.7], [90, 0.9], [0, 1.5], [180, 2]] as Array<[number, number]>) {
      const dx = Math.cos((deg * Math.PI) / 180) * r * travel;
      const dy = -Math.sin((deg * Math.PI) / 180) * r * travel;
      await f.move(1, origin.x + dx, origin.y + dy);
      const got = (await state(page)).steer;
      // knob clamps to its circle; only the horizontal axis steers
      const k = Math.min(1, travel / Math.hypot(dx, dy));
      expect(got, `${deg}° at ${r}`).toBeCloseTo(stickResponse(dx * k, travel), 1);
    }
    await f.up(1);
    expect((await state(page)).steer).toBe(0);
  });

  test('steering, drifting and using an item at the same time all work', async ({ page }, info) => {
    await touchRace(page, {}, { drive: true });
    const f = await fingers(page, info);
    const z = await zoneRect(page);
    const L = await layout(page);
    // a kart can only start a drift when it's moving: let auto-accelerate get it up to speed first
    await page.waitForFunction(() => window.__calex.app.session.world.karts[0].speed > 12, null, { timeout: slow(15_000) });
    await page.evaluate(() => {
      const k = window.__calex.app.session.world.karts[0];
      k.item = 'turbo';
      k.itemUses = 1;
    });
    await f.down(1, z.x + z.w * 0.5, z.y + z.h * 0.5);
    await f.move(1, z.x + z.w * 0.5 + 60, z.y + z.h * 0.5);
    await f.down(2, L.drift.x, L.drift.y);
    await f.down(3, L.item.x, L.item.y);
    const st = await state(page);
    expect(st.steer).toBeGreaterThan(0.5);
    expect(st.drift).toBe(true);
    expect(st.item).toBe(true);
    // and the kart really does it: the turbo is used, the kart hops into a drift while steering
    await page.waitForFunction(() => window.__calex.app.session.world.karts[0].item === null, null, { timeout: slow(10_000) });
    await page.waitForFunction(() => window.__calex.app.session.world.karts[0].drifting, null, { timeout: slow(10_000) });
    for (const id of [3, 2, 1]) await f.up(id);
    const end = await state(page);
    expect(end.steer).toBe(0);
    expect(end.drift).toBe(false);
  });

  test('floating stick: appears under the thumb, keeps its finger outside the zone, ignores a second finger', async ({ page }, info) => {
    await touchRace(page);
    const f = await fingers(page, info);
    const z = await zoneRect(page);
    const p = { x: z.x + z.w * 0.6, y: z.y + z.h * 0.55 };
    await f.down(1, p.x, p.y);
    const c = await page.evaluate(() => {
      const r = document.querySelector('.tc-stick')!.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, active: document.querySelector('.tc-stick')!.classList.contains('active') };
    });
    expect(c.active).toBe(true);
    expect(Math.abs(c.x - p.x)).toBeLessThan(2);
    expect(Math.abs(c.y - p.y)).toBeLessThan(2);
    // a second finger in the zone doesn't move or steal the stick
    await f.down(2, z.x + 30, z.y + z.h - 30);
    const c2 = await page.evaluate(() => document.querySelector('.tc-stick')!.getBoundingClientRect().x);
    expect(Math.abs(c2 - (c.x - (await layout(page)).stick.d / 2))).toBeLessThan(2);
    await f.up(2);
    // the thumb slides right out of the zone (across the screen): still steering, full lock
    const vp = await viewport(page);
    await f.move(1, vp.w * 0.85, p.y);
    expect((await state(page)).steer).toBe(1);
    await f.up(1);
    expect((await state(page)).steer).toBe(0);
  });

  test('left-handed layout swaps the stick and the buttons', async ({ page }, info) => {
    await touchRace(page, { touch: { stick: 'floating', size: 'medium', opacity: 1, leftHanded: true, highContrast: false } });
    const vp = await viewport(page);
    const L = await layout(page);
    expect(L.stick.x).toBeGreaterThan(vp.w / 2);
    expect(L.drift.x).toBeLessThan(vp.w / 2);
    const z = await zoneRect(page);
    expect(z.x).toBeGreaterThan(vp.w / 2 - 1);
    const f = await fingers(page, info);
    await f.down(1, z.x + z.w * 0.5, z.y + z.h * 0.5);
    await f.move(1, z.x + z.w * 0.5 - 60, z.y + z.h * 0.5);
    expect((await state(page)).steer).toBeLessThan(-0.5);
    await f.up(1);
    await f.down(2, L.drift.x, L.drift.y);
    expect((await state(page)).drift).toBe(true);
    await f.up(2);
  });

  test('Buttons and Tilt modes still work', async ({ page }, info) => {
    await touchRace(page, { touchSteer: 'buttons' });
    const f = await fingers(page, info);
    const r = await page.evaluate(() => {
      const b = document.querySelector('.tc-right')!.getBoundingClientRect();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    });
    await f.down(1, r.x, r.y);
    expect((await state(page)).steer).toBeGreaterThan(0.5);
    await f.up(1);
    expect((await state(page)).steer).toBe(0);
    // tilt: a sideways tilt of the device steers
    await page.evaluate(() => {
      const t = window.__calex.app.input.touch;
      t.setMode('tilt');
      // (which axis is "sideways" depends on how the browser reports the screen angle)
      window.dispatchEvent(Object.assign(new Event('deviceorientation'), { alpha: 0, beta: 14, gamma: 14 }));
    });
    expect(Math.abs((await state(page)).steer)).toBeGreaterThan(0.3);
  });

  test('every control keeps a touch target of at least 48 px, even at Small; reduced motion stops the ripple', async ({ page }, info) => {
    await touchRace(page, { touch: { stick: 'fixed', size: 'small', opacity: 0.6, leftHanded: false, highContrast: true }, reduceEffects: true });
    const sizes = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('.touch-controls .tc-btn, .touch-controls .tc-stick')]
        .filter((e) => e.offsetParent !== null)
        .map((e) => ({ c: e.className, w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height })),
    );
    expect(sizes.length).toBeGreaterThan(4);
    for (const s of sizes) {
      expect(s.w, s.c).toBeGreaterThanOrEqual(47.5);
      expect(s.h, s.c).toBeGreaterThanOrEqual(47.5);
    }
    const f = await fingers(page, info);
    const L = await layout(page);
    await f.down(1, L.drift.x, L.drift.y);
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('.tc-drift .ripple')!).display)).toBe('none');
    expect(await page.evaluate(() => document.querySelector('.touch-controls')!.classList.contains('gc-hc'))).toBe(true);
    await f.up(1);
    // fixed stick: pressing on the stick steers
    await f.down(2, L.stick.x, L.stick.y);
    await f.move(2, L.stick.x + 50, L.stick.y);
    expect((await state(page)).steer).toBeGreaterThan(0.5);
    await f.up(2);
  });

  test('Android vibration: short pulses on an item hit and a big landing (quietly nothing where vibrate is missing)', async ({ page }, info) => {
    await page.evaluate(() => {
      const n = navigator as unknown as { vibrate?: (p: unknown) => boolean };
      (window as unknown as { __vib: unknown[] }).__vib = [];
      if (typeof n.vibrate === 'function') n.vibrate = (ms: unknown): boolean => ((window as unknown as { __vib: unknown[] }).__vib.push(ms), true);
    });
    const w = watch(page);
    await touchRace(page, {}, { drive: true });
    // the player has really touched the screen (browsers only allow vibration after that)
    const f = await fingers(page, info);
    const L = await layout(page);
    await f.down(1, L.look.x, L.look.y);
    await f.up(1);
    await page.evaluate(async () => {
      const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
      const s = window.__calex.app.session;
      const k = s.world.karts[0];
      // an item hit (from a rival)…
      s.items.hit(k, 1, 'bumperBall', 'spin');
      await sleep(400);
      // …and a big landing from a jump
      k.y += 7;
      k.vy = 2;
      k.grounded = false;
      await sleep(1200);
    });
    const hasVibrate = await page.evaluate(() => typeof navigator.vibrate === 'function');
    const got = (await page.evaluate(() => (window as unknown as { __vib: unknown[] }).__vib)) as number[];
    if (hasVibrate) {
      expect(got.length).toBeGreaterThanOrEqual(2);
      for (const ms of got) expect(ms).toBeLessThanOrEqual(40);
    } else expect(got).toEqual([]);
    expect(w.errors).toEqual([]);
  });

  test('Edit layout: drag, safe-area limits, no overlaps, off the HUD, saved across a reload, reset', async ({ page }, info) => {
    test.setTimeout(slow(120_000));
    await page.evaluate(() => {
      const a = window.__calex.app;
      a.saves.create(3, 'Edit');
      a.screens.settings(() => a.screens.mainMenu(), 'touch');
    });
    await expect(page.locator('.touch-preview')).toBeVisible();
    await page.locator('.ui-root [data-nav]').filter({ hasText: 'Edit layout' }).first().tap();
    await expect(page.locator('.touch-editor')).toBeVisible();
    const f = await fingers(page, info);
    const edited = (): Promise<Layout> => page.evaluate(() => window.__calex.app.input.touch.editedLayout);
    const vp = await viewport(page);
    const hud = hudRects(vp, false);
    const drag = async (from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> => {
      await f.down(1, from.x, from.y);
      for (let i = 1; i <= 6; i++) await f.move(1, from.x + ((to.x - from.x) * i) / 6, from.y + ((to.y - from.y) * i) / 6);
      await f.up(1);
    };
    // 1) a plain drag moves the control by the finger's distance
    let L = await edited();
    const want = { x: L.item.x - 60, y: L.item.y - 18 };
    await drag(L.item, want);
    L = await edited();
    expect(Math.abs(L.item.x - want.x)).toBeLessThan(3);
    expect(Math.abs(L.item.y - want.y)).toBeLessThan(3);
    // 2) past the screen edge → stays inside the safe area; 3) onto the HUD item box → pushed off it;
    // 4) onto another control → no overlap after release
    await drag(L.brake, { x: vp.w - 2, y: vp.h - 2 });
    L = await edited();
    await drag(L.look, { x: hud[1].x + hud[1].w / 2, y: hud[1].y + hud[1].h / 2 });
    L = await edited();
    await drag(L.accel, L.drift);
    L = await edited();
    expect(layoutProblems(L, vp, hud)).toEqual([]);
    // resize DRIFT with its corner handle (bigger), still legal
    const before = L.drift.d;
    const hd = await page.evaluate(() => {
      const r = document.querySelector('.tc-drift .tc-handle')!.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await drag(hd, { x: hd.x + 40, y: hd.y + 40 });
    L = await edited();
    expect(L.drift.d).not.toBe(before);
    expect(layoutProblems(L, vp, hud)).toEqual([]);
    // save → reload → the race uses the saved spots
    await page.locator('.touch-editor [data-nav]').filter({ hasText: 'Save' }).first().tap();
    const saved = await page.evaluate(() => window.__calex.app.saves.settings.touch.layout);
    expect(saved).toBeTruthy();
    await page.reload();
    await page.waitForFunction(() => !!window.__calex?.app);
    expect(await page.evaluate(() => window.__calex.app.saves.settings.touch.layout)).toEqual(saved);
    await page.evaluate(() => window.__calex.app.saves.load(3));
    await touchRace(page);
    const raceL = await layout(page);
    expect(Math.abs(raceL.item.x - L.item.x)).toBeLessThan(4);
    expect(Math.abs(raceL.drift.d - L.drift.d)).toBeLessThan(2);
    // reset to default
    await page.evaluate(() => {
      const a = window.__calex.app;
      a.endSession();
      a.screens.settings(() => a.screens.mainMenu(), 'touch');
    });
    await page.locator('.ui-root [data-nav]').filter({ hasText: 'Reset to default' }).first().tap();
    expect(await page.evaluate(() => window.__calex.app.saves.settings.touch.layout)).toBeUndefined();
  });
});

test('phones keep the "turn sideways" screen; tablets race upright', async ({ page }, info) => {
  test.skip(!info.project.name.includes('portrait'), 'portrait projects only');
  await boot(page);
  const rotate = await page.evaluate(() => getComputedStyle(document.querySelector('.rotate-hint')!).display);
  expect(rotate).toBe('none'); // the portrait projects are tablets
  await touchRace(page, {}, { drive: true });
  const L = await layout(page);
  const vp = await viewport(page);
  expect(vp.h).toBeGreaterThan(vp.w);
  expect(layoutProblems(L, vp, await page.evaluate(() => window.__calex.app.input.touch.hudRects(window.__calex.app.input.touch.viewport())))).toEqual([]);
  // a phone held upright still asks to turn sideways
  const ctx = await page.context().browser()!.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const phone = await ctx.newPage();
  await boot(phone);
  expect(await phone.evaluate(() => getComputedStyle(document.querySelector('.rotate-hint')!).display)).toBe('flex');
  await ctx.close();
});
