import { Particle, ParticleContainer, type Texture } from 'pixi.js';

export interface EmitOpts {
  tex: Texture;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  life?: number;
  scale?: number;
  scaleEnd?: number;
  alpha?: number;
  alphaEnd?: number;
  tint?: number;
  gravity?: number;
  drag?: number;
  spin?: number;
  rotation?: number;
}

class PData {
  readonly p: Particle;
  vx = 0;
  vy = 0;
  life = 0;
  max = 1;
  s0 = 1;
  s1 = 1;
  a0 = 1;
  a1 = 0;
  g = 0;
  drag = 0;
  spin = 0;
  constructor(tex: Texture) {
    this.p = new Particle({ texture: tex, anchorX: 0.5, anchorY: 0.5 });
  }
}

/**
 * Pooled particle system on top of Pixi's ParticleContainer. The active
 * particle list *is* the container's child array (swap-remove, no splice).
 */
export class Particles {
  readonly container: ParticleContainer;
  private active: PData[] = [];
  private free: PData[] = [];
  budget: number;

  constructor(firstTex: Texture, budget: number, additive = false) {
    this.container = new ParticleContainer({
      texture: firstTex,
      dynamicProperties: { position: true, rotation: true, color: true, vertex: true, uvs: true },
    });
    if (additive) this.container.blendMode = 'add';
    this.budget = budget;
  }

  get count(): number {
    return this.active.length;
  }

  emit(o: EmitOpts): void {
    if (this.active.length >= this.budget) return;
    let d = this.free.pop();
    if (!d) d = new PData(o.tex);
    const p = d.p;
    p.texture = o.tex;
    p.x = o.x;
    p.y = o.y;
    p.rotation = o.rotation ?? 0;
    d.vx = o.vx ?? 0;
    d.vy = o.vy ?? 0;
    d.life = d.max = o.life ?? 0.6;
    d.s0 = o.scale ?? 1;
    d.s1 = o.scaleEnd ?? d.s0;
    d.a0 = o.alpha ?? 1;
    d.a1 = o.alphaEnd ?? 0;
    d.g = o.gravity ?? 0;
    d.drag = o.drag ?? 0;
    d.spin = o.spin ?? 0;
    p.scaleX = p.scaleY = d.s0;
    p.tint = o.tint ?? 0xffffff;
    p.alpha = d.a0;
    this.active.push(d);
    this.container.particleChildren.push(p);
  }

  update(dt: number): void {
    const act = this.active;
    const kids = this.container.particleChildren;
    let changed = false;
    for (let i = act.length - 1; i >= 0; i--) {
      const d = act[i]!;
      d.life -= dt;
      if (d.life <= 0) {
        const last = act.pop()!;
        const lastP = kids.pop()!;
        if (i < act.length) {
          act[i] = last;
          kids[i] = lastP;
        }
        this.free.push(d);
        changed = true;
        continue;
      }
      const t = 1 - d.life / d.max;
      const p = d.p;
      if (d.drag) {
        const k = Math.max(0, 1 - d.drag * dt);
        d.vx *= k;
        d.vy *= k;
      }
      d.vy += d.g * dt;
      p.x += d.vx * dt;
      p.y += d.vy * dt;
      if (d.spin) p.rotation += d.spin * dt;
      const s = d.s0 + (d.s1 - d.s0) * t;
      p.scaleX = p.scaleY = s;
      p.alpha = d.a0 + (d.a1 - d.a0) * t;
    }
    if (changed || act.length > 0) this.container.update();
  }

  clear(): void {
    while (this.active.length) this.free.push(this.active.pop()!);
    this.container.particleChildren.length = 0;
    this.container.update();
  }
}
