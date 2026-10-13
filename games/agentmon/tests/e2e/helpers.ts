import { expect, type Page } from '@playwright/test';
import { footprint, parseMap } from '../../src/core/world/map';
import { findPath } from '../../src/core/world/path';
import { MAPS } from '../../src/data/maps/index';
import { TER } from '../../src/data/terrain';

/** Collects console errors and any request that leaves the game's own origin (file:// and data: are fine). */
export function watch(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', error => problems.push(`page error: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') problems.push(`console error: ${message.text()}`); });
  page.on('request', request => {
    const url = new URL(request.url());
    if (!['127.0.0.1:4246', ''].includes(url.host) && url.protocol !== 'data:' && url.protocol !== 'blob:') problems.push(`request to ${request.url()}`);
  });
  return problems;
}

export type Spark = { index: number; angle: number; arcAt: number; arc: number };
export type Snap = { scene: string; frameMs?: number; coins?: number; wild?: { species: string; x: number; y: number }[]; view?: { x: number; y: number; zoom: number; dpr: number }; audio?: { on: boolean; song: string } | null; trial?: string; room?: string; roomIndex?: number; moves?: number; solved?: boolean; ready?: boolean; spark?: Spark | null; battle?: { turn: number; outcome: string | null } | null; map?: string; x?: number; y?: number; busy?: boolean; moving?: boolean; dialogue?: boolean; flags?: string[]; team?: { species: string }[] };
export const snap = (page: Page) => page.evaluate(() => (window as unknown as { __agentmon: { snapshot(): Snap } }).__agentmon.snapshot());

/** How far the spark is from the middle of the glow, in degrees. */
const offGlow = (sp: Spark) => Math.abs((((sp.angle - sp.arcAt) % 360) + 540) % 360 - 180);

/** Press A (Z) until no dialogue or card is open and the world is free. In battles, A picks the
 *  hinted move (it has the focus). In the Spark Ring, wait until the spark is in the glow, then tap. */
export async function advance(page: Page, seconds = 20) {
  const until = Date.now() + seconds * 1000;
  while (Date.now() < until) {
    const s = await snap(page);
    if (s.spark) {
      if (offGlow(s.spark) < s.spark.arc * 0.25) { await page.keyboard.press('Space'); await page.waitForTimeout(300); }
      else await page.waitForTimeout(8);
      continue;
    }
    // tutorial cards and Yes/No choices: the first button has the keyboard focus, Enter presses it
    const card = page.locator('.tutorial button, .dlg-choices button').first();
    if (await card.isVisible().catch(() => false)) { await page.keyboard.press('Enter'); await page.waitForTimeout(150); continue; }
    if (!s.dialogue && !s.busy) return;
    await page.keyboard.press('KeyZ');
    await page.waitForTimeout(120);
  }
  throw new Error('dialogue did not end');
}

/** Press A (Z) to talk, and wait until the conversation has started (the game reads keys on its next frame). */
export async function talk(page: Page) {
  await page.keyboard.press('KeyZ');
  await expect.poll(async () => { const s = await snap(page); return !!s.dialogue || !!s.busy; }, { timeout: 3000, intervals: [20] }).toBe(true);
}

/** Hold a direction key until `done`, then let go and wait until the player stands still. The game
 *  moves the player's tile at the start of each step, so letting go as soon as the target tile is
 *  reached never adds an extra step (a held key keeps walking, also through doors, as in the game). */
export async function hold(page: Page, key: string, done: (s: Snap) => boolean, timeout: number) {
  await page.keyboard.down(key);
  try {
    await expect.poll(async () => done(await snap(page)), { timeout, intervals: [15] }).toBe(true);
  } finally {
    await page.keyboard.up(key);
  }
  await expect.poll(async () => { const s = await snap(page); return (!s.busy && !s.moving) || !!s.dialogue; }, { timeout: 5000, intervals: [50] }).toBe(true);
}

/**
 * One step: hold the key until the step starts (the player's tile changes, or a door, map edge or
 * story moment takes over), let go, and wait until the player stands still. Letting go during the
 * step means a slow device (CI draws in software at ~15 fps) can never add a step. Returns false
 * when something other than a plain step happened.
 */
/** Wait until nothing is happening: no step, fade or story moment under way (a dialogue counts as settled). */
async function settled(page: Page) {
  await expect.poll(async () => { const s = await snap(page); return (!s.busy && !s.moving) || !!s.dialogue; }, { timeout: 15_000, intervals: [30] }).toBe(true);
}

async function oneStep(page: Page, key: string): Promise<boolean> {
  await settled(page);
  const b = await snap(page);
  if (b.dialogue) return false;
  await page.keyboard.down(key);
  let moved = false;
  try {
    await expect.poll(async () => {
      const s = await snap(page);
      moved = s.x !== b.x || s.y !== b.y;
      return moved || s.map !== b.map || !!s.busy || !!s.dialogue;
    }, { timeout: 8000, intervals: [10] }).toBe(true);
  } finally {
    await page.keyboard.up(key);
  }
  await settled(page);
  const a = await snap(page);
  return moved && a.map === b.map && !a.dialogue;
}

/** Walk exactly `steps` tiles, one at a time (stopping early if a door, map edge or story moment takes over). */
export async function walk(page: Page, key: string, steps: number) {
  for (let i = 0; i < steps; i++) if (!(await oneStep(page, key))) return;
}

/** Keep walking, a step at a time, until we arrive on another map. */
export async function leave(page: Page, key: string, map: string) {
  for (let i = 0; i < 40; i++) {
    await oneStep(page, key);
    if ((await snap(page)).map === map) return;
  }
  throw new Error(`did not reach ${map}`);
}


// ---- touch helpers --------------------------------------------------------------------------

/** Where a tile is on screen (CSS px), from the hook's camera numbers. */
export function tileOnScreen(s: Snap, x: number, y: number): { x: number; y: number } {
  const v = s.view!;
  return { x: ((x * 16 + 8) * v.zoom + v.x) / v.dpr, y: ((y * 16 + 8) * v.zoom + v.y) / v.dpr };
}

/**
 * True when a tap at this point reaches the world: the canvas, or the stick's zone (a quick tap
 * there is passed on to the world). Not the A, B or Menu buttons, a dialogue or a menu, and not
 * right next to a button either: phones snap a tap near a button onto it (Chromium's touch
 * adjustment does the same in the tests).
 */
export async function reachesWorld(page: Page, p: { x: number; y: number }) {
  return page.evaluate(([x, y]) => {
    const el = document.elementFromPoint(x!, y!);
    if (!(el instanceof HTMLCanvasElement || el?.classList.contains('tzone'))) return false;
    const pad = 32;
    return [...document.querySelectorAll('.gbtn')].every(b => {
      const r = b.getBoundingClientRect();
      return r.width === 0 || x! < r.left - pad || x! > r.right + pad || y! < r.top - pad || y! > r.bottom + pad;
    });
  }, [p.x, p.y]);
}

/** Tiles you can walk on without help from friends (houses, trees, signs and people block). */
function staticWalk(mapId: string) {
  const m = parseMap(MAPS[mapId]!);
  const blocked = new Set<number>();
  for (const o of m.objects) for (const f of footprint(o)) blocked.add(f.y * m.w + f.x);
  for (const n of MAPS[mapId]!.npcs) if (!n.wander && !n.showIf && !n.hideIf) blocked.add(n.y * m.w + n.x);
  return { w: m.w, h: m.h, ok: (x: number, y: number) => { const t = m.ter[y * m.w + x]; return !!t && TER[t].walk && !TER[t].needs && !blocked.has(y * m.w + x); } };
}

/**
 * Tap-to-move to a tile (or a door, or an exit at the map's edge), in hops: tap the farthest tile
 * of the way that is on screen, wait for the walk, and tap again. Stops when the map changes, or
 * `within` tiles of the target. A wild Agentmon may wander into you on the way: then the spar is
 * played (and befriended with `befriend`), and the walk goes on.
 */
export async function tapWalk(page: Page, tx: number, ty: number, o: { within?: number; befriend?: boolean } = {}) {
  const start = await snap(page);
  const map = start.map!;
  const g = staticWalk(map);
  const vp = page.viewportSize()!;
  const near = (n: Snap) => n.map !== map || Math.abs(n.x! - tx) + Math.abs(n.y! - ty) <= (o.within ?? 0);
  for (let hop = 0; hop < 25; hop++) {
    // a story moment or a spar on the way: tap through it, then keep walking; taps on the world
    // are ignored while the scene is busy (a fade), so wait until it is free
    const now = await snap(page);
    if (now.map === map && (now.dialogue || now.battle || (now.busy && !now.moving))) await touchAdvance(page, { befriend: o.befriend, seconds: 120 });
    await expect.poll(async () => { const n = await snap(page); return near(n) || !!n.battle || !!n.dialogue || (!n.busy && !n.moving); }, { timeout: 15_000, intervals: [100] }).toBe(true);
    const s = await snap(page);
    if (near(s)) return;
    if (s.battle || s.dialogue || s.busy) continue;
    const inMap = tx >= 0 && ty >= 0 && tx < g.w && ty < g.h;
    const path = findPath(g.w, g.h, s.x!, s.y!, Math.max(0, Math.min(g.w - 1, tx)), Math.max(0, Math.min(g.h - 1, ty)), (x, y) => g.ok(x, y) || (x === tx && y === ty), 8000) ?? [[tx, ty] as [number, number]];
    let pick: [number, number] = inMap ? [tx, ty] : path[path.length - 1] ?? [tx, ty];
    for (let i = path.length - 1; i >= 0; i--) {
      const p = tileOnScreen(s, path[i]![0], path[i]![1]);
      if (p.x > 24 && p.y > 64 && p.x < vp.width - 24 && p.y < vp.height - 24 && await reachesWorld(page, p)) { pick = path[i]!; break; }
    }
    const p = tileOnScreen(s, pick[0], pick[1]);
    await page.touchscreen.tap(p.x, p.y);
    // wait for the walk to start and finish (if nothing happens, the loop taps again)
    await page.waitForTimeout(300);
    await expect.poll(async () => { const n = await snap(page); return n.map !== map || n.busy || !n.moving; }, { timeout: 15_000, intervals: [100] }).toBe(true);
    await page.waitForTimeout(200);
  }
  throw new Error(`could not walk to ${tx},${ty} on ${map}`);
}

/**
 * The touch version of `advance`: tap the dialogue box, cards and choices; in battles tap the ★ move
 * (or Befriend when `befriend` is on and it is ready); in the Spark Ring tap when the spark is in the glow.
 */
export async function touchAdvance(page: Page, o: { seconds?: number; befriend?: boolean } = {}) {
  const until = Date.now() + (o.seconds ?? 30) * 1000;
  const visible = async (sel: string) => { const l = page.locator(sel).first(); return (await l.isVisible().catch(() => false)) ? l : null; };
  while (Date.now() < until) {
    const s = await snap(page);
    if (s.spark) {
      if (offGlow(s.spark) < s.spark.arc * 0.25) { const vp = page.viewportSize()!; await page.touchscreen.tap(vp.width / 2, vp.height / 2); await page.waitForTimeout(300); }
      else await page.waitForTimeout(8);
      continue;
    }
    const card = await visible('.tutorial button, .dlg-choices button, .credits-skip');
    if (card) { await card.tap(); await page.waitForTimeout(150); continue; }
    if (o.befriend) {
      const bf = await visible('.bpanel button.befriend.ready:not([disabled])');
      if (bf) { await bf.tap(); await page.waitForTimeout(200); continue; }
      const snack = await visible('.bpanel button:has(.tag.good), .bpanel button:has-text("No snack")');
      if (snack) { await snack.tap(); await page.waitForTimeout(200); continue; }
    }
    const move = await visible('.bpanel button.suggested:not([disabled]), .bpanel .pgrid button:not([disabled])');
    if (move) { await move.tap(); await page.waitForTimeout(200); continue; }
    if (s.dialogue) { const box = await visible('.dlg'); if (box) await box.tap({ position: { x: 30, y: 30 } }); await page.waitForTimeout(150); continue; }
    if (!s.busy && !s.battle) return;
    await page.waitForTimeout(120);
  }
  throw new Error('touch: the scene did not finish');
}
