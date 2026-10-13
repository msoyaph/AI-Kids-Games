/**
 * Effects: pooled sparkles and confetti (typed arrays, nothing allocated per frame), floating
 * words, a gentle glow (never a strobe: at most 3 glows a second, FlashLimiter from Vanex Defense's
 * idea), and a subtle screen shake. Reduced motion turns shake and big effects off and uses a
 * quarter of the particles.
 */
import { Container, Sprite, type Texture } from 'pixi.js';
import type { Atlas } from './atlas';
import { FlashLimiter } from './flash';
import { wordTexture } from './words';

const MAX = 240;

export class Fx {
  readonly layer = new Container();
  readonly wordLayer = new Container();
  private sprites: Sprite[] = [];
  private x = new Float32Array(MAX); private y = new Float32Array(MAX); private vx = new Float32Array(MAX); private vy = new Float32Array(MAX);
  private life = new Float32Array(MAX); private max = new Float32Array(MAX); private size = new Float32Array(MAX); private spin = new Float32Array(MAX); private grav = new Float32Array(MAX); private grow = new Float32Array(MAX);
  private free: number[] = [];
  private words: { sprite: Sprite; t: number; dur: number; x: number; y: number; scale: number }[] = [];
  readonly flashes = new FlashLimiter(3);
  /** The glow overlay's alpha (a sprite the stage owns), decaying. */
  glow = 0;
  shakeX = 0; shakeY = 0;
  private shake = 0;
  reduced = false; shakeOn = true;
  private seed = 12345;

  constructor(private atlas: Atlas) {
    for (let i = 0; i < MAX; i++) {
      const s = new Sprite(atlas.sparkle); s.anchor.set(0.5); s.visible = false;
      this.layer.addChild(s); this.sprites.push(s); this.free.push(i);
    }
    for (let i = 0; i < 6; i++) { const s = new Sprite(); s.anchor.set(0.5); s.visible = false; this.wordLayer.addChild(s); this.words.push({ sprite: s, t: 1, dur: 1, x: 0, y: 0, scale: 1 }); }
  }

  setAtlas(atlas: Atlas) { this.atlas = atlas; }
  private rnd() { this.seed ^= this.seed << 13; this.seed ^= this.seed >>> 17; this.seed ^= this.seed << 5; return ((this.seed >>> 0) % 10000) / 10000; }

  private spawn(tex: Texture, x: number, y: number, vx: number, vy: number, life: number, size: number, grav: number, spin: number, grow = 0) {
    const i = this.free.pop();
    if (i === undefined) return;
    const s = this.sprites[i]!;
    s.texture = tex; s.visible = true; s.alpha = 1; s.rotation = this.rnd() * 6.28;
    this.x[i] = x; this.y[i] = y; this.vx[i] = vx; this.vy[i] = vy; this.life[i] = life; this.max[i] = life; this.size[i] = size; this.grav[i] = grav; this.spin[i] = spin; this.grow[i] = grow;
  }

  /** Sparkles bursting from a cleared cell (cell size `c`). */
  sparkles(x: number, y: number, c: number, n: number) {
    n = this.reduced ? Math.ceil(n / 4) : n;
    for (let k = 0; k < n; k++) {
      const a = this.rnd() * 6.283, v = c * (1.2 + this.rnd() * 2.4);
      this.spawn(this.atlas.sparkle, x + (this.rnd() - 0.5) * c * 0.6, y + (this.rnd() - 0.5) * c * 0.6, Math.cos(a) * v, Math.sin(a) * v - c, 0.45 + this.rnd() * 0.35, (0.3 + this.rnd() * 0.45) / (this.atlas.cell / c), c * 3, 0);
    }
  }

  /** Confetti from the top of the screen (a new best, a board clear, a level won). */
  confetti(w: number, c: number, n = 90) {
    if (this.reduced) n = Math.ceil(n / 4);
    for (let k = 0; k < n; k++) {
      const tex = this.atlas.confetti[k % this.atlas.confetti.length]!;
      this.spawn(tex, this.rnd() * w, -c - this.rnd() * c * 3, (this.rnd() - 0.5) * c * 3, c * (1 + this.rnd() * 2), 2.2 + this.rnd() * 1.2, (0.5 + this.rnd() * 0.5) * c / this.atlas.cell, c * 2.2, (this.rnd() - 0.5) * 10);
    }
  }

  /** Soft rings spreading from the middle of the board (a board clear). A glow, never a strobe. */
  rings(x: number, y: number, size: number) {
    const n = this.reduced ? 1 : 3;
    for (let k = 0; k < n; k++) this.spawn(this.atlas.ring, x, y, 0, 0, 0.8 + k * 0.22, (size / this.atlas.cell) * 0.15, 0, 0, 5 + k * 1.5);
  }

  /** A word (and its points) that pops up, grows and floats away. `scale` grows with the streak. */
  word(text: string, x: number, y: number, size: number, color: string, scale = 1, dur = 1.1, maxWidth = Infinity) {
    const w = this.words.find(v => v.t >= v.dur) ?? this.words[0]!;
    const tex = wordTexture(text, size, color);
    w.sprite.texture = tex;
    w.sprite.visible = true; w.t = 0; w.dur = this.reduced ? dur * 0.8 : dur; w.x = x; w.y = y;
    // never wider than the space it pops up in (it grows to 1.15× at the top of its pop)
    w.scale = Math.min(scale, maxWidth / (tex.width * 1.15));
  }

  /** A soft glow over the board, limited to 3 a second. */
  flash(now: number, strength = 0.35) { if (this.flashes.allow(now)) this.glow = Math.max(this.glow, this.reduced ? strength * 0.4 : strength); }
  kick(amount: number) { if (this.shakeOn && !this.reduced) this.shake = Math.min(1, this.shake + amount); }

  /** Advances everything; returns whether anything is still moving. */
  update(dt: number): boolean {
    let busy = false;
    for (let i = 0; i < MAX; i++) {
      if (this.life[i]! <= 0) continue;
      busy = true;
      this.life[i]! -= dt;
      const s = this.sprites[i]!;
      if (this.life[i]! <= 0) { s.visible = false; this.free.push(i); continue; }
      this.vy[i]! += this.grav[i]! * dt; this.vx[i]! *= 1 - 1.5 * dt;
      this.x[i]! += this.vx[i]! * dt; this.y[i]! += this.vy[i]! * dt;
      const k = this.life[i]! / this.max[i]!;
      s.position.set(this.x[i]!, this.y[i]!); s.rotation += this.spin[i]! * dt;
      if (this.grow[i]) { s.scale.set(this.size[i]! * (1 + this.grow[i]! * (1 - k))); s.alpha = k * 0.8; }
      else { s.scale.set(this.size[i]! * (this.spin[i] ? 1 : 0.6 + 0.4 * k)); s.alpha = Math.min(1, k * 2.5); }
    }
    for (const w of this.words) {
      if (w.t >= w.dur) { if (w.sprite.visible) w.sprite.visible = false; continue; }
      busy = true; w.t += dt;
      const k = Math.min(1, w.t / w.dur);
      const pop = k < 0.18 ? 0.4 + (k / 0.18) * 0.75 : k < 0.3 ? 1.15 - ((k - 0.18) / 0.12) * 0.15 : 1;
      w.sprite.position.set(w.x, w.y - (this.reduced ? 0 : k * 40));
      w.sprite.scale.set(pop * w.scale); w.sprite.alpha = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
    }
    if (this.glow > 0) { busy = true; this.glow = Math.max(0, this.glow - dt * 1.6); }
    if (this.shake > 0) {
      busy = true; this.shake = Math.max(0, this.shake - dt * 3);
      const m = this.shake * this.shake * 6;
      this.shakeX = (this.rnd() - 0.5) * m; this.shakeY = (this.rnd() - 0.5) * m;
    } else { this.shakeX = 0; this.shakeY = 0; }
    return busy;
  }

  clear() { for (let i = 0; i < MAX; i++) if (this.life[i]! > 0) { this.life[i] = 0; this.sprites[i]!.visible = false; this.free.push(i); } for (const w of this.words) { w.t = w.dur; w.sprite.visible = false; } this.glow = 0; this.shake = 0; }
  /** How many particles are alive (the test hook reports it). */
  alive() { return MAX - this.free.length; }
}
