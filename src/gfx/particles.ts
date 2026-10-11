import { Container, Sprite, Text, type Texture } from 'pixi.js';
import { hexNum } from './palette';

/**
 * Pooled particle system. All particle data lives in typed arrays and sprites are created once,
 * so emitting and updating never allocates.
 */
export class Particles extends Container {
  private sprites: Sprite[] = [];
  private xs: Float32Array;
  private ys: Float32Array;
  private vxs: Float32Array;
  private vys: Float32Array;
  private life: Float32Array;
  private maxLife: Float32Array;
  private s0: Float32Array;
  private s1: Float32Array;
  private a0: Float32Array;
  private rot: Float32Array;
  private vr: Float32Array;
  private grav: Float32Array;
  private drag: Float32Array;
  private pxs: Float32Array;
  private pys: Float32Array;
  private active: Uint8Array;
  private head = 0;

  constructor(
    readonly capacity: number,
    additive: boolean,
  ) {
    super();
    const n = capacity;
    this.xs = new Float32Array(n);
    this.ys = new Float32Array(n);
    this.vxs = new Float32Array(n);
    this.vys = new Float32Array(n);
    this.life = new Float32Array(n);
    this.maxLife = new Float32Array(n);
    this.s0 = new Float32Array(n);
    this.s1 = new Float32Array(n);
    this.a0 = new Float32Array(n);
    this.rot = new Float32Array(n);
    this.vr = new Float32Array(n);
    this.grav = new Float32Array(n);
    this.drag = new Float32Array(n);
    this.pxs = new Float32Array(n);
    this.pys = new Float32Array(n);
    this.active = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const s = new Sprite();
      s.anchor.set(0.5);
      s.visible = false;
      if (additive) s.blendMode = 'add';
      this.sprites.push(s);
      this.addChild(s);
    }
  }

  spawn(
    tex: Texture, x: number, y: number, vx: number, vy: number, life: number,
    scale0: number, scale1: number, alpha: number, tint: number,
    opts?: { rot?: number; vr?: number; gravity?: number; drag?: number },
  ): void {
    // Ring buffer: when full, the oldest particle is reused.
    const i = this.head;
    this.head = (this.head + 1) % this.capacity;
    const s = this.sprites[i];
    if (s.texture !== tex) s.texture = tex;
    s.tint = tint;
    s.visible = true;
    this.active[i] = 1;
    this.xs[i] = this.pxs[i] = x;
    this.ys[i] = this.pys[i] = y;
    this.vxs[i] = vx;
    this.vys[i] = vy;
    this.life[i] = life;
    this.maxLife[i] = life;
    this.s0[i] = scale0;
    this.s1[i] = scale1;
    this.a0[i] = alpha;
    this.rot[i] = opts?.rot ?? 0;
    this.vr[i] = opts?.vr ?? 0;
    this.grav[i] = opts?.gravity ?? 0;
    this.drag[i] = opts?.drag ?? 0;
  }

  /** Burst of n particles in a circle. */
  burst(tex: Texture, x: number, y: number, n: number, speed: number, life: number, scale: number, color: string | number, opts?: { gravity?: number; spin?: boolean; drag?: number }): void {
    const tint = typeof color === 'string' ? hexNum(color) : color;
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.4 + Math.random() * 0.6);
      this.spawn(tex, x, y, Math.cos(a) * sp, Math.sin(a) * sp, life * (0.7 + Math.random() * 0.5), scale, scale * 0.2, 1, tint, {
        rot: Math.random() * 6.28,
        vr: opts?.spin ? (Math.random() - 0.5) * 12 : 0,
        gravity: opts?.gravity,
        drag: opts?.drag ?? 1.5,
      });
    }
  }

  update(dt: number): void {
    for (let i = 0; i < this.capacity; i++) {
      if (!this.active[i]) continue;
      const l = this.life[i] - dt;
      if (l <= 0) {
        this.active[i] = 0;
        this.sprites[i].visible = false;
        continue;
      }
      this.life[i] = l;
      this.pxs[i] = this.xs[i];
      this.pys[i] = this.ys[i];
      const k = this.drag[i] > 0 ? Math.exp(-this.drag[i] * dt) : 1;
      this.vxs[i] *= k;
      this.vys[i] = this.vys[i] * k + this.grav[i] * dt;
      this.xs[i] += this.vxs[i] * dt;
      this.ys[i] += this.vys[i] * dt;
      this.rot[i] += this.vr[i] * dt;
    }
  }

  render(alpha: number): void {
    for (let i = 0; i < this.capacity; i++) {
      if (!this.active[i]) continue;
      const s = this.sprites[i];
      const t = 1 - this.life[i] / this.maxLife[i];
      s.x = this.pxs[i] + (this.xs[i] - this.pxs[i]) * alpha;
      s.y = this.pys[i] + (this.ys[i] - this.pys[i]) * alpha;
      s.scale.set(this.s0[i] + (this.s1[i] - this.s0[i]) * t);
      s.alpha = this.a0[i] * (t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3);
      s.rotation = this.rot[i];
    }
  }

  clear(): void {
    for (let i = 0; i < this.capacity; i++) {
      this.active[i] = 0;
      this.sprites[i].visible = false;
    }
  }
}

const FONT = 'ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif';

/** Small pool of floating words ("+5", "Bonk!", "Slingshot!"). */
export class FloatTexts extends Container {
  private items: Array<{ t: Text; life: number; vy: number }> = [];

  constructor(count = 10) {
    super();
    for (let i = 0; i < count; i++) {
      const t = new Text({
        text: '',
        style: { fontFamily: FONT, fontSize: 40, fontWeight: '900', fill: '#ffe066', stroke: { color: '#20124d', width: 8, join: 'round' } },
      });
      t.anchor.set(0.5);
      t.visible = false;
      this.items.push({ t, life: 0, vy: 0 });
      this.addChild(t);
    }
  }

  show(text: string, x: number, y: number, color = '#ffe066', size = 40): void {
    let best = this.items[0];
    for (const it of this.items) {
      if (it.life <= 0) {
        best = it;
        break;
      }
      if (it.life < best.life) best = it;
    }
    if (best.t.text !== text) best.t.text = text;
    best.t.style.fill = color;
    best.t.style.fontSize = size;
    best.t.position.set(x, y);
    best.t.visible = true;
    best.t.alpha = 1;
    best.life = 1.2;
    best.vy = -70;
  }

  update(dt: number): void {
    for (const it of this.items) {
      if (it.life <= 0) continue;
      it.life -= dt;
      it.t.y += it.vy * dt;
      it.vy *= Math.exp(-2 * dt);
      const age = 1.2 - it.life;
      it.t.scale.set(age < 0.15 ? 0.5 + (age / 0.15) * 0.6 : 1.1 - Math.min(0.1, (age - 0.15) * 0.5));
      it.t.alpha = it.life < 0.3 ? it.life / 0.3 : 1;
      if (it.life <= 0) it.t.visible = false;
    }
  }
}

/** Screen shake helper. */
export class Shake {
  private time = 0;
  private power = 0;
  x = 0;
  y = 0;

  kick(power: number, time = 0.35): void {
    this.power = Math.max(this.power, power);
    this.time = Math.max(this.time, time);
  }

  update(dt: number): void {
    if (this.time <= 0) {
      this.x = this.y = 0;
      return;
    }
    this.time -= dt;
    const p = this.power * Math.max(0, this.time / 0.35);
    this.x = (Math.random() * 2 - 1) * p;
    this.y = (Math.random() * 2 - 1) * p;
    if (this.time <= 0) this.power = 0;
  }
}
