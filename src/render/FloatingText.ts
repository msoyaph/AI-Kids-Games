import { BitmapFont, BitmapText, Container } from 'pixi.js';
import { swapRemove } from '../core/pool';

export const NUM_FONT = 'VanexNum';
const FONT_STACK = "ui-rounded, 'SF Pro Rounded', 'Arial Rounded MT Bold', 'Trebuchet MS', system-ui, sans-serif";

let installed = false;

/** Rasterise a bitmap font from the system font stack (no font files). */
export function installFonts(resolution: number): void {
  if (installed) return;
  installed = true;
  BitmapFont.install({
    name: NUM_FONT,
    style: {
      fontFamily: FONT_STACK,
      fontSize: 30,
      fontWeight: '900',
      fill: '#ffffff',
      stroke: { color: '#2a1446', width: 6, join: 'round' },
    },
    chars: [['0', '9'], ['A', 'Z'], ['a', 'z'], '+-!?.,%x :'],
    resolution: Math.min(2, Math.max(1, resolution)),
    padding: 4,
  });
}

class Label {
  readonly t: BitmapText;
  life = 0;
  max = 1;
  vy = 0;
  s0 = 1;
  constructor() {
    this.t = new BitmapText({ text: '', style: { fontFamily: NUM_FONT, fontSize: 30 } });
    this.t.anchor.set(0.5);
  }
}

/** Pooled floating "+5" / "WOW!" labels in world space. */
export class FloatingText {
  readonly container = new Container();
  private active: Label[] = [];
  private free: Label[] = [];
  budget: number;

  constructor(budget: number) {
    this.budget = budget;
  }

  spawn(text: string, x: number, y: number, tint = 0xffffff, size = 0.6, life = 0.9, vy = -40): void {
    if (this.active.length >= this.budget) {
      // recycle one so new info always shows
      const old = swapRemove(this.active, 0);
      old.t.visible = false;
      this.free.push(old);
    }
    let l = this.free.pop();
    if (!l) {
      l = new Label();
      this.container.addChild(l.t);
    }
    if (l.t.text !== text) l.t.text = text;
    l.t.tint = tint;
    l.t.position.set(x, y);
    l.t.visible = true;
    l.t.alpha = 1;
    l.s0 = size;
    l.t.scale.set(size * 0.4);
    l.life = l.max = life;
    l.vy = vy;
    this.active.push(l);
  }

  update(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const l = this.active[i]!;
      l.life -= dt;
      if (l.life <= 0) {
        l.t.visible = false;
        swapRemove(this.active, i);
        this.free.push(l);
        continue;
      }
      const t = 1 - l.life / l.max;
      l.t.y += l.vy * dt;
      l.vy *= 1 - 2.2 * dt;
      // pop in, then float and fade
      const pop = t < 0.15 ? 0.4 + (t / 0.15) * 0.75 : t < 0.25 ? 1.15 - ((t - 0.15) / 0.1) * 0.15 : 1;
      l.t.scale.set(l.s0 * pop);
      l.t.alpha = t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1;
    }
  }

  clear(): void {
    for (const l of this.active) {
      l.t.visible = false;
      this.free.push(l);
    }
    this.active.length = 0;
  }
}
