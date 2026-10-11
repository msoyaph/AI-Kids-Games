import type { ArenaData } from '../data/types';
import { DEG } from '../core/math';
import { RAMP_NONE, RAMP_TRICK, type GroundHint, type GroundHit, type GroundModel, type SpawnPoint } from './ground';
import { TUNING } from './tuning';

interface RampBox {
  x: number;
  z: number;
  /** unit direction the ramp rises toward */
  dx: number;
  dz: number;
  halfW: number;
  len: number;
  h: number;
}

/**
 * Ground model for open battle arenas (also used as the Phase-2 test course):
 * flat floor, a boundary wall, solid obstacles, raised platforms and ramps.
 */
export class ArenaModel implements GroundModel {
  readonly gravityScale: number;
  readonly killY = -40;
  readonly length = 0;
  private readonly ramps: RampBox[];
  readonly spawnPoints: SpawnPoint[] = [];

  constructor(readonly data: ArenaData) {
    this.gravityScale = data.gravity ?? 1;
    this.ramps = data.ramps.map((r) => ({
      x: r.x,
      z: r.z,
      dx: Math.sin(r.dir * DEG),
      dz: Math.cos(r.dir * DEG),
      halfW: r.width / 2,
      len: r.length,
      h: r.height,
    }));
    // Spawn ring: evenly spaced, facing the centre.
    const n = 12;
    const rad = this.data.shape === 'ring' ? ((data.inner ?? data.size * 0.4) + data.size) / 2 : data.size * 0.72;
    const armHalf = data.inner ?? data.size * 0.3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      let x = Math.sin(a) * rad;
      let z = Math.cos(a) * rad;
      if (data.shape === 'cross') {
        // keep spawn points inside the arms
        const arm = i % 4;
        const along = data.size * (0.55 + 0.25 * ((i >> 2) % 3) / 2);
        x = arm === 0 ? 0 : arm === 1 ? along : arm === 2 ? 0 : -along;
        z = arm === 0 ? along : arm === 1 ? 0 : arm === 2 ? -along : 0;
        x += ((i >> 2) % 2 === 0 ? -1 : 1) * armHalf * 0.4 * (arm % 2 === 0 ? 1 : 0);
        z += ((i >> 2) % 2 === 0 ? -1 : 1) * armHalf * 0.4 * (arm % 2 === 1 ? 1 : 0);
      }
      this.spawnPoints.push({ x, y: 0, z, yaw: Math.atan2(-x, -z) });
    }
  }

  /** Signed distance to the outer boundary (negative inside). Writes outward normal into n. */
  private boundary(x: number, z: number, n: { x: number; z: number }): number {
    const d = this.data;
    switch (d.shape) {
      case 'circle':
      case 'ring': {
        const r = Math.hypot(x, z) || 1e-6;
        n.x = x / r;
        n.z = z / r;
        return r - d.size;
      }
      case 'square': {
        const ax = Math.abs(x) - d.size;
        const az = Math.abs(z) - d.size;
        if (ax > az) {
          n.x = Math.sign(x) || 1;
          n.z = 0;
          return ax;
        }
        n.x = 0;
        n.z = Math.sign(z) || 1;
        return az;
      }
      case 'cross': {
        const w = d.inner ?? d.size * 0.3;
        // union of two rectangles: |x|<=w & |z|<=size  OR |x|<=size & |z|<=w
        const a1 = Math.max(Math.abs(x) - w, Math.abs(z) - d.size);
        const a2 = Math.max(Math.abs(x) - d.size, Math.abs(z) - w);
        if (a1 < a2) {
          if (Math.abs(x) - w > Math.abs(z) - d.size) {
            n.x = Math.sign(x) || 1;
            n.z = 0;
          } else {
            n.x = 0;
            n.z = Math.sign(z) || 1;
          }
          return a1;
        }
        if (Math.abs(x) - d.size > Math.abs(z) - w) {
          n.x = Math.sign(x) || 1;
          n.z = 0;
        } else {
          n.x = 0;
          n.z = Math.sign(z) || 1;
        }
        return a2;
      }
    }
  }

  private readonly nTmp = { x: 0, z: 0 };

  query(x: number, y: number, z: number, _hint: GroundHint, out: GroundHit): GroundHit {
    const d = this.data;
    out.hit = true;
    out.height = 0;
    out.nx = 0;
    out.ny = 1;
    out.nz = 0;
    out.surface = 'road';
    out.s = 0;
    out.d = 0;
    out.halfWidth = d.size;
    out.dirX = 0;
    out.dirZ = 1;
    out.wallHit = false;
    out.wallNx = 0;
    out.wallNz = 0;
    out.wallDepth = 0;
    out.water = false;
    out.lowGrav = false;
    out.ramp = RAMP_NONE;
    out.ribbon = 0;
    out.sample = 0;
    out.ribbonT = 0;
    const R = TUNING.kartRadius;

    // platforms (raised floors)
    for (const p of d.platforms) {
      if (Math.abs(x - p.x) <= p.hx && Math.abs(z - p.z) <= p.hz && p.h > out.height) out.height = p.h;
    }
    // ramps
    for (const r of this.ramps) {
      const lx = x - r.x;
      const lz = z - r.z;
      const along = lx * r.dx + lz * r.dz; // 0 at the bottom (centre of ramp base is x,z), len at the top
      const side = lx * -r.dz + lz * r.dx;
      if (along >= 0 && along <= r.len && Math.abs(side) <= r.halfW) {
        const h = (along / r.len) * r.h;
        if (h >= out.height) {
          out.height = h;
          const slope = r.h / r.len;
          const inv = 1 / Math.sqrt(1 + slope * slope);
          out.nx = -r.dx * slope * inv;
          out.ny = inv;
          out.nz = -r.dz * slope * inv;
          out.ramp = RAMP_TRICK;
        }
      }
    }

    // outer boundary
    const n = this.nTmp;
    const bd = this.boundary(x, z, n) + R;
    if (bd > 0) {
      out.wallHit = true;
      out.wallNx = -n.x;
      out.wallNz = -n.z;
      out.wallDepth = bd;
    }
    if (d.shape === 'ring') {
      const inner = d.inner ?? d.size * 0.4;
      const r = Math.hypot(x, z) || 1e-6;
      const pen = inner + R - r;
      if (pen > 0 && pen > out.wallDepth) {
        out.wallHit = true;
        out.wallNx = x / r;
        out.wallNz = z / r;
        out.wallDepth = pen;
      }
    }
    // obstacles
    for (const o of d.obstacles) {
      if (y > o.h + 0.5) continue; // flying over it
      if (o.kind === 'cyl') {
        const dx = x - o.x;
        const dz = z - o.z;
        const dist = Math.hypot(dx, dz) || 1e-6;
        const pen = o.hx + R - dist;
        if (pen > 0 && pen > out.wallDepth) {
          out.wallHit = true;
          out.wallNx = dx / dist;
          out.wallNz = dz / dist;
          out.wallDepth = pen;
        }
      } else {
        const rot = (o.rot ?? 0) * DEG;
        const c = Math.cos(rot);
        const s = Math.sin(rot);
        const dx = x - o.x;
        const dz = z - o.z;
        const lx = dx * c - dz * s;
        const lz = dx * s + dz * c;
        const px = o.hx + R - Math.abs(lx);
        const pz = o.hz + R - Math.abs(lz);
        if (px > 0 && pz > 0) {
          let nlx = 0;
          let nlz = 0;
          let pen: number;
          if (px < pz) {
            nlx = Math.sign(lx) || 1;
            pen = px;
          } else {
            nlz = Math.sign(lz) || 1;
            pen = pz;
          }
          if (pen > out.wallDepth) {
            out.wallHit = true;
            // rotate the local normal back to world
            out.wallNx = nlx * c + nlz * s;
            out.wallNz = -nlx * s + nlz * c;
            out.wallDepth = pen;
          }
        }
      }
    }
    return out;
  }

  respawnAt(s: number, _lateral: number, out: SpawnPoint): SpawnPoint {
    const p = this.spawnPoints[Math.abs(Math.floor(s)) % this.spawnPoints.length];
    out.x = p.x;
    out.y = p.y;
    out.z = p.z;
    out.yaw = p.yaw;
    return out;
  }

  resetHint(_x: number, _y: number, _z: number, hint: GroundHint): void {
    hint.ribbon = 0;
    hint.sample = 0;
  }
}
