import { isSolidTile, TILE, T_EMPTY, T_GOO, T_GROUND, T_ICE, T_PLATFORM, T_ROCK, type LevelModel } from './level';

/**
 * Turns a level grid into 3D geometry (pure: typed arrays only, no Three.js), for the 2.5D view.
 *
 * World units: 1 tile = 1 unit. x = column, y = up with the level's bottom row resting on y = 0
 * (tile (tx, ty) spans y in [h - ty - 1, h - ty]), z = toward the camera. Gameplay stays on z = 0;
 * the ground is a slab from `zBack` to `zFront` around it.
 *
 * Layers (one material each in the renderer):
 *  - ground:   continuous earth with depth shading (darker further below the surface)
 *  - lip:      the surface cap on exposed ground tops (regolith, grass, snow...), slightly overhanging
 *  - rock:     bevelled blocks (metal panels, stone, crystal)
 *  - ice:      bevelled glossy ice blocks
 *  - platform: thin floating one-way slabs
 *  - goo:      bouncy jelly (not solid); shade = 1 marks surface vertices that wobble
 *  - trim:     glowing strips (platform edges)
 */

export type TileLayer = 'ground' | 'lip' | 'rock' | 'ice' | 'platform' | 'goo' | 'trim';
export const TILE_LAYERS: TileLayer[] = ['ground', 'lip', 'rock', 'ice', 'platform', 'goo', 'trim'];

export interface MeshData {
  pos: Float32Array;
  nrm: Float32Array;
  uv: Float32Array;
  /** Per-vertex brightness (or a layer-specific flag, see goo). */
  shade: Float32Array;
  idx: Uint32Array;
}

export interface TileMeshOpts {
  zFront: number;
  zBack: number;
  /** Extra columns drawn past each side of the level (a copy of the edge column). */
  margin: number;
  /** Extra solid rows drawn below the level. */
  below: number;
  /** Thickness of the surface cap and how far it overhangs. */
  lip: number;
  overhang: number;
  bevel: number;
}

export const TILE_MESH_DEFAULTS: TileMeshOpts = { zFront: 0.9, zBack: -1.7, margin: 8, below: 4, lip: 0.24, overhang: 0.07, bevel: 0.09 };

type V3 = [number, number, number];

class Builder {
  private readonly p: number[] = [];
  private readonly n: number[] = [];
  private readonly u: number[] = [];
  private readonly s: number[] = [];
  private readonly i: number[] = [];

  get vertexCount(): number {
    return this.p.length / 3;
  }

  private vert(v: V3, nx: number, ny: number, nz: number, shade: number): void {
    this.p.push(v[0], v[1], v[2]);
    this.n.push(nx, ny, nz);
    // World-space projection along the dominant axis: textures line up across tiles.
    const ax = Math.abs(nx);
    const ay = Math.abs(ny);
    const az = Math.abs(nz);
    if (az >= ax && az >= ay) this.u.push(v[0], v[1]);
    else if (ay >= ax) this.u.push(v[0], v[2]);
    else this.u.push(v[2], v[1]);
    this.s.push(shade);
  }

  /** A quad facing `normal` (winding fixed automatically so it is front-facing). */
  quad(a: V3, b: V3, c: V3, d: V3, normal: V3, shade: number | [number, number, number, number]): void {
    const [nx, ny, nz] = normalize(normal);
    const cx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
    const cy = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
    const cz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const flip = cx * nx + cy * ny + cz * nz < 0;
    const sh = typeof shade === 'number' ? [shade, shade, shade, shade] : shade;
    const base = this.vertexCount;
    const order = flip ? [0, 3, 2, 1] : [0, 1, 2, 3];
    const vs = [a, b, c, d];
    for (const k of order) this.vert(vs[k], nx, ny, nz, sh[k]);
    this.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  finish(): MeshData {
    return {
      pos: new Float32Array(this.p),
      nrm: new Float32Array(this.n),
      uv: new Float32Array(this.u),
      shade: new Float32Array(this.s),
      idx: new Uint32Array(this.i),
    };
  }
}

function normalize(v: V3): V3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

/** Which faces of a bevelled box to emit besides its front. */
interface Faces {
  top: boolean;
  bottom: boolean;
  left: boolean;
  right: boolean;
}

/**
 * A box from z0 (back) to z1 (front) whose front edges are chamfered by `b`: an inset front face
 * framed by four sloped strips. Side faces start where the chamfer ends, so everything closes.
 */
function bevelBox(B: Builder, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, b: number, f: Faces, shade: [number, number] = [1, 1]): void {
  const [sTop, sBot] = shade;
  const zf = z1 - b;
  B.quad([x0 + b, y0 + b, z1], [x1 - b, y0 + b, z1], [x1 - b, y1 - b, z1], [x0 + b, y1 - b, z1], [0, 0, 1], [sBot, sBot, sTop, sTop]);
  B.quad([x0 + b, y1 - b, z1], [x1 - b, y1 - b, z1], [x1, y1, zf], [x0, y1, zf], [0, 1, 1], sTop);
  B.quad([x0 + b, y0 + b, z1], [x1 - b, y0 + b, z1], [x1, y0, zf], [x0, y0, zf], [0, -1, 1], sBot);
  B.quad([x0 + b, y0 + b, z1], [x0 + b, y1 - b, z1], [x0, y1, zf], [x0, y0, zf], [-1, 0, 1], [sBot, sTop, sTop, sBot]);
  B.quad([x1 - b, y0 + b, z1], [x1 - b, y1 - b, z1], [x1, y1, zf], [x1, y0, zf], [1, 0, 1], [sBot, sTop, sTop, sBot]);
  if (f.top) B.quad([x0, y1, z0], [x1, y1, z0], [x1, y1, zf], [x0, y1, zf], [0, 1, 0], sTop);
  if (f.bottom) B.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, zf], [x0, y0, zf], [0, -1, 0], sBot);
  if (f.left) B.quad([x0, y0, z0], [x0, y1, z0], [x0, y1, zf], [x0, y0, zf], [-1, 0, 0], [sBot, sTop, sTop, sBot]);
  if (f.right) B.quad([x1, y0, z0], [x1, y1, z0], [x1, y1, zf], [x1, y0, zf], [1, 0, 0], [sBot, sTop, sTop, sBot]);
}

/** World y of the top edge of row `ty`. */
export function rowTop(m: LevelModel, ty: number): number {
  return m.h - ty;
}

/** Convert 2D level pixels to world units. */
export function worldX(px: number): number {
  return px / TILE;
}

export function worldY(m: LevelModel, py: number): number {
  return m.h - py / TILE;
}

/** Tile used for drawing: columns past the edges copy the edge column, rows below the level are solid. */
function visTile(m: LevelModel, tx: number, ty: number): number {
  if (ty < 0) return T_EMPTY;
  if (ty >= m.h) return T_GROUND;
  const x = tx < 0 ? 0 : tx >= m.w ? m.w - 1 : tx;
  return m.tiles[ty * m.w + x];
}

function isBlock(t: number): boolean {
  return t === T_ROCK || t === T_ICE;
}

function depthShade(depth: number): number {
  return 1 - 0.58 * Math.min(1, depth / 3.5);
}

export function buildTileMesh(m: LevelModel, opts: Partial<TileMeshOpts> = {}): Record<TileLayer, MeshData> {
  const o = { ...TILE_MESH_DEFAULTS, ...opts };
  const B: Record<TileLayer, Builder> = {
    ground: new Builder(), lip: new Builder(), rock: new Builder(), ice: new Builder(), platform: new Builder(), goo: new Builder(), trim: new Builder(),
  };
  const solid = (tx: number, ty: number) => isSolidTile(visTile(m, tx, ty));
  const x0 = -o.margin;
  const x1 = m.w + o.margin;
  const rows = m.h + o.below;
  const zF = o.zFront;
  const zB = o.zBack;

  for (let ty = 0; ty < rows; ty++) {
    const yTop = m.h - ty;
    const yBot = yTop - 1;
    for (let tx = x0; tx < x1; tx++) {
      const t = visTile(m, tx, ty);
      if (!isSolidTile(t)) continue;
      const topOpen = !solid(tx, ty - 1);
      if (isBlock(t)) {
        // Bevelled block; per-block brightness wobble makes walls read as built from blocks.
        const v = 0.92 + 0.08 * hash01(tx, ty);
        bevelBox(B[t === T_ROCK ? 'rock' : 'ice'], tx, tx + 1, yBot, yTop, zB, zF, o.bevel, {
          top: topOpen,
          bottom: !solid(tx, ty + 1),
          left: !solid(tx - 1, ty),
          right: !solid(tx + 1, ty),
        }, [v, v * 0.9]);
        continue;
      }
      // Continuous ground (pads and geysers too: their props sit on top).
      let depth = 0;
      while (depth < 4 && solid(tx, ty - depth - 1)) depth++;
      const sTop = depthShade(depth);
      const sBot = depthShade(depth + 1);
      const capped = topOpen;
      const yFace = capped ? yTop - o.lip : yTop;
      const sFace = capped ? depthShade(o.lip) : sTop;
      const G = B.ground;
      G.quad([tx, yBot, zF], [tx + 1, yBot, zF], [tx + 1, yFace, zF], [tx, yFace, zF], [0, 0, 1], [sBot, sBot, sFace, sFace]);
      // Sides/top/bottom where open (or next to a bevelled block, to close its chamfer groove).
      const lt = visTile(m, tx - 1, ty);
      const rt = visTile(m, tx + 1, ty);
      if (!isSolidTile(lt) || isBlock(lt)) G.quad([tx, yBot, zB], [tx, yFace, zB], [tx, yFace, zF], [tx, yBot, zF], [-1, 0, 0], [sBot, sFace, sFace, sBot]);
      if (!isSolidTile(rt) || isBlock(rt)) G.quad([tx + 1, yBot, zB], [tx + 1, yFace, zB], [tx + 1, yFace, zF], [tx + 1, yBot, zF], [1, 0, 0], [sBot, sFace, sFace, sBot]);
      const above = visTile(m, tx, ty - 1);
      if (!capped && isBlock(above)) G.quad([tx, yTop, zB], [tx + 1, yTop, zB], [tx + 1, yTop, zF], [tx, yTop, zF], [0, 1, 0], sTop);
      const below = visTile(m, tx, ty + 1);
      if (!isSolidTile(below) || isBlock(below)) G.quad([tx, yBot, zB], [tx + 1, yBot, zB], [tx + 1, yBot, zF], [tx, yBot, zF], [0, -1, 0], sBot);
    }
    // Runs along this row: surface caps, platforms and goo.
    for (let tx = x0; tx < x1; ) {
      const t = visTile(m, tx, ty);
      const capStart = isSolidTile(t) && !isBlock(t) && !solid(tx, ty - 1);
      const kind = capStart ? 'lip' : t === T_PLATFORM ? 'platform' : t === T_GOO ? 'goo' : null;
      if (!kind) {
        tx++;
        continue;
      }
      let end = tx + 1;
      while (end < x1) {
        const u = visTile(m, end, ty);
        const same = kind === 'lip' ? isSolidTile(u) && !isBlock(u) && !solid(end, ty - 1) : kind === 'platform' ? u === T_PLATFORM : u === T_GOO;
        if (!same) break;
        end++;
      }
      if (kind === 'lip') {
        const openL = !solid(tx - 1, ty) && tx > x0;
        const openR = !solid(end, ty) && end < x1;
        const ov = o.overhang;
        const b = Math.min(o.bevel, o.lip * 0.45);
        bevelBox(B.lip, tx - (openL ? ov : 0), end + (openR ? ov : 0), yTop - o.lip, yTop, zB, zF + ov, b, { top: true, bottom: true, left: true, right: true });
      } else if (kind === 'platform') {
        const py0 = yTop - 0.3;
        bevelBox(B.platform, tx + 0.03, end - 0.03, py0, yTop, -0.95, zF - 0.1, 0.07, { top: true, bottom: true, left: true, right: true });
        B.trim.quad([tx + 0.16, py0 + 0.075, zF - 0.09], [end - 0.16, py0 + 0.075, zF - 0.09], [end - 0.16, py0 + 0.135, zF - 0.09], [tx + 0.16, py0 + 0.135, zF - 0.09], [0, 0, 1], 1);
      } else {
        gooRun(B.goo, m, tx, end, ty, zB + 0.35, zF - 0.18);
      }
      tx = end;
    }
  }
  return {
    ground: B.ground.finish(), lip: B.lip.finish(), rock: B.rock.finish(), ice: B.ice.finish(),
    platform: B.platform.finish(), goo: B.goo.finish(), trim: B.trim.finish(),
  };
}

/** Jelly: front and top subdivided so the surface can wobble (shade 1 = surface vertex). */
function gooRun(G: Builder, m: LevelModel, xa: number, xb: number, ty: number, z0: number, z1: number): void {
  const yBot = m.h - ty - 1;
  const surface = visTile(m, xa, ty - 1) !== T_GOO;
  const yTop = surface ? m.h - ty - 0.14 : m.h - ty;
  const s = surface ? 1 : 0;
  const steps = (xb - xa) * 3;
  for (let k = 0; k < steps; k++) {
    const a = xa + (k / steps) * (xb - xa);
    const c = xa + ((k + 1) / steps) * (xb - xa);
    G.quad([a, yBot, z1], [c, yBot, z1], [c, yTop, z1], [a, yTop, z1], [0, 0, 1], [0, 0, s, s]);
    if (surface) G.quad([a, yTop, z0], [c, yTop, z0], [c, yTop, z1], [a, yTop, z1], [0, 1, 0], 1);
  }
  if (!isSolidTile(visTile(m, xa - 1, ty))) G.quad([xa, yBot, z0], [xa, yTop, z0], [xa, yTop, z1], [xa, yBot, z1], [-1, 0, 0], [0, s, s, 0]);
  if (!isSolidTile(visTile(m, xb, ty))) G.quad([xb, yBot, z0], [xb, yTop, z0], [xb, yTop, z1], [xb, yBot, z1], [1, 0, 0], [0, s, s, 0]);
}

/** Deterministic 0..1 noise per tile. */
export function hash01(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Height of the ground that rises from the bottom of each column (world units), ignoring
 * ceilings and floating bits: the line the background terrain follows.
 */
export function floorProfile(m: LevelModel): Float32Array {
  const out = new Float32Array(m.w);
  for (let x = 0; x < m.w; x++) {
    let ty = m.h - 1;
    while (ty > 0 && isSolidTile(m.tiles[(ty - 1) * m.w + x])) ty--;
    out[x] = m.h - ty;
  }
  return out;
}

/** World y of the first solid surface at or below (x, y) (for blob shadows and props). */
export function groundBelow(m: LevelModel, x: number, y: number): number {
  const tx = Math.floor(x);
  // The first row whose top is at or below y.
  let ty = Math.max(0, Math.ceil(m.h - y - 1e-3));
  while (ty < m.h) {
    const t = visTile(m, tx, ty);
    if (isSolidTile(t) || t === T_PLATFORM) return m.h - ty;
    ty++;
  }
  return 0;
}

export interface BackTerrainOpts {
  margin: number;
  /** Depths of the grid rows (from the slab's back edge to the far end). */
  zs: number[];
  /** How high the hills rise at the far end. */
  amp: number;
  /** Lower the whole thing (a cloud sea far below sky islands). */
  sink: number;
  seed: number;
}

export const BACK_DEFAULTS: BackTerrainOpts = { margin: 30, zs: [-1.7, -2.6, -4, -6, -9, -13, -18, -25, -34], amp: 5, sink: 0, seed: 1 };

/**
 * Rolling ground behind the play slab: it starts a little below the walkable floor, then rises
 * into gentle hills with distance. A heightfield with smooth normals; shade fades with distance.
 */
export function buildBackTerrain(m: LevelModel, opts: Partial<BackTerrainOpts> = {}): MeshData {
  const o = { ...BACK_DEFAULTS, ...opts };
  const floor = floorProfile(m);
  const xs0 = -o.margin;
  const nx = m.w + o.margin * 2 + 1;
  const nz = o.zs.length;
  const smooth = (x: number): number => {
    let sum = 0;
    let wsum = 0;
    for (let k = -4; k <= 4; k++) {
      const cx = Math.min(m.w - 1, Math.max(0, Math.round(x) + k));
      const w = 5 - Math.abs(k);
      sum += floor[cx] * w;
      wsum += w;
    }
    return sum / wsum;
  };
  const ph = [hash01(o.seed, 1) * 6.28, hash01(o.seed, 2) * 6.28, hash01(o.seed, 3) * 6.28];
  const height = (x: number, z: number): number => {
    const d = Math.max(0, -z - 1.7);
    const near = smooth(x) - 0.35 - Math.min(1, d / 2.5) * 0.5;
    const rise = Math.pow(Math.min(1, d / 30), 1.3);
    const hills = (Math.sin(x * 0.11 + ph[0] + z * 0.05) * 0.5 + 0.5) * 0.7 + (Math.sin(x * 0.29 + ph[1] - z * 0.13) * 0.5 + 0.5) * 0.3;
    const bumps = Math.sin(x * 0.83 + ph[2] + z * 0.71) * 0.12 * Math.min(1, d / 4);
    return near + rise * o.amp * (0.35 + hills) + bumps - o.sink;
  };
  const pos = new Float32Array(nx * nz * 3);
  const nrm = new Float32Array(nx * nz * 3);
  const uv = new Float32Array(nx * nz * 2);
  const shade = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) {
    const z = o.zs[j];
    for (let i = 0; i < nx; i++) {
      const x = xs0 + i;
      const y = height(x, z);
      const k = j * nx + i;
      pos[k * 3] = x;
      pos[k * 3 + 1] = y;
      pos[k * 3 + 2] = z;
      const e = 0.5;
      const dx = (height(x + e, z) - height(x - e, z)) / (2 * e);
      const dz = (height(x, z + e) - height(x, z - e)) / (2 * e);
      const l = Math.hypot(dx, 1, dz);
      nrm[k * 3] = -dx / l;
      nrm[k * 3 + 1] = 1 / l;
      nrm[k * 3 + 2] = -dz / l;
      uv[k * 2] = x;
      uv[k * 2 + 1] = z;
      shade[k] = 0.82 - 0.4 * Math.min(1, -z / 30);
    }
  }
  const idx = new Uint32Array((nx - 1) * (nz - 1) * 6);
  let n = 0;
  for (let j = 0; j < nz - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i;
      const b = a + 1;
      const c = a + nx;
      const d = c + 1;
      // Rows go away from the camera (-z), so (a, b, c) faces up.
      idx[n++] = a;
      idx[n++] = b;
      idx[n++] = c;
      idx[n++] = b;
      idx[n++] = d;
      idx[n++] = c;
    }
  }
  return { pos, nrm, uv, shade, idx };
}

export interface Spot {
  x: number;
  y: number;
  z: number;
  /** Scale and rotation. */
  s: number;
  r: number;
}

/**
 * Seeded spots for little surface details (grass tufts, pebbles, crystal shards) on exposed ground
 * tops. They keep clear of the walking line (z near 0) so the player always reads clearly.
 */
export function surfaceSpots(m: LevelModel, seed: number, density = 1.3, o: TileMeshOpts = TILE_MESH_DEFAULTS): Spot[] {
  const out: Spot[] = [];
  for (let tx = 0; tx < m.w; tx++) {
    for (let ty = 0; ty < m.h; ty++) {
      const t = m.tiles[ty * m.w + tx];
      if (!isSolidTile(t) || isBlock(t)) continue;
      if (ty > 0 && isSolidTile(m.tiles[(ty - 1) * m.w + tx])) continue;
      if (ty > 0 && m.tiles[(ty - 1) * m.w + tx] !== T_EMPTY) continue;
      const n = Math.floor(density + hash01(tx * 7 + seed, ty * 13));
      for (let k = 0; k < n; k++) {
        const a = hash01(tx * 31 + k * 7 + seed, ty * 17 + k);
        const b = hash01(tx * 11 + k * 3, ty * 29 + seed + k);
        const front = a < 0.45;
        const z = front ? 0.38 + b * (o.zFront - 0.48) : o.zBack + 0.25 + b * (-0.55 - o.zBack - 0.25);
        out.push({ x: tx + hash01(tx + seed, k * 5 + ty), y: m.h - ty, z, s: 0.7 + hash01(tx * 3 + k, ty + seed) * 0.6, r: a * Math.PI * 2 });
      }
    }
  }
  return out;
}
