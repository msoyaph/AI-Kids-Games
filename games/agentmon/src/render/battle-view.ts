/**
 * The battle stage: a backdrop, your friend on the left facing right, the other Agentmon on the
 * right, and playful animations (hops, bouncy bumps with stars, sparkles, a shield bubble, a nap
 * with little z's). Nothing scary, no impact gore. Nothing flashes more than 3 times a second.
 * Battle sprites are 64 px (faces and outline drawn in 32-px design units) shown at a whole-number
 * scale; at rest they breathe and blink, and they cheer, squash on a bump and slump for a nap.
 * Also draws the Spark Ring befriending game and the growing (evolution) animation.
 */
import { Container, Graphics, Sprite, Text, type Texture } from 'pixi.js';
import { BG_H, BG_W, drawBackdrop, GROUND_Y, INDOOR_BG } from '../art/backdrops';
import type { DayTime } from '../core/world/daytime';
import type { MapDef } from '../core/world/map';
import type { Creature, Element } from '../core/types';
import { ELEMENT_INFO } from '../data/elements';
import { SPECIES } from '../data/species';
import type { Sprites } from './sprites';
import { FX, MOTION, wave } from './fx';
import { footAnchor } from '../art/painter';

export interface StageLayout { x: number; y: number; w: number; h: number }

interface Particle { g: Container; vx: number; vy: number; life: number; max: number; spin: number; fall?: number }

const ease = (t: number) => 1 - (1 - t) * (1 - t);
/** A springy 0 → 1 that overshoots a little and settles (a pop). */
const spring = (t: number) => (t >= 1 ? 1 : 1 - Math.exp(-6 * t) * Math.cos(t * 9));

export class BattleView {
  readonly root = new Container();
  private bg: Sprite;
  readonly sprites: [Sprite, Sprite];
  private shields: [Graphics, Graphics] = [new Graphics(), new Graphics()];
  /** Soft shadows on the ground under each friend (they shrink when it hops). */
  private shadows: [Graphics, Graphics] = [new Graphics(), new Graphics()];
  private fx = new Container();
  private particles: Particle[] = [];
  private base: [{ x: number; y: number }, { x: number; y: number }] = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
  private time = 0;
  bgScale = 4;
  /** Device pixels per design pixel (the 32-px design space); the 64 px textures show at monScale / 2. */
  monScale = 6;
  speed = 1;
  /** Reduced motion: no breathing or hops (blinks and pose faces stay). */
  calm = false;
  /** Random blinks (off for still captures, so screenshots repeat exactly). */
  blinks = true;
  /** 1.1: what your friends wear (an accessory number); only your side is dressed. */
  wearingOf: (c: Creature) => number = () => 0;
  private mons: [Creature | null, Creature | null] = [null, null];
  private faces: ['idle' | 'blink' | 'happy' | 'hit' | 'nap', 'idle' | 'blink' | 'happy' | 'hit' | 'nap'] = ['idle', 'idle'];
  private nextBlink = [1.4, 2.3];
  layout: StageLayout = { x: 0, y: 0, w: 1, h: 1 };
  /** Staggered stage for tall screens (see resize). */
  private portrait = false;
  private idle = [true, true];
  private napping = [false, false];
  private zzz: [Text | null, Text | null] = [null, null];

  constructor(private art: Sprites, kind: MapDef['battleBg'], time: DayTime = 'day') {
    const t = INDOOR_BG.includes(kind) ? 'day' : time;
    this.bg = new Sprite(art.get(`bg:${kind}:${t}`, () => drawBackdrop(kind, t)));
    this.sprites = [new Sprite(), new Sprite()];
    for (const s of this.sprites) s.anchor.set(0.5, 1);
    // no mask: the backdrop simply runs on under the see-through bottom panel (a stencil mask cost a
    // few ms a frame on slow tablets)
    for (const g of this.shadows) g.visible = false;
    this.root.addChild(this.bg, this.shadows[0], this.shadows[1], this.shields[0], this.shields[1], this.sprites[0], this.sprites[1], this.fx);
  }

  /** Fit the stage into a rectangle (device pixels). */
  resize(l: StageLayout): void {
    this.layout = l;
    this.bgScale = Math.max(1, Math.ceil(Math.max(l.w / BG_W, l.h / BG_H)));
    // 64 px textures at a whole-number scale stay crisp. Side by side, each friend fits a third of
    // the stage's width and under half its height, so the two never overlap (1.0's did on phones).
    // On a tall stage (a phone held upright) they stand staggered instead: the other one further
    // back on the right, your friend nearer on the left, so each can be half the width.
    this.portrait = l.h > l.w * 1.15;
    const fit = Math.floor((this.portrait ? Math.min(l.w * 0.5, l.h * 0.3) : Math.min(l.w * 0.34, l.h * 0.45)) / 64);
    this.monScale = 2 * Math.max(1, Math.min(Math.round(this.bgScale * 0.85), fit));
    this.bg.scale.set(this.bgScale);
    this.bg.x = l.x + Math.round((l.w - BG_W * this.bgScale) / 2);
    this.bg.y = l.y + Math.round((l.h - BG_H * this.bgScale) / 2);
    const groundY = this.bg.y + GROUND_Y * this.bgScale + this.bgScale * 4;
    if (this.portrait) {
      const near = Math.min(groundY + 16 * this.bgScale, l.y + l.h - 3 * this.bgScale);
      this.base = [{ x: l.x + l.w * 0.3, y: near }, { x: l.x + l.w * 0.7, y: groundY }];
    } else {
      const spread = Math.min(l.w * 0.3, 32 * this.monScale * 1.4);
      this.base = [{ x: l.x + l.w / 2 - spread, y: groundY }, { x: l.x + l.w / 2 + spread, y: groundY }];
    }
    for (const side of [0, 1] as const) {
      const s = this.sprites[side];
      this.shadows[side].clear().ellipse(0, 0, 12 * this.monScale, 2.4 * this.monScale).fill({ color: 0x2a1f3d, alpha: 0.2 });
      this.rest(side);
      s.x = this.base[side].x;
      s.y = this.base[side].y;
    }
  }

  /**
   * Where a friend's info card goes (device px; the card sits just above the point): over its head;
   * when staggered, yours goes beside your friend, to the right (over its head it would cover the
   * other one, and beside the other one it would cover the face turned toward you).
   */
  headPoint(side: 0 | 1): { x: number; y: number } {
    const l = this.layout;
    if (this.portrait && side === 0) return { x: l.x + l.w * 0.72, y: this.base[0].y };
    return { x: this.base[side].x, y: this.base[side].y - 30 * this.monScale };
  }

  setCreature(side: 0 | 1, c: Creature, pose: 'idle' | 'happy' | 'hit' | 'nap' = 'idle'): void {
    this.mons[side] = c;
    this.pose(side, c, pose);
    const s = this.sprites[side];
    s.visible = true;
    s.alpha = 1;
    s.rotation = 0;
    this.rest(side);
    this.napping[side] = pose === 'nap';
    if (!this.napping[side] && this.zzz[side]) { this.zzz[side]!.destroy(); this.zzz[side] = null; }
  }

  pose(side: 0 | 1, c: Creature, pose: 'idle' | 'blink' | 'happy' | 'hit' | 'nap'): void {
    this.faces[side] = pose;
    const s = this.sprites[side];
    s.texture = this.art.creature(c.species, 64, pose, c.shimmer, side === 0 ? this.wearingOf(c) : 0);
    s.anchor.set(0.5, footAnchor(s.texture.height));
  }

  /** The sprite's resting scale (64 px textures, facing the other side). */
  private rest(side: 0 | 1, sx = 1, sy = 1): void {
    const m = this.monScale / 2;
    this.sprites[side].scale.set(m * sx * (side === 0 ? -1 : 1), m * sy);
  }

  /** A happy hop or two with a big smile (a friend joins, a level up, a won spar). */
  async cheer(side: 0 | 1, c: Creature, hops = 2): Promise<void> {
    if (this.napping[side] || !this.sprites[side].visible) return;
    this.idle[side] = false;
    const s = this.sprites[side], by = this.base[side].y;
    this.pose(side, c, 'happy');
    if (this.calm) await this.wait(500);
    else {
      await this.tween(380 * hops, t => {
        const k = Math.abs(Math.sin(t * Math.PI * hops));
        s.y = by - k * 8 * this.bgScale;
        this.rest(side, 1 - k * 0.06, 1 + k * 0.08);
      });
    }
    s.y = by;
    this.rest(side);
    this.pose(side, c, 'idle');
    this.idle[side] = true;
  }

  hide(side: 0 | 1): void { this.sprites[side].visible = false; }

  private wait(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms / this.speed));
  }

  private tween(ms: number, f: (t: number) => void): Promise<void> {
    const dur = ms / this.speed;
    return new Promise(resolve => {
      const t0 = performance.now();
      const step = () => {
        const t = Math.min(1, (performance.now() - t0) / dur);
        f(t);
        if (t < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  }

  /**
   * A friend arrives: `run` hops in from its side and lands in a little dust puff (your friends, and
   * a trainer's); `pop` jumps out of the grass with a springy pop and a "!" (a wild one).
   * With reduced motion it simply fades in where it stands.
   */
  async enter(side: 0 | 1, c: Creature, how: 'run' | 'pop' = 'run'): Promise<void> {
    this.setCreature(side, c);
    const s = this.sprites[side], bx = this.base[side].x, by = this.base[side].y;
    this.idle[side] = false;
    if (this.calm) {
      s.x = bx; s.y = by; s.alpha = 0;
      await this.tween(280, t => { s.alpha = t; });
      s.alpha = 1;
    } else if (how === 'pop') {
      s.x = bx; s.y = by;
      this.puff(bx, by, 10, 0x8fd88a);
      await this.tween(520, t => {
        const k = Math.max(0.01, spring(t));
        this.rest(side, k, k * (1 + Math.sin(t * Math.PI) * 0.12));
        s.y = by - Math.sin(Math.min(1, t * 1.4) * Math.PI) * 12 * this.bgScale;
      });
      void this.exclaim(side);
    } else {
      const from = side === 0 ? this.layout.x - 40 * this.monScale : this.layout.x + this.layout.w + 40 * this.monScale;
      await this.tween(520, t => { s.x = from + (bx - from) * ease(t); s.y = by - Math.abs(Math.sin(t * Math.PI * 3)) * 6 * this.bgScale * (1 - t * 0.5); });
      this.puff(bx, by, 7, 0xfff3e0);
    }
    s.x = bx; s.y = by;
    this.rest(side);
    this.idle[side] = true;
  }

  /** A little puff at the feet (dust, or leaves when something jumps out of the grass). */
  private puff(x: number, y: number, n: number, color: number): void {
    for (let i = 0; i < n; i++) {
      const g = new Graphics().circle(0, 0, 1.6 + (i % 3) * 0.6).fill({ color, alpha: 0.9 });
      g.scale.set(this.bgScale);
      g.x = x + (i - n / 2) * 2 * this.bgScale;
      g.y = y - this.bgScale;
      this.fx.addChild(g);
      const dir = i < n / 2 ? -1 : 1;
      this.particles.push({ g, vx: dir * (18 + (i % 4) * 9) * this.bgScale, vy: -(14 + (i % 3) * 8) * this.bgScale, life: 0.5, max: 0.5, spin: 0, fall: 40 });
    }
  }

  /** A "!" over its head (a wild one notices you). */
  private async exclaim(side: 0 | 1): Promise<void> {
    const s = this.sprites[side];
    const t = new Text({ text: '!', style: { fill: 0xffcf5c, fontSize: 18 * this.bgScale, fontWeight: '900', stroke: { color: 0x2a1f3d, width: 4 * this.bgScale } } });
    t.anchor.set(0.5, 1);
    t.x = s.x + (side === 0 ? -1 : 1) * 10 * this.monScale;
    t.y = s.y - 28 * this.monScale;
    this.fx.addChild(t);
    await this.tween(240, k => t.scale.set(spring(k)));
    await this.wait(520);
    await this.tween(200, k => { t.alpha = 1 - k; });
    t.destroy();
  }

  /**
   * An attack: the hop toward the other side, and a volley of the move's element shape (flames,
   * drops, leaves, pebbles, swirls, snowflakes, zigzags or stars) arcing over to it. The shapes are
   * the element icons, so the effect reads without colour.
   */
  async attack(side: 0 | 1, element: Element | 'plain'): Promise<void> {
    if (element !== 'plain' && !this.calm) void this.volley(side, element);
    await this.lunge(side);
  }

  private async volley(side: 0 | 1, element: Element): Promise<void> {
    const from = this.sprites[side], to = this.sprites[side === 0 ? 1 : 0];
    const x0 = from.x, y0 = from.y - 16 * this.monScale, x1 = to.x, y1 = to.y - 14 * this.monScale;
    const tex = this.art.element(element);
    const shots = Array.from({ length: 5 }, async (_, i) => {
      await this.wait(i * 70);
      const p = new Sprite(tex);
      p.anchor.set(0.5);
      // whole-number scales keep the icon's pixels square (12 px icons: about a quarter of a friend's height)
      p.scale.set(Math.max(1, Math.round(this.monScale * (0.6 + (i % 2) * 0.2))));
      this.fx.addChild(p);
      const lift = (10 + (i % 3) * 7) * this.monScale, wob = (i - 2) * 3 * this.monScale;
      await this.tween(360, t => {
        p.x = x0 + (x1 - x0) * t;
        p.y = y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * lift + Math.sin(t * Math.PI) * wob * 0.3;
        p.rotation = element === 'gust' ? t * 6 : 0;
        p.alpha = t < 0.85 ? 1 : (1 - t) / 0.15;
      });
      p.destroy();
    });
    await Promise.all(shots);
  }

  async leave(side: 0 | 1): Promise<void> {
    const s = this.sprites[side];
    const to = side === 0 ? this.layout.x - 40 * this.monScale : this.layout.x + this.layout.w + 40 * this.monScale;
    const from = s.x;
    await this.tween(300, t => { s.x = from + (to - from) * t; });
    s.visible = false;
  }

  /** The attacker hops toward the other side. */
  async lunge(side: 0 | 1): Promise<void> {
    this.idle[side] = false;
    const s = this.sprites[side], dir = side === 0 ? 1 : -1;
    const bx = this.base[side].x, by = this.base[side].y;
    await this.tween(260, t => { const k = Math.sin(t * Math.PI); s.x = bx + dir * k * 22 * this.bgScale; s.y = by - k * 10 * this.bgScale; });
    s.x = bx;
    s.y = by;
    this.idle[side] = true;
  }

  /** A friendly bump: squash and wobble, a few stars, bigger sparkles when it's super strong. */
  async bump(side: 0 | 1, matchup: 'strong' | 'weak' | 'neutral', element: Element | 'plain', c: Creature): Promise<void> {
    this.idle[side] = false;
    const s = this.sprites[side];
    const sign = side === 0 ? -1 : 1;
    this.pose(side, c, 'hit');
    const color = element === 'plain' ? 0xfff3b0 : ELEMENT_INFO[element].color;
    const { x, y } = s;
    this.burst(x, y - 16 * this.monScale, matchup === 'strong' ? 14 : matchup === 'weak' ? 4 : 8, color, matchup === 'strong' ? 1.4 : 1, false, element === 'plain' ? undefined : element);
    await this.tween(360, t => {
      const k = Math.sin(t * Math.PI);
      this.rest(side, 1 + k * 0.12, 1 - k * 0.12);
      if (!this.calm) s.x = this.base[side].x + Math.sin(t * Math.PI * 3) * (1 - t) * 3 * this.bgScale * -sign;
    });
    this.rest(side);
    s.x = this.base[side].x;
    this.pose(side, c, 'idle');
    this.idle[side] = true;
  }

  async glow(side: 0 | 1, color: number): Promise<void> {
    const s = this.sprites[side];
    this.burst(s.x, s.y - 14 * this.monScale, 10, color, 0.7, true);
    await this.tween(420, t => { s.tint = blend(0xffffff, color, Math.sin(t * Math.PI) * 0.5); });
    s.tint = 0xffffff;
  }

  async boost(side: 0 | 1, up: boolean): Promise<void> {
    const s = this.sprites[side];
    for (let i = 0; i < 5; i++) {
      const g = new Graphics().poly(up ? [0, -6, 5, 2, -5, 2] : [0, 6, 5, -2, -5, -2]).fill(up ? 0xffd84a : 0x9fa8d8);
      g.x = s.x + (i - 2) * 6 * this.bgScale;
      g.y = s.y - (8 + (i % 2) * 6) * this.monScale;
      g.scale.set(this.bgScale * 0.8);
      this.fx.addChild(g);
      this.particles.push({ g, vx: 0, vy: up ? -30 * this.bgScale : 20 * this.bgScale, life: 0.8, max: 0.8, spin: 0 });
    }
    await this.wait(450);
  }

  async shield(side: 0 | 1, on: boolean): Promise<void> {
    const g = this.shields[side];
    g.clear();
    if (!on) return;
    const s = this.sprites[side];
    const r = 20 * this.monScale;
    g.circle(s.x, s.y - 15 * this.monScale, r).fill({ color: 0xbfe6ff, alpha: 0.28 }).stroke({ color: 0xffffff, alpha: 0.7, width: this.bgScale });
    await this.wait(250);
  }

  async nap(side: 0 | 1, c: Creature): Promise<void> {
    this.setCreature(side, c, 'nap');
    const s = this.sprites[side];
    const by = this.base[side].y, tilt = side === 0 ? -0.1 : 0.1;
    // a slump: it settles lower and softer, tips a little to one side and dims a touch
    await this.tween(500, t => {
      const k = ease(t);
      s.y = by + Math.sin(t * Math.PI) * 2 * this.bgScale;
      this.rest(side, 1 + k * 0.05, 1 - k * 0.1);
      s.rotation = this.calm ? 0 : tilt * k;
      s.alpha = 1 - t * 0.25;
    });
    const z = new Text({ text: 'z z z', style: { fill: 0xffffff, fontSize: 9 * this.bgScale, fontWeight: '900', stroke: { color: 0x2a1f3d, width: 2 * this.bgScale } } });
    z.anchor.set(0.5);
    z.x = s.x + 10 * this.monScale;
    z.y = s.y - 30 * this.monScale;
    this.fx.addChild(z);
    this.zzz[side] = z;
  }

  async status(side: 0 | 1, tex: Texture): Promise<void> {
    const s = this.sprites[side];
    const icon = new Sprite(tex);
    icon.anchor.set(0.5);
    icon.scale.set(this.bgScale * 1.5);
    icon.x = s.x;
    icon.y = s.y - 34 * this.monScale;
    this.fx.addChild(icon);
    await this.tween(700, t => { icon.y -= 0.4 * this.bgScale; icon.alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3; });
    icon.destroy();
  }

  /** Floating words ("Super strong!", "+12"). */
  async float(side: 0 | 1, text: string, color = 0xffffff): Promise<void> {
    const s = this.sprites[side];
    const t = new Text({ text, style: { fill: color, fontSize: 10 * this.bgScale, fontWeight: '900', stroke: { color: 0x2a1f3d, width: 3 * this.bgScale } } });
    t.anchor.set(0.5);
    t.x = s.x;
    t.y = s.y - 34 * this.monScale;
    this.fx.addChild(t);
    await this.tween(800, k => { t.y -= 0.5 * this.bgScale; t.alpha = k < 0.75 ? 1 : 1 - (k - 0.75) * 4; });
    t.destroy();
  }

  private burst(x: number, y: number, n: number, color: number, power = 1, gentle = false, element?: Element): void {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const star = i % 2 === 0 && !gentle;
      let g: Container;
      if (element && i % 2 === 1) {
        // the element's own shape, so a bump says which element it was without colour
        const icon = new Sprite(this.art.element(element));
        icon.anchor.set(0.5);
        g = icon;
      } else {
        const d = new Graphics();
        if (star) d.poly([0, -3, 1, -1, 3, 0, 1, 1, 0, 3, -1, 1, -3, 0, -1, -1]).fill(i % 4 === 0 ? 0xffffff : color);
        else d.circle(0, 0, 1.4).fill(color);
        g = d;
      }
      g.scale.set(element && i % 2 === 1 ? Math.max(1, Math.round(this.monScale * (0.45 + power * 0.15))) : this.bgScale * (0.8 + power * 0.4));
      g.x = x;
      g.y = y;
      this.fx.addChild(g);
      const v = (40 + Math.random() * 30) * this.bgScale * power;
      this.particles.push({ g, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 10 * this.bgScale, life: 0.6, max: 0.6, spin: (Math.random() - 0.5) * 6 });
    }
  }

  update(dt: number): void {
    this.time += dt;
    for (const side of [0, 1] as const) {
      const s = this.sprites[side], c = this.mons[side], sh = this.shadows[side];
      sh.visible = s.visible && s.alpha > 0.05;
      if (sh.visible) {
        const lift = Math.max(0, this.base[side].y - s.y);
        sh.x = s.x;
        sh.y = this.base[side].y - this.monScale * 0.6;
        sh.scale.set(Math.max(0.5, 1 - lift / (36 * this.monScale)) * Math.min(1, Math.abs(s.scale.x) / (this.monScale / 2)));
        sh.alpha = s.alpha;
      }
      if (this.idle[side] && s.visible && !this.napping[side]) {
        // breathing: a slow, gentle stretch from the feet (no brightness change)
        const b = this.calm ? 0 : wave(MOTION.breatheHz, this.time, side * 1.7);
        this.rest(side, 1 - b * 0.012, 1 + b * 0.025);
        s.y = this.base[side].y;
        // blinking now and then, never in step with the other side
        if (this.blinks) this.nextBlink[side]! -= dt;
        if (c && this.faces[side] === 'idle' && this.nextBlink[side]! <= 0) { this.pose(side, c, 'blink'); this.nextBlink[side] = 0.13; }
        else if (c && this.faces[side] === 'blink' && this.nextBlink[side]! <= 0) { this.pose(side, c, 'idle'); this.nextBlink[side] = 2.2 + Math.random() * 2.6; }
      }
      const z = this.zzz[side];
      if (z) z.alpha = 0.6 + wave(FX.napFadeHz, this.time) * 0.3;
    }
    for (const p of [...this.particles]) {
      p.life -= dt * this.speed;
      p.g.x += p.vx * dt * this.speed;
      p.g.y += p.vy * dt * this.speed;
      p.vy += (p.fall ?? 60) * this.bgScale * dt * this.speed;
      p.g.rotation += p.spin * dt;
      p.g.alpha = Math.max(0, p.life / p.max);
      if (p.life <= 0) { p.g.destroy(); this.particles = this.particles.filter(x => x !== p); }
    }
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }
}

function blend(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255, br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}

export const speciesName = (c: Creature) => SPECIES[c.species]?.name ?? c.species;
