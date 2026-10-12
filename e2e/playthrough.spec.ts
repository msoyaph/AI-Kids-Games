// The opening chapter, played with touch only: new game, Pemberly, branches and fiber, four tools
// at the workbench, two fish and two bugs, digging and chopping, the evening talk and the first
// night's sleep. The test looks at the game (where things are) but acts only with taps, holds and
// drags. One shortcut: instead of waiting real minutes for 5 PM, the clock is moved forward.
import { expect, test } from '@playwright/test';
import { Player, newGameByTouch } from './lib/play';

const LOW = !!process.env.E2E_LOW;
type Spot = { x: number; z: number; tile: number };

test('Chapter 1 from a new game, by touch only', async ({ page, browserName }) => {
  test.setTimeout(LOW ? 3_600_000 : 2_400_000);
  const tag = test.info().project.name;
  await page.goto(LOW ? '/?quality=low' : '/');
  await page.waitForFunction(() => !!(window as unknown as { __lc?: { dev?: unknown } }).__lc?.dev);
  const pl = new Player(page, browserName);
  page.on('crash', () => console.log(`${tag} PAGE CRASHED`));
  page.on('pageerror', (e) => console.log(`${tag} page error: ${e.message}`));
  if (process.env.PT_LOG) {
    page.on('console', (m) => m.text().startsWith('PT ') && console.log(m.text()));
    await page.evaluate(() => {
      const app = (window as unknown as { __lc: { panels: Record<string, (a?: unknown) => void> } }).__lc;
      const orig = app.panels.toolRing!;
      app.panels.toolRing = (a?: unknown) => {
        console.log('PT ring opened ' + (new Error().stack ?? '').split('\n').slice(1, 6).join(' | '));
        orig(a);
      };
    });
  }
  const done = async (id: string) => (await pl.peek()).done.includes(id);
  /** Story scenes and calls pop up between missions: tap through them. */
  const settle = async () => {
    for (let k = 0; k < 4; k++) {
      await pl.wait(300);
      if (await pl.talking()) await pl.talkThrough();
      else if ((await pl.peek()).panel) await pl.closeMenus();
      else return;
    }
  };
  const count = (id: string) => pl.dev<number>('count', id);
  const log = async (what: string) => {
    if (!process.env.PT_LOG) return;
    const p = await pl.peek();
    console.log(`${tag} [${(p.minute / 60).toFixed(1)}h] ${what} — at ${p.x.toFixed(1)},${p.z.toFixed(1)} branch ${await count('branch')} fiber ${await count('fiber')} done ${p.done.join(',')}`);
  };

  // ---- new game
  await newGameByTouch(pl);
  await pl.until(() => pl.talking(), 8000, 'the opening narration');
  await settle();

  // ---- Pemberly at Lantern Hall
  const visitPemberly = async (pick: (string | RegExp)[] = []) => {
    if ((await pl.peek()).location !== 'hall') {
      const d = (await pl.dev<{ x: number; z: number; tx: number; tz: number }>('door', 'hall'))!;
      await pl.walkTo(d.x, d.z, 1.2);
      expect(await pl.tapWorld(d.tx, d.tz, 0.8)).toBe(true);
      await pl.until(async () => (await pl.peek()).location === 'hall', 10_000, 'Lantern Hall');
      await pl.wait(700);
    }
    const pem = (await pl.dev<{ x: number; z: number }>('person', 'pemberly'))!;
    await pl.approach(pem.x, pem.z, 0.9);
    await pl.until(() => pl.talking(), 6000, 'Pemberly');
    await pl.talkThrough(pick);
    await settle();
  };
  const leave = async () => {
    if ((await pl.peek()).location === 'island') return;
    const room = (await pl.dev<{ w: number; d: number; door: { x: number; z: number } }>('room'))!;
    // tap the door mat; if a HUD bubble hides it, walk to the doorway and push the stick down
    if (!(await pl.tapWorld(room.door.x + 0.5, room.d - 0.5))) {
      if (!(await pl.tapWorld(room.door.x + 0.5, room.d - 1.5))) await pl.tapWorld(room.door.x + 0.5, room.d - 2.5);
      await pl.idle();
      await pl.stick(0, 1, 0.8, 900);
    }
    await pl.until(async () => (await pl.peek()).location === 'island', 10_000, 'outside');
    await pl.wait(500);
  };
  await log('new game');
  await visitPemberly();
  await log('met Pemberly');
  expect(await done('m1_arrive')).toBe(true);
  await leave();

  // ---- branches (for camp and all four tools) and weed fiber
  const gather = async (kind: string, item: string | undefined, have: () => Promise<number>, want: number) => {
    const skip: number[] = [];
    while ((await have()) < want) {
      await leave(); // (a tap on a building walks you in)
      const t = await pl.dev<Spot | null>('nearest', kind, item, skip);
      await log(`${item ?? kind} → ${t ? `${t.x},${t.z}` : 'none'} (skipped ${skip.length})`);
      if (!t) throw new Error(`no more ${item ?? kind}`);
      const before = await have();
      try {
        await pl.approach(t.x, t.z, kind === 'tree' ? 1.0 : 0.2);
        await pl.until(async () => (await have()) > before || !(await pl.peek()).action, 3000).catch(() => {});
      } catch {
        /* out of reach this time */
      }
      await settle();
      if ((await have()) <= before) skip.push(t.tile);
      if (skip.length > 25) throw new Error(`can't reach any ${item ?? kind}`);
    }
  };
  await gather('weed', undefined, () => count('fiber'), 3);
  await log('fiber done');
  /** Sleep in the tent until morning (tap the tent, tap the bed, say yes). */
  const sleepInTent = async () => {
    const day = (await pl.peek()).day;
    await leave();
    const tent = (await pl.dev<{ x: number; z: number; tx: number; tz: number }>('door', 'home'))!;
    await pl.walkTo(tent.x, tent.z, 1.2);
    expect(await pl.tapWorld(tent.tx, tent.tz, 0.6)).toBe(true);
    await pl.until(async () => (await pl.peek()).location === 'home', 10_000, 'the tent');
    await pl.wait(700);
    const bed = await page.evaluate(() => {
      const app = (window as unknown as { __lc: { game: { runtime: { interior?: { room: { fixtures: { id: string; x: number; z: number }[] } } } } } }).__lc;
      const f = app.game.runtime.interior?.room.fixtures.find((x) => /bed/i.test(x.id));
      return f ? { x: f.x + 0.5, z: f.z + 0.5 } : null;
    });
    expect(bed).not.toBeNull();
    await pl.approach(bed!.x, bed!.z, 0.3);
    if ((await pl.peek()).panel === null) await pl.a();
    await pl.until(async () => (await page.locator('button:visible', { hasText: /Yes|Sleep/ }).count()) > 0, 6000, 'the sleep question');
    await pl.button(/Yes|Sleep/);
    await pl.until(async () => (await pl.peek()).day > day, 15_000, 'morning');
    await settle();
    await leave();
  };
  /** Branches: pick them up; when the ground is bare, shake trees; when they're bare too, sleep. */
  const branches = async (want: number, canSleep: boolean) => {
    let skip: number[] = [];
    let shaken: number[] = [];
    for (let k = 0; k < 200 && (await count('branch')) < want; k++) {
      await leave();
      const b = await pl.dev<Spot | null>('nearest', 'item', 'branch', skip);
      await log(b ? `branch at ${b.x},${b.z}` : 'shake a tree');
      if (b) {
        const before = await count('branch');
        await pl.approach(b.x, b.z, 0.2).catch(() => {});
        await pl.until(async () => (await count('branch')) > before, 2500).catch(() => {});
        if ((await count('branch')) <= before) skip.push(b.tile);
      } else {
        const t = await pl.dev<Spot | null>('nearest', 'tree,pine', undefined, shaken);
        if (!t) {
          if (!canSleep) throw new Error('no branches and no trees left');
          await log('out of branches: sleep');
          await sleepInTent();
          skip = [];
          shaken = [];
          continue;
        }
        shaken.push(t.tile);
        await pl.approach(t.x, t.z, 1.0).catch(() => {});
        await pl.idle();
      }
      await settle();
    }
    expect(await count('branch')).toBeGreaterThanOrEqual(want);
  };
  await branches(6, false);
  await visitPemberly([/Branch|Fiber|Here/]);
  if (!(await done('m1_camp'))) await visitPemberly([/Branch|Fiber|Here/]);
  expect(await done('m1_camp')).toBe(true);
  await leave();
  await log('camp done');
  // enough branches for four tools (the tent is up now, so a night's sleep brings more)
  await branches(18, true);

  // ---- four tools at the workbench
  await leave();
  const bench = (await pl.dev<{ x: number; z: number; tx: number; tz: number }>('door', 'workbench'))!;
  await pl.walkTo(bench.x, bench.z, 1.2);
  expect(await pl.tapWorld(bench.tx, bench.tz, 0.6)).toBe(true);
  await pl.until(async () => (await pl.peek()).panel !== null, 8000, 'the workbench');
  await pl.button(/Tools/);
  for (const name of ['Twig Net', 'Twig Rod', 'Stone Hatchet', 'Twig Shovel']) {
    const row = page.locator('.craft-row', { hasText: name }).first();
    await row.scrollIntoViewIfNeeded();
    const b = (await row.boundingBox())!;
    await pl.f.tap(b.x + b.width / 2, b.y + b.height / 2);
    await pl.button('Craft!');
    await pl.wait(300);
  }
  await pl.closeMenus();
  await settle();
  await log('tools crafted');
  expect(await done('m1_tools')).toBe(true);

  // ---- two fish
  await pl.equip('Fishing Rod');
  const fish = async () => (await pl.peek()).stats.fishCaught ?? 0;
  // to the river first, then fish by the shadows
  const w = (await pl.dev<{ x: number; z: number; sx: number; sz: number }>('nearestWater'))!;
  await pl.walkTo(w.sx, w.sz, 0.6);
  for (let tries = 0; tries < 16 && (await fish()) < 2; tries++) {
    await pl.fishOnce(LOW ? 120_000 : 45_000);
    await settle();
  }
  expect(await fish()).toBeGreaterThanOrEqual(2);
  await log('two fish');

  // ---- two bugs: creep up with a small push, swing with A from a step away
  await pl.equip('Net');
  const bugs = async () => (await pl.peek()).stats.bugsCaught ?? 0;
  const STILL = ['ground', 'flowers', 'trees', 'rocks', 'fruit', 'beach'];
  const t0 = Date.now();
  const skipBug = new Set<string>(); // bugs we couldn't get any closer to (something in the way)
  const bugKey = (b: { x: number; z: number }) => `${Math.floor(b.x)},${Math.floor(b.z)}`;
  for (let tries = 0; (await bugs()) < 2 && Date.now() - t0 < (LOW ? 900_000 : 300_000); tries++) {
    const p0 = await pl.peek();
    // a bug on our side of the river, sitting still if possible
    const list = (await pl.dev<{ x: number; z: number; y: number; state: string; reachable: boolean; habitat: string; alert: number }[]>('bugs')).filter((b) => b.state === 'idle' && b.reachable && b.habitat !== 'water' && b.alert < 0.3 && !skipBug.has(bugKey(b)));
    const dist = (b: { x: number; z: number }) => Math.hypot(b.x - p0.x, b.z - p0.z);
    const b = list.sort((a, c) => (STILL.includes(a.habitat) ? 0 : 6) + dist(a) - ((STILL.includes(c.habitat) ? 0 : 6) + dist(c)))[0];
    if (!b) {
      // look around somewhere new and wait for bugs to show up
      await pl.stick(Math.cos(tries * 2.1), Math.sin(tries * 2.1), 0.8, 900);
      await pl.wait(1500);
      continue;
    }
    if (dist(b) > 3.6) {
      await pl.walkTo(b.x, b.z, 3.2).catch(() => {});
      continue;
    }
    const vp = page.viewportSize()!;
    const sx = vp.width * 0.3, sy = vp.height * 0.62;
    await log(`bug ${b.habitat} at ${b.x.toFixed(1)},${b.z.toFixed(1)} dist ${dist(b).toFixed(1)}`);
    await pl.f.start(sx, sy);
    for (let k = 0; k < 50; k++) {
      const p = await pl.peek();
      // always turn toward it first; stop a step away (the net reaches)
      if (k >= 2 && Math.hypot(p.x - b.x, p.z - b.z) < 1.5) break;
      const me = await pl.spot(p.x, p.z), it = await pl.spot(b.x, b.z);
      const dx = it.x - me.x, dy = it.y - me.y, len = Math.hypot(dx, dy) || 1;
      await pl.f.move(sx + (dx / len) * 20, sy + (dy / len) * 20);
      await pl.wait(100);
    }
    await pl.f.end();
    const before = await bugs();
    await pl.a();
    await pl.wait(800);
    const caught = (await bugs()) > before;
    await log(`  swung: ${caught ? 'caught!' : 'missed'}`);
    const p1 = await pl.peek();
    if (!caught && Math.hypot(p1.x - b.x, p1.z - b.z) > dist(b) - 0.3) skipBug.add(bugKey(b));
    await settle();
  }
  expect(await bugs()).toBeGreaterThanOrEqual(2);
  await settle();
  expect(await done('m1_catch')).toBe(true);

  // ---- dig two spots and chop five timber
  await pl.equip('Shovel');
  const digs = async () => (await pl.peek()).stats.digSpots ?? 0;
  const skipDig: number[] = [];
  await log('digging');
  while ((await digs()) < 2) {
    expect(skipDig.length, 'dig spots tried').toBeLessThan(20);
    const t = (await pl.dev<Spot | null>('nearest', 'dig', undefined, skipDig))!;
    expect(t).not.toBeNull();
    await log(`dig spot at ${t.x},${t.z}`);
    const before = await digs();
    await pl.approach(t.x, t.z, 0).catch(() => {});
    const tg = await pl.dev<{ tile: number } | null>('target');
    if (tg?.tile === t.tile) {
      await pl.tapWorld(t.x, t.z); // tap the glowing spot to dig
      await pl.until(async () => (await digs()) > before, 6000).catch(() => {});
    }
    if ((await digs()) <= before) skipDig.push(t.tile);
    await pl.idle();
  }
  await log('dug two');
  await pl.equip('Axe');
  const skipTree: number[] = [];
  while ((await count('timber')) < 5) {
    expect(skipTree.length, 'trees tried').toBeLessThan(25);
    const t = (await pl.dev<Spot | null>('nearest', 'tree', undefined, skipTree))!;
    expect(t).not.toBeNull();
    await log(`chop tree at ${t.x},${t.z} (timber ${await count('timber')})`);
    await pl.approach(t.x, t.z, 1.0).catch(() => {});
    for (let k = 0; k < 3 && (await count('timber')) < 5; k++) {
      const before = await count('timber');
      await pl.a();
      await pl.until(async () => !(await pl.peek()).action, 3000).catch(() => {});
      if ((await count('timber')) <= before) break;
    }
    skipTree.push(t.tile);
    await settle();
  }
  await settle();
  await log('timber done');
  expect(await done('m1_dig')).toBe(true);

  // ---- the evening: talk to Pemberly after 5 PM, then sleep in the tent
  await pl.equip('Hands');
  await pl.dev('hour', 17.3); // (waiting for the evening)
  await pl.wait(500);
  await settle();
  await visitPemberly();
  await log('evening talk');
  await sleepInTent();
  await log('slept');
  expect(await done('m1_evening')).toBe(true);
  expect((await pl.peek()).chapter).toBeGreaterThanOrEqual(2);
});
