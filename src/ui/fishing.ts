// Reel minigame bar for big fish.
import { fishingRT } from '../sim/fishing';
import type { Game } from '../sim/game';
import { h } from './dom';

export class ReelBar {
  readonly el: HTMLElement;
  private zone = h('div', { class: 'reel-zone' });
  private cursor = h('div', { class: 'reel-cursor' });
  private prog = h('div', { class: 'reel-prog' });
  private hint = h('div', { class: 'reel-hint' }, 'Hold to reel — keep the hook in the green!');
  constructor(root: HTMLElement) {
    this.el = h('div', { class: 'reel' }, this.hint, h('div', { class: 'reel-track' }, this.zone, this.cursor), h('div', { class: 'reel-progress' }, this.prog));
    this.el.style.display = 'none';
    root.appendChild(this.el);
  }
  update(g: Game | null): void {
    const c = g ? fishingRT(g).cast : null;
    if (!c || c.phase !== 'reel' || !c.reel) {
      this.el.style.display = 'none';
      return;
    }
    const r = c.reel;
    this.el.style.display = '';
    this.zone.style.left = `${(r.zone - r.zoneW / 2) * 100}%`;
    this.zone.style.width = `${r.zoneW * 100}%`;
    this.cursor.style.left = `${r.cursor * 100}%`;
    this.prog.style.width = `${Math.max(0, Math.min(1, r.progress)) * 100}%`;
    const inZone = Math.abs(r.cursor - r.zone) < r.zoneW / 2;
    this.el.classList.toggle('good', inZone);
  }
}
