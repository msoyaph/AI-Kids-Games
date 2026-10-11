import { comfortOn } from '../app/comfort';
import { Scene3D } from '../app/Scene3D';
import { S } from '../app/services';
import { CREDITS } from '../data/credits';
import { Particles3 } from '../r3/fx/particles';
import { MenuBackdrop } from '../r3/space/backdrop';
import { SKIES } from '../r3/space/sky';
import { h } from '../ui/dom';
import { button } from '../ui/widgets';

const COLORS = ['#ff5d73', '#ffe066', '#8cff66', '#4dd4ff', '#ff7ad9'];

/** Scrolling credits over a starry sky with fireworks. */
export class CreditsScene extends Scene3D {
  private backdrop: MenuBackdrop;
  private fx = new Particles3(600, 'spark');
  private roll: HTMLElement;
  private boomT = 0;
  private finished = false;

  constructor() {
    super('credits');
    this.music = 'credits';
    this.backdrop = new MenuBackdrop(this.world, this.camera, SKIES.zephyra);
    this.fx.gravity = 1.2;
    this.fx.drag = 1.1;
    this.world.add(this.fx.points);
    this.roll = h('div', { class: 'credits-roll', 'data-testid': 'credits' });
    for (const block of CREDITS) {
      this.roll.append(h('div', { class: 'credits-block' }, h('div', { class: 'h2' }, block.title), ...block.lines.map((l) => h('div', { class: 'credits-line' }, l))));
    }
    this.ui.append(h('div', { class: 'credits-view' }, this.roll), h('div', { class: 'cutscene-skip' }, button('Skip', 'next', () => this.done(), { size: 'small', color: 'white', id: 'btn-skip-credits' })));
  }

  override enter(): void {
    S.state.data.creditsSeen = true;
    S.state.markDirty();
    this.roll.style.animationDuration = `${18 + CREDITS.length * 3}s`;
    this.roll.addEventListener('animationend', () => this.done());
  }

  override back(): boolean {
    this.done();
    return true;
  }

  private done(): void {
    if (this.finished) return;
    this.finished = true;
    void S.game.go('complete');
  }

  override resize(w: number, hh: number): void {
    super.resize(w, hh);
    this.fx.setScreen(window.innerHeight * S.game.r3.pixelRatio);
  }

  override update(dt: number): void {
    this.fx.update(dt);
    this.boomT -= dt;
    if (this.boomT <= 0) {
      this.boomT = 0.9 + Math.random();
      // Fireworks in front of the camera, which slowly turns: place them along its view.
      const yaw = this.camera.rotation.y;
      const d = 18;
      const side = (Math.random() - 0.5) * 16;
      const x = -Math.sin(yaw) * d + Math.cos(yaw) * side;
      const z = -Math.cos(yaw) * d - Math.sin(yaw) * side;
      this.fx.burst(x, 2 + Math.random() * 5, z, comfortOn() ? 24 : 40, 5, 1.4, 0.35, COLORS[Math.floor(Math.random() * COLORS.length)]);
    }
  }

  override render(): void {
    this.backdrop.update(this.time, 1 / 60, comfortOn());
  }
}
