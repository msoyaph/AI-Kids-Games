// Planting, sapling growth and flower cross-breeding.
import { dayRng } from '../core/rng';
import { breedResult, FLOWER_BLOOM_STAGE, SAPLING_DAYS } from '../data/gardening';
import { FLOWER_COLOR_NAMES } from '../data/items';
import { FRUITS, COCONUT } from '../data/fruit';
import { item } from '../data/registry';
import { DIRS8, Ground } from '../world/types';
import type { Game } from './game';
import { removeAt, stat } from './inventory';
import { frontTile } from './player';
import type { TileObj } from './state';

/** What a plantable item becomes, or null if not plantable. */
export function plantObjFor(id: string): { obj: TileObj; needsSand?: boolean } | null {
  const def = item(id);
  if (def.plant?.kind === 'flower') return { obj: { k: 'flower', v: def.plant.v, g: def.cat === 'seed' ? 0 : FLOWER_BLOOM_STAGE } };
  if (def.plant?.kind === 'sapling') return { obj: { k: 'sapling', item: def.plant.item ?? 'tree', g: 0 } };
  const fi = FRUITS.findIndex((f) => f.id === id);
  if (fi >= 0) return { obj: { k: 'sapling', item: 'fruit', v: fi, g: 0 } };
  if (id === COCONUT.id) return { obj: { k: 'sapling', item: 'palm', g: 0 }, needsSand: true };
  return null;
}

export function canPlantAt(g: Game, tile: number, id: string): boolean {
  const w = g.world;
  const plan = plantObjFor(id);
  if (!plan) return false;
  if (w.structure(tile)) return false;
  const o = w.obj(tile);
  if (o && o.k !== 'hole') return false;
  const gr = w.ground(tile);
  if (plan.needsSand) return gr === Ground.Sand;
  if (plan.obj.k === 'flower') return gr === Ground.Grass || gr === Ground.Dirt || gr === Ground.Sand;
  return gr === Ground.Grass || gr === Ground.Dirt;
}

/** Plant the item in pocket `slot` on the tile in front of the player. */
export function plantFromSlot(g: Game, slot: number): boolean {
  const s = g.state.player.inv[slot];
  if (!s) return false;
  const tile = frontTile(g.world, g.state.player);
  if (!canPlantAt(g, tile, s.id)) {
    g.toast("You can't plant that here.", 'warn');
    g.emit('sfx', { name: 'error' });
    return false;
  }
  const plan = plantObjFor(s.id)!;
  const id = s.id;
  removeAt(g, slot, 1, 'plant');
  g.world.setObj(tile, { ...plan.obj, pd: g.state.clock.day });
  stat(g, 'planted');
  g.emit('planted', { id, tile });
  g.emit('sfx', { name: 'dig' });
  g.emit('objectsChanged', { tiles: [tile] });
  return true;
}

/** Daily growth + breeding pass (runs before watering flags reset). */
export function dailyGarden(g: Game): void {
  const s = g.state;
  const w = g.world;
  const N = w.size;
  const rng = dayRng(s.seed, s.clock.day, 'garden');
  const objs = s.world.objects;
  const bredToday = new Set<number>();
  const keys = Object.keys(objs).map(Number);
  // breeding
  for (const i of keys) {
    const o = objs[i];
    if (!o || o.k !== 'flower' || !o.w || (o.g ?? 0) < FLOWER_BLOOM_STAGE || bredToday.has(i)) continue;
    const sp = Math.floor((o.v ?? 0) / 16), col = (o.v ?? 0) % 16;
    const x = i % N, z = (i / N) | 0;
    const partners: number[] = [];
    for (const [dx, dz] of DIRS8) {
      if (!w.inb(x + dx, z + dz)) continue;
      const j = w.idx(x + dx, z + dz);
      const p = objs[j];
      if (p && p.k === 'flower' && Math.floor((p.v ?? 0) / 16) === sp && (p.g ?? 0) >= FLOWER_BLOOM_STAGE && !bredToday.has(j)) partners.push(j);
    }
    if (!partners.length) continue;
    const j = rng.pick(partners);
    const pc = (objs[j]!.v ?? 0) % 16;
    const rule = breedResult(col, pc);
    if (!rule || !rng.chance(rule.chance * (objs[j]!.w ? 1 : 0.5))) continue;
    const free: number[] = [];
    for (const [dx, dz] of DIRS8) {
      if (!w.inb(x + dx, z + dz)) continue;
      const k = w.idx(x + dx, z + dz);
      const gr = w.ground(k);
      if (!objs[k] && !w.structure(k) && (gr === Ground.Grass || gr === Ground.Dirt) && w.height(k) === w.height(i)) free.push(k);
    }
    if (!free.length) continue;
    const k = rng.pick(free);
    objs[k] = { k: 'flower', v: sp * 16 + rule.child, g: FLOWER_BLOOM_STAGE, pd: s.clock.day };
    bredToday.add(i);
    bredToday.add(j);
    bredToday.add(k);
    if (rule.child >= 3) {
      s.stats.flowersBred = (s.stats.flowersBred ?? 0) + 1;
      g.emit('flowerBred', { color: FLOWER_COLOR_NAMES[rule.child]!, species: sp });
    }
  }
  // growth + reset watering
  for (const i of keys) {
    const o = objs[i];
    if (!o) continue;
    if (o.k === 'flower') {
      if ((o.g ?? 0) < FLOWER_BLOOM_STAGE) o.g = (o.g ?? 0) + 1;
      o.w = 0;
    } else if (o.k === 'sapling') {
      o.g = (o.g ?? 0) + (o.w ? 2 : 1);
      o.w = 0;
      if ((o.g ?? 0) >= SAPLING_DAYS + 1) {
        if (o.item === 'pine') objs[i] = { k: 'pine', v: rng.int(0, 3) };
        else if (o.item === 'fruit') objs[i] = { k: 'fruitTree', v: o.v ?? 0, f: 3 };
        else if (o.item === 'palm') objs[i] = { k: 'palm', v: 0, f: 2 };
        else objs[i] = { k: 'tree', v: rng.int(0, 3) };
        s.stats.treesGrown = (s.stats.treesGrown ?? 0) + 1;
      }
    } else if (o.k === 'hole' && rng.chance(0.5)) {
      delete objs[i];
    }
  }
  g.emit('objectsChanged', {});
}
