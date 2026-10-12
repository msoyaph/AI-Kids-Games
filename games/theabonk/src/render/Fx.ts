import * as THREE from 'three';
import { ENEMIES } from '../config/enemies';
import { Ev, type EventBuffer } from '../core/events';
import type { CameraRig } from './CameraRig';
import { commitInstances, makeInstanced, uploadPrefix, TRS, writeTRSFrom } from './instancing';
import type { Particles } from './Particles';

const tmpC = new THREE.Color();

/** Expanding additive rings (shockwaves, bursts) and flash spheres. */
class Shockwaves {
  readonly rings: THREE.InstancedMesh;
  readonly spheres: THREE.InstancedMesh;
  private cap = 96;
  private n = 0;
  private data: Float32Array; // x y z radius life max kind(0 ring / 1 sphere)
  private col: Float32Array;

  constructor() {
    const rg = new THREE.RingGeometry(0.82, 1, 32, 1);
    rg.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.rings = makeInstanced(rg, mat, this.cap, true);
    this.rings.renderOrder = 2;
    const sg = new THREE.IcosahedronGeometry(1, 1);
    this.spheres = makeInstanced(sg, mat.clone(), this.cap, true);
    this.spheres.renderOrder = 2;
    this.data = new Float32Array(this.cap * 7);
    this.col = new Float32Array(this.cap * 3);
  }

  add(x: number, y: number, z: number, radius: number, color: number, life: number, sphere: boolean): void {
    if (this.n >= this.cap) return;
    const o = this.n * 7;
    this.data[o] = x;
    this.data[o + 1] = y;
    this.data[o + 2] = z;
    this.data[o + 3] = radius;
    this.data[o + 4] = life;
    this.data[o + 5] = life;
    this.data[o + 6] = sphere ? 1 : 0;
    tmpC.setHex(color);
    this.col[this.n * 3] = tmpC.r;
    this.col[this.n * 3 + 1] = tmpC.g;
    this.col[this.n * 3 + 2] = tmpC.b;
    this.n++;
  }

  clear(): void {
    this.n = 0;
  }

  update(dt: number): void {
    let i = 0;
    while (i < this.n) {
      const o = i * 7;
      this.data[o + 4] -= dt;
      if (this.data[o + 4] <= 0) {
        const last = --this.n;
        if (i !== last) {
          this.data.copyWithin(o, last * 7, last * 7 + 7);
          this.col.copyWithin(i * 3, last * 3, last * 3 + 3);
        }
        continue;
      }
      i++;
    }
    const ra = this.rings.instanceMatrix.array as Float32Array;
    const rc = this.rings.instanceColor!.array as Float32Array;
    const sa = this.spheres.instanceMatrix.array as Float32Array;
    const sc = this.spheres.instanceColor!.array as Float32Array;
    let nr = 0;
    let ns = 0;
    for (let k = 0; k < this.n; k++) {
      const o = k * 7;
      const f = 1 - this.data[o + 4] / this.data[o + 5]; // 0 → 1
      const ease = 1 - (1 - f) * (1 - f);
      const fade = 1 - f;
      if (this.data[o + 6] === 0) {
        const r = this.data[o + 3] * (0.3 + 0.7 * ease);
        TRS[0] = this.data[o];
        TRS[1] = this.data[o + 1] + 0.15;
        TRS[2] = this.data[o + 2];
        TRS[3] = 0;
        TRS[4] = 0;
        TRS[5] = r;
        TRS[6] = 1;
        TRS[7] = r;
        writeTRSFrom(ra, nr * 16);
        rc[nr * 3] = this.col[k * 3] * fade;
        rc[nr * 3 + 1] = this.col[k * 3 + 1] * fade;
        rc[nr * 3 + 2] = this.col[k * 3 + 2] * fade;
        nr++;
      } else {
        const r = this.data[o + 3] * (0.4 + 0.6 * ease);
        TRS[0] = this.data[o];
        TRS[1] = this.data[o + 1];
        TRS[2] = this.data[o + 2];
        TRS[3] = 0;
        TRS[4] = 0;
        TRS[5] = r;
        TRS[6] = r * 0.8;
        TRS[7] = r;
        writeTRSFrom(sa, ns * 16);
        const ff = fade * fade * 0.8;
        sc[ns * 3] = this.col[k * 3] * ff;
        sc[ns * 3 + 1] = this.col[k * 3 + 1] * ff;
        sc[ns * 3 + 2] = this.col[k * 3 + 2] * ff;
        ns++;
      }
    }
    commitInstances(this.rings, nr);
    commitInstances(this.spheres, ns);
  }
}

/** Zig-zag lightning bolts as additive line segments. */
class Lightning {
  readonly lines: THREE.LineSegments;
  private maxBolts = 64;
  private segs = 7;
  private pos: Float32Array;
  private col: Float32Array;
  private bolts: Float32Array; // x1 y1 z1 x2 y2 z2 life
  private n = 0;
  private geo: THREE.BufferGeometry;

  constructor() {
    const verts = this.maxBolts * this.segs * 2;
    this.pos = new Float32Array(verts * 3);
    this.col = new Float32Array(verts * 3);
    this.bolts = new Float32Array(this.maxBolts * 7);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setDrawRange(0, 0);
    this.lines = new THREE.LineSegments(this.geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.lines.frustumCulled = false;
    this.lines.renderOrder = 3;
  }

  add(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): void {
    if (this.n >= this.maxBolts) return;
    const o = this.n++ * 7;
    const b = this.bolts;
    b[o] = x1;
    b[o + 1] = y1;
    b[o + 2] = z1;
    b[o + 3] = x2;
    b[o + 4] = y2;
    b[o + 5] = z2;
    b[o + 6] = 0.18;
  }

  clear(): void {
    this.n = 0;
  }

  update(dt: number): void {
    let i = 0;
    while (i < this.n) {
      const o = i * 7;
      this.bolts[o + 6] -= dt;
      if (this.bolts[o + 6] <= 0) {
        const last = --this.n;
        if (i !== last) this.bolts.copyWithin(o, last * 7, last * 7 + 7);
        continue;
      }
      i++;
    }
    let v = 0;
    for (let b = 0; b < this.n; b++) {
      const o = b * 7;
      const f = this.bolts[o + 6] / 0.18;
      let lx = this.bolts[o];
      let ly = this.bolts[o + 1];
      let lz = this.bolts[o + 2];
      for (let s = 1; s <= this.segs; s++) {
        const t = s / this.segs;
        const j = s === this.segs ? 0 : 0.7;
        const nx = this.bolts[o] + (this.bolts[o + 3] - this.bolts[o]) * t + (Math.random() - 0.5) * j;
        const ny = this.bolts[o + 1] + (this.bolts[o + 4] - this.bolts[o + 1]) * t + (Math.random() - 0.5) * j;
        const nz = this.bolts[o + 2] + (this.bolts[o + 5] - this.bolts[o + 2]) * t + (Math.random() - 0.5) * j;
        const pp = this.pos;
        const cc = this.col;
        const o3 = v * 3;
        pp[o3] = lx;
        pp[o3 + 1] = ly;
        pp[o3 + 2] = lz;
        pp[o3 + 3] = nx;
        pp[o3 + 4] = ny;
        pp[o3 + 5] = nz;
        cc[o3] = cc[o3 + 3] = 0.75 * f;
        cc[o3 + 1] = cc[o3 + 4] = 0.92 * f;
        cc[o3 + 2] = cc[o3 + 5] = f;
        v += 2;
        lx = nx;
        ly = ny;
        lz = nz;
      }
    }
    this.geo.setDrawRange(0, v);
    if (v > 0) {
      uploadPrefix(this.geo.getAttribute('position') as THREE.BufferAttribute, v);
      uploadPrefix(this.geo.getAttribute('color') as THREE.BufferAttribute, v);
    }
  }
}

/** Floating damage numbers drawn on a 2D canvas overlay. */
export class DamageNumbers {
  private cap = 160;
  private n = 0;
  private d: Float32Array; // x y z value life crit kind
  private ctx: CanvasRenderingContext2D | null;
  private v = new THREE.Vector3();
  enabled = true;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private fonts: string[] = [];
  private texts = new Map<number, string>();

  private font(px: number): string {
    const k = Math.round(px);
    return (this.fonts[k] ??= `900 ${k}px "Trebuchet MS", system-ui, sans-serif`);
  }

  private text(v: number): string {
    const k = Math.round(v);
    let t = this.texts.get(k);
    if (t === undefined) {
      t = String(k);
      if (this.texts.size < 4000) this.texts.set(k, t);
    }
    return t;
  }

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d');
    this.d = new Float32Array(this.cap * 7);
  }

  resize(w: number, h: number, dpr: number): void {
    this.dpr = Math.min(2, dpr);
    this.w = w;
    this.h = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
  }

  /** kind: 0 damage, 1 heal, 2 player hurt */
  add(x: number, y: number, z: number, value: number, crit: boolean, kind = 0): void {
    if (!this.enabled && kind === 0) return;
    let i: number;
    if (this.n < this.cap) i = this.n++;
    else {
      // overwrite the oldest (lowest life)
      i = 0;
      for (let k = 1; k < this.n; k++) if (this.d[k * 7 + 4] < this.d[i * 7 + 4]) i = k;
    }
    const o = i * 7;
    this.d[o] = x + (Math.random() - 0.5) * 0.6;
    this.d[o + 1] = y;
    this.d[o + 2] = z + (Math.random() - 0.5) * 0.6;
    this.d[o + 3] = value;
    this.d[o + 4] = crit ? 0.9 : 0.65;
    this.d[o + 5] = crit ? 1 : 0;
    this.d[o + 6] = kind;
  }

  clear(): void {
    this.n = 0;
    this.ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  update(dt: number, camera: THREE.Camera): void {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.n === 0) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    const base = Math.max(12, Math.min(this.w, this.h) * 0.022);
    let i = 0;
    while (i < this.n) {
      const o = i * 7;
      this.d[o + 4] -= dt;
      if (this.d[o + 4] <= 0) {
        const last = --this.n;
        if (i !== last) this.d.copyWithin(o, last * 7, last * 7 + 7);
        continue;
      }
      this.d[o + 1] += dt * 2.2;
      this.v.set(this.d[o], this.d[o + 1], this.d[o + 2]).project(camera);
      if (this.v.z < 1 && this.v.x > -1.1 && this.v.x < 1.1 && this.v.y > -1.1 && this.v.y < 1.1) {
        const sx = (this.v.x * 0.5 + 0.5) * this.w;
        const sy = (-this.v.y * 0.5 + 0.5) * this.h;
        const crit = this.d[o + 5] === 1;
        const kind = this.d[o + 6];
        const life = this.d[o + 4];
        const pop = crit ? 1.45 + Math.max(0, life - 0.7) * 2 : 1;
        const size = base * pop;
        ctx.globalAlpha = Math.min(1, life * 4);
        ctx.font = this.font(size);
        const txt = kind === 1 ? `+${this.text(this.d[o + 3])}` : this.text(this.d[o + 3]);
        ctx.lineWidth = Math.max(2, size * 0.18);
        ctx.strokeStyle = 'rgba(30, 20, 45, 0.9)';
        ctx.strokeText(txt, sx, sy);
        ctx.fillStyle = kind === 1 ? '#7dff8a' : kind === 2 ? '#ff5a5f' : crit ? '#ffd34d' : '#ffffff';
        ctx.fillText(txt, sx, sy);
      }
      i++;
    }
    ctx.globalAlpha = 1;
  }
}

/** Consumes sim events into particles / rings / lightning / numbers / camera shake. */
export class Fx {
  readonly group = new THREE.Group();
  private shock = new Shockwaves();
  private bolts = new Lightning();
  readonly numbers: DamageNumbers;
  private enemyColors: number[] = ENEMIES.map((e) => e.color);

  constructor(
    private particles: Particles,
    overlay: HTMLCanvasElement,
    private rig: CameraRig,
  ) {
    this.group.add(this.shock.rings, this.shock.spheres, this.bolts.lines, particles.mesh);
    this.numbers = new DamageNumbers(overlay);
  }

  clear(): void {
    this.particles.clear();
    this.shock.clear();
    this.bolts.clear();
    this.numbers.clear();
  }

  consume(ev: EventBuffer, px: number, py: number, pz: number): void {
    const p = this.particles;
    for (let n = 0; n < ev.count; n++) {
      const t = ev.type[n];
      const a = ev.get(n, 0);
      const b = ev.get(n, 1);
      const c = ev.get(n, 2);
      const d = ev.get(n, 3);
      switch (t) {
        case Ev.Damage:
          this.numbers.add(a, b, c, d, ev.get(n, 4) === 1);
          break;
        case Ev.EnemyDie: {
          const color = this.enemyColors[d] ?? 0xffffff;
          const scale = ev.get(n, 4);
          const big = ENEMIES[d]?.behavior === 'boss';
          p.burst(a, b + 0.6 * scale, c, big ? 60 : 9 * scale, color, big ? 14 : 6 * scale, big ? 0.9 : 0.3 * scale, big ? 1.2 : 0.55);
          p.burst(a, b + 0.6 * scale, c, big ? 20 : 3, 0xffffff, 4, 0.2, 0.35);
          if (ev.get(n, 5) === 1 || big) {
            this.shock.add(a, b, c, big ? 12 : 5, 0xffd34d, 0.6, false);
            this.rig.addTrauma(big ? 0.8 : 0.3);
          }
          break;
        }
        case Ev.Explosion: {
          const color = ev.i[n] || 0xff8a3d;
          this.shock.add(a, b, c, d * 1.1, color, 0.45, true);
          this.shock.add(a, b, c, d * 1.3, color, 0.4, false);
          p.burst(a, b, c, 10 + d * 2, color, d * 2.5, 0.35, 0.5);
          const dist = Math.hypot(a - px, c - pz);
          if (dist < 20) this.rig.addTrauma(0.25 * (1 - dist / 20));
          break;
        }
        case Ev.Ring:
          this.shock.add(a, b, c, d, ev.i[n] || 0xffffff, 0.35, false);
          break;
        case Ev.Lightning:
          this.bolts.add(a, b, c, d, ev.get(n, 4), ev.get(n, 5));
          p.burst(d, ev.get(n, 4), ev.get(n, 5), 3, 0xbfe9ff, 5, 0.18, 0.25);
          break;
        case Ev.PlayerHurt:
          this.numbers.add(px, py + 2.2, pz, a, false, 2);
          this.rig.addTrauma(0.35);
          p.burst(px, py + 1, pz, 8, 0xff5a5f, 5, 0.25, 0.4);
          break;
        case Ev.PlayerHeal:
          this.numbers.add(px, py + 2.2, pz, a, false, 1);
          p.burst(px, py + 1, pz, 10, 0x7dff8a, 3, 0.22, 0.6, 1.5, -2);
          break;
        case Ev.Gem:
          if (Math.random() < 0.5) p.burst(a, b, c, 2, 0x9ff3ff, 2, 0.12, 0.3, 1, 0);
          break;
        case Ev.Coin:
          p.burst(a, b, c, 4, 0xffd34d, 3, 0.15, 0.4);
          break;
        case Ev.Land:
          p.ring(a, b + 0.1, c, 10, 0xe8dcc0, Math.min(8, 2 + d * 0.4), 0.22, 0.35);
          if (d > 14) this.rig.addTrauma(0.15);
          break;
        case Ev.Jump:
          p.ring(a, b + 0.1, c, 6, 0xe8dcc0, 3, 0.16, 0.25);
          break;
        case Ev.Slide:
          p.burst(a, b + 0.2, c, 6, 0xd8c8a8, 3, 0.2, 0.4, 0.4);
          break;
        case Ev.LevelUp:
          this.shock.add(a, b, c, 6, 0x6dd6ff, 0.6, false);
          p.burst(a, b + 1, c, 30, 0x9ff3ff, 7, 0.25, 0.9, 1.5, 6);
          break;
        case Ev.Chest:
          this.shock.add(a, b, c, 5, 0xffd34d, 0.5, false);
          p.burst(a, b + 0.5, c, 24, 0xffd34d, 6, 0.25, 0.8);
          break;
        case Ev.ShrineHit:
          p.burst(a, b + 1.5, c, 8, 0xd8d4e8, 5, 0.22, 0.4);
          this.rig.addTrauma(0.1);
          break;
        case Ev.ShrineBreak:
          this.shock.add(a, b, c, 8, ev.i[n] || 0xffffff, 0.7, false);
          this.shock.add(a, b + 1.5, c, 3, ev.i[n] || 0xffffff, 0.5, true);
          p.burst(a, b + 1.5, c, 40, ev.i[n] || 0xffffff, 9, 0.3, 1.0);
          this.rig.addTrauma(0.3);
          break;
        case Ev.Revive:
          this.shock.add(a, b, c, 14, 0xfff2a8, 0.9, false);
          this.shock.add(a, b + 1, c, 6, 0xfff2a8, 0.6, true);
          this.rig.addTrauma(0.6);
          break;
        case Ev.BossSpawn:
          this.rig.addTrauma(0.5);
          break;
        case Ev.BossDie:
          this.shock.add(a, b, c, 18, 0xffffff, 1.2, false);
          this.shock.add(a, b + 3, c, 7, 0xffd34d, 0.9, true);
          this.rig.addTrauma(1);
          break;
        case Ev.EnemyShoot:
          p.burst(a, b, c, 3, 0xff4fa3, 2, 0.15, 0.25);
          break;
        default:
          break;
      }
    }
  }

  update(dt: number, camera: THREE.Camera): void {
    this.particles.update(dt);
    this.shock.update(dt);
    this.bolts.update(dt);
    this.numbers.update(dt, camera);
  }
}
