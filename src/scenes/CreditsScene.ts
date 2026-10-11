import { Scene } from '../app/Scene';
import { S } from '../app/services';
import { CREDITS } from '../data/credits';
import { Particles } from '../gfx/particles';
import { Starfield } from '../gfx/starfield';
import { tex } from '../gfx/textures';
import { h } from '../ui/dom';
import { button } from '../ui/widgets';

/** Scrolling credits over a starry sky with fireworks. */
export class CreditsScene extends Scene {
  private stars = new Starfield(['#ff7ad9', '#9b6bff', '#2de0c7'], 'credits');
  private fx = new Particles(200, true);
  private roll: HTMLElement;
  private t = 0;
  private w = 1280;
  private h = 720;
  private boomT = 0;
  private finished = false;

  constructor() {
    super('credits');
    this.music = 'credits';
    this.root.addChild(this.stars, this.fx);
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
    this.w = w;
    this.h = hh;
    this.stars.resize(w, hh);
  }

  override update(dt: number): void {
    this.t += dt;
    this.fx.update(dt);
    this.boomT -= dt;
    if (this.boomT <= 0) {
      this.boomT = 0.9 + Math.random();
      const cols = ['#ff5d73', '#ffe066', '#8cff66', '#4dd4ff', '#ff7ad9'];
      this.fx.burst(tex('spark'), this.w * (0.1 + Math.random() * 0.8), this.h * (0.1 + Math.random() * 0.5), 30, 380, 1.2, 0.8, cols[Math.floor(Math.random() * cols.length)], { gravity: 120 });
    }
  }

  override render(alpha: number): void {
    this.stars.update(this.t * 20, -this.t * 30, 1 / 60);
    this.fx.render(alpha);
  }
}
