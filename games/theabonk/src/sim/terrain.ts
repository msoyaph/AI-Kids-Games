import { MAP_HALF } from '../config/balance';
import { mapDef, type TerrainSpec } from '../config/maps';
import type { PropKind } from '../config/types';
import { ValueNoise2D, smoothstep, clamp } from '../core/math';
import { Rng } from '../core/rng';

/**
 * Procedural map: rolling heightfield hills + rectangular mesas (flat-topped, steep sides)
 * + ramps (linear inclines; standalone "kickers" have a lip that launches fast players).
 * Pure math, shared by the sim (physics) and the renderer (meshes).
 */

export type StructureKind = 'mesa' | 'ramp';

export interface Structure {
  kind: StructureKind;
  x: number;
  z: number;
  /** Half extents in local space (u along rot, v across). */
  hu: number;
  hv: number;
  rot: number;
  cos: number;
  sin: number;
  /** Mesa: flat top Y. Ramp: Y at local u = -hu (start) and +hu (end). */
  y0: number;
  y1: number;
  /** Lowest ground under the footprint (for visual skirts). */
  baseY: number;
}

export type { PropKind };

/** Ground surface under a lattice cell (Terrain.surface). */
export const Surface = { Ground: 0, Ice: 1, Snow: 2 } as const;

/** A frozen pond (flat ice) or a snowdrift (soft mound). */
export interface Patch {
  x: number;
  z: number;
  r: number;
  /** Pond: ice level. Drift: mound height. */
  y: number;
}

export interface Prop {
  kind: PropKind;
  x: number;
  y: number;
  z: number;
  rot: number;
  scale: number;
  /** Collision radius (0 = walk-through). */
  radius: number;
}

export interface Spot {
  x: number;
  z: number;
}

const GRID_CELL = 16;

/** A structure (plateau / ramp) edge taller than this is a wall (≈ the player's step height). */
export const WALL_STEP = 0.7;
/** A ramp meeting its plateau rises at most ~1.1 per unit. */
export const JOIN_STEP = 1.25;
/** Natural slopes are only unwalkable above this rise per unit (steepest hills reach ~2.5). */
export const MAX_NATURAL_STEP = 2.6;
/** Lattice neighbour offsets: +x, -x, +z, -z, then the four diagonals. */
export const DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];
/** (dj+1)*3 + (di+1) → DIRS index. */
const DIR_INDEX = Int8Array.from([7, 3, 5, 1, -1, 0, 6, 2, 4]);

export class Terrain {
  readonly seed: number;
  readonly half = MAP_HALF;
  readonly noise: ValueNoise2D;
  readonly structures: Structure[] = [];
  readonly props: Prop[] = [];
  readonly shrineSpots: Spot[] = [];
  readonly ponds: Patch[] = [];
  readonly drifts: Patch[] = [];
  readonly spec: TerrainSpec;

  // structure lookup grid
  private sCells: number;
  private sCellStart: Int32Array;
  private sCellItems: Int32Array;

  // collider lookup grid (props with radius > 0)
  private cCells: number;
  private cCellStart: Int32Array;
  private cCellItems: Int32Array;
  readonly colX: Float32Array;
  readonly colZ: Float32Array;
  readonly colR: Float32Array;
  /** Per collider-grid cell: 1 if this or a neighbouring cell holds a collider. */
  readonly colNear: Uint8Array;
  readonly colCells: number;

  /** Precomputed height samples (1 unit spacing) for cheap, inlinable lookups. */
  readonly hcache: Float32Array;
  readonly hdim: number;
  /**
   * Walkability between neighbouring lattice points (bit d set = may step toward DIRS[d]).
   * Plateau / ramp walls block both ways; natural slopes only when absurdly steep.
   */
  readonly pass: Uint8Array;
  /** Surface kind per lattice cell (Surface.*), or null on maps without ice / snow. */
  readonly surface: Uint8Array | null;

  constructor(seed: number, spec: TerrainSpec = mapDef('meadow').terrain) {
    this.seed = seed;
    this.spec = spec;
    this.noise = new ValueNoise2D(seed ^ 0x5bd1e995);
    const rng = new Rng(seed ^ 0x1234567);
    this.generateStructures(rng);
    this.generatePatches(rng);
    this.sCells = Math.ceil((this.half * 2) / GRID_CELL);
    [this.sCellStart, this.sCellItems] = this.buildStructureGrid();
    this.generateProps(rng);
    this.generateShrineSpots(rng);

    const cols = this.props.filter((p) => p.radius > 0);
    this.colX = new Float32Array(cols.map((p) => p.x));
    this.colZ = new Float32Array(cols.map((p) => p.z));
    this.colR = new Float32Array(cols.map((p) => p.radius));
    this.cCells = Math.ceil((this.half * 2) / GRID_CELL);
    this.colCells = this.cCells;
    [this.cCellStart, this.cCellItems] = this.buildColliderGrid();
    this.colNear = new Uint8Array(this.cCells * this.cCells);
    for (let cz = 0; cz < this.cCells; cz++) {
      for (let cx = 0; cx < this.cCells; cx++) {
        let any = 0;
        for (let oz = -1; oz <= 1 && !any; oz++) {
          for (let ox = -1; ox <= 1 && !any; ox++) {
            const xx = cx + ox;
            const zz = cz + oz;
            if (xx < 0 || zz < 0 || xx >= this.cCells || zz >= this.cCells) continue;
            const c = zz * this.cCells + xx;
            if (this.cCellStart[c + 1] > this.cCellStart[c]) any = 1;
          }
        }
        this.colNear[cz * this.cCells + cx] = any;
      }
    }

    this.hdim = this.half * 2 + 1;
    this.hcache = new Float32Array(this.hdim * this.hdim);
    for (let j = 0; j < this.hdim; j++) {
      for (let i = 0; i < this.hdim; i++) this.hcache[j * this.hdim + i] = this.height(i - this.half, j - this.half);
    }
    this.pass = this.buildPassability();
    this.surface = this.ponds.length || this.drifts.length ? this.buildSurface() : null;
  }

  private buildSurface(): Uint8Array {
    const d = this.hdim;
    const out = new Uint8Array(d * d);
    const mark = (list: Patch[], k: number, inner: number, kind: number): void => {
      for (const p of list) {
        const r = p.r * inner;
        for (let z = Math.floor(p.z - r); z <= p.z + r; z++) {
          for (let x = Math.floor(p.x - r); x <= p.x + r; x++) {
            if ((x - p.x) ** 2 + (z - p.z) ** 2 > r * r) continue;
            const c = this.cellOf(x, z);
            if (out[c] === 0 || k > 0) out[c] = kind;
          }
        }
      }
    };
    mark(this.drifts, 0, 0.9, Surface.Snow);
    mark(this.ponds, 1, 0.8, Surface.Ice);
    return out;
  }

  /** Surface kind under a world position (Surface.Ground on maps without patches). */
  surfaceAt(x: number, z: number): number {
    return this.surface ? this.surface[this.cellOf(x, z)] : Surface.Ground;
  }

  /** Which structure (index + 1) covers a lattice point, 0 for open ground. */
  private structureAt(x: number, z: number): number {
    const cx = Math.floor((x + this.half) / GRID_CELL);
    const cz = Math.floor((z + this.half) / GRID_CELL);
    if (cx < 0 || cz < 0 || cx >= this.sCells || cz >= this.sCells) return 0;
    const cell = cz * this.sCells + cx;
    // lowest index first, like a scan over every structure would find
    let found = 0;
    for (let n = this.sCellStart[cell]; n < this.sCellStart[cell + 1]; n++) {
      const k = this.sCellItems[n];
      if (found && k + 1 >= found) continue;
      const s = this.structures[k];
      const dx = x - s.x;
      const dz = z - s.z;
      const u = dx * s.cos + dz * s.sin;
      const v = -dx * s.sin + dz * s.cos;
      if (u >= -s.hu && u <= s.hu && v >= -s.hv && v <= s.hv) found = k + 1;
    }
    return found;
  }

  private buildPassability(): Uint8Array {
    const d = this.hdim;
    const h = this.hcache;
    const owner = new Uint16Array(d * d);
    for (let j = 0; j < d; j++) for (let i = 0; i < d; i++) owner[j * d + i] = this.structureAt(i - this.half, j - this.half);
    const pass = new Uint8Array(d * d);
    const dx = Int8Array.from(DIRS.map((v) => v[0]));
    const dz = Int8Array.from(DIRS.map((v) => v[1]));
    // orthogonal steps first; diagonals need both orthogonal legs (no corner cutting)
    for (let j = 0; j < d; j++) {
      for (let i = 0; i < d; i++) {
        const c = j * d + i;
        let m = 0;
        for (let k = 0; k < 4; k++) {
          const ni = i + dx[k];
          const nj = j + dz[k];
          if (ni < 0 || nj < 0 || ni >= d || nj >= d) continue;
          if (stepOk(h, owner, c, nj * d + ni)) m |= 1 << k;
        }
        pass[c] = m;
      }
    }
    for (let j = 0; j < d; j++) {
      for (let i = 0; i < d; i++) {
        const c = j * d + i;
        const pc = pass[c];
        let m = pc;
        for (let k = 4; k < 8; k++) {
          const sx = dx[k];
          const sz = dz[k];
          const ni = i + sx;
          const nj = j + sz;
          if (ni < 0 || nj < 0 || ni >= d || nj >= d) continue;
          const xBit = sx > 0 ? 1 : 2; // +x / -x leg
          const zBit = sz > 0 ? 4 : 8; // +z / -z leg
          if ((pc & xBit) && (pc & zBit) && (pass[j * d + ni] & zBit) && (pass[nj * d + i] & xBit) && stepOk(h, owner, c, nj * d + ni)) m |= 1 << k;
        }
        pass[c] = m;
      }
    }
    return pass;
  }

  /** Lattice cell (nearest 1-unit sample point) for a world position, clamped to the map. */
  cellOf(x: number, z: number): number {
    const d = this.hdim;
    let i = Math.round(x + this.half);
    let j = Math.round(z + this.half);
    if (i < 0) i = 0;
    else if (i >= d) i = d - 1;
    if (j < 0) j = 0;
    else if (j >= d) j = d - 1;
    return j * d + i;
  }

  /** True if one lattice step from cell a to the neighbouring cell b is walkable. */
  canStep(a: number, b: number): boolean {
    if (a === b) return true;
    const d = this.hdim;
    const di = (b % d) - (a % d);
    const dj = ((b / d) | 0) - ((a / d) | 0);
    if (di < -1 || di > 1 || dj < -1 || dj > 1) return false;
    return (this.pass[a] & (1 << DIR_INDEX[(dj + 1) * 3 + (di + 1)])) !== 0;
  }

  /**
   * Ground height that respects walls: bilinear over the surrounding samples that share the
   * level of the nearest sample, so a creature hugging a plateau wall stays on its own level.
   */
  heightOnLevel(x: number, z: number): number {
    const d = this.hdim;
    let fx = x + this.half;
    let fz = z + this.half;
    if (fx < 0) fx = 0;
    else if (fx > d - 1.001) fx = d - 1.001;
    if (fz < 0) fz = 0;
    else if (fz > d - 1.001) fz = d - 1.001;
    const ix = fx | 0;
    const iz = fz | 0;
    const tx = fx - ix;
    const tz = fz - iz;
    const c = this.hcache;
    const o = iz * d + ix;
    const h00 = c[o];
    const h10 = c[o + 1];
    const h01 = c[o + d];
    const h11 = c[o + d + 1];
    // reference: the nearest sample
    const ref = tx < 0.5 ? (tz < 0.5 ? h00 : h01) : tz < 0.5 ? h10 : h11;
    const w00 = (1 - tx) * (1 - tz) * (Math.abs(h00 - ref) <= WALL_STEP ? 1 : 0);
    const w10 = tx * (1 - tz) * (Math.abs(h10 - ref) <= WALL_STEP ? 1 : 0);
    const w01 = (1 - tx) * tz * (Math.abs(h01 - ref) <= WALL_STEP ? 1 : 0);
    const w11 = tx * tz * (Math.abs(h11 - ref) <= WALL_STEP ? 1 : 0);
    const wsum = w00 + w10 + w01 + w11;
    if (wsum < 1e-6) return ref;
    return (h00 * w00 + h10 * w10 + h01 * w01 + h11 * w11) / wsum;
  }

  /**
   * Fast approximate ground height (bilinear over the 1-unit cache). Small enough for
   * V8 to inline, so hot loops (enemies, projectiles, pickups) avoid boxing doubles.
   * The player uses the exact height().
   */
  heightAt(x: number, z: number): number {
    const d = this.hdim;
    let fx = x + this.half;
    let fz = z + this.half;
    if (fx < 0) fx = 0;
    else if (fx > d - 1.001) fx = d - 1.001;
    if (fz < 0) fz = 0;
    else if (fz > d - 1.001) fz = d - 1.001;
    const ix = fx | 0;
    const iz = fz | 0;
    const tx = fx - ix;
    const tz = fz - iz;
    const o = iz * d + ix;
    const c = this.hcache;
    const a = c[o] + (c[o + 1] - c[o]) * tx;
    const b = c[o + d] + (c[o + d + 1] - c[o + d]) * tx;
    return a + (b - a) * tz;
  }

  /** Collider-grid cell index of a coordinate (integer math; callers inline it). */
  colliderCellNear(x: number, z: number): boolean {
    const cx = ((x + this.half) / GRID_CELL) | 0;
    const cz = ((z + this.half) / GRID_CELL) | 0;
    if (cx < 0 || cz < 0 || cx >= this.colCells || cz >= this.colCells) return false;
    return this.colNear[cz * this.colCells + cx] === 1;
  }

  /** Rolling hills (+ ponds and drifts), no structures. */
  baseHeight(x: number, z: number): number {
    let h = this.hills(x, z);
    for (let k = 0; k < this.ponds.length; k++) {
      const p = this.ponds[k];
      const dx = x - p.x;
      const dz = z - p.z;
      const d2 = dx * dx + dz * dz;
      if (d2 >= p.r * p.r) continue;
      // flat ice inside 75% of the radius, a gentle bank outside
      h += (p.y - h) * smoothstep(p.r, p.r * 0.75, Math.sqrt(d2));
    }
    for (let k = 0; k < this.drifts.length; k++) {
      const p = this.drifts[k];
      const dx = x - p.x;
      const dz = z - p.z;
      const q = 1 - (dx * dx + dz * dz) / (p.r * p.r);
      if (q > 0) h += p.y * q * q;
    }
    return h;
  }

  private hills(x: number, z: number): number {
    const n = this.noise;
    let h = n.fbm(x * 0.011, z * 0.011, 3) * 9 + n.sample(x * 0.045 + 31, z * 0.045 - 7) * 1.6;
    // keep the starting meadow gentle
    const d = Math.sqrt(x * x + z * z);
    h *= 0.25 + 0.75 * smoothstep(8, 45, d);
    // bowl edge so the map feels enclosed
    const edge = Math.max(Math.abs(x), Math.abs(z));
    const e = edge - (this.half - 22);
    if (e > 0) h += e * e * 0.05;
    return h;
  }

  /** True inside a frozen pond's footprint (props and shrines keep off the ice). */
  inPond(x: number, z: number, pad = 0): boolean {
    for (const p of this.ponds) if ((x - p.x) ** 2 + (z - p.z) ** 2 < (p.r + pad) ** 2) return true;
    return false;
  }

  /** Full walkable ground height at (x, z). */
  height(x: number, z: number): number {
    let h = this.baseHeight(x, z);
    const cx = Math.floor((x + this.half) / GRID_CELL);
    const cz = Math.floor((z + this.half) / GRID_CELL);
    if (cx < 0 || cz < 0 || cx >= this.sCells || cz >= this.sCells) return h;
    const cell = cz * this.sCells + cx;
    const start = this.sCellStart[cell];
    const end = this.sCellStart[cell + 1];
    for (let k = start; k < end; k++) {
      const s = this.structures[this.sCellItems[k]];
      const dx = x - s.x;
      const dz = z - s.z;
      const u = dx * s.cos + dz * s.sin;
      const v = -dx * s.sin + dz * s.cos;
      if (u < -s.hu || u > s.hu || v < -s.hv || v > s.hv) continue;
      let sh: number;
      if (s.kind === 'mesa') sh = s.y0;
      else sh = s.y0 + ((u + s.hu) / (2 * s.hu)) * (s.y1 - s.y0);
      if (sh > h) h = sh;
    }
    return h;
  }

  /** Central-difference gradient of the ground. Writes into out[0], out[1]. */
  gradient(x: number, z: number, out: Float32Array | number[]): void {
    const e = 0.35;
    out[0] = (this.height(x + e, z) - this.height(x - e, z)) / (2 * e);
    out[1] = (this.height(x, z + e) - this.height(x, z - e)) / (2 * e);
  }

  /**
   * Pushes a circle at (x, z) out of static colliders. Returns adjusted position through
   * `out`. Returns true if a collision happened.
   */
  resolveColliders(x: number, z: number, r: number, out: Float32Array): boolean {
    out[0] = x;
    out[1] = z;
    const cx = Math.floor((x + this.half) / GRID_CELL);
    const cz = Math.floor((z + this.half) / GRID_CELL);
    let hit = false;
    for (let oz = -1; oz <= 1; oz++) {
      const zz = cz + oz;
      if (zz < 0 || zz >= this.cCells) continue;
      for (let ox = -1; ox <= 1; ox++) {
        const xx = cx + ox;
        if (xx < 0 || xx >= this.cCells) continue;
        const cell = zz * this.cCells + xx;
        for (let k = this.cCellStart[cell]; k < this.cCellStart[cell + 1]; k++) {
          const i = this.cCellItems[k];
          const dx = out[0] - this.colX[i];
          const dz = out[1] - this.colZ[i];
          const rr = r + this.colR[i];
          const d2 = dx * dx + dz * dz;
          if (d2 < rr * rr && d2 > 1e-6) {
            const d = Math.sqrt(d2);
            const push = (rr - d) / d;
            out[0] += dx * push;
            out[1] += dz * push;
            hit = true;
          }
        }
      }
    }
    return hit;
  }

  clampToMap(v: number): number {
    return clamp(v, -this.half + 2, this.half - 2);
  }

  // ───────────────────────── generation ─────────────────────────

  private overlapsStructure(x: number, z: number, pad: number): boolean {
    for (const s of this.structures) {
      const dx = x - s.x;
      const dz = z - s.z;
      const u = dx * s.cos + dz * s.sin;
      const v = -dx * s.sin + dz * s.cos;
      if (Math.abs(u) < s.hu + pad && Math.abs(v) < s.hv + pad) return true;
    }
    return false;
  }

  private addStructure(kind: StructureKind, x: number, z: number, hu: number, hv: number, rot: number, y0: number, y1: number): Structure {
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    let baseY = Infinity;
    for (let a = -1; a <= 1; a += 0.5) {
      for (let b = -1; b <= 1; b += 0.5) {
        const px = x + a * hu * cos - b * hv * sin;
        const pz = z + a * hu * sin + b * hv * cos;
        baseY = Math.min(baseY, this.baseHeight(px, pz));
      }
    }
    const s: Structure = { kind, x, z, hu, hv, rot, cos, sin, y0, y1, baseY: baseY - 1.5 };
    this.structures.push(s);
    return s;
  }

  private generateStructures(rng: Rng): void {
    // Mesas with one or two access ramps
    let attempts = 0;
    let mesas = 0;
    while (mesas < this.spec.mesas && attempts++ < 400) {
      const x = rng.range(-this.half + 30, this.half - 30);
      const z = rng.range(-this.half + 30, this.half - 30);
      if (Math.hypot(x, z) < 28) continue;
      const hu = rng.range(6, 12);
      const hv = rng.range(5, 10);
      if (this.overlapsStructure(x, z, 18)) continue;
      const rot = rng.range(0, Math.PI);
      const top = this.baseHeight(x, z) + rng.range(3.5, 7);
      const mesa = this.addStructure('mesa', x, z, hu, hv, rot, top, top);
      mesas++;
      // ramp(s) attached to the short ends (u axis) or long sides (v axis)
      const rampCount = rng.chance(0.5) ? 2 : 1;
      for (let r = 0; r < rampCount; r++) {
        const side = r === 0 ? 1 : -1;
        const alongU = rng.chance(0.5);
        const len = rng.range(9, 13);
        const width = rng.range(2.6, 3.6);
        // Ramp local +u must point toward the mesa (u = -hu is the low far end).
        let rx: number, rz: number, rotIn: number;
        if (alongU) {
          const off = mesa.hu + len / 2 - 0.4;
          rx = mesa.x + mesa.cos * off * side;
          rz = mesa.z + mesa.sin * off * side;
          rotIn = mesa.rot + (side > 0 ? Math.PI : 0);
        } else {
          const off = mesa.hv + len / 2 - 0.4;
          rx = mesa.x - mesa.sin * off * side;
          rz = mesa.z + mesa.cos * off * side;
          rotIn = mesa.rot + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
        }
        const farX = rx - Math.cos(rotIn) * (len / 2);
        const farZ = rz - Math.sin(rotIn) * (len / 2);
        const startY = this.baseHeight(farX, farZ) - 0.2;
        this.addStructure('ramp', rx, rz, len / 2, width / 2, rotIn, startY, top + 0.02);
      }
    }
    // Standalone kicker ramps (launch pads)
    attempts = 0;
    let kickers = 0;
    while (kickers < this.spec.kickers && attempts++ < 400) {
      const x = rng.range(-this.half + 25, this.half - 25);
      const z = rng.range(-this.half + 25, this.half - 25);
      if (Math.hypot(x, z) < 14) continue;
      if (this.overlapsStructure(x, z, 10)) continue;
      const rot = rng.range(0, Math.PI * 2);
      const len = rng.range(6, 9);
      const rise = rng.range(1.8, 3.2);
      const startX = x - Math.cos(rot) * len * 0.5;
      const startZ = z - Math.sin(rot) * len * 0.5;
      const y0 = this.baseHeight(startX, startZ) - 0.15;
      this.addStructure('ramp', x, z, len / 2, rng.range(1.8, 2.8), rot, y0, y0 + rise);
      kickers++;
    }
  }

  /** Frozen ponds on gentle open ground, then snowdrifts (none on maps without them). */
  private generatePatches(rng: Rng): void {
    let tries = 0;
    while (this.ponds.length < this.spec.ponds && tries++ < 600) {
      const x = rng.range(-this.half + 30, this.half - 30);
      const z = rng.range(-this.half + 30, this.half - 30);
      const r = rng.range(6, 11);
      if (Math.hypot(x, z) < r + 14) continue;
      if (this.overlapsStructure(x, z, r + 4)) continue;
      if (this.ponds.some((p) => Math.hypot(p.x - x, p.z - z) < p.r + r + 8)) continue;
      // gentle ground only: the bank must stay walkable
      let lo = Infinity;
      let hi = -Infinity;
      for (let k = 0; k < 9; k++) {
        const a = (k / 8) * Math.PI * 2;
        const rr = k === 8 ? 0 : r;
        const hh = this.hills(x + Math.cos(a) * rr, z + Math.sin(a) * rr);
        lo = Math.min(lo, hh);
        hi = Math.max(hi, hh);
      }
      if (hi - lo > 2.2) continue;
      this.ponds.push({ x, z, r, y: lo - 0.15 });
    }
    tries = 0;
    while (this.drifts.length < this.spec.drifts && tries++ < 600) {
      const x = rng.range(-this.half + 20, this.half - 20);
      const z = rng.range(-this.half + 20, this.half - 20);
      const r = rng.range(5, 9);
      if (Math.hypot(x, z) < r + 10) continue;
      if (this.overlapsStructure(x, z, r + 2)) continue;
      if (this.inPond(x, z, r + 3)) continue;
      if (this.drifts.some((p) => Math.hypot(p.x - x, p.z - z) < p.r + r + 4)) continue;
      this.drifts.push({ x, z, r, y: rng.range(0.5, 0.9) });
    }
  }

  private buildStructureGrid(): [Int32Array, Int32Array] {
    const n = this.sCells;
    const lists: number[][] = Array.from({ length: n * n }, () => []);
    this.structures.forEach((s, idx) => {
      const r = Math.hypot(s.hu, s.hv) + 0.5;
      const x0 = Math.max(0, Math.floor((s.x - r + this.half) / GRID_CELL));
      const x1 = Math.min(n - 1, Math.floor((s.x + r + this.half) / GRID_CELL));
      const z0 = Math.max(0, Math.floor((s.z - r + this.half) / GRID_CELL));
      const z1 = Math.min(n - 1, Math.floor((s.z + r + this.half) / GRID_CELL));
      for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) lists[cz * n + cx].push(idx);
    });
    return flatten(lists);
  }

  private buildColliderGrid(): [Int32Array, Int32Array] {
    const n = this.cCells;
    const lists: number[][] = Array.from({ length: n * n }, () => []);
    for (let i = 0; i < this.colX.length; i++) {
      const cx = clamp(Math.floor((this.colX[i] + this.half) / GRID_CELL), 0, n - 1);
      const cz = clamp(Math.floor((this.colZ[i] + this.half) / GRID_CELL), 0, n - 1);
      lists[cz * n + cx].push(i);
    }
    return flatten(lists);
  }

  private generateProps(rng: Rng): void {
    const place = (kind: PropKind, count: number, minS: number, maxS: number, radiusK: number, avoidCenter: number, pad: number): void => {
      let placed = 0;
      let tries = 0;
      while (placed < count && tries++ < count * 20) {
        const x = rng.range(-this.half + 4, this.half - 4);
        const z = rng.range(-this.half + 4, this.half - 4);
        if (Math.hypot(x, z) < avoidCenter) continue;
        if (pad >= 0 && this.overlapsStructure(x, z, pad)) continue;
        if (this.ponds.length && this.inPond(x, z, radiusK > 0 ? 1.5 : 0)) continue;
        // keep big blockers apart
        if (radiusK > 0) {
          let close = false;
          for (let k = this.props.length - 1; k >= 0 && k > this.props.length - 400; k--) {
            const p = this.props[k];
            if (p.radius > 0 && Math.abs(p.x - x) < 5 && Math.abs(p.z - z) < 5) {
              close = true;
              break;
            }
          }
          if (close) continue;
        }
        const scale = rng.range(minS, maxS);
        this.props.push({ kind, x, z, y: this.height(x, z), rot: rng.range(0, Math.PI * 2), scale, radius: radiusK * scale });
        placed++;
      }
    };
    for (const sp of this.spec.props) place(sp.kind, sp.count, sp.scale[0], sp.scale[1], sp.radius, sp.avoidCenter, sp.pad);
    // fence posts ring near the boundary
    const fence = this.spec.fence;
    const ring = this.half - 10;
    for (let a = 0; a < 360 && fence; a++) {
      const t = (a / 360) * Math.PI * 2;
      // square ring
      const s = Math.max(Math.abs(Math.cos(t)), Math.abs(Math.sin(t)));
      const x = (Math.cos(t) / s) * ring;
      const z = (Math.sin(t) / s) * ring;
      if (a % 2 === 0) this.props.push({ kind: fence, x, z, y: this.height(x, z), rot: t, scale: 1, radius: 0 });
    }
  }

  private generateShrineSpots(rng: Rng): void {
    // a few on mesa tops (reward platforming), the rest on open ground
    const mesas = this.structures.filter((s) => s.kind === 'mesa');
    for (let i = 0; i < Math.min(4, mesas.length); i++) this.shrineSpots.push({ x: mesas[i].x, z: mesas[i].z });
    let tries = 0;
    while (this.shrineSpots.length < 24 && tries++ < 2000) {
      const x = rng.range(-this.half + 20, this.half - 20);
      const z = rng.range(-this.half + 20, this.half - 20);
      if (Math.hypot(x, z) < 20) continue;
      if (this.overlapsStructure(x, z, 3)) continue;
      if (this.ponds.length && this.inPond(x, z, 2)) continue;
      if (this.shrineSpots.some((s) => Math.hypot(s.x - x, s.z - z) < 30)) continue;
      this.shrineSpots.push({ x, z });
    }
  }
}

/**
 * One lattice step between neighbouring cells a and b. Ground ↔ structure edges above step
 * height are walls; structure ↔ structure (a ramp meeting its plateau) only needs the ramp's
 * own steepness; natural slopes only stop you when absurdly steep.
 */
function stepOk(h: Float32Array, owner: Uint16Array, a: number, b: number): boolean {
  const dh = Math.abs(h[a] - h[b]);
  if (owner[a] !== owner[b]) {
    const join = owner[a] !== 0 && owner[b] !== 0;
    if (dh > (join ? JOIN_STEP : WALL_STEP)) return false;
  }
  return dh <= MAX_NATURAL_STEP;
}

function flatten(lists: number[][]): [Int32Array, Int32Array] {
  const start = new Int32Array(lists.length + 1);
  let total = 0;
  for (let i = 0; i < lists.length; i++) {
    start[i] = total;
    total += lists[i].length;
  }
  start[lists.length] = total;
  const items = new Int32Array(total);
  let k = 0;
  for (const l of lists) for (const v of l) items[k++] = v;
  return [start, items];
}
