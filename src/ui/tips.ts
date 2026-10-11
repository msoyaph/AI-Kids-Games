// Shows each onboarding tip once (per save), when the mechanic is first used.
import type { App } from '../app';
import { TIPS } from '../data/tips';
import type { Game } from '../sim/game';
import { equippedTool } from '../sim/tools';
import { fishingRT } from '../sim/fishing';
import { h } from './dom';

export class TipManager {
  private el = h('div', { class: 'tip' });
  private queue: string[] = [];
  private shownT = 0;
  constructor(private app: App, root: HTMLElement) {
    root.appendChild(this.el);
    this.el.style.display = 'none';
    this.el.addEventListener('click', () => this.dismiss());
  }

  bind(g: Game): void {
    this.queue = [];
    const t = (id: string) => this.trigger(g, id);
    g.bus.on('chapterStarted', () => t('challenge'));
    g.bus.on('location', (e) => t(e.loc === 'home' ? 'home' : e.loc === 'museum' ? 'museum' : ''));
    g.bus.on('talked', () => t('villager'));
    g.bus.on('inventoryChanged', () => {
      const tool = equippedTool(g);
      if (tool) t(tool.kind);
    });
    setTimeout(() => t('move'), 4000);
  }

  trigger(g: Game, id: string): void {
    if (!id || !TIPS[id] || g.state.tips[id] || !this.app.settings.tips) return;
    if (this.queue.includes(id)) return;
    this.queue.push(id);
  }

  dismiss(): void {
    this.el.style.display = 'none';
    this.shownT = 0;
  }

  update(dt: number, g: Game | null): void {
    if (!g) return;
    // contextual triggers
    const m = g.state.clock.minute / 60;
    if (m >= 20 || m < 5) this.trigger(g, 'night');
    if (g.state.weather.today === 'rain') this.trigger(g, 'rain');
    if (fishingRT(g).cast?.phase === 'reel') this.trigger(g, 'reel');
    if (g.runtime.placement) this.trigger(g, 'placement');
    if (g.state.clock.day >= 2) this.trigger(g, 'phone');
    if (this.shownT > 0) {
      this.shownT -= dt;
      if (this.shownT <= 0) this.dismiss();
      return;
    }
    if (!this.queue.length || this.app.ui.modalOpen || g.mode !== 'play') return;
    const id = this.queue.shift()!;
    if (g.state.tips[id]) return;
    g.state.tips[id] = 1;
    const tip = TIPS[id]!;
    this.el.innerHTML = '';
    this.el.append(h('div', { class: 'tip-title' }, `Tip · ${tip.title}`), h('div', null, tip.text));
    this.el.style.display = '';
    this.shownT = 9;
  }
}
