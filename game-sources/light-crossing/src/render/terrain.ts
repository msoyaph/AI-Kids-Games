// Chunked, flat-shaded, vertex-colored terrain built from the generated tile grid.
import * as THREE from 'three';
import { hash01 } from '../core/rng';
import { fbm2 } from '../core/noise';
import { mixHex } from '../core/math';
import type { IslandGen } from '../world/worldgen';
import { DIRS4, Ground, LEVEL_HEIGHT } from '../world/types';
import { PAL } from './palette';
import { curved } from './curve';

const CHUNK = 16;
export const WATER_Y = -0.28;
export const OCEAN_FLOOR_Y = -1.5;

type V3 = [number, number, number];

class GeoBuilder {
  pos: number[] = [];
  col: number[] = [];
  private c = new THREE.Color();
  tri(a: V3, b: V3, c: V3, color: number, outward?: V3): void {
    if (outward) {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      if (nx * outward[0] + ny * outward[1] + nz * outward[2] < 0) {
        const t = b;
        b = c;
        c = t;
      }
    }
    this.pos.push(...a, ...b, ...c);
    this.c.setHex(color);
    for (let k = 0; k < 3; k++) this.col.push(this.c.r, this.c.g, this.c.b);
  }
  quad(a: V3, b: V3, c: V3, d: V3, color: number, outward: V3, color2 = color): void {
    this.tri(a, b, c, color, outward);
    this.tri(a, c, d, color2, outward);
  }
  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }
}

export class TerrainRenderer {
  readonly group = new THREE.Group();
  private material = curved(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  private N: number;
  private seaDist: Uint8Array;

  constructor(private gen: IslandGen) {
    this.N = gen.size;
    this.seaDist = this.computeSeaDist();
    for (let cz = 0; cz < this.N; cz += CHUNK)
      for (let cx = 0; cx < this.N; cx += CHUNK) {
        const mesh = new THREE.Mesh(this.buildChunk(cx, cz), this.material);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        this.group.add(mesh);
      }
    // Deep sea floor beyond the grid.
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 600, 60, 60).rotateX(-Math.PI / 2),
      curved(new THREE.MeshLambertMaterial({ color: PAL.oceanDeep })),
    );
    floor.position.set(this.N / 2, OCEAN_FLOOR_Y - 0.02, this.N / 2);
    this.group.add(floor);
  }

  private computeSeaDist(): Uint8Array {
    const N = this.N;
    const d = new Uint8Array(N * N).fill(255);
    const q: number[] = [];
    for (let i = 0; i < N * N; i++)
      if (this.gen.ground[i] !== Ground.Ocean) {
        d[i] = 0;
        q.push(i);
      }
    for (let h = 0; h < q.length; h++) {
      const j = q[h]!;
      const x = j % N, z = (j / N) | 0;
      for (const [dx, dz] of DIRS4) {
        const nx = x + dx, nz = z + dz;
        if (nx < 0 || nz < 0 || nx >= N || nz >= N) continue;
        const k = nz * N + nx;
        if (d[k] === 255) {
          d[k] = d[j]! + 1;
          q.push(k);
        }
      }
    }
    return d;
  }

  private g(x: number, z: number): number {
    if (x < 0 || z < 0 || x >= this.N || z >= this.N) return Ground.Ocean;
    return this.gen.ground[z * this.N + x]!;
  }

  private base(x: number, z: number): number {
    const g = this.g(x, z);
    if (g === Ground.Ocean) {
      if (x < 0 || z < 0 || x >= this.N || z >= this.N) return OCEAN_FLOOR_Y;
      const d = this.seaDist[z * this.N + x]!;
      return Math.max(OCEAN_FLOOR_Y, -0.32 - 0.3 * (d - 1));
    }
    if (g === Ground.River || g === Ground.Pond) return -0.92;
    return this.gen.height[z * this.N + x]! * LEVEL_HEIGHT;
  }

  private jit(cx: number, cz: number): number {
    return (hash01(cx, cz, 77, this.gen.seed) - 0.5) * 0.09;
  }

  /** Height of tile (x,z)'s corner (cx,cz). */
  private cornerH(x: number, z: number, cx: number, cz: number): number {
    const g = this.g(x, z);
    if (g === Ground.Ocean || g === Ground.Sand) {
      let sum = 0, n = 0, allLand = true;
      for (const [ox, oz] of [
        [cx - 1, cz - 1],
        [cx, cz - 1],
        [cx - 1, cz],
        [cx, cz],
      ] as const) {
        const gg = this.g(ox, oz);
        if (gg === Ground.Ocean || gg === Ground.Sand) {
          sum += this.base(ox, oz);
          n++;
          if (gg === Ground.Ocean) allLand = false;
        }
      }
      return sum / n + (allLand ? this.jit(cx, cz) : 0);
    }
    if (g === Ground.River || g === Ground.Pond) return -0.92;
    return this.base(x, z) + this.jit(cx, cz);
  }

  private topColor(x: number, z: number, a: number, b: number, c: number, d: number): [number, number] {
    const g = this.g(x, z);
    const i = z * this.N + x;
    const lvl = this.gen.height[i]!;
    const n = fbm2(this.gen.seed + 5, x * 0.18, z * 0.18, 2);
    const h1 = hash01(x, z, 3);
    switch (g) {
      case Ground.Grass: {
        const pal =
          lvl === 2 ? [PAL.grassTop0, PAL.grassTop1] : lvl === 1 ? [PAL.grassHigh0, PAL.grassHigh1] : [PAL.grass0, PAL.grass1];
        const base = mixHex(pal[0]!, pal[1]!, Math.min(1, Math.max(0, n * 1.2 + 0.5)));
        const c2 = mixHex(base, PAL.grass2, (x + z) % 2 === 0 ? 0.18 : 0.0);
        return [c2, mixHex(c2, 0x000000, 0.025 + h1 * 0.02)];
      }
      case Ground.Dirt: {
        const c2 = mixHex(PAL.dirt, PAL.dirtDark, h1 * 0.35);
        return [c2, mixHex(c2, PAL.dirtDark, 0.15)];
      }
      case Ground.Sand: {
        const minH = Math.min(a, b, c, d);
        const c2 = minH < -0.05 ? PAL.sandWet : mixHex(PAL.sand, PAL.sandWet, h1 * 0.25);
        return [c2, mixHex(c2, 0x000000, 0.02)];
      }
      case Ground.River:
      case Ground.Pond:
        return [PAL.riverBed, mixHex(PAL.riverBed, 0x000000, 0.04)];
      default: {
        const depth = Math.min(1, -Math.min(a, b, c, d) / 1.4);
        const c2 = mixHex(PAL.oceanShallow, PAL.oceanDeep, depth);
        return [c2, c2];
      }
    }
  }

  private buildChunk(x0: number, z0: number): THREE.BufferGeometry {
    const B = new GeoBuilder();
    const up: V3 = [0, 1, 0];
    for (let z = z0; z < Math.min(z0 + CHUNK, this.N); z++)
      for (let x = x0; x < Math.min(x0 + CHUNK, this.N); x++) {
        const hNW = this.cornerH(x, z, x, z);
        const hNE = this.cornerH(x, z, x + 1, z);
        const hSE = this.cornerH(x, z, x + 1, z + 1);
        const hSW = this.cornerH(x, z, x, z + 1);
        const [c1, c2] = this.topColor(x, z, hNW, hNE, hSE, hSW);
        const pNW: V3 = [x, hNW, z], pNE: V3 = [x + 1, hNE, z], pSE: V3 = [x + 1, hSE, z + 1], pSW: V3 = [x, hSW, z + 1];
        if (hash01(x, z, 11) < 0.5) {
          B.tri(pNW, pSW, pSE, c1, up);
          B.tri(pNW, pSE, pNE, c2, up);
        } else {
          B.tri(pNW, pSW, pNE, c1, up);
          B.tri(pNE, pSW, pSE, c2, up);
        }
        // walls toward lower neighbours
        const edges: [number, number, number, number, number, number, V3][] = [
          // nx, nz, corner A (cx,cz), corner B (cx,cz), outward
          [x, z - 1, x, z, x + 1, z, [0, 0, -1]],
          [x + 1, z, x + 1, z, x + 1, z + 1, [1, 0, 0]],
          [x, z + 1, x + 1, z + 1, x, z + 1, [0, 0, 1]],
          [x - 1, z, x, z + 1, x, z, [-1, 0, 0]],
        ];
        for (const [nx, nz, ax, az, bx, bz, out] of edges) {
          if (nx < 0 || nz < 0 || nx >= this.N || nz >= this.N) continue;
          const tA = this.cornerH(x, z, ax, az), tB = this.cornerH(x, z, bx, bz);
          const nA = this.cornerH(nx, nz, ax, az), nB = this.cornerH(nx, nz, bx, bz);
          if (tA - nA < 0.02 && tB - nB < 0.02) continue;
          this.wall(B, ax, az, bx, bz, Math.min(nA, tA), Math.min(nB, tB), tA, tB, out);
        }
      }
    return B.build();
  }

  private wall(
    B: GeoBuilder,
    ax: number,
    az: number,
    bx: number,
    bz: number,
    botA: number,
    botB: number,
    topA: number,
    topB: number,
    out: V3,
  ): void {
    // Split at integer levels so cliff bands line up between neighbours.
    const lo = Math.min(botA, botB), hi = Math.max(topA, topB);
    const cuts: number[] = [];
    for (let k = 0; k <= 2; k++) {
      const y = k * LEVEL_HEIGHT;
      if (y > lo + 0.15 && y < hi - 0.15) cuts.push(y);
    }
    const ys = (bot: number, top: number) => [bot, ...cuts.filter((c) => c > bot + 0.1 && c < top - 0.1), top];
    const yA = ys(botA, topA), yB = ys(botB, topB);
    if (yA.length !== yB.length) {
      // fall back to a single quad
      B.quad([ax, botA, az], [bx, botB, bz], [bx, topB, bz], [ax, topA, az], PAL.bank, out);
      return;
    }
    for (let s = 0; s < yA.length - 1; s++) {
      const a0 = yA[s]!, a1 = yA[s + 1]!, b0 = yB[s]!, b1 = yB[s + 1]!;
      const isBank = Math.max(a1, b1) <= 0.12;
      if (isBank) {
        B.quad([ax, a0, az], [bx, b0, bz], [bx, b1, bz], [ax, a1, az], PAL.bank, out);
        continue;
      }
      // rocky cliff band: middle row with jittered vertices
      const am = (a0 + a1) / 2, bm = (b0 + b1) / 2;
      const jA = this.wallJit(ax, az, am), jB = this.wallJit(bx, bz, bm);
      const pa0: V3 = [ax, a0, az], pb0: V3 = [bx, b0, bz];
      const pam: V3 = [ax + jA[0], am + jA[1], az + jA[2]], pbm: V3 = [bx + jB[0], bm + jB[1], bz + jB[2]];
      const pa1: V3 = [ax, a1, az], pb1: V3 = [bx, b1, bz];
      const band = Math.floor(am / LEVEL_HEIGHT) % 2 === 0 ? PAL.cliff : PAL.cliffBand;
      B.quad(pa0, pb0, pbm, pam, mixHex(band, PAL.cliffDark, 0.45), out, mixHex(band, PAL.cliffDark, 0.35));
      B.quad(pam, pbm, pb1, pa1, band, out, mixHex(band, 0xffffff, 0.06));
    }
  }

  private wallJit(cx: number, cz: number, y: number): V3 {
    const k = Math.round(y * 4);
    return [
      (hash01(cx, cz, k, 91) - 0.5) * 0.22,
      (hash01(cx, cz, k, 92) - 0.5) * 0.12,
      (hash01(cx, cz, k, 93) - 0.5) * 0.22,
    ];
  }
}

export class WaterRenderer {
  readonly mesh: THREE.Mesh;
  constructor(center: number) {
    const geo = new THREE.PlaneGeometry(600, 600, 150, 150).rotateX(-Math.PI / 2);
    const mat = curved(
      new THREE.MeshLambertMaterial({
        color: PAL.water,
        transparent: true,
        opacity: 0.72,
        flatShading: true,
        depthWrite: false,
      }),
      { waves: true },
    );
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(center, WATER_Y, center);
    this.mesh.renderOrder = 2;
    this.mesh.receiveShadow = true;
  }
}
