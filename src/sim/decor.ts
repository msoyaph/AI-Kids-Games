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
  return { label: `Pick up ${item(id).name}`, priority: 65, run: () => pickUpOutdoor(g, ctx.front) };
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
