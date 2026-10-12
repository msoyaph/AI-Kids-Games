// Touch-only play on phones and tablets (Chromium and WebKit, portrait and landscape — see the
// projects in playwright.config.ts). Situations are staged with window.__lc.dev; every action in
// the game is a real tap, hold or drag on the screen.
import { expect, test, type Page } from '@playwright/test';
import { Player, newGameByTouch } from './lib/play';

const LOW = !!process.env.E2E_LOW;
const Q = LOW ? '?quality=low' : '';

async function open(page: Page): Promise<void> {
  await page.goto(`/${Q}`);
  await page.waitForFunction(() => !!(window as unknown as { __lc?: { dev?: unknown } }).__lc?.dev);
}

/** A fresh island with a few neighbors and every tool. */
async function stage(page: Page, browserName: string, extra?: (d: Record<string, (...a: unknown[]) => unknown>) => void): Promise<Player> {
  await open(page);
  await page.evaluate((src) => {
    const d = (window as unknown as { __lc: { dev: Record<string, (...a: unknown[]) => unknown> } }).__lc.dev;
    d.start!();
    d.town!();
    d.tools!();
    d.hour!(10);
    d.toPlaza!();
    if (src) new Function('d', `(${src})(d)`)(d);
  }, extra ? extra.toString() : '');
  const pl = new Player(page, browserName);
  await pl.wait(600);
  if (!(await pl.peek()).panel) await expect(page.locator('.tc-a')).toBeVisible();
  return pl;
}

test.describe('touch controls', () => {
  test('the stick: a small push sneaks, a bigger push walks, the edge runs', async ({ page, browserName }) => {
    const pl = await stage(page, browserName, (d) => d.toOpen!());
    const vp = page.viewportSize()!;
    // in a clear meadow: sneak down, walk back up, run down again (so we never reach its edge)
    const x0 = vp.width * 0.3, y0 = vp.height * 0.45;
    await pl.f.start(x0, y0);
    await pl.f.move(x0, y0 + 8);
    await pl.f.move(x0, y0 + 20);
    await pl.wait(400);
    let p = await pl.peek();
    expect(p.creeping).toBe(true);
    expect(p.speed).toBeLessThan(1.6);
    await expect(page.locator('.tc-stick[data-mode="sneak"] .tc-stick-label')).toHaveText('🐾 Sneak');
    await pl.f.move(x0, y0 - 40);
    await pl.wait(350);
    p = await pl.peek();
    expect(p.creeping).toBe(false);
    expect(p.speed).toBeGreaterThan(1.8);
    await pl.f.move(x0, y0 + 80);
    await pl.wait(400);
    p = await pl.peek();
    expect(p.running).toBe(true);
    await pl.f.end();
    await pl.wait(300);
    expect((await pl.peek()).speed).toBeLessThan(0.5);
  });

  test('tap the ground to walk there; tap a building to go in; tap the door mat to come out', async ({ page, browserName }) => {
    const pl = await stage(page, browserName);
    const d = (await pl.dev<{ x: number; z: number; tx: number; tz: number }>('door', 'shop'))!;
    await pl.walkTo(d.x, d.z + 2);
    let p = await pl.peek();
    expect(Math.hypot(p.x - d.x, p.z - (d.z + 2))).toBeLessThan(0.8);
    // tap the shop itself: walk to its door and go in
    expect(await pl.tapWorld(d.tx, d.tz, 0.8)).toBe(true);
    await pl.until(async () => (await pl.peek()).location === 'shop', 10_000, 'going into the shop');
    // tap the door mat: walk out
    await pl.wait(700);
    const room = (await pl.dev<{ w: number; d: number; door: { x: number; z: number } }>('room'))!;
    expect(await pl.tapWorld(room.door.x + 0.5, room.d - 0.5)).toBe(true);
    await pl.until(async () => (await pl.peek()).location === 'island', 10_000, 'coming back out');
    p = await pl.peek();
    expect(p.mode).toBe('play');
  });

  test('the tool ring, the target ring, digging and chopping', async ({ page, browserName }) => {
    // from an open meadow, so the dig spot isn't already right in front of us
    const pl = await stage(page, browserName, (d) => d.toOpen!());
    await pl.equip('Shovel');
    expect((await pl.peek()).tool).toBe('shovel');
    const dig = (await pl.dev<{ x: number; z: number; tile: number }>('nearest', 'dig'))!;
    await pl.approach(dig.x, dig.z, 0);
    // standing on a branch or a weed? the ring shows that first (A picks it up) — clear it
    for (let k = 0; k < 3 && /^(Pick up|Pull weeds)/.test((await pl.peek()).prompt ?? ''); k++) {
      await pl.a();
      await pl.idle();
    }
    // the ring is on the spot the shovel will dig, and walking up never digs by itself
    const t = (await pl.dev<{ tile: number; ok: boolean }>('target'))!;
    expect(t.tile).toBe(dig.tile);
    expect(t.ok).toBe(true);
    expect((await pl.peek()).stats.digSpots ?? 0).toBe(0);
    // tap the glowing spot: dig
    expect(await pl.tapWorld(dig.x, dig.z)).toBe(true);
    await pl.until(async () => ((await pl.peek()).stats.digSpots ?? 0) === 1, 8000, 'digging');
    await pl.idle();
    await pl.equip('Axe');
    const tree = (await pl.dev<{ x: number; z: number; tile: number }>('nearest', 'tree'))!;
    await pl.approach(tree.x, tree.z, 1.0);
    const before = await pl.dev<number>('count', 'timber');
    await pl.a();
    await pl.until(async () => (await pl.dev<number>('count', 'timber')) > before, 8000, 'chopping');
  });

  test('fishing: cast, hook and reel with touch only', async ({ page, browserName }) => {
    test.setTimeout(LOW ? 900_000 : 300_000);
    const pl = await stage(page, browserName, (d) => d.face!('water'));
    await pl.equip('Fishing Rod');
    // the reel minigame, played fairly: hold anywhere while the hook is below the green, let go above it
    await pl.dev('reel');
    const vp = page.viewportSize()!;
    const hx = vp.width * 0.5, hy = vp.height * 0.45;
    let holding = false;
    const t0 = Date.now();
    for (;;) {
      const p = await pl.peek();
      if (!p.reel) break;
      const want = p.reel.cursor + p.reel.cursorV * 0.25 < p.reel.zone;
      if (want && !holding) await pl.f.start(hx, hy);
      if (!want && holding) await pl.f.end();
      holding = want;
      await pl.wait(40);
      if (Date.now() - t0 > 40_000) throw new Error('the reel never finished');
    }
    if (holding) await pl.f.end();
    await pl.idle();
    expect((await pl.peek()).stats.fishCaught ?? 0).toBe(1);
    // a real cast by a shadow: tap A, wait for the bite, tap anywhere to hook (hold to reel a big one)
    let caught = false;
    for (let tries = 0; tries < 6 && !caught; tries++) caught = await pl.fishOnce(LOW ? 120_000 : 45_000);
    expect(caught).toBe(true);
  });

  test('bugs: creep up with a small push and swing with A', async ({ page, browserName }) => {
    const pl = await stage(page, browserName, (d) => d.toOpen!());
    await pl.equip('Net');
    let got = false;
    for (let tries = 0; tries < 4 && !got; tries++) {
      const b = (await pl.dev<{ x: number; z: number } | null>('bug', 3.2))!;
      expect(b).not.toBeNull();
      await pl.wait(200);
      // creep toward it with a small push (watching the screen), then swing from a step away
      const vp = page.viewportSize()!;
      const sx = vp.width * 0.3, sy = vp.height * 0.62;
      await pl.f.start(sx, sy);
      let crept = false;
      for (let k = 0; k < 60; k++) {
        const p = await pl.peek();
        crept ||= p.creeping;
        if (k >= 2 && Math.hypot(p.x - b.x, p.z - b.z) < 1.5) break;
        const me = await pl.spot(p.x, p.z), it = await pl.spot(b.x, b.z);
        const dx = it.x - me.x, dy = it.y - me.y, len = Math.hypot(dx, dy) || 1;
        await pl.f.move(sx + (dx / len) * 20, sy + (dy / len) * 20);
        await pl.wait(100);
      }
      expect(crept).toBe(true);
      await pl.f.end();
      await pl.a();
      await pl.wait(800);
      got = ((await pl.peek()).stats.bugsCaught ?? 0) > 0;
    }
    expect(got).toBe(true);
  });

  test('placing a home plot with the Place / Cancel buttons', async ({ page, browserName }) => {
    const pl = await stage(page, browserName, (d) => d.plot!('bellamy'));
    await expect(page.locator('.tc-place')).toBeVisible();
    await pl.f.tapEl('.tc-place-no');
    await pl.wait(300);
    await expect(page.locator('.tc-place')).toBeHidden();
    await pl.dev('plot', 'bellamy');
    // walk to a spot where the plot fits, turn to face the right way, then place
    const spot = (await pl.dev<{ x: number; z: number; facing: number }>('plotSpot', 'bellamy'))!;
    expect(spot).not.toBeNull();
    await pl.walkTo(spot.x, spot.z, 0.3);
    // a tiny push faces a direction (screen up = north, facing π)
    const dir: Record<string, [number, number]> = { [Math.PI]: [0, -1], 0: [0, 1], [Math.PI / 2]: [1, 0], [-Math.PI / 2]: [-1, 0] };
    const [dx, dy] = dir[String(spot.facing)] ?? [0, -1];
    await pl.stick(dx, dy, 0.3, 90);
    await pl.wait(300);
    for (let k = 0; k < 6 && (await page.locator('.tc-place-ok').isDisabled()); k++) {
      await pl.walkTo(spot.x, spot.z, 0.2);
      await pl.stick(dx, dy, 0.3, 60);
      await pl.wait(300);
    }
    await expect(page.locator('.tc-place-ok')).toBeEnabled();
    await pl.f.tapEl('.tc-place-ok');
    await pl.wait(400);
    await expect(page.locator('.tc-place')).toBeHidden();
  });
});

test.describe('menus and activities', () => {
  test('talking, choices, the shop: buy one, sell several', async ({ page, browserName }) => {
    const pl = await stage(page, browserName, (d) => (d.give!('fruit_blushpear', 6), d.give!('shell_scallop', 3)));
    const d = (await pl.dev<{ x: number; z: number; tx: number; tz: number }>('door', 'shop'))!;
    await pl.walkTo(d.x, d.z + 1.5);
    expect(await pl.tapWorld(d.tx, d.tz, 0.8)).toBe(true);
    await pl.until(async () => (await pl.peek()).location === 'shop', 10_000, 'the shop');
    await pl.wait(700);
    const f = (await pl.dev<{ x: number; z: number }>('person', 'fennimore'))!;
    await pl.approach(f.x, f.z, 0.9);
    await pl.until(() => pl.talking(), 5000, 'Fennimore talking');
    await pl.talkThrough([/trade/i], 6);
    await expect(page.locator('.shop-card').first()).toBeVisible();
    const g0 = (await pl.peek()).glints;
    // sell: tap the fruit (whole stack) and the shells, then Sell
    await pl.button('Sell');
    await pl.button('All fruit');
    await pl.button(/Sell selected/);
    await pl.wait(300);
    const g1 = (await pl.peek()).glints;
    expect(g1).toBeGreaterThan(g0);
    expect(await pl.dev<number>('count', 'fruit_blushpear')).toBe(0);
    // buy: one card
    await pl.button('Buy');
    const card = page.locator('.shop-card:not(.sold)').first();
    const box = (await card.boundingBox())!;
    await pl.f.tap(box.x + box.width / 2, box.y + box.height / 2);
    await pl.wait(300);
    expect((await pl.peek()).glints).toBeLessThan(g1);
    await pl.closeMenus();
  });

  test('crafting several and tracking a recipe', async ({ page, browserName }) => {
    const pl = await stage(page, browserName, (d) => (d.give!('branch', 30), d.give!('stone', 4), d.learn!('r_net_flimsy'), d.panel!('craft')));
    await pl.button(/Tools/);
    const row = page.locator('.craft-row', { hasText: 'Twig Net' }).first();
    const b = (await row.boundingBox())!;
    await pl.f.tap(b.x + b.width / 2, b.y + b.height / 2);
    await pl.button(/^×\d/);
    expect(await pl.dev<number>('count', 'net_flimsy')).toBeGreaterThanOrEqual(3);
    await pl.button(/📌 Track/);
    await pl.closeMenus();
    await expect(page.locator('.rtrack')).toBeVisible();
    await pl.f.tapEl('.rtrack-x');
    await expect(page.locator('.rtrack')).toBeHidden();
  });

  test('decorating: drag, turn, table-top, wall and undo', async ({ page, browserName }) => {
    const pl = await stage(page, browserName, (d) => (d.give!('furn_plank_table'), d.give!('furn_wick_lantern'), d.give!('furn_sunset_painting'), d.inside!('home')));
    await pl.wait(800);
    // open the editor with A (the prompt says Decorate)
    await pl.until(async () => (await pl.peek()).prompt === 'Decorate', 5000, 'the Decorate prompt');
    await pl.a();
    await expect(page.locator('.editor')).toBeVisible();
    const home = () => page.evaluate(() => {
      const s = (window as unknown as { __lc: { game: { state: { home: { furniture: { id: string; uid: number; x: number; z: number; rot: number; on?: number }[]; walls: unknown[] } } } } }).__lc.game.state.home;
      return { furniture: s.furniture.map((f) => ({ ...f })) as { id: string; uid: number; x: number; z: number; rot: number; on?: number }[], walls: s.walls.length };
    });
    const room = (await pl.dev<{ w: number; d: number }>('room'))!;
    const floor = (x: number, z: number) => pl.spot(x + 0.5, z + 0.5);
    // add the table from the drawer and drop it in the middle
    await pl.button('＋ Add');
    await pl.f.tapEl('.craft-row:has-text("Plank Table")');
    const mid = await floor(Math.floor(room.w / 2), Math.floor(room.d / 2) - 1);
    await pl.f.tap(mid.x, mid.y);
    await pl.wait(300);
    let h = await home();
    expect(h.furniture.map((f) => f.id)).toEqual(['furn_plank_table']);
    // drag it two tiles to the left
    const t0 = h.furniture[0]!;
    const from = await floor(t0.x, t0.z);
    const to = await floor(t0.x - 2, t0.z);
    await pl.f.drag(from.x, from.y, to.x, to.y, 8, 100);
    await pl.wait(300);
    h = await home();
    expect(h.furniture[0]!.x).toBe(t0.x - 2);
    // turn it
    await pl.button('Turn');
    h = await home();
    expect(h.furniture[0]!.rot).toBe(1);
    // the lantern goes on the table
    await pl.button('＋ Add');
    await pl.f.tapEl('.craft-row:has-text("Wick Lantern")');
    const top = await floor(h.furniture[0]!.x, h.furniture[0]!.z);
    await pl.f.tap(top.x, top.y);
    await pl.wait(300);
    h = await home();
    expect(h.furniture.find((f) => f.id === 'furn_wick_lantern')?.on).toBe(h.furniture.find((f) => f.id === 'furn_plank_table')!.uid);
    // the painting goes on the back wall
    await pl.button('＋ Add');
    await pl.f.tapEl('.craft-row:has-text("Sunset Sail Painting")');
    const wall = await pl.spot(room.w / 2, 0.05, 1.6);
    await pl.f.tap(wall.x, wall.y);
    await pl.wait(300);
    expect((await home()).walls).toBe(1);
    // undo takes the painting back down
    await pl.button('Undo');
    expect((await home()).walls).toBe(0);
    await pl.button('✔ Done');
    await expect(page.locator('.editor')).toBeHidden();
  });

  test('the closet, outfits and the dye station', async ({ page, browserName }) => {
    const pl = await stage(page, browserName, (d) => (d.give!('cloth_sunny_tee'), d.give!('cloth_sun_cap'), d.give!('flower_bell_red', 2), d.inside!('home'), d.panel!('wardrobe')));
    await expect(page.locator('.wardrobe')).toBeVisible();
    const worn = () => page.evaluate(() => ({ ...(window as unknown as { __lc: { game: { state: { wardrobe: { worn: Record<string, string> } } } } }).__lc.game.state.wardrobe.worn }));
    await pl.f.tapEl('.wd-wear:has(img)');
    await pl.wait(250);
    expect(Object.values(await worn()).length).toBeGreaterThan(0);
    await pl.button('Save');
    await pl.button('✔ Done');
    await pl.dev('panel', 'dye');
    await pl.f.tapEl('.wd-wear:has(img), .slot:has(img)');
    await pl.f.tapEl('.dye-btn');
    await pl.wait(300);
    expect(await pl.dev<number>('count', 'flower_bell_red')).toBeLessThan(2);
    await pl.closeMenus();
  });

  test('a contest by touch: the bug-off', async ({ page, browserName }) => {
    const pl = await stage(page, browserName, (d) => (d.toOpen!(), d.contest!('bugoff')));
    await pl.equip('Net');
    await expect(page.locator('.contest-hud')).toBeVisible();
    for (let k = 0; k < 4 && ((await pl.peek()).stats.bugsCaught ?? 0) === 0; k++) {
      const b = (await pl.dev<{ x: number; z: number } | null>('bug', 1.2))!;
      await pl.wait(150);
      const p = await pl.peek();
      // turn to face it with a tiny push, then swing
      const me = await pl.spot(p.x, p.z), it = await pl.spot(b.x, b.z);
      const vp = page.viewportSize()!;
      const sx = vp.width * 0.3, sy = vp.height * 0.62;
      const dx = it.x - me.x, dy = it.y - me.y, len = Math.hypot(dx, dy) || 1;
      await pl.f.drag(sx, sy, sx + (dx / len) * 16, sy + (dy / len) * 16, 3, 120);
      await pl.a();
      await pl.wait(700);
    }
    const score = await page.evaluate(() => (window as unknown as { __lc: { game: { state: { events: { active: { score: number } | null } } } } }).__lc.game.state.events.active?.score ?? 0);
    expect(score).toBeGreaterThan(0);
  });

  test('festivals by touch: the Lantern Skate and the Flower Fair', async ({ page, browserName }) => {
    test.setTimeout(LOW ? 600_000 : 150_000);
    const pl = await stage(page, browserName, (d) => d.festival!('lanternSkate'));
    await pl.wait(800);
    const rings = await pl.dev<{ x: number; z: number }[]>('rings');
    expect(rings).toHaveLength(5);
    for (const r of rings) {
      await pl.walkTo(r.x, r.z, 0.5);
      if (await pl.dev<boolean>('festivalDone')) break;
    }
    expect(await pl.dev<boolean>('festivalDone')).toBe(true);
    // off the ice and back to the plaza before the next festival
    await pl.dev('toPlaza');
    // Flower Fair: bring three colors to Rusk in the plaza
    await pl.dev('festival', 'flowerFair');
    for (const id of ['flower_bell_red', 'flower_moon_white', 'flower_star_yellow']) await pl.dev('give', id, 1);
    await pl.wait(1500);
    const rusk = (await pl.dev<{ x: number; z: number }>('person', 'rusk'))!;
    await pl.walkTo(rusk.x, rusk.z, 2.5);
    const r2 = (await pl.dev<{ x: number; z: number }>('person', 'rusk'))!;
    await pl.approach(r2.x, r2.z, 0.9);
    await pl.until(() => pl.talking(), 6000, 'Rusk talking');
    await pl.talkThrough([/🎉/], 30);
    expect(await pl.dev<boolean>('festivalDone')).toBe(true);
  });

  test('settings by touch: text size, read-aloud, quality, playtest export, benchmark', async ({ page, browserName }) => {
    test.setTimeout(LOW ? 600_000 : 180_000);
    const pl = await stage(page, browserName);
    await pl.f.tapEl('.tc-menu');
    await pl.button('Settings');
    await pl.button('Bigger');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ts').trim())).toBe('1.5');
    const speech = await page.evaluate(() => 'speechSynthesis' in window);
    if (speech) await pl.button(/^On$/);
    await pl.button(/^Low$/);
    expect(await page.evaluate(() => (window as unknown as { __lc: { tier: string } }).__lc.tier)).toBe('low');
    // the hidden playtest switch: tap the version line five times
    const v = page.locator('.pt-version');
    await v.scrollIntoViewIfNeeded();
    for (let k = 0; k < 5; k++) await pl.f.tapEl('.pt-version');
    await expect(page.getByText('Playtest mode')).toBeVisible();
    await page.locator('.chip', { hasText: /^On$/ }).last().scrollIntoViewIfNeeded();
    const chips = page.locator('.chip', { hasText: /^On$/ });
    const last = (await chips.last().boundingBox())!;
    await pl.f.tap(last.x + last.width / 2, last.y + last.height / 2);
    await pl.wait(300);
    const exportBtn = page.locator('button', { hasText: /Export file|Show data to copy/ });
    await exportBtn.scrollIntoViewIfNeeded();
    const dl = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    const eb = (await exportBtn.boundingBox())!;
    await pl.f.tap(eb.x + eb.width / 2, eb.y + eb.height / 2);
    const file = await dl;
    if (file) expect(file.suggestedFilename()).toMatch(/\.json$/);
    else await expect(page.locator('.pt-json')).toBeVisible();
    await pl.closeMenus();
    // the benchmark from Settings
    await pl.f.tapEl('.tc-menu');
    await pl.button('Settings');
    const tp = page.locator('button', { hasText: 'Test performance' });
    await tp.scrollIntoViewIfNeeded();
    const tb = (await tp.boundingBox())!;
    await pl.f.tap(tb.x + tb.width / 2, tb.y + tb.height / 2);
    await pl.button('Start test');
    await page.waitForFunction(() => !!(window as unknown as { __benchResults?: unknown }).__benchResults, null, { timeout: LOW ? 400_000 : 120_000 });
  });
});

test.describe('the browser around the game', () => {
  test('menu: save, quit to the title and continue — all by touch', async ({ page, browserName }) => {
    const pl = await stage(page, browserName);
    const p0 = await pl.peek();
    await pl.f.tapEl('.tc-menu');
    await pl.button('Save & quit to title');
    await expect(page.locator('.logo')).toBeVisible();
    await pl.button(/Continue|Start/);
    await pl.button('Continue');
    await page.waitForFunction(() => !!(window as unknown as { __lc: { game: unknown } }).__lc.game);
    await pl.wait(1200);
    const p1 = await pl.peek();
    expect(p1.day).toBe(p0.day);
  });

  test('going to the background pauses and saves; coming back resumes with a tap', async ({ page, browserName }) => {
    const pl = await stage(page, browserName);
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect((await pl.peek()).panel).toBe('pause');
    const saved = await page.evaluate(() => !!localStorage.getItem('lightcrossing.slot2'));
    expect(saved).toBe(true);
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await pl.button('Resume');
    expect((await pl.peek()).panel).toBeNull();
  });

  test('graphics lost and back: "Tap to continue" works with a finger', async ({ page, browserName }) => {
    const pl = await stage(page, browserName);
    expect(await pl.dev<boolean>('loseGL')).toBe(true);
    await expect(page.getByText('Taking a little break')).toBeVisible();
    await pl.dev('restoreGL');
    await expect(page.getByText('Tap to continue')).toBeVisible();
    await pl.f.tapEl('text=Tap to continue');
    await expect(page.getByText('Tap to continue')).toBeHidden();
    await pl.wait(500);
    expect(await page.evaluate(() => (window as unknown as { __lc: { glPaused: boolean } }).__lc.glPaused)).toBe(false);
  });

  test('a Bluetooth keyboard or a gamepad on a tablet: the touch buttons step aside', async ({ page, browserName }) => {
    const pl = await stage(page, browserName);
    await page.keyboard.down('KeyD');
    await pl.wait(600);
    await page.keyboard.up('KeyD');
    await expect(page.locator('.tc-a')).toBeHidden();
    expect((await pl.peek()).speed).toBeGreaterThanOrEqual(0);
    // a touch brings them back
    await pl.f.tap(page.viewportSize()!.width / 2, page.viewportSize()!.height * 0.3);
    await expect(page.locator('.tc-a')).toBeVisible();
    // a gamepad pushing right
    await page.evaluate(() => {
      const pad = { connected: true, axes: [0.9, 0, 0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })), id: 'test pad', index: 0 };
      (navigator as unknown as { getGamepads: () => unknown[] }).getGamepads = () => [pad];
    });
    const p0 = await pl.peek();
    await pl.wait(700);
    await expect(page.locator('.tc-a')).toBeHidden();
    const p1 = await pl.peek();
    expect(Math.hypot(p1.x - p0.x, p1.z - p0.z)).toBeGreaterThan(0.5);
  });

  test('typing a name: the field stays visible above the on-screen keyboard', async ({ page, browserName }) => {
    await open(page);
    const pl = new Player(page, browserName);
    await pl.button(/Start|Continue/);
    await pl.button('New Game');
    const field = page.locator('.creator input.textin').first();
    const b = (await field.boundingBox())!;
    await pl.f.tap(b.x + b.width / 2, b.y + b.height / 2);
    for (let k = 0; k < 16; k++) await page.keyboard.press('Backspace');
    await page.keyboard.type('Pip');
    // the keyboard takes the bottom ~40% of the screen
    const vp = page.viewportSize()!;
    await page.setViewportSize({ width: vp.width, height: Math.round(vp.height * 0.58) });
    await pl.wait(600);
    const after = (await field.boundingBox())!;
    expect(after.y).toBeGreaterThanOrEqual(0);
    expect(after.y + after.height).toBeLessThanOrEqual(Math.round(vp.height * 0.58));
    await expect(field).toHaveValue('Pip');
    await page.setViewportSize(vp);
    await pl.wait(300);
    await pl.button('Set sail!');
    await page.waitForFunction(() => (window as unknown as { __lc: { game: { state: { player: { name: string } } } | null } }).__lc.game?.state.player.name === 'Pip');
  });

  test('no page zoom, pull-to-refresh or long-press menu during play', async ({ page, browserName }) => {
    await stage(page, browserName);
    const css = await page.evaluate(() => {
      const h = getComputedStyle(document.documentElement);
      return { overscroll: h.overscrollBehaviorY || h.overscrollBehavior, touch: h.touchAction, callout: (h as unknown as Record<string, string>).webkitTouchCallout ?? '' };
    });
    expect(css.overscroll).toBe('none');
    expect(css.touch).toBe('none');
    // a long press on the game doesn't open a menu or select text
    const prevented = await page.evaluate(() => {
      const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      document.getElementById('game')!.dispatchEvent(e);
      return e.defaultPrevented;
    });
    expect(prevented).toBe(true);
    expect(await page.evaluate(() => getSelection()?.toString() ?? '')).toBe('');
  });
});

test('new game from the title by touch', async ({ page, browserName }) => {
  await open(page);
  const pl = new Player(page, browserName);
  await newGameByTouch(pl);
  // the opening narration: tap through it
  await pl.until(() => pl.talking(), 8000, 'the narration');
  await pl.talkThrough();
  expect((await pl.peek()).mode).toBe('play');
});
