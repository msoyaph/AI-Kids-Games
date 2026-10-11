// Runtime view of the island: generated terrain + mutable objects/structures from GameState.
import { generateIsland, type IslandGen } from '../world/worldgen';
import { Ground, LEVEL_HEIGHT, WORLD_SIZE, isWaterGround, type Rect } from '../world/types';
import type { GameState, Structure, TileObj } from './state';

const genCache = new Map<number, IslandGen>();
export function getIsland(seed: number): IslandGen {
  let g = genCache.get(seed);
  if (!g) {
    g = generateIsland(seed);
    genCache.set(seed, g);
    if (genCache.size > 6) genCache.delete(genCache.keys().next().value!);
  }
  return g;
}

export const SOLID_OBJ = new Set(['tree', 'pine', 'palm', 'fruitTree', 'rock', 'deco', 'hole', 'sapling']);
/** Structures you can walk on (rather than collide with). */
const WALKABLE_STRUCT = new Set(['dock', 'bridge', 'ramp']);

export const DIR_VEC: readonly [number, number][] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

export class World {
  readonly size = WORLD_SIZE;
  readonly gen: IslandGen;
  /** structure index + 1 occupying each tile (0 = none) */
  structAt: Int32Array;
  constructor(public state: GameState) {
    this.gen = getIsland(state.seed);
    this.structAt = new Int32Array(this.size * this.size);
    this.rebuildStructures();
  }

  idx(x: number, z: number): number {
    return z * this.size + x;
  }
  inb(x: number, z: number): boolean {
    return x >= 0 && z >= 0 && x < this.size && z < this.size;
  }
  ground(i: number): number {
    return this.gen.ground[i]!;
  }
  height(i: number): number {
    return this.gen.height[i]!;
  }
  region(i: number): number {
    return this.gen.region[i]!;
  }
  obj(i: number): TileObj | undefined {
    return this.state.world.objects[i];
  }
  structure(i: number): Structure | undefined {
    const s = this.structAt[i]!;
    return s ? this.state.world.structures[s - 1] : undefined;
  }

  rebuildStructures(): void {
    this.structAt.fill(0);
    this.state.world.structures.forEach((s, k) => {
      for (let z = s.z; z < s.z + s.d; z++)
        for (let x = s.x; x < s.x + s.w; x++) if (this.inb(x, z)) this.structAt[this.idx(x, z)] = k + 1;
    });
  }

  /** Water that isn't covered by a bridge/dock. */
  isWater(i: number): boolean {
    if (!isWaterGround(this.ground(i))) return false;
    const s = this.structure(i);
    return !(s && (s.type === 'bridge' || s.type === 'dock'));
  }

  isFishable(i: number): boolean {
    return this.isWater(i);
  }

  /** Tile's walking level (ramps report their bottom level). */
  logicalLevel(i: number): number {
    const s = this.structure(i);
    if (s && s.type === 'ramp') return s.level;
    return this.height(i);
  }

  rampRow(s: Structure, x: number, z: number): number {
    // 1 = top row (next to the cliff), 0 = bottom row
    switch (s.dir ?? 0) {
      case 0:
        return z === s.z ? 1 : 0;
      case 2:
        return z === s.z + s.d - 1 ? 1 : 0;
      case 1:
        return x === s.x + s.w - 1 ? 1 : 0;
      default:
        return x === s.x ? 1 : 0;
    }
  }

  /** Can a character stand on this tile at all? */
  standable(i: number): boolean {
    if (this.isWater(i)) return false;
    const st = this.structure(i);
    if (st && !WALKABLE_STRUCT.has(st.type)) return false;
    const o = this.obj(i);
    return !(o && SOLID_OBJ.has(o.k));
  }

  /** Is (x,z) on the upper level just past the top of ramp `s` (anywhere across its width)? */
  inLanding(s: Structure, x: number, z: number): boolean {
    switch (s.dir ?? 0) {
      case 0:
        return z === s.z - 1 && x >= s.x && x < s.x + s.w;
      case 2:
        return z === s.z + s.d && x >= s.x && x < s.x + s.w;
      case 1:
        return x === s.x + s.w && z >= s.z && z < s.z + s.d;
      default:
        return x === s.x - 1 && z >= s.z && z < s.z + s.d;
    }
  }

  /** Whether moving from tile `from` into neighbouring tile `to` is blocked. */
  blocked(from: number, to: number): boolean {
    const tx = to % this.size, tz = (to / this.size) | 0;
    if (!this.inb(tx, tz)) return true;
    const st = this.structure(to);
    if (st && !WALKABLE_STRUCT.has(st.type)) return true;
    if (this.isWater(to)) return true;
    const o = this.obj(to);
    if (o && SOLID_OBJ.has(o.k)) return true;
    const fx = from % this.size, fz = (from / this.size) | 0;
    const sf = this.structure(from);
    const rf = sf && sf.type === 'ramp' ? sf : undefined;
    const rt = st && st.type === 'ramp' ? st : undefined;
    const lf = this.logicalLevel(from), lt = this.logicalLevel(to);
    if (lf === lt) {
      if (rf && rt && rf === rt) return false;
      if (rf && !rt && this.rampRow(rf, fx, fz) === 1) return true; // railings
      if (rt && !rf && this.rampRow(rt, tx, tz) === 1) return true;
      return false;
    }
    if (rf && this.rampRow(rf, fx, fz) === 1 && lt === rf.level + 1 && this.inLanding(rf, tx, tz)) return false;
    if (rt && this.rampRow(rt, tx, tz) === 1 && lf === rt.level + 1 && this.inLanding(rt, fx, fz)) return false;
    return true;
  }

  /** Visual ground height under a world position (handles ramps/bridges). */
  surfaceY(x: number, z: number): number {
    const tx = Math.floor(x), tz = Math.floor(z);
    if (!this.inb(tx, tz)) return 0;
    const i = this.idx(tx, tz);
    const s = this.structure(i);
    if (s && s.type === 'ramp') {
      const len = s.dir === 0 || s.dir === 2 ? s.d : s.w;
      let t = 0;
      switch (s.dir ?? 0) {
        case 0:
          t = (s.z + s.d - z) / len;
          break;
        case 2:
          t = (z - s.z) / len;
          break;
        case 1:
          t = (x - s.x) / len;
          break;
        default:
          t = (s.x + s.w - x) / len;
      }
      return (s.level + Math.max(0, Math.min(1, t))) * LEVEL_HEIGHT;
    }
    if (s && (s.type === 'bridge' || s.type === 'dock')) return 0.16;
    const g = this.ground(i);
    if (g === Ground.Ocean) return -0.4;
    if (g === Ground.River || g === Ground.Pond) return -0.6;
    return this.height(i) * LEVEL_HEIGHT;
  }

  /** Is this tile free for placing a 1x1 object (flower, deco, dropped item)? */
  isFreeForObject(i: number, allowSand = true): boolean {
    if (this.obj(i)) return false;
    if (this.structure(i)) return false;
    const g = this.ground(i);
    if (isWaterGround(g)) return false;
    if (!allowSand && g === Ground.Sand) return false;
    return true;
  }

  rectFree(r: Rect, level: number): boolean {
    for (let z = r.z; z < r.z + r.d; z++)
      for (let x = r.x; x < r.x + r.w; x++) {
        if (!this.inb(x, z)) return false;
        const i = this.idx(x, z);
        if (this.height(i) !== level || isWaterGround(this.ground(i))) return false;
        if (this.structure(i) || this.obj(i)) return false;
      }
    return true;
  }

  setObj(i: number, o: TileObj | undefined): void {
    if (o) this.state.world.objects[i] = o;
    else delete this.state.world.objects[i];
  }
}
