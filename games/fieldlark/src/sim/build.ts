/**
 * Buying and placing things: buildings, animal homes and orchard plants. Phase 5 adds moving,
 * turning, putting away and undo on top of this.
 */
import { BUILDING } from '../data/buildings';
import { TREE } from '../data/orchard';
import { buyAnimal } from './animals';
import { tileAt } from './map';
import { canPlace, tilesOf, type OtherObj, type Size } from './objects';
import type { Farm } from './state';
import { startTree } from './trees';
import { pathUnder } from './decorate';
import { levelOf, newId, occupancy, spend } from './world';

export type Buyable = { kind: 'building' | 'tree'; def: string };

export function buyableInfo(b: Buyable): { name: string; cost: number; level: number; size: Size } | null {
  if (b.kind === 'building') { const d = BUILDING[b.def]; return d && !d.fixed ? { name: d.name, cost: d.cost, level: d.level, size: { w: d.w, d: d.d } } : null; }
  const t = TREE[b.def];
  return t ? { name: t.name, cost: t.cost, level: t.level, size: { w: 1, d: 1 } } : null;
}

const WHY: Record<string, string> = {
  edge: 'That’s off the farm.', locked: 'That land isn’t open yet.', water: 'It can’t go on water.', taken: 'Something is already there.', uneven: 'It needs flat ground.', water2: 'A duck house must be right beside water.',
};

/** Does a footprint touch water on any side (for the duck house)? */
function touchesWater(at: { x: number; z: number; rot: number }, size: Size) {
  for (const [x, z] of tilesOf(at, size)) {
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx!, nz = z + dz!;
      if (nx >= 0 && nz >= 0 && nx < 56 && nz < 56 && tileAt(nx, nz).water) return true;
    }
  }
  return false;
}

/** For the placement ghost: is this one tile free, open, dry and at the given level? */
export function tileFits(farm: Farm, x: number, z: number, level: number, occ = occupancy(farm)): boolean {
  if (x < 0 || z < 0 || x >= 56 || z >= 56) return false;
  return canPlace(occ, farm.unlocked, { x, z, rot: 0 }, { w: 1, d: 1 }).ok && tileAt(x, z).level === level;
}

/** Why the story or the Lab keeps this out of the Shop for now (null: it's in). */
export function notYet(farm: Farm, b: Buyable): string | null {
  const n = b.kind === 'building' ? BUILDING[b.def]?.needs : undefined;
  if (!n) return null;
  if (n.chapter !== undefined && farm.story.chapter < n.chapter) return n.why;
  if (n.flag && !farm.flags[n.flag]) return n.why;
  return null;
}

/** Can this be placed here? (Doesn't check coins.) */
export function placeCheck(farm: Farm, b: Buyable, at: { x: number; z: number; rot: number }, ignore?: number): { ok: true } | { ok: false; why: string } {
  const info = buyableInfo(b);
  if (!info) return { ok: false, why: 'That can’t be built.' };
  const r = canPlace(occupancy(farm), farm.unlocked, at, info.size, ignore);
  if (!r.ok) return { ok: false, why: WHY[r.reason] ?? 'It can’t go there.' };
  if (b.kind === 'building' && BUILDING[b.def]?.needsWater && !touchesWater(at, info.size)) return { ok: false, why: WHY.water2! };
  if (pathUnder(farm, at, info.size)) return { ok: false, why: 'Take the path away first.' };
  return { ok: true };
}

export function buyAndPlace(farm: Farm, b: Buyable, at: { x: number; z: number; rot: 0 | 1 | 2 | 3 }): { ok: true; obj: OtherObj } | { ok: false; why: string } {
  const info = buyableInfo(b);
  if (!info) return { ok: false, why: 'That can’t be built.' };
  if (levelOf(farm) < info.level) return { ok: false, why: `${info.name} comes at farm level ${info.level}.` };
  const later = notYet(farm, b);
  if (later) return { ok: false, why: later };
  const where = placeCheck(farm, b, at);
  if (!where.ok) return where;
  if (!spend(farm, info.cost)) return { ok: false, why: `${info.name} costs ${info.cost} coins.` };
  const obj: OtherObj = { id: newId(farm), kind: b.kind, def: b.def, x: at.x, z: at.z, rot: at.rot, data: {} };
  farm.objects.push(obj);
  if (b.kind === 'tree') startTree(farm, obj);
  // bees arrive with their hive
  if (b.kind === 'building' && b.def === 'beehive') buyAnimal(farm, obj, true);
  return { ok: true, obj };
}
