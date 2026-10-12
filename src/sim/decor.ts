// Outdoor furniture/decorations placed on the island (count toward the island rating).
import { item } from '../data/registry';
import { Ground, Region } from '../world/types';
import type { Game, InteractCtx, Interaction } from './game';
import { addToPockets, addToStorage, removeAt, stat } from './inventory';
import { facingVec, tileOf } from './player';

/** Tiles a decoration would cover when placed in front of the player. */
export function decorTiles(g: Game, id: string): number[] | null {
  const w = g.world;
  const p = g.state.player;
  const f = item(id).furn;
  if (!f) return null;
  const [fx, fz] = facingVec(p.facing);
  const here = tileOf(w, p.x, p.z);
  const hx = here % w.size, hz = (here / w.size) | 0;
  const dx = Math.abs(fx) > Math.abs(fz) ? Math.sign(fx) : 0;
  const dz = dx === 0 ? Math.sign(fz) || 1 : 0;
  // footprint extends away from the player; width spreads to the right-hand side
  const fw = dx !== 0 ? f.d : f.w;
  const fd = dx !== 0 ? f.w : f.d;
  const ax = dx > 0 ? hx + 1 : dx < 0 ? hx - fw : hx - Math.floor((fw - 1) / 2);
  const az = dz > 0 ? hz + 1 : dz < 0 ? hz - fd : hz - Math.floor((fd - 1) / 2);
  const tiles: number[] = [];
  for (let z = az; z < az + fd; z++)
    for (let x = ax; x < ax + fw; x++) {
      if (!w.inb(x, z)) return null;
      const i = w.idx(x, z);
      if (w.obj(i) || w.structure(i)) return null;
      const gr = w.ground(i);
      if (gr !== Ground.Grass && gr !== Ground.Dirt && gr !== Ground.Sand) return null;
      if (w.height(i) !== p.level) return null;
      if (i === here) return null;
      tiles.push(i);
    }
  return tiles;
}

export function placeOutdoor(g: Game, slot: number): boolean {
  const s = g.state.player.inv[slot];
  if (!s || !item(s.id).furn) return false;
  if (g.state.player.location !== 'island') return false;
  if (item(s.id).furn!.layer === 'wall') {
    g.toast('This one hangs on a wall. Decorate your home to put it up!', 'warn');
    return false;
  }
  const tiles = decorTiles(g, s.id);
  if (!tiles) {
    g.toast("There isn't enough flat, clear space in front of you.", 'warn');
    g.emit('sfx', { name: 'error' });
    return false;
  }
  const id = s.id;
  removeAt(g, slot, 1, 'place');
  // rotation faces the player
  const p = g.state.player;
  const [fx, fz] = facingVec(p.facing);
  const rot = Math.abs(fx) > Math.abs(fz) ? (fx > 0 ? 3 : 1) : fz > 0 ? 2 : 0;
  const anchor = Math.min(...tiles);
  for (const t of tiles) g.world.setObj(t, t === anchor ? { k: 'deco', item: id, r: rot, q: tiles.length } : { k: 'deco', item: id, tag: 'fill', v: anchor });
  stat(g, 'decorPlaced');
  g.emit('furniturePlaced', { id, where: 'outdoor' });
  g.emit('sfx', { name: 'place' });
  g.emit('objectsChanged', { tiles });
  return true;
}

export function decorAnchor(g: Game, i: number): number {
  const o = g.world.obj(i);
  if (!o || o.k !== 'deco') return -1;
  return o.tag === 'fill' ? (o.v ?? -1) : i;
}

export function pickUpOutdoor(g: Game, i: number): boolean {
  const a = decorAnchor(g, i);
  if (a < 0) return false;
  const o = g.world.obj(a)!;
  const id = o.item!;
  if (addToPockets(g, id, 1) > 0) addToStorage(g, id, 1);
  for (const key of Object.keys(g.state.world.objects)) {
    const k = +key;
    const ob = g.state.world.objects[k]!;
    if (ob.k === 'deco' && (k === a || (ob.tag === 'fill' && ob.v === a))) delete g.state.world.objects[k];
  }
  g.emit('sfx', { name: 'pickup' });
  g.emit('objectsChanged', {});
  return true;
}

export function decorResolver(g: Game, ctx: InteractCtx): Interaction | null {
  if (!ctx.frontObj || ctx.frontObj.k !== 'deco') return null;
  const a = decorAnchor(g, ctx.front);
  const id = g.world.obj(a)?.item ?? '';
  return { label: `Edit ${item(id).name}`, priority: 65, run: () => g.ui.open('decorEdit', a) };
}

// ---------------------------------------------------------------- edit in place

/** All tiles of the decoration anchored at `anchor`. */
export function decorTilesOf(g: Game, anchor: number): number[] {
  const out = [anchor];
  for (const key in g.state.world.objects) {
    const o = g.state.world.objects[key]!;
    if (o.k === 'deco' && o.tag === 'fill' && o.v === anchor) out.push(+key);
  }
  return out;
}

/** Footprint of a decoration at rotation r (odd turns swap width/depth). */
export function decorFootprint(id: string, r: number): { w: number; d: number } {
  const f = item(id).furn;
  const w = f?.w ?? 1, d = f?.d ?? 1;
  return r % 2 ? { w: d, d: w } : { w, d };
}

/** Tiles a decoration would cover with its top-left corner at (ax, az), or null if it can't go there. */
function fitTiles(g: Game, id: string, ax: number, az: number, r: number, level: number, own: Set<number>): number[] | null {
  const w = g.world;
  const fp = decorFootprint(id, r);
  const here = tileOf(w, g.state.player.x, g.state.player.z);
  const tiles: number[] = [];
  for (let z = az; z < az + fp.d; z++)
    for (let x = ax; x < ax + fp.w; x++) {
      if (!w.inb(x, z)) return null;
      const i = w.idx(x, z);
      if (!own.has(i) && (w.obj(i) || w.structure(i))) return null;
      if (w.structure(i)) return null;
      const gr = w.ground(i);
      if (gr !== Ground.Grass && gr !== Ground.Dirt && gr !== Ground.Sand) return null;
      if (w.height(i) !== level) return null;
      if (i === here) return null;
      tiles.push(i);
    }
  return tiles;
}

/** Re-place a decoration at a new anchor/rotation (keeps its fine offset). Returns the new anchor. */
function rehome(g: Game, anchor: number, tiles: number[], r: number): number {
  const o = g.world.obj(anchor)!;
  const keep = { item: o.item!, nx: o.nx, nz: o.nz };
  for (const t of decorTilesOf(g, anchor)) g.world.setObj(t, undefined);
  const a = Math.min(...tiles);
  for (const t of tiles)
    g.world.setObj(t, t === a ? { k: 'deco', item: keep.item, r, q: tiles.length, ...(keep.nx ? { nx: keep.nx } : {}), ...(keep.nz ? { nz: keep.nz } : {}) } : { k: 'deco', item: keep.item, tag: 'fill', v: a });
  g.emit('objectsChanged', { tiles });
  g.emit('sfx', { name: 'place' });
  return a;
}

/** Move a decoration one tile. Returns the new anchor, or -1 if blocked. */
export function moveDecor(g: Game, anchor: number, dx: number, dz: number): number {
  const o = g.world.obj(anchor);
  if (!o || o.k !== 'deco' || o.tag === 'fill') return -1;
  const N = g.world.size;
  const own = new Set(decorTilesOf(g, anchor));
  const tiles = fitTiles(g, o.item!, (anchor % N) + dx, Math.floor(anchor / N) + dz, o.r ?? 0, g.world.height(anchor), own);
  if (!tiles) {
    g.emit('sfx', { name: 'error' });
    return -1;
  }
  return rehome(g, anchor, tiles, o.r ?? 0);
}

/**
 * Turn a decoration a quarter. Long pieces that no longer fit are shifted to the nearest spot that
 * does (so turning never "fails" for no visible reason). Returns the new anchor, or -1.
 */
export function rotateDecor(g: Game, anchor: number): number {
  const o = g.world.obj(anchor);
  if (!o || o.k !== 'deco' || o.tag === 'fill') return -1;
  const N = g.world.size;
  const r = ((o.r ?? 0) + 1) % 4;
  const own = new Set(decorTilesOf(g, anchor));
  const ax = anchor % N, az = Math.floor(anchor / N);
  for (const [sx, sz] of [[0, 0], [-1, 0], [0, -1], [-1, -1], [1, 0], [0, 1]] as const) {
    const tiles = fitTiles(g, o.item!, ax + sx, az + sz, r, g.world.height(anchor), own);
    if (tiles) return rehome(g, anchor, tiles, r);
  }
  g.emit('sfx', { name: 'error' });
  return -1;
}

export const NUDGE_STEP = 0.125;
export const NUDGE_MAX = 0.375;

/** Slide a decoration a little within its tile (visual only). */
export function nudgeDecor(g: Game, anchor: number, dx: number, dz: number): boolean {
  const o = g.world.obj(anchor);
  if (!o || o.k !== 'deco' || o.tag === 'fill') return false;
  const clampN = (v: number) => Math.max(-NUDGE_MAX, Math.min(NUDGE_MAX, Math.round(v / NUDGE_STEP) * NUDGE_STEP));
  const nx = clampN((o.nx ?? 0) + dx * NUDGE_STEP), nz = clampN((o.nz ?? 0) + dz * NUDGE_STEP);
  if (nx === (o.nx ?? 0) && nz === (o.nz ?? 0)) return false;
  if (nx) o.nx = nx;
  else delete o.nx;
  if (nz) o.nz = nz;
  else delete o.nz;
  g.emit('objectsChanged', { tiles: [anchor] });
  return true;
}

/** A restorable copy of one decoration (for undo). */
export interface DecorSnap {
  item: string;
  r: number;
  nx?: number;
  nz?: number;
  tiles: number[];
}

export function decorSnap(g: Game, anchor: number): DecorSnap | null {
  const o = g.world.obj(anchor);
  if (!o || o.k !== 'deco' || o.tag === 'fill') return null;
  return { item: o.item!, r: o.r ?? 0, nx: o.nx, nz: o.nz, tiles: decorTilesOf(g, anchor) };
}

/** Put a decoration back the way a snapshot had it. `anchor` is where it is now (-1 = in pockets). */
export function restoreDecor(g: Game, anchor: number, snap: DecorSnap): number {
  if (anchor >= 0) for (const t of decorTilesOf(g, anchor)) g.world.setObj(t, undefined);
  else {
    // it was put away: take it back out of the pockets (or storage)
    const slot = g.state.player.inv.findIndex((s) => s?.id === snap.item);
    if (slot >= 0) removeAt(g, slot, 1, 'place');
    else {
      const k = g.state.home.storage.findIndex((s) => s.id === snap.item);
      if (k < 0) return -1;
      const st = g.state.home.storage[k]!;
      st.qty -= 1;
      if (st.qty <= 0) g.state.home.storage.splice(k, 1);
    }
  }
  const a = Math.min(...snap.tiles);
  for (const t of snap.tiles)
    g.world.setObj(t, t === a ? { k: 'deco', item: snap.item, r: snap.r, q: snap.tiles.length, ...(snap.nx ? { nx: snap.nx } : {}), ...(snap.nz ? { nz: snap.nz } : {}) } : { k: 'deco', item: snap.item, tag: 'fill', v: a });
  g.emit('objectsChanged', { tiles: snap.tiles });
  return a;
}

/** Decorations inside the plaza rectangle (chapter 4 objective). */
export function plazaDecorCount(g: Game): number {
  const lot = g.world.gen.lots.plaza;
  let n = 0;
  for (let z = lot.z - 3; z < lot.z + lot.d + 3; z++)
    for (let x = lot.x - 3; x < lot.x + lot.w + 3; x++) {
      if (!g.world.inb(x, z)) continue;
      const o = g.world.obj(g.world.idx(x, z));
      if (o && o.k === 'deco' && o.tag !== 'fill') n++;
    }
  return n;
}

export function islandDecorPoints(g: Game): number {
  let pts = 0;
  for (const key in g.state.world.objects) {
    const o = g.state.world.objects[key]!;
    if (o.k === 'deco' && o.tag !== 'fill') pts += item(o.item ?? '').furn?.decor ?? 1;
  }
  return pts;
}

export function inWestRegion(g: Game, i: number): boolean {
  return g.world.region(i) === Region.West;
}
