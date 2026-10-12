// Terraforming-lite: bridges across water and ramps up cliffs, built overnight with a permit.
import { Ground, isWaterGround } from '../world/types';
import type { Game } from './game';
import { countItem, money, removeItem } from './inventory';
import { facingVec, tileOf } from './player';
import { cancelPlacement, type Placement } from './placement';
import { addStructure, startConstruction } from './structures';
import { invalidateReach } from './villagers';

export const BUILD_COSTS = {
  bridge: { glints: 3000, item: 'timber', qty: 10, label: 'Bridge' },
  ramp: { glints: 3000, item: 'stone', qty: 10, label: 'Ramp' },
} as const;
export const MAX_BRIDGES = 8;
export const MAX_RAMPS = 8;
export const MAX_SPAN = 7;

const CLEARABLE = new Set(['weed', 'item', 'flower', 'dig', 'hole']);

/** Bounding rect of tiles along the axis plus their perpendicular neighbour. */
function rectOf(tiles: [number, number][], px: number, pz: number): { x: number; z: number; w: number; d: number } {
  const xs = tiles.flatMap(([x]) => [x, x + px]);
  const zs = tiles.flatMap(([, z]) => [z, z + pz]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
  return { x: x0, z: z0, w: x1 - x0 + 1, d: z1 - z0 + 1 };
}

function dirIndex(fx: number, fz: number): { dx: number; dz: number; dir: number } {
  if (Math.abs(fx) > Math.abs(fz)) return fx > 0 ? { dx: 1, dz: 0, dir: 1 } : { dx: -1, dz: 0, dir: 3 };
  return fz > 0 ? { dx: 0, dz: 1, dir: 2 } : { dx: 0, dz: -1, dir: 0 };
}

export function computeBridge(g: Game, pl: Placement): void {
  const w = g.world;
  const p = g.state.player;
  const here = tileOf(w, p.x, p.z);
  const hx = here % w.size, hz = (here / w.size) | 0;
  const { dx, dz, dir } = dirIndex(...facingVec(p.facing));
  // perpendicular direction for the 2-wide deck
  const px = dz !== 0 ? 1 : 0, pz = dx !== 0 ? 1 : 0;
  const fail = (r: string) => {
    pl.valid = false;
    pl.reason = r;
  };
  pl.dir = dir;
  pl.level = 0;
  let len = 0;
  for (let k = 1; k <= MAX_SPAN + 1; k++) {
    const x = hx + dx * k, z = hz + dz * k;
    if (!w.inb(x, z)) break;
    if (!isWaterGround(w.ground(w.idx(x, z)))) break;
    len = k;
  }
  if (len === 0) {
    pl.rect = { x: hx + dx, z: hz + dz, w: 1 + px, d: 1 + pz };
    pl.extra = null;
    return fail('Face the river from its bank to build a bridge.');
  }
  pl.rect = rectOf(Array.from({ length: len }, (_, k) => [hx + dx * (k + 1), hz + dz * (k + 1)] as [number, number]), px, pz);
  // landing on the far side
  const fx = hx + dx * (len + 1), fz = hz + dz * (len + 1);
  pl.extra = { x: Math.min(fx, fx + px), z: Math.min(fz, fz + pz), w: 1 + px, d: 1 + pz };
  if (w.height(here) !== 0) return fail('Bridges can only be built on the lowlands.');
  if (len > MAX_SPAN) return fail('That stretch of water is too wide for a bridge.');
  for (let k = 1; k <= len; k++)
    for (let s = 0; s < 2; s++) {
      const x = hx + dx * k + px * s, z = hz + dz * k + pz * s;
      if (!w.inb(x, z)) return fail('Too close to the edge.');
      const i = w.idx(x, z);
      const gr = w.ground(i);
      if (gr === Ground.Ocean) return fail('Bridges are for rivers and ponds, not the open sea.');
      if (!isWaterGround(gr)) return fail('The bridge needs open water all the way across.');
      if (w.structure(i)) return fail('Something is already built there.');
    }
  for (let s = 0; s < 2; s++) {
    for (const k of [0, len + 1]) {
      const x = hx + dx * k + px * s, z = hz + dz * k + pz * s;
      if (!w.inb(x, z)) return fail('Too close to the edge.');
      const i = w.idx(x, z);
      if (isWaterGround(w.ground(i)) || w.height(i) !== 0) return fail('Both ends need solid, level ground.');
      const o = w.obj(i);
      if (w.structure(i) || (o && !CLEARABLE.has(o.k))) return fail('Clear the ground at both ends first.');
    }
  }
  pl.valid = true;
  pl.reason = '';
}

export function computeRamp(g: Game, pl: Placement): void {
  const w = g.world;
  const p = g.state.player;
  const here = tileOf(w, p.x, p.z);
  const hx = here % w.size, hz = (here / w.size) | 0;
  const { dx, dz, dir } = dirIndex(...facingVec(p.facing));
  const px = dz !== 0 ? 1 : 0, pz = dx !== 0 ? 1 : 0;
  const L = w.height(here);
  pl.dir = dir;
  pl.level = L;
  const fail = (r: string) => {
    pl.valid = false;
    pl.reason = r;
  };
  // ramp occupies the two tiles ahead; the cliff top is the third
  pl.rect = rectOf([[hx + dx, hz + dz], [hx + dx * 2, hz + dz * 2]], px, pz);
  const tx = hx + dx * 3, tz = hz + dz * 3;
  pl.extra = { x: Math.min(tx, tx + px), z: Math.min(tz, tz + pz), w: 1 + px, d: 1 + pz };
  const front = w.idx(hx + dx, hz + dz);
  if (w.inb(hx + dx, hz + dz) && w.height(front) > L) return fail('Step back two tiles from the cliff, then face it.');
  if (L >= 2) return fail('There is nothing higher to reach from here!');
  for (let k = 1; k <= 2; k++)
    for (let s = 0; s < 2; s++) {
      const x = hx + dx * k + px * s, z = hz + dz * k + pz * s;
      if (!w.inb(x, z)) return fail('Too close to the edge.');
      const i = w.idx(x, z);
      if (w.height(i) !== L || isWaterGround(w.ground(i))) return fail('A ramp needs two tiles of flat ground in front of a cliff.');
      const o = w.obj(i);
      if (w.structure(i) || (o && !CLEARABLE.has(o.k))) return fail('Clear the ground for the ramp first.');
    }
  for (let s = 0; s < 2; s++) {
    const x = tx + px * s, z = tz + pz * s;
    if (!w.inb(x, z)) return fail('Too close to the edge.');
    const i = w.idx(x, z);
    if (w.height(i) !== L + 1) return fail('Face a cliff that is exactly one level higher.');
    const o = w.obj(i);
    if (w.structure(i) || isWaterGround(w.ground(i)) || (o && !CLEARABLE.has(o.k))) return fail('The top of the cliff needs a clear landing.');
  }
  pl.valid = true;
  pl.reason = '';
}

export function canAfford(g: Game, kind: 'bridge' | 'ramp'): { ok: boolean; reason?: string } {
  const c = BUILD_COSTS[kind];
  const count = g.state.world.structures.filter((s) => s.type === kind || (s.type === 'construction' && s.becomes === kind)).length;
  if (count >= (kind === 'bridge' ? MAX_BRIDGES : MAX_RAMPS)) return { ok: false, reason: `That's plenty of ${kind}s for one island!` };
  if (g.state.player.glints < c.glints) return { ok: false, reason: `You need ${c.glints.toLocaleString()} Glints.` };
  if (countItem(g, c.item) < c.qty) return { ok: false, reason: `You need ${c.qty} ${c.item === 'timber' ? 'Timber' : 'River Stones'} in your pockets.` };
  return { ok: true };
}

export function startBuildPlacement(g: Game, kind: 'bridge' | 'ramp'): boolean {
  if (!canAfford(g, kind).ok) return false;
  const pl: Placement = {
    kind,
    rect: null,
    extra: null,
    valid: false,
    reason: '',
    compute: kind === 'bridge' ? computeBridge : computeRamp,
    onConfirm: placeBuild,
  };
  g.runtime.placement = pl;
  g.mode = 'placement';
  return true;
}

/** Called by confirmPlacement for bridge/ramp placements. */
export function placeBuild(g: Game, pl: Placement): boolean {
  if (!pl.rect || !pl.valid) return false;
  const kind = pl.kind as 'bridge' | 'ramp';
  if (!canAfford(g, kind).ok) {
    g.toast(canAfford(g, kind).reason ?? '', 'warn');
    return false;
  }
  const c = BUILD_COSTS[kind];
  money(g, -c.glints, 0, 'build');
  removeItem(g, c.item, c.qty, 'build');
  const s = addStructure(g, { type: kind, ...pl.rect, level: pl.level ?? 0, dir: pl.dir });
  startConstruction(g, s, kind, 1);
  invalidateReach();
  cancelPlacement(g);
  g.toast(`${c.label} construction starts tonight — it'll be ready tomorrow!`, 'good');
  g.emit('sfx', { name: 'build' });
  return true;
}
