import { MAP_HALF } from '../config/balance';
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

export type PropKind = 'pine' | 'oak' | 'rock' | 'mushroom' | 'crystal' | 'stump' | 'flower' | 'tuft' | 'post';

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

export class Terrain {
  readonly seed: number;
  readonly half = MAP_HALF;
  readonly noise: ValueNoise2D;
  readonly structures: Structure[] = [];
  readonly props: Prop[] = [];
  readonly shrineSpots: Spot[] = [];

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

  constructor(seed: number) {
    this.seed = seed;
    this.noise = new ValueNoise2D(seed ^ 0x5bd1e995);
    const rng = new Rng(seed ^ 0x1234567);
    this.generateStructures(rng);
    this.sCells = Math.ceil((this.half * 2) / GRID_CELL);
    [this.sCellStart, this.sCellItems] = this.buildStructureGrid();
    this.generateProps(rng);
    this.generateShrineSpots(rng);

    const cols = this.props.filter((p) => p.radius > 0);
    this.colX = new Float32Array(cols.map((p) => p.x));
    this.colZ = new Float32Array(cols.map((p) => p.z));
    this.colR = new Float32Array(cols.map((p) => p.radius));
    this.cCells = Math.ceil((this.half * 2) / GRID_CELL);
    [this.cCellStart, this.cCellItems] = this.buildColliderGrid();
  }

  /** Rolling hills only (no structures). */
  baseHeight(x: number, z: number): number {
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
    while (mesas < 11 && attempts++ < 400) {
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
    while (kickers < 16 && attempts++ < 400) {
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
    place('pine', 120, 0.8, 1.5, 0.55, 18, 2);
    place('oak', 70, 0.8, 1.3, 0.6, 18, 2);
    place('rock', 90, 0.6, 1.8, 0.9, 14, 1);
    place('stump', 30, 0.8, 1.2, 0.45, 12, 1);
    place('crystal', 26, 0.7, 1.4, 0, 20, 1);
    place('mushroom', 90, 0.5, 1.3, 0, 6, 0.5);
    place('flower', 420, 0.6, 1.2, 0, 2, -1);
    place('tuft', 900, 0.6, 1.4, 0, 1, -1);
    // fence posts ring near the boundary
    const ring = this.half - 10;
    for (let a = 0; a < 360; a++) {
      const t = (a / 360) * Math.PI * 2;
      // square ring
      const s = Math.max(Math.abs(Math.cos(t)), Math.abs(Math.sin(t)));
      const x = (Math.cos(t) / s) * ring;
      const z = (Math.sin(t) / s) * ring;
      if (a % 2 === 0) this.props.push({ kind: 'post', x, z, y: this.height(x, z), rot: t, scale: 1, radius: 0 });
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
      if (this.shrineSpots.some((s) => Math.hypot(s.x - x, s.z - z) < 30)) continue;
      this.shrineSpots.push({ x, z });
    }
  }
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
