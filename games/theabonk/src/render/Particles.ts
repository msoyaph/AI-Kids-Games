import * as THREE from 'three';
import { addAlphaAttribute, alphaBasic, commitInstances, makeInstanced, TRS, writeTRSFrom, writeTRSPitchFrom } from './instancing';

/** Particle kinds: tumbling chunks, sparks stretched along their flight, soft puffs. */
export const PK = { Chunk: 0, Spark: 1, Puff: 2 } as const;

/**
 * Render-only particle pool (cosmetic, uses Math.random). Typed arrays, swap-remove,
 * one InstancedMesh with per-instance colour.
 */
export class Particles {
  readonly mesh: THREE.InstancedMesh;
  readonly sparkMesh: THREE.InstancedMesh;
  readonly puffMesh: THREE.InstancedMesh;
  private puffAlpha: THREE.InstancedBufferAttribute;
  private kind: Uint8Array;
  private cap: number;
  private n = 0;
  private x: Float32Array;
  private y: Float32Array;
  private z: Float32Array;
  private vx: Float32Array;
  private vy: Float32Array;
  private vz: Float32Array;
  private life: Float32Array;
  private max: Float32Array;
  private size: Float32Array;
  private grav: Float32Array;
  private spin: Float32Array;
  private col: Float32Array;
  /** 0..1 multiplier from graphics quality. */
  density = 1;
  private tmpC = new THREE.Color();

  constructor(cap = 3000) {
    this.cap = cap;
    const geo = new THREE.OctahedronGeometry(0.5, 0);
    this.mesh = makeInstanced(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }), cap, true);
    this.mesh.name = 'particles';
    // sparks: thin, unit length along +Z (stretched by speed)
    this.sparkMesh = makeInstanced(new THREE.BoxGeometry(0.16, 0.16, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), 1200, true);
    this.sparkMesh.name = 'particles:sparks';
    this.puffMesh = makeInstanced(new THREE.IcosahedronGeometry(0.5, 1), alphaBasic({ color: 0xffffff }), 600, true);
    this.puffMesh.name = 'particles:puffs';
    this.puffAlpha = addAlphaAttribute(this.puffMesh, 600);
    this.kind = new Uint8Array(cap);
    this.x = new Float32Array(cap);
    this.y = new Float32Array(cap);
    this.z = new Float32Array(cap);
    this.vx = new Float32Array(cap);
    this.vy = new Float32Array(cap);
    this.vz = new Float32Array(cap);
    this.life = new Float32Array(cap);
    this.max = new Float32Array(cap);
    this.size = new Float32Array(cap);
    this.grav = new Float32Array(cap);
    this.spin = new Float32Array(cap);
    this.col = new Float32Array(cap * 3);
  }

  get count(): number {
    return this.n;
  }

  emit(x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, size: number, color: number, gravity = 18, kind = 0): void {
    if (this.n >= this.cap) return;
    const i = this.n++;
    this.kind[i] = kind;
    this.x[i] = x;
    this.y[i] = y;
    this.z[i] = z;
    this.vx[i] = vx;
    this.vy[i] = vy;
    this.vz[i] = vz;
    this.life[i] = life;
    this.max[i] = life;
    this.size[i] = size;
    this.grav[i] = gravity;
    this.spin[i] = Math.random() * 6;
    const c = this.tmpC.setHex(color);
    this.col[i * 3] = c.r;
    this.col[i * 3 + 1] = c.g;
    this.col[i * 3 + 2] = c.b;
  }

  burst(x: number, y: number, z: number, count: number, color: number, speed: number, size: number, life = 0.6, up = 1, gravity = 18): void {
    const n = Math.max(1, Math.round(count * this.density));
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      const r = (0.4 + Math.random() * 0.6) * speed;
      this.emit(x, y, z, Math.cos(a) * r, (0.4 + Math.random()) * speed * up, Math.sin(a) * r, life * (0.6 + Math.random() * 0.6), size * (0.6 + Math.random() * 0.7), color, gravity);
    }
  }

  /** Fast sparks, stretched along their velocity (hits, shards, crits). */
  sparks(x: number, y: number, z: number, count: number, color: number, speed: number, life = 0.35, up = 0.8): void {
    const n = Math.max(1, Math.round(count * this.density));
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      const r = (0.5 + Math.random() * 0.5) * speed;
      this.emit(x, y, z, Math.cos(a) * r, (Math.random() * 0.8 + 0.2) * speed * up, Math.sin(a) * r, life * (0.6 + Math.random() * 0.5), 0.6 + Math.random() * 0.5, color, 14, PK.Spark);
    }
  }

  /** Soft puffs that swell and fade (dust, snow, smoke). */
  puffs(x: number, y: number, z: number, count: number, color: number, size: number, life = 0.7, speed = 1.5): void {
    const n = Math.max(1, Math.round(count * this.density));
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * speed;
      this.emit(x + Math.cos(a) * 0.3, y, z + Math.sin(a) * 0.3, Math.cos(a) * r, 0.6 + Math.random() * 0.8, Math.sin(a) * r, life * (0.7 + Math.random() * 0.5), size * (0.7 + Math.random() * 0.6), color, -0.5, PK.Puff);
    }
  }

  ring(x: number, y: number, z: number, count: number, color: number, speed: number, size: number, life = 0.5): void {
    const n = Math.max(4, Math.round(count * this.density));
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      this.emit(x, y, z, Math.cos(a) * speed, 0.5, Math.sin(a) * speed, life, size, color, 0);
    }
  }

  clear(): void {
    this.n = 0;
  }

  update(dt: number): void {
    let i = 0;
    while (i < this.n) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        const last = --this.n;
        if (i !== last) {
          this.x[i] = this.x[last];
          this.y[i] = this.y[last];
          this.z[i] = this.z[last];
          this.vx[i] = this.vx[last];
          this.vy[i] = this.vy[last];
          this.vz[i] = this.vz[last];
          this.life[i] = this.life[last];
          this.max[i] = this.max[last];
          this.size[i] = this.size[last];
          this.grav[i] = this.grav[last];
          this.spin[i] = this.spin[last];
          this.kind[i] = this.kind[last];
          this.col[i * 3] = this.col[last * 3];
          this.col[i * 3 + 1] = this.col[last * 3 + 1];
          this.col[i * 3 + 2] = this.col[last * 3 + 2];
        }
        continue;
      }
      this.vy[i] -= this.grav[i] * dt;
      const drag = 1 - Math.min(1, dt * 1.5);
      this.vx[i] *= drag;
      this.vz[i] *= drag;
      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
      this.z[i] += this.vz[i] * dt;
      i++;
    }
    const a = this.mesh.instanceMatrix.array as Float32Array;
    const c = this.mesh.instanceColor!.array as Float32Array;
    const sa = this.sparkMesh.instanceMatrix.array as Float32Array;
    const sc = this.sparkMesh.instanceColor!.array as Float32Array;
    const pa = this.puffMesh.instanceMatrix.array as Float32Array;
    const pc = this.puffMesh.instanceColor!.array as Float32Array;
    const palpha = this.puffAlpha.array as Float32Array;
    const sparkCap = this.sparkMesh.instanceMatrix.count;
    const puffCap = this.puffMesh.instanceMatrix.count;
    let nc = 0;
    let ns = 0;
    let np = 0;
    for (let k = 0; k < this.n; k++) {
      const f = this.life[k] / this.max[k];
      const kind = this.kind[k];
      TRS[0] = this.x[k];
      TRS[1] = this.y[k];
      TRS[2] = this.z[k];
      if (kind === PK.Spark) {
        if (ns >= sparkCap) continue;
        // stretched along the velocity, shrinking as it fades
        const vx = this.vx[k];
        const vy = this.vy[k];
        const vz = this.vz[k];
        const hv = Math.sqrt(vx * vx + vz * vz);
        const sp = Math.sqrt(hv * hv + vy * vy);
        TRS[3] = Math.atan2(vx, vz);
        TRS[4] = -Math.atan2(vy, hv);
        TRS[5] = this.size[k] * 0.45 * f;
        TRS[6] = this.size[k] * 0.45 * f;
        TRS[7] = Math.max(0.15, sp * 0.06) * this.size[k];
        writeTRSPitchFrom(sa, ns * 16);
        sc[ns * 3] = this.col[k * 3];
        sc[ns * 3 + 1] = this.col[k * 3 + 1];
        sc[ns * 3 + 2] = this.col[k * 3 + 2];
        ns++;
      } else if (kind === PK.Puff) {
        if (np >= puffCap) continue;
        const s = this.size[k] * (1.6 - f * 0.9);
        TRS[3] = this.spin[k];
        TRS[4] = 0;
        TRS[5] = s;
        TRS[6] = s * 0.85;
        TRS[7] = s;
        writeTRSFrom(pa, np * 16);
        pc[np * 3] = this.col[k * 3];
        pc[np * 3 + 1] = this.col[k * 3 + 1];
        pc[np * 3 + 2] = this.col[k * 3 + 2];
        palpha[np] = Math.min(1, f * 1.6) * 0.38;
        np++;
      } else {
        const s = this.size[k] * (f < 0.5 ? f * 2 : 1);
        TRS[3] = this.spin[k] + f * 4;
        TRS[4] = f * 2;
        TRS[5] = s;
        TRS[6] = s;
        TRS[7] = s;
        writeTRSFrom(a, nc * 16);
        c[nc * 3] = this.col[k * 3];
        c[nc * 3 + 1] = this.col[k * 3 + 1];
        c[nc * 3 + 2] = this.col[k * 3 + 2];
        nc++;
      }
    }
    commitInstances(this.mesh, nc);
    commitInstances(this.sparkMesh, ns);
    commitInstances(this.puffMesh, np, [this.puffAlpha]);
  }
}
