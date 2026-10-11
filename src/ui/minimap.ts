import { F_ICE } from '../sim/track/trackModel';
import type { TrackModel } from '../sim/track/trackModel';
import type { ArenaModel } from '../sim/arena';
import type { Kart } from '../sim/kart';

const KART_COLORS = ['#ff4d6d', '#3fa7ff', '#ffd23f', '#8cff6b', '#b47bff', '#ff9f1c', '#4ce0d2', '#ff6fae', '#ffffff', '#c0c8d8', '#a1887f', '#e040fb'];

/**
 * 2D minimap: the course is pre-rendered once into an offscreen canvas; each redraw blits it and adds kart dots.
 * Redraws are throttled (~15 Hz) to keep the HUD cheap.
 */
export class Minimap {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private bg: HTMLCanvasElement | null = null;
  private minX = 0;
  private minZ = 0;
  private scale = 1;
  private size = 150;
  private timer = 0;
  private readonly pad = 8;

  constructor(
    readonly course: { track?: TrackModel; arena?: ArenaModel },
    readonly mirror: boolean,
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'hud-minimap';
    this.ctx = this.canvas.getContext('2d')!;
  }

  resize(cssSize: number): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.size = cssSize;
    this.canvas.width = Math.round(cssSize * dpr);
    this.canvas.height = Math.round(cssSize * dpr);
    this.canvas.style.width = `${cssSize}px`;
    this.canvas.style.height = `${cssSize}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.prerender(dpr);
  }

  private toX(x: number): number {
    // map is drawn as seen from above with +X to the left so turns read naturally (same as SVG previews)
    return this.size - this.pad - (x - this.minX) * this.scale;
  }

  private toY(z: number): number {
    return this.size - this.pad - (z - this.minZ) * this.scale;
  }

  private prerender(dpr: number): void {
    const c = document.createElement('canvas');
    c.width = this.canvas.width;
    c.height = this.canvas.height;
    const g = c.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const t = this.course.track;
    if (t) {
      const rb = t.main;
      let minX = Infinity;
      let maxX = -Infinity;
      let minZ = Infinity;
      let maxZ = -Infinity;
      for (let i = 0; i < rb.n; i++) {
        minX = Math.min(minX, rb.px[i]);
        maxX = Math.max(maxX, rb.px[i]);
        minZ = Math.min(minZ, rb.pz[i]);
        maxZ = Math.max(maxZ, rb.pz[i]);
      }
      const span = Math.max(maxX - minX, maxZ - minZ) || 1;
      this.scale = (this.size - this.pad * 2) / span;
      this.minX = minX - ((span - (maxX - minX)) / 2);
      this.minZ = minZ - ((span - (maxZ - minZ)) / 2);
      const line = (r: typeof rb, width: number, color: string, closed: boolean): void => {
        g.beginPath();
        for (let i = 0; i < r.n; i += 3) {
          const x = this.toX(r.px[i]);
          const y = this.toY(r.pz[i]);
          if (i === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        if (closed) g.closePath();
        g.lineWidth = width;
        g.strokeStyle = color;
        g.lineJoin = 'round';
        g.lineCap = 'round';
        g.stroke();
      };
      line(rb, 7, 'rgba(29,18,80,0.75)', true);
      line(rb, 4, 'rgba(255,255,255,0.95)', true);
      // icy stretches in light blue
      g.strokeStyle = '#8fd8ff';
      g.lineWidth = 4;
      for (let i = 0; i < rb.n; i += 3) {
        const j = rb.idx(i + 3);
        if (!(rb.flags[i] & F_ICE) || !(rb.flags[j] & F_ICE)) continue;
        g.beginPath();
        g.moveTo(this.toX(rb.px[i]), this.toY(rb.pz[i]));
        g.lineTo(this.toX(rb.px[j]), this.toY(rb.pz[j]));
        g.stroke();
      }
      for (const sc of t.shortcuts) line(sc, 2, sc.flags[0] & F_ICE ? 'rgba(143,216,255,0.95)' : 'rgba(255,210,63,0.9)', false);
      // start line
      g.fillStyle = '#ff4d6d';
      g.beginPath();
      g.arc(this.toX(rb.px[0]), this.toY(rb.pz[0]), 3.5, 0, Math.PI * 2);
      g.fill();
    } else if (this.course.arena) {
      const a = this.course.arena.data;
      const span = a.size * 2.1;
      this.scale = (this.size - this.pad * 2) / span;
      this.minX = -span / 2;
      this.minZ = -span / 2;
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.strokeStyle = 'rgba(29,18,80,0.75)';
      g.lineWidth = 3;
      g.beginPath();
      if (a.shape === 'circle' || a.shape === 'ring') g.arc(this.toX(0), this.toY(0), a.size * this.scale, 0, Math.PI * 2);
      else if (a.shape === 'square') g.rect(this.toX(a.size), this.toY(a.size), a.size * 2 * this.scale, a.size * 2 * this.scale);
      else {
        const w = a.inner ?? a.size * 0.3;
        g.rect(this.toX(w), this.toY(a.size), w * 2 * this.scale, a.size * 2 * this.scale);
        g.rect(this.toX(a.size), this.toY(w), a.size * 2 * this.scale, w * 2 * this.scale);
      }
      g.fill();
      g.stroke();
      if (a.shape === 'ring') {
        g.fillStyle = 'rgba(29,18,80,0.75)';
        g.beginPath();
        g.arc(this.toX(0), this.toY(0), (a.inner ?? a.size * 0.4) * this.scale, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = 'rgba(29,18,80,0.6)';
      for (const o of a.obstacles) {
        g.beginPath();
        g.arc(this.toX(o.x), this.toY(o.z), Math.max(2, o.hx * this.scale), 0, Math.PI * 2);
        g.fill();
      }
    }
    this.bg = c;
  }

  draw(karts: readonly Kart[], highlight: number[], dt: number, force = false): void {
    this.timer -= dt;
    if (this.timer > 0 && !force) return;
    this.timer = 1 / 15;
    const g = this.ctx;
    g.clearRect(0, 0, this.size, this.size);
    if (this.bg) g.drawImage(this.bg, 0, 0, this.size, this.size);
    // draw others first, players on top
    for (let pass = 0; pass < 2; pass++) {
      for (const k of karts) {
        const isHi = highlight.includes(k.index);
        if ((pass === 1) !== isHi) continue;
        const x = this.toX(k.x);
        const y = this.toY(k.z);
        g.beginPath();
        g.arc(x, y, isHi ? 5.5 : 3.6, 0, Math.PI * 2);
        g.fillStyle = KART_COLORS[k.index % KART_COLORS.length];
        g.fill();
        g.lineWidth = isHi ? 2.5 : 1.5;
        g.strokeStyle = isHi ? '#ffffff' : '#1d1250';
        g.stroke();
      }
    }
  }
}

export { KART_COLORS };
