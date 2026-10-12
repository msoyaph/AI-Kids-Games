/** Screen-space weather particles (pooled): rain, storm flashes, windy leaves, snow, petals. */
import { Container, Sprite, Texture } from 'pixi.js';
import type { Weather } from '../sim/state';

interface Drop {
  s: Sprite;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ph: number;
}

export class WeatherFx {
  readonly layer = new Container();
  private drops: Drop[] = [];
  private flash = new Sprite(Texture.WHITE);
  private flashA = 0;
  private nextFlash = 8;
  private mode: string = '';
  /** particle budget multiplier (adaptive quality) */
  density = 1;
  reduced = false;

  constructor() {
    this.flash.alpha = 0;
    this.layer.addChild(this.flash);
  }

  private ensure(n: number): void {
    while (this.drops.length < n) {
      const s = new Sprite(Texture.WHITE);
      s.anchor.set(0.5);
      this.layer.addChild(s);
      this.drops.push({ s, x: 0, y: 0, vx: 0, vy: 0, ph: Math.random() * 6 });
    }
  }

  private reset(d: Drop, W: number, H: number, top: boolean): void {
    d.x = Math.random() * (W + 200) - 100;
    d.y = top ? -10 - Math.random() * 40 : Math.random() * H;
  }

  update(dt: number, W: number, H: number, weather: Weather, season: number, outdoor: boolean, zoom: number): void {
    const mode = !outdoor ? 'none' : weather === 'rain' || weather === 'storm' ? 'rain' : weather === 'snow' ? 'snow' : weather === 'wind' ? (season === 3 ? 'snowwind' : 'leaves') : season === 0 ? 'petals' : 'none';
    const base = mode === 'rain' ? (weather === 'storm' ? 170 : 120) : mode === 'snow' ? 110 : mode === 'snowwind' ? 90 : mode === 'leaves' ? 45 : mode === 'petals' ? 12 : 0;
    const n = Math.round(base * this.density * (this.reduced ? 0.4 : 1));
    this.ensure(n);
    const px = Math.max(1, Math.round(zoom / 2));
    if (mode !== this.mode) {
      this.mode = mode;
      for (const d of this.drops) this.reset(d, W, H, false);
    }
    const leafCols = [0xffc6dc, 0x86c25a, 0xe4862e, 0xffffff];
    for (let i = 0; i < this.drops.length; i++) {
      const d = this.drops[i];
      const s = d.s;
      if (i >= n) {
        s.visible = false;
        continue;
      }
      s.visible = true;
      if (mode === 'rain') {
        d.vx = -120 * zoom * 0.25;
        d.vy = 900 * zoom * 0.25;
        s.tint = 0xa8d0f8;
        s.alpha = 0.55;
        s.width = px;
        s.height = 7 * px;
        s.rotation = 0.13;
      } else if (mode === 'snow' || mode === 'snowwind') {
        d.ph += dt;
        d.vx = Math.sin(d.ph) * 20 * zoom * 0.25 + (mode === 'snowwind' ? -160 * zoom * 0.25 : 0);
        d.vy = 60 * zoom * 0.25;
        s.tint = 0xffffff;
        s.alpha = 0.9;
        s.width = s.height = px * (1 + (i % 2));
        s.rotation = 0;
      } else {
        d.ph += dt * 3;
        d.vx = (mode === 'petals' ? -40 : -220) * zoom * 0.25;
        d.vy = (Math.sin(d.ph) * 40 + 30) * zoom * 0.25;
        s.tint = mode === 'petals' ? leafCols[0] : leafCols[Math.min(2, season)];
        s.alpha = 0.95;
        s.width = 2 * px;
        s.height = px * 1.5;
        s.rotation = d.ph;
      }
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (d.y > H + 20 || d.x < -120 || d.x > W + 120) this.reset(d, W, H, d.y > H + 20);
      if (d.x < -100) d.x = W + 50;
      s.x = Math.round(d.x);
      s.y = Math.round(d.y);
    }
    // storm lightning
    this.flash.width = W;
    this.flash.height = H;
    if (outdoor && weather === 'storm' && !this.reduced) {
      this.nextFlash -= dt;
      if (this.nextFlash <= 0) {
        this.flashA = 0.55;
        this.nextFlash = 7 + Math.random() * 9;
      }
    }
    this.flashA = Math.max(0, this.flashA - dt * 1.6);
    this.flash.alpha = this.flashA;
  }

  /** True right after a lightning flash (for the thunder sound). */
  flashed(): boolean {
    return this.flashA > 0.5;
  }
}
