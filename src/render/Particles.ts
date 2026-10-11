import * as THREE from 'three';
import { commitInstances, makeInstanced, writeTRS } from './instancing';

/**
 * Render-only particle pool (cosmetic, uses Math.random). Typed arrays, swap-remove,
 * one InstancedMesh with per-instance colour.
 */
export class Particles {
  readonly mesh: THREE.InstancedMesh;
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

  emit(x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, size: number, color: number, gravity = 18): void {
    if (this.n >= this.cap) return;
    const i = this.n++;
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
    for (let k = 0; k < this.n; k++) {
      const f = this.life[k] / this.max[k];
      const s = this.size[k] * (f < 0.5 ? f * 2 : 1);
      writeTRS(a, k * 16, this.x[k], this.y[k], this.z[k], this.spin[k] + f * 4, f * 2, s, s, s);
      c[k * 3] = this.col[k * 3];
      c[k * 3 + 1] = this.col[k * 3 + 1];
      c[k * 3 + 2] = this.col[k * 3 + 2];
    }
    commitInstances(this.mesh, this.n);
  }
}
