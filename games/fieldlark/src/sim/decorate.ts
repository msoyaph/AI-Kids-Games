/**
 * Build mode on the farm: paths painted on the ground, fences and flower beds painted tile by tile,
 * decorations, moving and turning anything that isn't fixed, putting things away (into storage, to
 * place again for free), undo, opening new land, and the farm's beauty rating.
 */
import { BUILDING } from '../data/buildings';
import { BEAUTY_TIERS, DECOR_BY_ID, LAND, PATHS, SETS } from '../data/decor';
import { TREE } from '../data/orchard';
import { areaAt, areaDef, H, tileAt, W, type AreaId } from './map';
import { canPlace, tileKey, type Obj, type OtherObj } from './objects';
import type { Farm } from './state';
import { bump, levelOf, newId, occupancy, sizeOf, spend } from './world';

export type Result<T = object> = ({ ok: true } & T) | { ok: false; why: string };

// --- paths: one character per tile, '0' for none ---

export const pathAt = (farm: Farm, x: number, z: number) => Number(farm.paths.charCodeAt(z * W + x) - 48) || 0;

function setPath(farm: Farm, x: number, z: number, id: number) {
  const i = z * W + x;
  farm.paths = farm.paths.slice(0, i) + String.fromCharCode(48 + id) + farm.paths.slice(i + 1);
}

export function paintPath(farm: Farm, x: number, z: number, id: number): Result {
  const def = PATHS.find(p => p.id === id);
  if (!def) return { ok: false, why: 'Unknown path.' };
  if (levelOf(farm) < def.level) return { ok: false, why: `${def.name} comes at farm level ${def.level}.` };
  const area = areaAt(x, z);
  if (!area || !farm.unlocked.includes(area) || tileAt(x, z).water) return { ok: false, why: 'Paths go on open farm land.' };
  if (occupancy(farm).has(tileKey(x, z))) return { ok: false, why: 'Something is in the way.' };
  if (pathAt(farm, x, z) === id) return { ok: false, why: 'Already a path.' };
  if (!spend(farm, def.cost)) return { ok: false, why: `${def.name} costs ${def.cost} coins a tile.` };
  setPath(farm, x, z, id);
  return { ok: true };
}

/** Clears a path, fence or flower bed from a tile (free; fences and flowers go into storage). */
export function erase(farm: Farm, x: number, z: number): Result<{ what: 'path' | 'decor' }> {
  const o = farm.objects.find(ob => ob.kind === 'decor' && ob.x === x && ob.z === z && DECOR_BY_ID[ob.def]?.paint);
  if (o) { putAway(farm, o.id); return { ok: true, what: 'decor' }; }
  if (pathAt(farm, x, z)) { setPath(farm, x, z, 0); return { ok: true, what: 'path' }; }
  return { ok: false, why: 'Nothing to clear here.' };
}

// --- storage: things put away, ready to place again for free ---

export const storageKey = (o: { kind: string; def: string }) => `${o.kind}:${o.def}`;
export const stored = (farm: Farm, key: string) => farm.storage[key] ?? 0;

/** Can this be moved or put away? (Fixed buildings, fields and clutter can't.) */
export function movable(o: Obj): boolean {
  if (o.kind === 'field' || o.kind === 'debris') return false;
  if (o.kind === 'building') return !BUILDING[o.def]?.fixed;
  return true;
}

/** Busy things (animals inside, jobs running, fruit on the tree) stay out of storage. */
function busy(o: Obj): string | null {
  if (o.kind !== 'building' && o.kind !== 'tree') return null;
  const d = (o as OtherObj).data ?? {};
  if (Array.isArray(d.animals) && d.animals.length) return 'Animals live here, so it can only be moved, not put away.';
  if ((Array.isArray(d.queue) && d.queue.length) || (Array.isArray(d.shelf) && d.shelf.length)) return 'It’s busy working. Collect everything first.';
  if (o.kind === 'tree') return 'Trees are planted for good: you can move them, but not put them away.';
  return null;
}

export function putAway(farm: Farm, id: number): Result {
  const i = farm.objects.findIndex(o => o.id === id);
  const o = farm.objects[i];
  if (!o || !movable(o)) return { ok: false, why: 'That stays where it is.' };
  const why = busy(o);
  if (why) return { ok: false, why };
  farm.objects.splice(i, 1);
  const key = storageKey(o);
  farm.storage[key] = stored(farm, key) + 1;
  return { ok: true };
}

/** Moves (and turns) a placed thing. */
export function moveObject(farm: Farm, id: number, at: { x: number; z: number; rot: 0 | 1 | 2 | 3 }): Result {
  const o = farm.objects.find(ob => ob.id === id);
  if (!o || !movable(o)) return { ok: false, why: 'That stays where it is.' };
  const size = sizeOf(o);
  const r = canPlace(occupancy(farm), farm.unlocked, at, size, id);
  if (!r.ok) return { ok: false, why: r.reason === 'taken' ? 'Something is already there.' : r.reason === 'uneven' ? 'It needs flat ground.' : 'It can’t go there.' };
  if (pathUnder(farm, at, size)) return { ok: false, why: 'Take the path away first (or put it somewhere else).' };
  if (o.kind === 'building' && BUILDING[o.def]?.needsWater && !touchesWaterAt(at, size)) return { ok: false, why: 'A duck house must be right beside water.' };
  o.x = at.x; o.z = at.z; o.rot = at.rot;
  return { ok: true };
}

function touchesWaterAt(at: { x: number; z: number; rot: number }, size: { w: number; d: number }) {
  const odd = at.rot % 2 === 1, w = odd ? size.d : size.w, d = odd ? size.w : size.d;
  for (let z = at.z - 1; z <= at.z + d; z++) for (let x = at.x - 1; x <= at.x + w; x++) {
    const inside = x >= at.x && x < at.x + w && z >= at.z && z < at.z + d;
    if (!inside && x >= 0 && z >= 0 && x < W && z < H && tileAt(x, z).water && (x >= at.x && x < at.x + w || z >= at.z && z < at.z + d)) return true;
  }
  return false;
}

/** Big things can't sit on paths (decorations of one tile can, like a bench on a path). */
export function pathUnder(farm: Farm, at: { x: number; z: number; rot: number }, size: { w: number; d: number }): boolean {
  const odd = at.rot % 2 === 1, w = odd ? size.d : size.w, d = odd ? size.w : size.d;
  if (w * d === 1) return false;
  for (let z = at.z; z < at.z + d; z++) for (let x = at.x; x < at.x + w; x++) if (x >= 0 && z >= 0 && x < W && z < H && pathAt(farm, x, z)) return true;
  return false;
}

// --- decorations ---

export const setEarned = (farm: Farm, set: string) => !!farm.flags[`set:${set}`];

/** Place a decoration: from storage if there is one, else bought (earned sets are free once earned). */
export function placeDecor(farm: Farm, def: string, at: { x: number; z: number; rot: 0 | 1 | 2 | 3 }): Result<{ obj: OtherObj; fromStorage: boolean }> {
  const d = DECOR_BY_ID[def];
  if (!d) return { ok: false, why: 'Unknown decoration.' };
  const fromStorage = stored(farm, `decor:${def}`) > 0;
  if (!fromStorage) {
    if (d.set && !setEarned(farm, d.set)) return { ok: false, why: `Earn the ${SETS[d.set]!.name} from ${SETS[d.set]!.how}.` };
    if (!d.set && levelOf(farm) < d.level) return { ok: false, why: `${d.name} comes at farm level ${d.level}.` };
  }
  const r = canPlace(occupancy(farm), farm.unlocked, at, { w: d.w, d: d.d });
  if (!r.ok) return { ok: false, why: r.reason === 'taken' ? 'Something is already there.' : r.reason === 'locked' ? 'That land isn’t open yet.' : r.reason === 'uneven' ? 'It needs flat ground.' : 'It can’t go there.' };
  if (pathUnder(farm, at, { w: d.w, d: d.d })) return { ok: false, why: 'Take the path away first.' };
  if (fromStorage) farm.storage[`decor:${def}`]!--;
  else if (!spend(farm, d.cost)) return { ok: false, why: `${d.name} costs ${d.cost} coins.` };
  const obj: OtherObj = { id: newId(farm), kind: 'decor', def, x: at.x, z: at.z, rot: at.rot };
  farm.objects.push(obj);
  return { ok: true, obj, fromStorage };
}

/** Put a building or tree back from storage (free). */
export function placeStored(farm: Farm, kind: 'building' | 'tree', def: string, at: { x: number; z: number; rot: 0 | 1 | 2 | 3 }): Result<{ obj: OtherObj }> {
  const key = `${kind}:${def}`;
  if (stored(farm, key) <= 0) return { ok: false, why: 'Nothing like that in storage.' };
  const size = kind === 'building' ? { w: BUILDING[def]!.w, d: BUILDING[def]!.d } : { w: 1, d: 1 };
  const r = canPlace(occupancy(farm), farm.unlocked, at, size);
  if (!r.ok) return { ok: false, why: 'It can’t go there.' };
  if (pathUnder(farm, at, size)) return { ok: false, why: 'Take the path away first.' };
  if (kind === 'building' && BUILDING[def]?.needsWater && !touchesWaterAt(at, size)) return { ok: false, why: 'A duck house must be right beside water.' };
  farm.storage[key]!--;
  const obj: OtherObj = { id: newId(farm), kind, def, x: at.x, z: at.z, rot: at.rot, data: {} };
  farm.objects.push(obj);
  return { ok: true, obj };
}

// --- undo ---

export interface Snapshot { objects: string; paths: string; coins: number; storage: string; unlocked: string }
export const snapshot = (farm: Farm): Snapshot => ({ objects: JSON.stringify(farm.objects), paths: farm.paths, coins: farm.coins, storage: JSON.stringify(farm.storage), unlocked: JSON.stringify(farm.unlocked) });
export function restore(farm: Farm, s: Snapshot) {
  farm.objects = JSON.parse(s.objects);
  farm.paths = s.paths;
  farm.coins = s.coins;
  farm.storage = JSON.parse(s.storage);
  farm.unlocked = JSON.parse(s.unlocked);
}

/** A stack of up to 30 snapshots taken before each build action. */
export class UndoStack {
  private stack: Snapshot[] = [];
  push(farm: Farm) { this.stack.push(snapshot(farm)); if (this.stack.length > 30) this.stack.shift(); }
  get size() { return this.stack.length; }
  undo(farm: Farm): boolean { const s = this.stack.pop(); if (!s) return false; restore(farm, s); return true; }
  clear() { this.stack = []; }
}

// --- land ---

export function landInfo(area: AreaId) { return LAND.find(l => l.area === area); }

export function canOpen(farm: Farm, area: AreaId): string | null {
  const l = landInfo(area);
  if (!l) return 'That land is already yours.';
  if (farm.unlocked.includes(area)) return 'Already open.';
  if (levelOf(farm) < l.level) return `${areaDef(area).name} opens at farm level ${l.level}.`;
  if (farm.coins < l.cost) return `${areaDef(area).name} costs ${l.cost} coins.`;
  return null;
}

export function openLand(farm: Farm, area: AreaId): Result {
  const why = canOpen(farm, area);
  if (why) return { ok: false, why };
  spend(farm, landInfo(area)!.cost);
  farm.unlocked.push(area);
  bump(farm, 'land');
  return { ok: true };
}

// --- beauty ---

/**
 * The farm's beauty: decorations and flower beds by their beauty points, a little for every path
 * tile (paths that lead somewhere look best), a bonus for variety, and a little off for clutter
 * left lying on open land. Fruit trees count too.
 */
export function beauty(farm: Farm): { score: number; tier: string; next: number | null } {
  let score = 0;
  const kinds = new Set<string>();
  for (const o of farm.objects) {
    if (o.kind === 'decor') { score += DECOR_BY_ID[o.def]?.beauty ?? 0; kinds.add(o.def); }
    else if (o.kind === 'tree' && TREE[o.def]) { score += 1; kinds.add(o.def); }
    else if (o.kind === 'debris' && o.def !== 'mushrooms') { const a = areaAt(o.x, o.z); if (a && farm.unlocked.includes(a)) score -= 0.5; }
  }
  let paths = 0;
  for (let i = 0; i < farm.paths.length; i++) if (farm.paths.charCodeAt(i) !== 48) paths += PATHS.find(p => p.id === farm.paths.charCodeAt(i) - 48)?.beauty ?? 0;
  score += Math.min(60, paths) + Math.min(40, kinds.size * 2);
  score = Math.max(0, Math.round(score));
  let tier = BEAUTY_TIERS[0]!.name, next: number | null = null;
  for (const t of BEAUTY_TIERS) { if (score >= t.from) tier = t.name; else if (next === null) next = t.from; }
  return { score, tier, next };
}

export const emptyPaths = () => '0'.repeat(W * H);
