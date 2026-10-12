import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  MeshBasicMaterial,
  PerspectiveCamera,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import { h } from '../../ui/dom';

/**
 * Third-person chase camera. Springs smoothly behind the rocket, looks a little ahead, never rolls
 * (world up stays up), and keeps field-of-view changes small. Comfort mode makes it calmer still.
 */
export class ChaseCam {
  readonly pos = new Vector3();
  private readonly look = new Vector3();
  private readonly goal = new Vector3();
  private readonly lookGoal = new Vector3();
  private readonly flat = new Vector3();
  private shake = 0;
  private readonly baseFov: number;
  private fov: number;
  dist = 290;
  height = 95;
  ahead = 220;
  comfort = false;

  constructor(private readonly cam: PerspectiveCamera, fov = 60) {
    this.baseFov = fov;
    this.fov = fov;
  }

  kick(amount: number): void {
    if (!this.comfort) this.shake = Math.min(1, this.shake + amount);
  }

  /** Jump straight to the goal (scene start, after a tow). */
  snap(ship: Vector3, fwd: Vector3): void {
    this.computeGoal(ship, fwd);
    this.pos.copy(this.goal);
    this.look.copy(this.lookGoal);
  }

  private computeGoal(ship: Vector3, fwd: Vector3): void {
    // Sit behind the rocket, mostly level: only follow part of the pitch so climbing feels gentle.
    this.flat.set(fwd.x, fwd.y * 0.55, fwd.z).normalize();
    this.goal.copy(ship).addScaledVector(this.flat, -this.dist);
    this.goal.y += this.height;
    this.lookGoal.copy(ship).addScaledVector(fwd, this.ahead);
    this.lookGoal.y += this.height * 0.25;
  }

  update(dt: number, ship: Vector3, fwd: Vector3, speedFrac: number, boosting: boolean, time: number): void {
    this.computeGoal(ship, fwd);
    const stiff = this.comfort ? 3.2 : 4.5;
    const k = 1 - Math.exp(-stiff * dt);
    this.pos.lerp(this.goal, k);
    this.look.lerp(this.lookGoal, 1 - Math.exp(-7 * dt));
    this.cam.position.copy(this.pos);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.5);
      const s = this.shake * this.shake * 14;
      this.cam.position.x += Math.sin(time * 61) * s;
      this.cam.position.y += Math.sin(time * 53 + 1) * s;
    }
    this.cam.up.set(0, 1, 0);
    this.cam.lookAt(this.look);
    // Small FOV changes only (and nearly none in Comfort mode).
    const kickMax = this.comfort ? 1 : 6;
    const want = this.baseFov + (boosting ? kickMax : kickMax * 0.3 * Math.max(0, speedFrac - 0.8));
    this.fov += (want - this.fov) * (1 - Math.exp(-3 * dt));
    if (Math.abs(this.cam.fov - this.fov) > 0.01) {
      this.cam.fov = this.fov;
      this.cam.updateProjectionMatrix();
    }
  }
}

/**
 * Faint dust streaks that stream past the camera: they make speed easy to feel. Positions live in a
 * box around the camera and wrap; each streak is stretched along the rocket's velocity.
 */
export class SpeedDust {
  readonly lines: LineSegments;
  private readonly n: number;
  private readonly seeds: Float32Array;
  private readonly pos: Float32Array;
  private readonly box = 1400;
  private readonly mat: LineBasicMaterial;

  constructor(count: number) {
    this.n = count;
    this.seeds = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) this.seeds[i] = Math.random() * this.box;
    this.pos = new Float32Array(count * 6);
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(this.pos, 3));
    this.mat = new LineBasicMaterial({ color: new Color('#cfe0ff').multiplyScalar(0.9), transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false });
    this.lines = new LineSegments(g, this.mat);
    this.lines.frustumCulled = false;
  }

  update(cam: Vector3, vx: number, vy: number, vz: number, strength: number): void {
    const B = this.box;
    const half = B / 2;
    const len = 0.06 * strength;
    this.mat.opacity = Math.min(0.6, 0.15 + strength * 0.45);
    for (let i = 0; i < this.n; i++) {
      // A fixed lattice of points that wraps around the camera (world-anchored, so it streams past).
      const x = cam.x - half + ((((this.seeds[i * 3] - cam.x) % B) + B) % B);
      const y = cam.y - half + ((((this.seeds[i * 3 + 1] - cam.y) % B) + B) % B);
      const z = cam.z - half + ((((this.seeds[i * 3 + 2] - cam.z) % B) + B) % B);
      const o = i * 6;
      this.pos[o] = x;
      this.pos[o + 1] = y;
      this.pos[o + 2] = z;
      this.pos[o + 3] = x - vx * len;
      this.pos[o + 4] = y - vy * len;
      this.pos[o + 5] = z - vz * len;
    }
    (this.lines.geometry.attributes.position as BufferAttribute).needsUpdate = true;
  }
}

/** Easy mode: a flowing line of sparkles from the rocket to where you need to go. */
export class GuideTrail {
  readonly mesh: InstancedMesh;
  private readonly n = 26;
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly s = new Vector3();
  private readonly p = new Vector3();
  private readonly c = new Vector3();

  constructor() {
    this.mesh = new InstancedMesh(new SphereGeometry(1, 10, 8), new MeshBasicMaterial({ color: new Color('#fff3b0').multiplyScalar(2.2), transparent: true, opacity: 0.85, depthWrite: false, blending: AdditiveBlending }), this.n);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
  }

  hide(): void {
    this.mesh.count = 0;
  }

  /** From `a` (in front of the rocket) to `b` (the target), bending gently. */
  update(a: Vector3, fwd: Vector3, b: Vector3, time: number): void {
    const dist = a.distanceTo(b);
    if (dist < 220) {
      this.mesh.count = 0;
      return;
    }
    // Control point ahead of the rocket so the line starts along the way you are flying.
    this.c.copy(a).addScaledVector(fwd, Math.min(900, dist * 0.35));
    const span = Math.min(1, 1600 / dist);
    let k = 0;
    for (let i = 0; i < this.n; i++) {
      const u = ((i + ((time * 1.4) % 1)) / this.n) * span;
      const iu = 1 - u;
      this.p.set(
        iu * iu * a.x + 2 * iu * u * this.c.x + u * u * b.x,
        iu * iu * a.y + 2 * iu * u * this.c.y + u * u * b.y,
        iu * iu * a.z + 2 * iu * u * this.c.z + u * u * b.z,
      );
      const size = 4.5 * (1 - (i / this.n) * 0.5);
      this.s.setScalar(size);
      this.m.compose(this.p, this.q, this.s);
      this.mesh.setMatrixAt(k++, this.m);
    }
    this.mesh.count = k;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/** DOM words that pop up at 3D positions ("Fuel!", "Bonk!", "3 / 11") and float away. */
export class FloatLabels {
  private readonly layer: HTMLElement;
  private readonly items: Array<{ el: HTMLElement; pos: Vector3; t: number }> = [];
  private readonly tmp = new Vector3();

  constructor(parent: HTMLElement) {
    this.layer = h('div', { class: 'float-layer' });
    parent.append(this.layer);
  }

  show(text: string, at: Vector3, color = '#ffe066', big = false): void {
    if (this.items.length > 7) this.items.shift()?.el.remove();
    const el = h('div', { class: `float-text ${big ? 'big' : ''}` }, text);
    el.style.color = color;
    this.layer.append(el);
    this.items.push({ el, pos: at.clone(), t: 0 });
  }

  update(dt: number, cam: PerspectiveCamera, w: number, hh: number): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.t += dt;
      if (it.t > 1.3) {
        it.el.remove();
        this.items.splice(i, 1);
        continue;
      }
      const p = this.tmp.copy(it.pos).project(cam);
      if (p.z > 1) {
        it.el.style.display = 'none';
        continue;
      }
      it.el.style.display = '';
      const x = ((p.x + 1) / 2) * w;
      const y = ((1 - p.y) / 2) * hh - it.t * 60;
      it.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${1 + Math.min(0.25, it.t)})`;
      it.el.style.opacity = String(Math.min(1, 2.5 - it.t * 1.9));
    }
  }

  clear(): void {
    for (const it of this.items) it.el.remove();
    this.items.length = 0;
  }
}
