/**
 * Where things stand: which tiles each thing covers, what is on a tile, and whether something can
 * be placed somewhere (on open, unlocked land, off the roads, not on top of anything else; transit
 * stops beside a road; never past the caps a save can hold).
 *
 * Pure: no DOM, no Date, no Math.random.
 */
import { isBuildingDef, THING, type ThingDef } from '../data/things';
import { TUNING } from '../data/tuning';
import { areaAt, buildable, H, idx, inMap, W } from './map';
import { isRoad } from './roads';
import type { Rot, Thing, Town } from './state';

/** Footprint size after turning. */
export function sizeOf(def: Pick<ThingDef, 'w' | 'd'>, rot: Rot) { return rot % 2 ? { w: def.d, d: def.w } : { w: def.w, d: def.d }; }

/** Every tile a thing covers. */
export function tilesOf(t: Pick<Thing, 'def' | 'x' | 'z' | 'rot'>): [number, number][] {
  const d = THING[t.def];
  if (!d) return [];
  const s = sizeOf(d, t.rot);
  const out: [number, number][] = [];
  for (let z = t.z; z < t.z + s.d; z++) for (let x = t.x; x < t.x + s.w; x++) out.push([x, z]);
  return out;
}

/** Which thing covers each tile (thing id; 0 none). Cached on the town's version. */
const occCache = new WeakMap<Town, { v: number; occ: Int32Array }>();
export function occupancy(town: Town): Int32Array {
  const c = occCache.get(town);
  if (c && c.v === town.version) return c.occ;
  const occ = new Int32Array(W * H);
  for (const t of town.things) for (const [x, z] of tilesOf(t)) if (inMap(x, z)) occ[idx(x, z)] = t.id;
  occCache.set(town, { v: town.version ?? 0, occ });
  return occ;
}

export const thingAt = (town: Town, x: number, z: number) => {
  if (!inMap(x, z)) return null;
  const id = occupancy(town)[idx(x, z)];
  return id ? town.things.find(t => t.id === id) ?? null : null;
};

export const thingById = (town: Town, id: number) => town.things.find(t => t.id === id) ?? null;

export const isOpen = (town: Pick<Town, 'unlocked'>, x: number, z: number) => { const a = areaAt(x, z); return !!a && town.unlocked.includes(a.id); };

export type Why = 'ok' | 'locked' | 'water' | 'road' | 'taken' | 'edge' | 'noroad' | 'full';

/** How many buildings, and how many decorations (trees, park and street pieces), the town has. */
export function counts(town: Town): { buildings: number; decor: number } {
  let buildings = 0;
  for (const t of town.things) if (isBuildingDef(t.def)) buildings++;
  return { buildings, decor: town.things.length - buildings };
}

/** Is the town as full of this kind of thing as a save can hold? */
export function atCap(town: Town, def: string): boolean {
  const c = counts(town);
  return isBuildingDef(def) ? c.buildings >= TUNING.caps.buildings : c.decor >= TUNING.caps.decor;
}

/** Can `def` stand at (x, z) turned `rot`? `ignore`: a thing being moved (its own tiles don't count). */
export function canPlace(town: Town, def: string, x: number, z: number, rot: Rot, ignore = 0): Why {
  const d = THING[def];
  if (!d) return 'edge';
  if (!ignore && atCap(town, def)) return 'full';
  const occ = occupancy(town);
  for (const [tx, tz] of tilesOf({ def, x, z, rot })) {
    if (!inMap(tx, tz) || !areaAt(tx, tz)) return 'edge';
    if (!buildable(tx, tz)) return 'water';
    if (!isOpen(town, tx, tz)) return 'locked';
    if (isRoad(town, tx, tz)) return 'road';
    const o = occ[idx(tx, tz)]!;
    if (o && o !== ignore) return 'taken';
  }
  // stops stand beside a road (any side)
  if (d.class === 'transit' && !touchesRoad(town, def, x, z, rot)) return 'noroad';
  return 'ok';
}

/** Does a footprint have a road along one of its sides? */
export function touchesRoad(town: Town, def: string, x: number, z: number, rot: Rot): boolean {
  for (const [tx, tz] of tilesOf({ def, x, z, rot })) for (const [dx, dz] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) if (isRoad(town, tx + dx, tz + dz)) return true;
  return false;
}

/** Plain words for why something can't go there. */
export const WHY_TEXT: Record<Exclude<Why, 'ok'>, string> = {
  locked: 'That land isn’t open yet.',
  water: 'You can’t build on the beach or in the bay.',
  road: 'There’s a road there.',
  taken: 'Something is already there.',
  edge: 'That’s outside the town.',
  noroad: 'Stops go right beside a road.',
  full: 'The town is full of those! Take one away to make room.',
};

/** A thing's middle (world units). */
export function centerOf(t: Pick<Thing, 'def' | 'x' | 'z' | 'rot'>) {
  const d = THING[t.def]!, s = sizeOf(d, t.rot);
  return { x: t.x + s.w / 2, z: t.z + s.d / 2 };
}
