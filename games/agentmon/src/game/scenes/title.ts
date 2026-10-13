/**
 * Title screen (first version): a sky with drifting Agentmon and the logo. Phase 4 adds the save
 * slots and New Game; for now it links to the creature sheet.
 */
import { Container, Graphics, Sprite } from 'pixi.js';
import { SPECIES_LIST } from '../../data/species';
import type { App, Scene } from '../app';

export class TitleScene implements Scene {
  readonly name = 'title';
  readonly root = new Container();
  private sky = new Graphics();
  private friends: { s: Sprite; vx: number; phase: number }[] = [];
  private el: HTMLElement | null = null;
  private t = 0;

  enter(app: App): void {
    this.root.addChild(this.sky);
    const picks = ['spinnet', 'druzling', 'buzzbill', 'kernip', 'hummet', 'lullakin', 'gleamgrub', 'zestle', 'hailbit', 'bathlet'];
    picks.forEach((id, i) => {
      const s = new Sprite(app.sprites.creature(id));
      s.anchor.set(0.5, 1);
      this.root.addChild(s);
      this.friends.push({ s, vx: (i % 2 ? 1 : -1) * (12 + (i * 7) % 15), phase: i * 1.3 });
    });
    this.el = document.createElement('div');
    this.el.className = 'screen';
    this.el.innerHTML = `<h1>Agentmon</h1><p class="panel">Befriend creatures and relight the six Beacons.</p>
      <button class="primary" data-act="sheet">Meet all ${SPECIES_LIST.length} Agentmon</button>`;
    this.el.querySelector('[data-act=sheet]')!.addEventListener('click', () => { location.search = '?scene=sheet'; });
    app.ui.appendChild(this.el);
  }

  exit(): void {
    this.el?.remove();
  }

  resize(app: App): void {
    const { width: W, height: H } = app.host;
    this.sky.clear().rect(0, 0, W, H).fill(0x8fc8ff).rect(0, H * 0.72, W, H * 0.28).fill(0x74c464).rect(0, H * 0.72, W, 6).fill(0x9ed97a);
    const scale = Math.max(2, Math.round(app.host.zoom * 1.2));
    this.friends.forEach((f, i) => { f.s.scale.set(scale); f.s.x = ((i + 0.5) / this.friends.length) * W; f.s.y = H * 0.72 + 8 + (i % 3) * 18; });
  }

  update(dt: number, app: App): void {
    this.t += dt;
    const W = app.host.width;
    for (const f of this.friends) {
      f.s.x += f.vx * dt * f.s.scale.x * 0.5;
      f.s.scale.x = Math.abs(f.s.scale.x) * (f.vx > 0 ? -1 : 1);
      if (f.s.x < -40) f.s.x = W + 40;
      if (f.s.x > W + 40) f.s.x = -40;
      f.s.pivot.y = Math.round(Math.max(0, Math.sin(this.t * 6 + f.phase)) * 2);
    }
  }
}
