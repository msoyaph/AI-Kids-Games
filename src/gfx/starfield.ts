import { Container, Sprite, TilingSprite } from 'pixi.js';
import { nebulaTex, tex } from './textures';

/**
 * Parallax star background: three tiling star layers plus soft nebula clouds.
 * Call update() with the camera position each frame.
 */
export class Starfield extends Container {
  private layers: TilingSprite[] = [];
  private factors = [0.04, 0.12, 0.25];
  private nebulas: Sprite[] = [];
  private nebFactor = 0.02;
  private w = 1280;
  private h = 720;
  private twinkle = 0;

  constructor(nebulaColors: string[] = ['#9b6bff', '#4c7dff'], nebulaKey = 'default') {
    super();
    const nt = nebulaTex(nebulaKey, nebulaColors);
    for (let i = 0; i < 3; i++) {
      const n = new Sprite(nt);
      n.anchor.set(0.5);
      n.scale.set(2.2 + i * 0.6);
      n.alpha = 0.9;
      this.nebulas.push(n);
      this.addChild(n);
    }
    for (let i = 0; i < 3; i++) {
      const t = new TilingSprite({ texture: tex(`stars${i}`), width: this.w, height: this.h });
      this.layers.push(t);
      this.addChild(t);
    }
  }

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    for (const l of this.layers) {
      l.width = w;
      l.height = h;
    }
  }

  update(camX: number, camY: number, dt = 0): void {
    this.twinkle += dt;
    for (let i = 0; i < this.layers.length; i++) {
      const l = this.layers[i];
      l.tilePosition.x = -camX * this.factors[i];
      l.tilePosition.y = -camY * this.factors[i];
    }
    this.layers[2].alpha = 0.75 + Math.sin(this.twinkle * 2.1) * 0.25;
    this.layers[1].alpha = 0.85 + Math.sin(this.twinkle * 1.3 + 1) * 0.15;
    const span = 1400;
    for (let i = 0; i < this.nebulas.length; i++) {
      const n = this.nebulas[i];
      const bx = (i * 900 + 300) - camX * this.nebFactor;
      const by = (i % 2 === 0 ? 0.3 : 0.75) * this.h - camY * this.nebFactor * 0.5;
      n.x = (((bx % (span * 3)) + span * 3) % (span * 3)) - span + this.w * 0.5 - 600;
      n.y = by;
    }
  }
}
