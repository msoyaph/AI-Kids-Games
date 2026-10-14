/**
 * Things placed on the land: fields, buildings, pens, trees, decorations and the old clutter of a
 * sleepy farm. Each has a footprint on the grid; rotation turns it in 90° steps (w and d swap on odd
 * turns). `occupancy` maps every covered tile to its object.
 */
import type { CropFamily } from '../data/crops';
import { areaAt, H, tileAt, W, type AreaId } from './map';

export type ObjKind = 'field' | 'building' | 'tree' | 'decor' | 'debris';

export interface BaseObj {
  id: number;
  kind: ObjKind;
  /** What it is: a building or decoration id, a tree id, a debris id ('field' for fields). */
  def: string;
  x: number;
  z: number;
  rot: 0 | 1 | 2 | 3;
}

export interface FieldObj extends BaseObj {
  kind: 'field';
  crop: string | null;
  plantedAt: number;
  readyAt: number;
  watered: boolean;
  fertilized: boolean;
  /** A different family from last time (crop rotation). */
  rotation: boolean;
  /** Nitrogen left by a legume before it. */
  boost: boolean;
  /** The family of the last crop harvested here. */
  last: CropFamily | null;
  /** The last crop was a legume: the next one gets the boost. */
  legumeLeft: boolean;
}

export interface OtherObj extends BaseObj {
  kind: 'building' | 'tree' | 'decor' | 'debris';
  /** Per-kind state (production queues, tree fruit timers…), plain JSON. */
  data?: Record<string, unknown>;
}

export type Obj = FieldObj | OtherObj;

/** Footprint size before rotation: width (x) and depth (z) in tiles. */
export type Size = { w: number; d: number };

export function footprint(o: { x: number; z: number; rot: number }, size: Size) {
  const odd = o.rot % 2 === 1;
  return { x: o.x, z: o.z, w: odd ? size.d : size.w, d: odd ? size.w : size.d };
}

export function tilesOf(o: { x: number; z: number; rot: number }, size: Size): [number, number][] {
  const f = footprint(o, size);
  const out: [number, number][] = [];
  for (let z = f.z; z < f.z + f.d; z++) for (let x = f.x; x < f.x + f.w; x++) out.push([x, z]);
  return out;
}

export const tileKey = (x: number, z: number) => z * W + x;

/**
 * Can something of this size go here? Every tile must be on unlocked, dry farm land and free
 * (`ignore` lets a moved object overlap its own old spot).
 */
export function canPlace(
  occupancy: Map<number, number>,
  unlocked: readonly AreaId[],
  at: { x: number; z: number; rot: number },
  size: Size,
  ignore?: number,
): { ok: true } | { ok: false; reason: 'edge' | 'locked' | 'water' | 'taken' | 'uneven' } {
  let level: number | null = null;
  for (const [x, z] of tilesOf(at, size)) {
    if (x < 0 || z < 0 || x >= W || z >= H) return { ok: false, reason: 'edge' };
    const lv = tileAt(x, z).level;
    if (level !== null && lv !== level) return { ok: false, reason: 'uneven' };
    level = lv;
    const area = areaAt(x, z);
    if (!area) return { ok: false, reason: 'edge' };
    if (!unlocked.includes(area)) return { ok: false, reason: 'locked' };
    if (tileAt(x, z).water) return { ok: false, reason: 'water' };
    const there = occupancy.get(tileKey(x, z));
    if (there !== undefined && there !== ignore) return { ok: false, reason: 'taken' };
  }
  return { ok: true };
}
