// Foraging + tool interactions on tile objects: shake, chop, mine, pluck, pick up, dig, fill, water, climb.
import { hashInts, Rng } from '../core/rng';
import { FRUITS, COCONUT } from '../data/fruit';
import { FRUIT_REGROW_DAYS } from '../data/gardening';
import { flowerItemId } from '../data/items';
import { item } from '../data/registry';
import { DIRS8, Ground, LEVEL_HEIGHT, isWaterGround } from '../world/types';
import type { Game, InteractCtx, Interaction } from './game';
import { give, money, roomFor, stat } from './inventory';
import { ladderTarget, tileOf } from './player';
import type { TileObj } from './state';
import { wearTool } from './tools';

const TREE_KINDS = new Set(['tree', 'pine', 'fruitTree', 'palm']);
export const WOOD_PER_TREE_PER_DAY = 3;
export const ROCK_HITS_PER_DAY = 4;

export const ROCK_TABLE: [string, number][] = [
  ['stone', 52],
  ['clay', 20],
  ['iron', 20],
  ['glowstone', 7],
  ['starnugget', 1],
];

function rngFor(g: Game, salt: string | number): Rng {
  const s = g.state;
  return new Rng(hashInts(s.seed, s.clock.day, Math.floor(s.playSeconds * 10), typeof salt === 'number' ? salt : salt.length * 977));
}

function tileCenter(g: Game, i: number): { x: number; y: number; z: number } {
  const N = g.world.size;
  return { x: (i % N) + 0.5, y: g.world.height(i) * LEVEL_HEIGHT, z: ((i / N) | 0) + 0.5 };
}

function fx(g: Game, kind: string, i: number, extra: { text?: string; item?: string; color?: number } = {}): void {
  const c = tileCenter(g, i);
  g.emit('fx', { kind, x: c.x, y: c.y, z: c.z, ...extra });
}

/** Drop items on free tiles around `center` (falls back to giving directly). */
export function dropAround(g: Game, center: number, id: string, count: number): void {
  const w = g.world;
  const N = w.size;
  const cx = center % N, cz = (center / N) | 0;
  const rng = rngFor(g, center);
  const dirs = rng.shuffle([...DIRS8]);
  let left = count;
  for (const [dx, dz] of dirs) {
    if (left <= 0) break;
    if (!w.inb(cx + dx, cz + dz)) continue;
    const i = w.idx(cx + dx, cz + dz);
    if (w.obj(i) || w.structure(i) || isWaterGround(w.ground(i)) || w.height(i) !== w.height(center)) continue;
    w.setObj(i, { k: 'item', item: id, q: 1 });
    left--;
  }
  if (left > 0) give(g, id, left, 'drop');
  g.emit('objectsChanged', {});
}

export function pickUp(g: Game, i: number): void {
  const o = g.world.obj(i);
  if (!o || o.k !== 'item' || !o.item) return;
  const qty = o.q ?? 1;
  if (roomFor(g, o.item, qty) < qty) {
    g.toast('Your pockets are full!', 'warn');
    g.emit('sfx', { name: 'error' });
    return;
  }
  const id = o.item;
  g.startAction('pickup', 0.35, 0.18, () => {
    g.world.setObj(i, undefined);
    give(g, id, qty, 'pickup');
    g.emit('pickedUp', { id, qty });
    const def = item(id);
    if (def.cat === 'fruit') g.emit('fruitPicked', { id });
    if (def.cat === 'shell') stat(g, 'shells');
    if (id === 'branch') stat(g, 'branches');
    g.emit('sfx', { name: 'pickup' });
    fx(g, 'pop', i, { item: id });
    g.emit('objectsChanged', { tiles: [i] });
  });
}

function shake(g: Game, i: number, o: TileObj): void {
  g.startAction('shake', 0.7, 0.25, () => {
    fx(g, 'treeShake', i);
    g.emit('sfx', { name: 'rustle' });
    const day = g.state.clock.day;
    let dropped: string | null = null;
    if (o.k === 'fruitTree' && (o.f ?? 0) > 0) {
      dropped = FRUITS[o.v ?? 0]?.id ?? FRUITS[0]!.id;
      dropAround(g, i, dropped, o.f ?? 0);
      o.f = 0;
      o.g = day + FRUIT_REGROW_DAYS;
    } else if (o.k === 'palm' && (o.f ?? 0) > 0) {
      dropped = COCONUT.id;
      dropAround(g, i, dropped, o.f ?? 0);
      o.f = 0;
      o.g = day + FRUIT_REGROW_DAYS;
    } else if (!o.b) {
      o.b = 1;
      const r = rngFor(g, i);
      if (r.chance(0.04)) {
        dropped = 'pouch';
        dropAround(g, i, 'pouch', 1);
      } else if (o.k !== 'palm' && r.chance(0.55)) {
        dropped = 'branch';
        dropAround(g, i, 'branch', 1);
      }
    }
    g.emit('treeShaken', { tile: i, dropped });
    if (!dropped) g.toast('Nothing fell out.');
    g.emit('objectsChanged', { tiles: [i] });
  });
}

function chop(g: Game, i: number, o: TileObj): void {
  g.startAction('chop', 0.6, 0.32, () => {
    fx(g, 'treeShake', i);
    if ((o.c ?? 0) >= WOOD_PER_TREE_PER_DAY) {
      g.emit('sfx', { name: 'thunk' });
      g.toast('This tree needs to rest until tomorrow.');
      return;
    }
    o.c = (o.c ?? 0) + 1;
    wearTool(g);
    g.emit('sfx', { name: 'chop' });
    fx(g, 'chips', i);
    give(g, 'timber', 1, 'chop');
    fx(g, 'pop', i, { item: 'timber' });
    stat(g, 'woodChopped');
    g.emit('woodChopped', { id: 'timber', qty: 1 });
    g.emit('toolUsed', { tool: 'axe', ok: true });
  });
}

function hitRock(g: Game, i: number, o: TileObj): void {
  g.startAction('chop', 0.6, 0.32, () => {
    fx(g, 'rockHit', i);
    if ((o.c ?? 0) >= ROCK_HITS_PER_DAY) {
      g.emit('sfx', { name: 'clink' });
      g.toast('The rock has nothing left today.');
      return;
    }
    o.c = (o.c ?? 0) + 1;
    wearTool(g);
    g.emit('sfx', { name: 'rock' });
    const r = rngFor(g, i * 7 + (o.c ?? 0));
    const night = g.state.clock.minute < 5 * 60 || g.state.clock.minute > 20 * 60;
    const id = r.weighted(ROCK_TABLE, ([id, w]) => (id === 'glowstone' && night ? w * 3 : w))![0];
    give(g, id, 1, 'rock');
    fx(g, 'pop', i, { item: id });
    stat(g, 'rocksHit');
    g.emit('rockHit', { id });
    g.emit('toolUsed', { tool: 'shovel', ok: true });
  });
}

function pluck(g: Game, i: number): void {
  g.startAction('pickup', 0.4, 0.2, () => {
    g.world.setObj(i, undefined);
    give(g, 'fiber', 1, 'weed');
    stat(g, 'weedsPulled');
    g.emit('weedPulled', {});
    g.emit('sfx', { name: 'pluck' });
    fx(g, 'leaves', i);
    g.emit('objectsChanged', { tiles: [i] });
  });
}

function dig(g: Game, i: number, o: TileObj | undefined): void {
  const w = g.world;
  g.startAction('dig', 0.65, 0.35, () => {
    wearTool(g);
    g.emit('sfx', { name: 'dig' });
    fx(g, 'dirt', i);
    if (o && o.k === 'dig') {
      const found = o.item ?? 'stone';
      w.setObj(i, { k: 'hole' });
      if (found === 'pouch') {
        const amt = 1000;
        money(g, amt);
        g.toast(`You dug up a Glint Pouch! +${amt} Glints`, 'good');
      } else {
        give(g, found, 1, 'dig');
        fx(g, 'pop', i, { item: found });
      }
      if (found === 'fossil_unknown') {
        stat(g, 'fossilsDug');
        g.emit('fossilFound', {});
      }
      stat(g, 'digSpots');
      g.emit('dug', { tile: i, found });
    } else if (o && o.k === 'hole') {
      w.setObj(i, undefined);
      g.emit('dug', { tile: i, found: null });
    } else if (o && o.k === 'flower') {
      const sp = Math.floor((o.v ?? 0) / 16), col = (o.v ?? 0) % 16;
      w.setObj(i, undefined);
      give(g, flowerItemId(sp, col), 1, 'dig');
      g.emit('dug', { tile: i, found: 'flower' });
    } else if (o && o.k === 'sapling') {
      w.setObj(i, undefined);
      give(g, saplingItemFor(o), 1, 'dig');
      g.emit('dug', { tile: i, found: 'sapling' });
    } else if (o && TREE_KINDS.has(o.k)) {
      w.setObj(i, { k: 'hole' });
      give(g, treeItemFor(o), 1, 'dig');
      g.emit('dug', { tile: i, found: 'tree' });
    } else if (!o) {
      w.setObj(i, { k: 'hole' });
      g.emit('dug', { tile: i, found: null });
    }
    g.emit('toolUsed', { tool: 'shovel', ok: true });
    g.emit('objectsChanged', { tiles: [i] });
  });
}

export function saplingItemFor(o: TileObj): string {
  if (o.item === 'pine') return 'sapling_pine';
  if (o.item === 'fruit') return FRUITS[o.v ?? 0]?.id ?? 'sapling_round';
  if (o.item === 'palm') return COCONUT.id;
  return 'sapling_round';
}

function treeItemFor(o: TileObj): string {
  if (o.k === 'pine') return 'sapling_pine';
  if (o.k === 'fruitTree') return FRUITS[o.v ?? 0]?.id ?? 'sapling_round';
  if (o.k === 'palm') return COCONUT.id;
  return 'sapling_round';
}

function water(g: Game, i: number, sturdy: boolean): void {
  g.startAction('water', 0.8, 0.4, () => {
    const w = g.world;
    const N = w.size;
    const tiles = [i];
    if (sturdy) {
      const x = i % N, z = (i / N) | 0;
      for (const [dx, dz] of [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ] as const)
        if (w.inb(x + dx, z + dz)) tiles.push(w.idx(x + dx, z + dz));
    }
    let n = 0;
    for (const t of tiles) {
      const o = w.obj(t);
      if (o && (o.k === 'flower' || o.k === 'sapling')) {
        if (!o.w) n++;
        o.w = 1;
        g.emit('watered', { tile: t });
      }
      fx(g, 'splash', t);
    }
    wearTool(g);
    g.emit('sfx', { name: 'water' });
    if (n > 0) stat(g, 'watered', n);
    g.emit('objectsChanged', {});
  });
}

function canDigHere(g: Game, i: number): boolean {
  const w = g.world;
  if (w.structure(i)) return false;
  const gr = w.ground(i);
  return gr === Ground.Grass || gr === Ground.Sand || gr === Ground.Dirt;
}

export function foragingResolver(g: Game, ctx: InteractCtx): Interaction | null {
  const w = g.world;
  const { here, front, hereObj, frontObj, tool } = ctx;
  const sameLevel = w.height(front) === w.height(here) || !!w.structure(here);
  // pick up / pluck
  if (hereObj && hereObj.k === 'item') return { label: `Pick up ${item(hereObj.item ?? '').name}`, priority: 95, run: () => pickUp(g, here) };
  if (frontObj && frontObj.k === 'item' && sameLevel) return { label: `Pick up ${item(frontObj.item ?? '').name}`, priority: 92, run: () => pickUp(g, front) };
  if (hereObj && hereObj.k === 'weed') return { label: 'Pull weeds', priority: 88, run: () => pluck(g, here) };
  if (frontObj && frontObj.k === 'weed' && sameLevel) return { label: 'Pull weeds', priority: 86, run: () => pluck(g, front) };

  if (tool) {
    switch (tool.kind) {
      case 'axe':
        if (frontObj && TREE_KINDS.has(frontObj.k) && sameLevel) return { label: 'Chop tree', priority: 70, run: () => chop(g, front, frontObj) };
        if (frontObj && frontObj.k === 'rock' && sameLevel) return { label: 'Hit rock', priority: 70, run: () => hitRock(g, front, frontObj) };
        break;
      case 'shovel': {
        if (!sameLevel) break;
        if (frontObj?.k === 'rock') return { label: 'Hit rock', priority: 70, run: () => hitRock(g, front, frontObj) };
        if (frontObj?.k === 'dig') return { label: 'Dig up', priority: 75, run: () => dig(g, front, frontObj) };
        if (frontObj?.k === 'hole') return { label: 'Fill hole', priority: 60, run: () => dig(g, front, frontObj) };
        if (frontObj?.k === 'flower') return { label: 'Dig up flower', priority: 60, run: () => dig(g, front, frontObj) };
        if (frontObj?.k === 'sapling') return { label: 'Dig up sapling', priority: 60, run: () => dig(g, front, frontObj) };
        if (frontObj && TREE_KINDS.has(frontObj.k))
          return {
            label: 'Dig up tree',
            priority: 40,
            run: () => g.ui.confirm('Dig up this whole tree? You will get something to replant.', () => dig(g, front, frontObj)),
          };
        if (!frontObj && canDigHere(g, front) && front !== here) return { label: 'Dig', priority: 30, run: () => dig(g, front, undefined) };
        break;
      }
      case 'can':
        if (frontObj && (frontObj.k === 'flower' || frontObj.k === 'sapling') && sameLevel) return { label: 'Water', priority: 65, run: () => water(g, front, tool.sturdy) };
        return { label: 'Sprinkle', priority: 10, run: () => water(g, front, tool.sturdy) };
      case 'ladder': {
        const t = ladderTarget(w, g.state.player);
        if (t !== null) {
          const up = w.height(t) > w.logicalLevel(here);
          return { label: up ? 'Climb up' : 'Climb down', priority: 55, run: () => climb(g, t) };
        }
        break;
      }
      default:
        break;
    }
  }
  if (frontObj && TREE_KINDS.has(frontObj.k) && sameLevel && (!tool || tool.kind !== 'axe'))
    return { label: frontObj.k === 'fruitTree' && (frontObj.f ?? 0) > 0 ? 'Shake for fruit' : 'Shake tree', priority: 50, run: () => shake(g, front, frontObj) };
  return null;
}

export function climb(g: Game, target: number): void {
  const w = g.world;
  const p = g.state.player;
  const up = w.height(target) > w.logicalLevel(tileOf(w, p.x, p.z));
  g.emit('sfx', { name: 'climb' });
  g.startAction(
    'climb',
    0.9,
    0.85,
    () => {
      p.x = (target % w.size) + 0.5;
      p.z = ((target / w.size) | 0) + 0.5;
      p.level = w.height(target);
      stat(g, 'climbs');
      g.emit('climbed', { up });
    },
  );
}
