/**
 * The creature sheet (capture route ?scene=sheet): every Agentmon in Field Guide order, gently
 * bobbing and blinking, for the visual review and the "all 52" sheet. Options: &shimmer=1,
 * &pose=happy, &small=1.
 */
import { Container, Graphics, Sprite } from 'pixi.js';
import { SPECIES_LIST } from '../../data/species';
import type { PoseName } from '../../render/sprites';
import type { App, Scene } from '../app';

export class SheetScene implements Scene {
  readonly name = 'sheet';
  readonly root = new Container();
  private cells: { sprite: Sprite; blink: Sprite; base: number; phase: number }[] = [];
  private labels: HTMLElement[] = [];
  private t = 0;
  private bg = new Graphics();
  private grid = new Container();

  constructor(private opts: { shimmer?: boolean; pose?: PoseName; small?: boolean } = {}) {}

  enter(app: App): void {
    this.root.addChild(this.bg, this.grid);
    const size = this.opts.small ? 16 : 32;
    for (const s of SPECIES_LIST) {
      const sprite = new Sprite(app.sprites.creature(s.id, size, this.opts.pose ?? 'idle', this.opts.shimmer));
      const blink = new Sprite(app.sprites.creature(s.id, size, 'blink', this.opts.shimmer));
      blink.visible = false;
      sprite.anchor.set(0.5, 1);
      blink.anchor.set(0.5, 1);
      this.grid.addChild(sprite, blink);
      this.cells.push({ sprite, blink, base: 0, phase: s.num * 0.37 });
      const label = document.createElement('div');
      label.className = 'sheet-label';
      label.textContent = `${s.num} ${s.name}`;
      app.ui.appendChild(label);
      this.labels.push(label);
    }
  }

  exit(): void {
    for (const l of this.labels) l.remove();
  }

  resize(app: App): void {
    const { width: W, height: H, dpr } = app.host;
    const cols = W > H ? 13 : 8;
    const rows = Math.ceil(this.cells.length / cols);
    const cellW = W / cols, cellH = H / rows;
    const scale = Math.max(1, Math.floor(Math.min(cellW, cellH * 0.78) / (this.opts.small ? 16 : 32)));
    this.bg.clear().rect(0, 0, W, H).fill(0x8fd08a);
    this.cells.forEach((c, i) => {
      const x = (i % cols) * cellW + cellW / 2, y = Math.floor(i / cols) * cellH + cellH * 0.8;
      for (const s of [c.sprite, c.blink]) { s.scale.set(scale); s.x = Math.round(x); s.y = Math.round(y); }
      c.base = Math.round(y);
      const l = this.labels[i]!;
      l.style.left = `${x / dpr}px`;
      l.style.top = `${(y + 2) / dpr}px`;
    });
  }

  update(dt: number): void {
    this.t += dt;
    for (const c of this.cells) {
      const bob = Math.round(Math.max(0, Math.sin(this.t * 2.2 + c.phase)) * 2) * c.sprite.scale.y * 0.5;
      c.sprite.y = c.base - Math.round(bob);
      c.blink.y = c.sprite.y;
      const blinking = (this.t + c.phase) % 4 < 0.15;
      c.sprite.visible = !blinking;
      c.blink.visible = blinking;
    }
  }

  snapshot() {
    return { creatures: this.cells.length };
  }
}
