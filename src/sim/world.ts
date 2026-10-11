/**
 * Runtime locations: static map data + dynamic soil/objects. Shared by the sim, the bot
 * and the renderer (which reads dirty-chunk flags).
 */
import { PROPS, STRUCTURES, type StructureDef } from '../data/structures';
import type { MapDef, StructurePlacement, Warp } from '../data/maps/types';
import { TER_INFO } from './terrain';
import type { ObjKind, WorldObject } from './types';

export const CHUNK = 16;

/** Which object kinds block walking. */
const SOLID: Partial<Record<ObjKind, boolean>> = {
  weed: true,
  stone: true,
  twig: true,
  stump: true,
  log: true,
  boulder: true,
  part: true,
  machine: true,
  chest: true,
  sprinkler: true,
  scarecrow: true,
  fence: true,
  deco: true,
  bush: true,
  rock: true,
  ore: true,
  gem: true,
  box: true,
  ice: true,
  mineChest: true,
  heartstone: true,
  torch: true,
  beehouse: true,
  giant: true,
  crabpot: true,
};

export function objSolid(o: WorldObject): boolean {
  if (o.k === 'tree') return (o.g ?? 0) >= 2;
  if (o.k === 'fruitTree') return (o.g ?? 0) >= 4;
  if (o.k === 'gate') return !o.open;
  if (o.k === 'crop') return o.id === 'peas' || o.id === 'greenbean' || o.id === 'grape' ? !o.dead : false;
  return SOLID[o.k] === true;
}

export interface ResolvedStructure {
  sp: StructurePlacement;
  /** StructureDef key, or null if nothing is built here (empty plot) */
  key: string | null;
  def: StructureDef | null;
}

export type StructureResolver = (loc: string, sp: StructurePlacement) => string | null;

export class Loc {
  readonly id: string;
  def: MapDef;
  w: number;
  h: number;
  soil: Uint8Array;
  objs = new Map<number, WorldObject>();
  solid: Uint8Array;
  warps: Warp[] = [];
  warpAt: Int16Array;
  trigAt: Int16Array;
  structs: ResolvedStructure[] = [];
  /** per-chunk "needs redraw" flags for the renderer */
  chunkDirty: Uint8Array;
  cw: number;
  ch: number;
  /** bumps whenever objects change (renderer re-syncs sprites) */
  objVersion = 1;
  /** bumps when static layout changes (structures rebuilt) */
  layoutVersion = 1;

  constructor(def: MapDef, resolve: StructureResolver) {
    this.id = def.id;
    this.def = def;
    this.w = def.w;
    this.h = def.h;
    this.soil = new Uint8Array(def.w * def.h);
    this.solid = new Uint8Array(def.w * def.h);
    this.warpAt = new Int16Array(def.w * def.h);
    this.trigAt = new Int16Array(def.w * def.h);
    this.cw = Math.ceil(def.w / CHUNK);
    this.ch = Math.ceil(def.h / CHUNK);
    this.chunkDirty = new Uint8Array(this.cw * this.ch).fill(1);
    this.rebuild(resolve);
  }

  /** Swap the map definition (e.g. farmhouse upgrade) keeping soil/objects that still fit. */
  setDef(def: MapDef, resolve: StructureResolver): void {
    const oldSoil = this.soil, oldW = this.w;
    this.def = def;
    this.w = def.w;
    this.h = def.h;
    this.soil = new Uint8Array(def.w * def.h);
    for (let y = 0; y < Math.min(this.h, oldSoil.length / oldW); y++)
      for (let x = 0; x < Math.min(this.w, oldW); x++) this.soil[y * this.w + x] = oldSoil[y * oldW + x];
    const objs = this.objs;
    this.objs = new Map();
    for (const [i, o] of objs) {
      const x = i % oldW, y = Math.floor(i / oldW);
      if (x < this.w && y < this.h) this.objs.set(y * this.w + x, o);
    }
    this.solid = new Uint8Array(def.w * def.h);
    this.warpAt = new Int16Array(def.w * def.h);
    this.trigAt = new Int16Array(def.w * def.h);
    this.cw = Math.ceil(def.w / CHUNK);
    this.ch = Math.ceil(def.h / CHUNK);
    this.chunkDirty = new Uint8Array(this.cw * this.ch).fill(1);
    this.rebuild(resolve);
  }

  /** Recompute static solidity, warps and triggers from terrain, props and structures. */
  rebuild(resolve: StructureResolver): void {
    const { w, h, def } = this;
    for (let i = 0; i < w * h; i++) this.solid[i] = TER_INFO[def.ground[i]]?.walk ? 0 : 1;
    for (const p of def.props) {
      const pd = PROPS[p.kind];
      if (!pd || !pd.solid) continue;
      for (let j = 0; j < (pd.h ?? 1); j++) for (let i = 0; i < (pd.w ?? 1); i++) this.setSolid(p.x + i, p.y + j);
    }
    this.warps = def.warps.slice();
    this.structs = [];
    for (const sp of def.structures) {
      const key = resolve(this.id, sp);
      const sd = key ? STRUCTURES[key] ?? null : null;
      this.structs.push({ sp, key, def: sd });
      if (!sd) continue;
      for (let j = 0; j < sd.h; j++)
        for (let i = 0; i < sd.w; i++) {
          if (sd.door && i === sd.door.dx && j === sd.door.dy && sp.door) continue;
          this.setSolid(sp.x + i, sp.y + j);
        }
      if (sd.door && sp.door) {
        this.solid[this.idx(sp.x + sd.door.dx, sp.y + sd.door.dy)] = 0;
        this.warps.push({ x: sp.x + sd.door.dx, y: sp.y + sd.door.dy, to: sp.door.to, tx: sp.door.tx, ty: sp.door.ty, dir: 3, need: sp.door.need, msg: sp.door.msg });
      }
    }
    this.warpAt.fill(-1);
    this.warps.forEach((wp, n) => {
      for (let j = 0; j < (wp.h ?? 1); j++) for (let i = 0; i < (wp.w ?? 1); i++) if (this.inb(wp.x + i, wp.y + j)) this.warpAt[this.idx(wp.x + i, wp.y + j)] = n;
    });
    this.trigAt.fill(-1);
    def.triggers.forEach((t, n) => {
      for (let j = 0; j < (t.h ?? 1); j++) for (let i = 0; i < (t.w ?? 1); i++) if (this.inb(t.x + i, t.y + j)) this.trigAt[this.idx(t.x + i, t.y + j)] = n;
    });
    this.chunkDirty.fill(1);
    this.layoutVersion++;
    this.objVersion++;
  }

  private setSolid(x: number, y: number): void {
    if (this.inb(x, y)) this.solid[y * this.w + x] = 1;
  }

  idx(x: number, y: number): number {
    return y * this.w + x;
  }
  inb(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  ter(x: number, y: number): number {
    return this.inb(x, y) ? this.def.ground[y * this.w + x] : 0;
  }
  blocked(x: number, y: number): boolean {
    if (!this.inb(x, y)) return true;
    const i = y * this.w + x;
    if (this.solid[i]) return true;
    const o = this.objs.get(i);
    return o !== undefined && objSolid(o);
  }
  /** Static-only solidity (ignores objects) — used for placement checks. */
  staticBlocked(x: number, y: number): boolean {
    return !this.inb(x, y) || this.solid[y * this.w + x] === 1;
  }

  obj(x: number, y: number): WorldObject | undefined {
    if (!this.inb(x, y)) return undefined;
    return this.objs.get(y * this.w + x);
  }
  /** Object at tile, following multi-tile 'part' references to their anchor. */
  objAnchor(x: number, y: number): { o: WorldObject; i: number } | null {
    if (!this.inb(x, y)) return null;
    let i = y * this.w + x;
    let o = this.objs.get(i);
    if (o && o.k === 'part' && o.ref !== undefined) {
      i = o.ref;
      o = this.objs.get(i);
    }
    return o ? { o, i } : null;
  }
  setObj(x: number, y: number, o: WorldObject): void {
    if (!this.inb(x, y)) return;
    this.objs.set(y * this.w + x, o);
    this.touch(x, y);
  }
  /** Place a multi-tile object anchored at top-left. */
  setBig(x: number, y: number, w: number, h: number, o: WorldObject): void {
    const anchor = this.idx(x, y);
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        if (i === 0 && j === 0) this.objs.set(anchor, o);
        else this.objs.set(this.idx(x + i, y + j), { k: 'part', id: o.id, ref: anchor });
      }
    this.touch(x, y);
  }
  removeObj(x: number, y: number): WorldObject | undefined {
    if (!this.inb(x, y)) return undefined;
    const i = y * this.w + x;
    const o = this.objs.get(i);
    if (!o) return undefined;
    if (o.k === 'part' && o.ref !== undefined) return this.removeObj(o.ref % this.w, Math.floor(o.ref / this.w));
    this.objs.delete(i);
    // remove parts pointing to this anchor
    for (const [j, p] of this.objs) if (p.k === 'part' && p.ref === i) this.objs.delete(j);
    this.touch(x, y);
    return o;
  }
  /** Mark tile's chunk dirty and bump object version. */
  touch(x: number, y: number): void {
    const cx = Math.floor(x / CHUNK), cy = Math.floor(y / CHUNK);
    if (cx >= 0 && cy >= 0 && cx < this.cw && cy < this.ch) this.chunkDirty[cy * this.cw + cx] = 1;
    this.objVersion++;
  }
  soilAt(x: number, y: number): number {
    return this.inb(x, y) ? this.soil[y * this.w + x] : 0;
  }
  setSoil(x: number, y: number, v: number): void {
    if (!this.inb(x, y)) return;
    const i = y * this.w + x;
    if (this.soil[i] === v) return;
    this.soil[i] = v;
    const cx = Math.floor(x / CHUNK), cy = Math.floor(y / CHUNK);
    this.chunkDirty[cy * this.cw + cx] = 1;
  }
  warpAtTile(x: number, y: number): Warp | null {
    if (!this.inb(x, y)) return null;
    const n = this.warpAt[y * this.w + x];
    return n >= 0 ? this.warps[n] : null;
  }
  triggerAt(x: number, y: number): { action: string; arg?: string } | null {
    if (!this.inb(x, y)) return null;
    const n = this.trigAt[y * this.w + x];
    return n >= 0 ? this.def.triggers[n] : null;
  }
  isWater(x: number, y: number): boolean {
    return TER_INFO[this.ter(x, y)]?.water === true;
  }
  isTillable(x: number, y: number): boolean {
    return this.def.farmable && TER_INFO[this.ter(x, y)]?.till === true && !this.solid[this.idx(x, y)];
  }
  inClearZone(x: number, y: number): boolean {
    const z = this.def.clearZones;
    if (!z) return false;
    for (const r of z) if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return true;
    return false;
  }
}
