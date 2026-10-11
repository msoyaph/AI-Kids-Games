/** Pooled particles, floating text and sprite shakes in world space. No allocation per frame. */
import { Container, Sprite, Text, type Texture } from 'pixi.js';

interface Particle {
  s: Sprite;
  vx: number;
  vy: number;
  g: number;
  life: number;
  max: number;
  spin: number;
  fade: boolean;
}

interface Floater {
  t: Text;
  life: number;
  vy: number;
}

interface Shake {
  s: Sprite;
  baseX: number;
  t: number;
}

export class Fx {
  readonly layer = new Container();
  private pool: Particle[] = [];
  private live: Particle[] = [];
  private floaters: Floater[] = [];
  private floaterPool: Text[] = [];
  private shakes: Shake[] = [];
  enabled = true;
  reduced = false;

  burst(tex: Texture, x: number, y: number, n: number, opts: { color?: number; speed?: number; up?: number; life?: number; gravity?: number; scale?: number; fade?: boolean } = {}): void {
    if (!this.enabled) return;
    if (this.reduced) n = Math.ceil(n / 3);
    const sp = opts.speed ?? 40;
    for (let i = 0; i < n; i++) {
      const p = this.pool.pop() ?? { s: new Sprite(), vx: 0, vy: 0, g: 0, life: 0, max: 0, spin: 0, fade: true };
      p.s.texture = tex;
      p.s.anchor.set(0.5);
      p.s.tint = opts.color ?? 0xffffff;
      p.s.alpha = 1;
      p.s.scale.set(opts.scale ?? 1);
      p.s.rotation = 0;
      p.s.x = x + (Math.random() - 0.5) * 6;
      p.s.y = y + (Math.random() - 0.5) * 4;
      const a = Math.random() * Math.PI * 2;
      p.vx = Math.cos(a) * sp * (0.4 + Math.random() * 0.6);
      p.vy = Math.sin(a) * sp * 0.5 - (opts.up ?? 30) * (0.6 + Math.random() * 0.6);
      p.g = opts.gravity ?? 160;
      p.max = p.life = (opts.life ?? 0.6) * (0.7 + Math.random() * 0.6);
      p.spin = (Math.random() - 0.5) * 8;
      p.fade = opts.fade ?? true;
      this.layer.addChild(p.s);
      this.live.push(p);
    }
  }

  text(str: string, x: number, y: number, color = 0xffffff): void {
    if (!this.enabled) return;
    const t =
      this.floaterPool.pop() ??
      new Text({ text: '', style: { fontFamily: 'Trebuchet MS, Verdana, sans-serif', fontSize: 9, fontWeight: '700', fill: 0xffffff, stroke: { color: 0x1a1520, width: 2 } }, resolution: 4 });
    t.text = str;
    t.style.fill = color;
    t.anchor.set(0.5, 1);
    t.x = Math.round(x);
    t.y = Math.round(y);
    t.alpha = 1;
    this.layer.addChild(t);
    this.floaters.push({ t, life: 1, vy: -18 });
  }

  shake(s: Sprite): void {
    if (this.reduced) return;
    const ex = this.shakes.find((k) => k.s === s);
    if (ex) {
      ex.t = 0.25;
      return;
    }
    this.shakes.push({ s, baseX: s.x, t: 0.25 });
  }

  update(dt: number): void {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.s.removeFromParent();
        this.pool.push(p);
        this.live[i] = this.live[this.live.length - 1];
        this.live.pop();
        continue;
      }
      p.vy += p.g * dt;
      p.s.x += p.vx * dt;
      p.s.y += p.vy * dt;
      p.s.rotation += p.spin * dt;
      if (p.fade) p.s.alpha = Math.min(1, (p.life / p.max) * 2);
    }
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.life -= dt;
      f.t.y += f.vy * dt;
      f.t.alpha = Math.min(1, f.life * 2);
      if (f.life <= 0) {
        f.t.removeFromParent();
        this.floaterPool.push(f.t);
        this.floaters.splice(i, 1);
      }
    }
    for (let i = this.shakes.length - 1; i >= 0; i--) {
      const k = this.shakes[i];
      k.t -= dt;
      if (k.t <= 0 || !k.s.parent) {
        k.s.x = k.baseX;
        this.shakes.splice(i, 1);
      } else k.s.x = k.baseX + Math.round(Math.sin(k.t * 60) * 1.5);
    }
  }

  clear(): void {
    for (const p of this.live) {
      p.s.removeFromParent();
      this.pool.push(p);
    }
    this.live.length = 0;
    for (const f of this.floaters) {
      f.t.removeFromParent();
      this.floaterPool.push(f.t);
    }
    this.floaters.length = 0;
    for (const k of this.shakes) k.s.x = k.baseX;
    this.shakes.length = 0;
  }
}
