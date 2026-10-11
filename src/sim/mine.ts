/**
 * The mine: 40 floors in four layers (earth, frost, glow caves, crystal core).
 * Floors are generated from (seed, floor, day) with cellular automata, then filled with
 * rocks, ores, gem nodes, geodes and a hidden ladder. Elevator stops every 5 floors;
 * floors 21–40 need the Mine Lift (minerals board). Floor 40 holds the Heartstone.
 */
import { TILE } from '../core/math';
import { nearestOpen } from '../core/pathfind';
import { Rng, hash32 } from '../core/rng';
import { registerMap } from '../data/maps';
import { MapBuilder } from '../data/maps/builder';
import type { MapDef } from '../data/maps/types';
import { MINERALS, ORES } from '../data/minerals';
import { TUNING } from '../tuning';
import { gainXp, hasPerk } from './skills';
import { simInitHooks, type Sim } from './sim';
import { Ter } from './terrain';
import { mineHooks } from './tools';
import type { WorldObject } from './types';
import type { Loc } from './world';

export const MINE_W = 40;
export const MINE_H = 30;

export function layerOf(floor: number): number {
  return Math.min(3, Math.floor((floor - 1) / 10));
}
export const LAYER_NAMES = ['Earth Caves', 'Frost Caves', 'Glow Caves', 'Crystal Core'];

/** Current floor being built (set right before (re)creating the 'mine' location). */
let building = { floor: 1, seed: 1, day: 0 };

export function liftOk(sim: Sim): boolean {
  return sim.state.story.done.includes('minerals');
}

function genCave(rng: Rng): { ground: Uint8Array; open: number[] } {
  const w = MINE_W, h = MINE_H;
  for (let attempt = 0; attempt < 8; attempt++) {
    let g = new Uint8Array(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const edge = x < 2 || y < 2 || x >= w - 2 || y >= h - 2;
        g[y * w + x] = edge || rng.chance(0.43) ? 1 : 0;
      }
    for (let it = 0; it < 4; it++) {
      const n = new Uint8Array(w * h);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          let c = 0;
          for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
            const xx = x + i, yy = y + j;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h || g[yy * w + xx]) c++;
          }
          const edge = x < 1 || y < 1 || x >= w - 1 || y >= h - 1;
          n[y * w + x] = edge || c >= 5 ? 1 : 0;
        }
      g = n;
    }
    // keep the largest open region
    const region = new Int32Array(w * h).fill(-1);
    let best = -1, bestSize = 0, rid = 0;
    const sizes: number[] = [];
    for (let i = 0; i < w * h; i++) {
      if (g[i] || region[i] >= 0) continue;
      const stack = [i];
      region[i] = rid;
      let size = 0;
      while (stack.length) {
        const c = stack.pop()!;
        size++;
        const cx = c % w, cy = (c / w) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const ni = ny * w + nx;
          if (!g[ni] && region[ni] < 0) {
            region[ni] = rid;
            stack.push(ni);
          }
        }
      }
      sizes.push(size);
      if (size > bestSize) {
        bestSize = size;
        best = rid;
      }
      rid++;
    }
    if (bestSize < 320) continue;
    const ground = new Uint8Array(w * h);
    const open: number[] = [];
    for (let i = 0; i < w * h; i++) {
      const isOpen = !g[i] && region[i] === best;
      ground[i] = isOpen ? Ter.CAVE : Ter.CAVEWALL;
      if (isOpen) open.push(i);
    }
    return { ground, open };
  }
  // fallback: a big open room
  const ground = new Uint8Array(w * h).fill(Ter.CAVEWALL);
  const open: number[] = [];
  for (let y = 3; y < h - 3; y++) for (let x = 3; x < w - 3; x++) {
    ground[y * w + x] = Ter.CAVE;
    open.push(y * w + x);
  }
  return { ground, open };
}

function openWithRoom(ground: Uint8Array, i: number): boolean {
  const x = i % MINE_W, y = (i / MINE_W) | 0;
  for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) if (ground[(y + j) * MINE_W + x + k] !== Ter.CAVE) return false;
  return true;
}

export function buildMineFloor(): MapDef {
  const { floor, seed, day } = building;
  if (floor >= TUNING.mineFloors) return buildHeartChamber();
  const rng = new Rng(hash32(seed, floor, day, 0x3113));
  const { ground, open } = genCave(rng);
  const b = new MapBuilder(MINE_W, MINE_H, Ter.CAVEWALL);
  b.ground.set(ground);
  const roomy = open.filter((i) => openWithRoom(ground, i));
  const start = rng.pick(roomy.length ? roomy : open);
  const sx = start % MINE_W, sy = (start / MINE_W) | 0;
  b.prop('ladderUp', sx, sy - 1);
  b.ground[(sy - 1) * MINE_W + sx] = Ter.CAVEWALL;
  b.trigger(sx, sy - 1, 'ladderUp');
  b.point('start', sx, sy, 0);
  // decorations by layer
  const L = layerOf(floor);
  const deco = ['stalagmite', 'stalagmite', 'crystal', 'crystal'][L];
  for (let k = 0; k < 6; k++) {
    const i = rng.pick(open);
    const x = i % MINE_W, y = (i / MINE_W) | 0;
    if (Math.abs(x - sx) + Math.abs(y - sy) > 3 && !b.isTaken(x, y)) b.prop(deco, x, y);
  }
  return b.build({ id: 'mine', name: `Mine · Floor ${floor}`, outdoor: false, farmable: false, music: `mine${L}`, water: 'mine', dark: true, region: LAYER_NAMES[L] });
}

function buildHeartChamber(): MapDef {
  const rows = [
    'WWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWW',
    'WWWW............WWWW',
    'WWW..............WWW',
    'WW................WW',
    'WW................WW',
    'WW................WW',
    'WW................WW',
    'WW................WW',
    'WWW..............WWW',
    'WWWW............WWWW',
    'WWWWWWWW....WWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWW',
  ];
  const b = new MapBuilder(rows[0].length, rows.length, Ter.CAVEWALL);
  b.ascii(0, 0, rows, { W: { t: Ter.CAVEWALL }, '.': { t: Ter.CAVE } });
  for (const [x, y] of [[4, 3], [15, 3], [3, 8], [16, 8], [6, 9], [13, 9]]) b.prop('crystal', x, y);
  b.prop('ladderUp', 10, 10);
  b.trigger(10, 10, 'ladderUp');
  b.point('start', 10, 9, 3);
  b.point('heart', 10, 5);
  return b.build({ id: 'mine', name: 'The Heart of the Valley', outdoor: false, farmable: false, music: 'heart', water: 'none', dark: true, region: 'Crystal Core' });
}

registerMap('mine', buildMineFloor);

/** Fill a fresh floor with rocks, ores, gems, geodes and a hidden ladder. */
export function populateFloor(sim: Sim, loc: Loc, floor: number): void {
  const rng = sim.rng(0x31ee, floor);
  const L = layerOf(floor);
  if (floor >= TUNING.mineFloors) {
    if (sim.state.story.heartstone === 0) loc.setObj(10, 5, { k: 'heartstone', id: 'heartstone' });
    return;
  }
  const start = loc.def.points.start;
  const open: [number, number][] = [];
  for (let y = 1; y < loc.h - 1; y++)
    for (let x = 1; x < loc.w - 1; x++) {
      if (loc.blocked(x, y) || loc.obj(x, y)) continue;
      if (Math.abs(x - start.x) + Math.abs(y - start.y) < 3) continue;
      open.push([x, y]);
    }
  rng.shuffle(open);
  const density = 0.22 + L * 0.02;
  const n = Math.floor(open.length * density);
  const ore = ORES[Math.min(3, L)];
  const prevOre = L > 0 ? ORES[L - 1] : null;
  const gems = MINERALS.filter((m) => m.from.includes('node'));
  const rocks: [number, number][] = [];
  for (let k = 0; k < n; k++) {
    const [x, y] = open[k];
    const r = rng.next();
    let o: WorldObject;
    if (r < 0.1) o = { k: 'ore', id: ore.id, hp: 2 + L };
    else if (r < 0.13 && prevOre) o = { k: 'ore', id: prevOre.id, hp: 1 + L };
    else if (r < 0.16) o = { k: 'ore', id: 'coal', hp: 2 + L };
    else if (r < 0.175) o = { k: 'gem', id: rng.pick(gems.filter((g) => tierOk(g.id, L))).id, hp: 3 + L };
    else if (r < 0.2) o = { k: 'rock', id: `geode${L}`, hp: 2 + L };
    else if (L === 1 && r < 0.27) o = { k: 'ice', id: 'ice', hp: 2 };
    else if (r < 0.205) o = { k: 'box', id: 'box', hp: 1 };
    else o = { k: 'rock', id: `rock${L}`, hp: 1 + Math.floor(L / 2), n: rng.int(3) };
    loc.setObj(x, y, o);
    if (o.k === 'rock') rocks.push([x, y]);
  }
  // the ladder hides under one ordinary rock (elevator floors show it right away)
  if (floor % TUNING.elevatorEvery === 0 || rocks.length === 0) placeLadder(sim, loc, open[n] ?? open[0]);
  else {
    const [lx, ly] = rng.pick(rocks);
    loc.obj(lx, ly)!.hid = true;
  }
  // reward chests
  if (floor % 10 === 0 && !sim.state.mine.chests.includes(floor)) {
    const [cx, cy] = nearestOpen(loc, start.x + 2, start.y);
    loc.setObj(cx, cy, { k: 'mineChest', id: `mineChest${floor}` });
  }
}

function tierOk(id: string, L: number): boolean {
  const order = ['quartz', 'amethyst', 'topaz', 'jade', 'aquamarine', 'ruby', 'emerald', 'sapphire', 'diamond'];
  const i = order.indexOf(id);
  return i <= 3 + L * 2;
}

function placeLadder(sim: Sim, loc: Loc, at: [number, number] | undefined): void {
  if (!at) return;
  const floor = sim.state.mine.floor;
  if (floor === TUNING.liftFloor && !liftOk(sim)) {
    loc.setObj(at[0], at[1], { k: 'ladder', id: 'blocked' });
    return;
  }
  loc.setObj(at[0], at[1], { k: 'ladder', id: 'ladder' });
}

/** Pickaxe hits on mine objects (rocks, ores, gems, ice, boxes). */
function hitMine(sim: Sim, loc: Loc, x: number, y: number, dmg: number): boolean {
  const o = loc.obj(x, y);
  if (!o || !['rock', 'ore', 'gem', 'ice', 'box', 'mineChest', 'heartstone'].includes(o.k)) return false;
  if (o.k === 'mineChest' || o.k === 'heartstone') return true; // interact instead
  o.hp = (o.hp ?? 1) - dmg;
  sim.ev.emit('anim', { kind: 'shake', x, y });
  if (o.hp > 0) return true;
  loc.removeObj(x, y);
  const rng = sim.rng(0x6e, x, y + sim.state.mine.floor * 100);
  const L = layerOf(sim.state.mine.floor);
  sim.state.stats.rocks++;
  switch (o.k) {
    case 'ore':
      sim.give(o.id, o.id === 'coal' ? rng.range(1, 2) : rng.range(1, 3) + (hasPerk(sim, 'prospector') ? 1 : 0));
      gainXp(sim, 'mining', 6 + L * 3);
      break;
    case 'gem':
      sim.give(o.id, 1);
      gainXp(sim, 'mining', 15 + L * 4);
      break;
    case 'ice':
      if (rng.chance(0.3)) sim.give('quartz', 1);
      gainXp(sim, 'mining', 2);
      break;
    case 'box':
      sim.give(rng.pick(['coal', 'stone', ORES[L].id, 'geode']), rng.range(1, 3));
      if (rng.chance(0.1)) sim.give('battery', 1);
      break;
    default: {
      sim.give('stone', 1);
      if (o.id.startsWith('geode')) sim.give(['geode', 'frostGeode', 'glowGeode', 'crystalGeode'][L], 1);
      else if (rng.chance(0.06)) sim.give(['geode', 'frostGeode', 'glowGeode', 'crystalGeode'][rng.int(L + 1)], 1);
      if (rng.chance(0.05)) sim.give('coal', 1);
      if (L === 2 && rng.chance(0.03)) sim.give('battery', 1);
      gainXp(sim, 'mining', 2 + L);
    }
  }
  // ladders: the hidden one, or a lucky extra
  const lucky = rng.chance(0.015 + (hasPerk(sim, 'tunneler') ? 0.03 : 0));
  if ((o.hid || lucky) && !hasLadder(loc)) {
    placeLadder(sim, loc, [x, y]);
    sim.ev.emit('toast', { text: 'You found a ladder going down!', icon: 'ui.star2' });
  }
  return true;
}
mineHooks.hit = hitMine;

// Saved while deep in the mine? Wake up at the mine entrance instead (floors regenerate).
simInitHooks.push((sim) => {
  if (sim.p.loc === 'mine') {
    sim.state.mine.floor = 0;
    const p = sim.loc('minelobby').def.points.fromMine ?? { x: 6, y: 6 };
    sim.p.loc = 'minelobby';
    sim.p.x = p.x * TILE + 8;
    sim.p.y = p.y * TILE + 14;
  }
});

export function hasLadder(loc: Loc): boolean {
  for (const o of loc.objs.values()) if (o.k === 'ladder') return true;
  return false;
}

/** Go to a mine floor (0 = lobby). */
export function enterFloor(sim: Sim, floor: number): void {
  const st = sim.state;
  if (floor <= 0) {
    st.mine.floor = 0;
    sim.world.delete('mine');
    const p = sim.loc('minelobby').def.points.fromMine ?? { x: 6, y: 6 };
    sim.warpTo('minelobby', p.x, p.y, 0);
    return;
  }
  st.mine.floor = floor;
  building = { floor, seed: st.seed, day: st.day };
  sim.world.delete('mine');
  sim.forgetMapCache('mine');
  const loc = sim.loc('mine');
  populateFloor(sim, loc, floor);
  const s = loc.def.points.start;
  sim.warpTo('mine', s.x, s.y, 0);
  if (floor > st.mine.deepest) st.mine.deepest = floor;
  if (floor % TUNING.elevatorEvery === 0 && floor > st.mine.elevator) {
    st.mine.elevator = floor;
    sim.ev.emit('toast', { text: `The elevator can now stop at floor ${floor}!`, icon: 'ui.star2' });
  }
  sim.ev.emit('mineFloor', { floor });
}

export function canDescend(sim: Sim): { ok: boolean; msg?: string } {
  const f = sim.state.mine.floor;
  if (f === TUNING.liftFloor && !liftOk(sim)) return { ok: false, msg: 'Rubble blocks the way down. The old Mine Lift could reach the deep caves... if it worked. (Finish the Minerals board in the Valley Hall!)' };
  if (f >= TUNING.mineFloors) return { ok: false, msg: 'This is the very bottom of the mine!' };
  return { ok: true };
}

export function elevatorFloors(sim: Sim): { floor: number; locked: boolean }[] {
  const out: { floor: number; locked: boolean }[] = [];
  for (let f = 0; f <= Math.min(sim.state.mine.elevator, TUNING.mineFloors); f += TUNING.elevatorEvery) {
    out.push({ floor: f, locked: f > TUNING.liftFloor && !liftOk(sim) });
  }
  return out;
}

/** Open a reward chest. */
export function openMineChest(sim: Sim, loc: Loc, x: number, y: number): string[] {
  const o = loc.obj(x, y);
  if (!o || o.k !== 'mineChest') return [];
  const floor = sim.state.mine.floor;
  loc.removeObj(x, y);
  sim.state.mine.chests.push(floor);
  const got: string[] = [];
  const give = (id: string, n = 1) => {
    sim.give(id, n);
    got.push(id);
  };
  if (floor === 10) {
    if ((sim.p.tools.sling ?? -1) < 0) {
      sim.p.tools.sling = 0;
      give('tool.sling');
    }
    give('stone', 20);
    give('copperBar', 3);
  } else if (floor === 20) {
    give('ironBar', 3);
    give('frostGeode', 3);
  } else if (floor === 30) {
    give('goldBar', 3);
    give('ruby', 1);
  }
  return got;
}

/** Floor-40 Heartstone. */
export function takeHeartstone(sim: Sim, loc: Loc, x: number, y: number): boolean {
  const o = loc.obj(x, y);
  if (!o || o.k !== 'heartstone') return false;
  loc.removeObj(x, y);
  sim.give('heartstone', 1);
  sim.state.story.heartstone = 1;
  sim.state.flags.heartstone = 1;
  gainXp(sim, 'mining', 200);
  return true;
}

export const mineTile = (p: { x: number; y: number }) => ({ x: Math.floor(p.x / TILE), y: Math.floor(p.y / TILE) });
