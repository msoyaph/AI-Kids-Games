/**
 * Lighting: screen-space time-of-day tint, cave darkness with a soft light circle around
 * the player, and additive glows on lamps/windows at night. Works on WebGL and Canvas.
 */
import { Container, Sprite, Texture, type Renderer } from 'pixi.js';
import { TILE } from '../core/math';
import type { Loc } from '../sim/world';

function radialTexture(size: number, inner: number, stops: [number, number][]): Texture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, inner, size / 2, size / 2, size / 2);
  for (const [o, a] of stops) g.addColorStop(o, `rgba(0,0,0,${a})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return Texture.from(c);
}

function glowTexture(size: number): Texture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,220,140,0.75)');
  g.addColorStop(0.4, 'rgba(255,190,100,0.3)');
  g.addColorStop(1, 'rgba(255,170,80,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return Texture.from(c);
}

/** Tint color + alpha for a time of day (minutes). */
export function skyTint(min: number, outdoor: boolean, weatherDim: number): { color: number; alpha: number } {
  const h = min / 60;
  let color = 0x000000, alpha = 0;
  if (h < 7) {
    color = 0x30406a;
    alpha = 0.25 * (7 - h);
  } else if (h >= 17 && h < 19) {
    color = 0xff9a50;
    alpha = 0.12 * ((h - 17) / 2);
  } else if (h >= 19 && h < 21) {
    const t = (h - 19) / 2;
    color = mixC(0xc07a80, 0x24306a, t);
    alpha = 0.18 + t * 0.27;
  } else if (h >= 21) {
    color = 0x24306a;
    alpha = Math.min(0.55, 0.45 + (h - 21) * 0.02);
  }
  if (!outdoor) alpha *= 0.35;
  if (outdoor && weatherDim > 0 && alpha < weatherDim) {
    color = mixC(0x404860, color, alpha / Math.max(0.01, weatherDim));
    alpha = Math.max(alpha, weatherDim);
  }
  return { color, alpha };
}

function mixC(a: number, b: number, t: number): number {
  const r = ((a >> 16) & 255) + ((((b >> 16) & 255) - ((a >> 16) & 255)) * t);
  const g = ((a >> 8) & 255) + ((((b >> 8) & 255) - ((a >> 8) & 255)) * t);
  const bl = (a & 255) + (((b & 255) - (a & 255)) * t);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
}

export class Lighting {
  /** screen-space layer (added above the world) */
  readonly screen = new Container();
  /** world-space glows (added into the world view) */
  readonly glows = new Container();
  private tint = new Sprite(Texture.WHITE);
  private hole: Sprite;
  private edges: Sprite[] = [];
  private glowTex: Texture;
  private glowPool: Sprite[] = [];
  private glowFor: Loc | null = null;
  private glowVersion = -1;
  enabled = true;

  constructor() {
    this.tint.blendMode = 'multiply';
    this.screen.addChild(this.tint);
    this.hole = new Sprite(radialTexture(256, 30, [[0, 0], [0.55, 0.55], [1, 0.92]]));
    this.hole.anchor.set(0.5);
    this.screen.addChild(this.hole);
    for (let i = 0; i < 4; i++) {
      const e = new Sprite(Texture.WHITE);
      e.tint = 0x000000;
      this.edges.push(e);
      this.screen.addChild(e);
    }
    this.glowTex = glowTexture(64);
    this.glows.blendMode = 'add';
  }

  update(r: { width: number; height: number; zoom: number }, loc: Loc, min: number, psx: number, psy: number, weatherDim: number, darkness: number): void {
    const W = r.width, H = r.height;
    if (!this.enabled) {
      this.screen.visible = false;
      this.glows.visible = false;
      return;
    }
    this.screen.visible = true;
    const { color, alpha } = skyTint(min, loc.def.outdoor, weatherDim);
    // multiply toward the sky color: white = no change
    this.tint.tint = mixC(0xffffff, color, Math.min(0.85, alpha * 1.45));
    this.tint.alpha = loc.def.dark ? 0 : 1;
    this.tint.visible = !loc.def.dark && alpha > 0.005;
    this.tint.width = W;
    this.tint.height = H;
    // caves: darkness with a light around the player
    const dark = loc.def.dark ? darkness : 0;
    this.hole.visible = dark > 0;
    for (const e of this.edges) e.visible = dark > 0;
    if (dark > 0) {
      const size = Math.round(Math.max(W, H) * 0.9 + r.zoom * 40);
      this.hole.width = this.hole.height = size;
      this.hole.alpha = dark;
      this.hole.x = Math.round(psx);
      this.hole.y = Math.round(psy);
      const x0 = this.hole.x - size / 2, y0 = this.hole.y - size / 2, x1 = x0 + size, y1 = y0 + size;
      const [a, b, c, d] = this.edges;
      a.x = 0; a.y = 0; a.width = W; a.height = Math.max(0, y0);
      b.x = 0; b.y = y1; b.width = W; b.height = Math.max(0, H - y1);
      c.x = 0; c.y = y0; c.width = Math.max(0, x0); c.height = size;
      d.x = x1; d.y = y0; d.width = Math.max(0, W - x1); d.height = size;
      for (const e of this.edges) e.alpha = dark * 0.92;
    }
    // night glows on lamps & windows
    const night = alpha > 0.18 || !!loc.def.dark;
    this.glows.visible = night;
    if (night && (this.glowFor !== loc || this.glowVersion !== loc.objVersion)) this.buildGlows(loc);
    this.glows.alpha = loc.def.dark ? 0.9 : Math.min(1, alpha * 2);
  }

  private buildGlows(loc: Loc): void {
    this.glowFor = loc;
    this.glowVersion = loc.objVersion;
    for (const s of this.glowPool) s.visible = false;
    let i = 0;
    const add = (x: number, y: number, scale: number) => {
      let s = this.glowPool[i];
      if (!s) {
        s = new Sprite(this.glowTex);
        s.anchor.set(0.5);
        this.glowPool.push(s);
        this.glows.addChild(s);
      }
      s.visible = true;
      s.x = x;
      s.y = y;
      s.scale.set(scale);
      i++;
    };
    for (const p of loc.def.props) {
      if (p.kind === 'lamp' || p.kind === 'lanternPost') add(p.x * TILE + 8, p.y * TILE - 4, 1.2);
      else if (p.kind === 'lantern' || p.kind === 'crystal' || p.kind === 'fireplace') add(p.x * TILE + 8, p.y * TILE + 6, 0.9);
    }
    for (const st of loc.structs) {
      if (!st.def || !loc.def.outdoor || !st.def.look.windows) continue;
      add(st.sp.x * TILE + (st.def.w * TILE) / 2, (st.sp.y + st.def.h) * TILE - 18, 1.4);
    }
    for (const [idx, o] of loc.objs) {
      if (o.k === 'torch' || (o.k === 'deco' && /lamp|lantern|Torch|Light/i.test(o.id))) add((idx % loc.w) * TILE + 8, Math.floor(idx / loc.w) * TILE + 4, 1);
      if (o.k === 'gem' || (o.k === 'ore' && o.id === 'crystaliteOre')) add((idx % loc.w) * TILE + 8, Math.floor(idx / loc.w) * TILE + 8, 0.5);
    }
  }
}

export type { Renderer };
