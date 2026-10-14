/**
 * The HUD: a top bar (the goal on the left; the date, population, happiness, coins and the menu on
 * the right), a tool bar along the bottom (a slim rail down the side on phones held sideways), and a
 * little camera pad. The same layout and sizes as games/fieldlark/src/ui/hud.ts (style.css and
 * ui/layout.ts), with the town's tools and counters. Counters are calm pills: no red dots, no nags.
 */
import { fill, h } from './h';
import { icon, type IconName } from './icons';

export interface HudTool { id: string; label: string; icon: IconName }

export const TOOLS: readonly HudTool[] = [
  { id: 'look', label: 'Look', icon: 'look' },
  { id: 'road', label: 'Roads', icon: 'road' },
  { id: 'zones', label: 'Zones', icon: 'zones' },
  { id: 'build', label: 'Build', icon: 'build' },
  { id: 'park', label: 'Parks', icon: 'park' },
  { id: 'services', label: 'Services', icon: 'services' },
  { id: 'transit', label: 'Transit', icon: 'transit' },
  { id: 'overlays', label: 'Maps', icon: 'overlays' },
  { id: 'cityhall', label: 'City Hall', icon: 'cityhall' },
];

export class Hud {
  readonly el: HTMLElement;
  private goalText: HTMLElement;
  private goalBar: HTMLElement;
  private tools: HTMLElement;
  private pop = h('b');
  private happy = h('b');
  private coins = h('b');
  private date = h('span.pill-text');

  constructor(root: HTMLElement) {
    this.goalText = h('span.goal-text', null, '');
    this.goalBar = h('i.bar-fill');
    this.tools = h('nav.toolbar', { 'aria-label': 'Tools' });
    this.el = h('div#hud', null,
      h('div.topbar', null,
        h('button.goal', { 'aria-label': 'Goals' }, icon('star', 26), h('span.goal-body', null, this.goalText, h('span.bar', null, this.goalBar))),
        h('div.pills', null,
          h('span.pill.date', { title: 'Season and day' }, icon('summer', 22), this.date),
          h('span.pill', { title: 'People living in town' }, icon('people', 24, 'Population'), this.pop),
          h('span.pill.happy', { title: 'How happy the town is' }, icon('smile', 24, 'Happiness'), this.happy),
          h('span.pill', { title: 'The town’s budget' }, icon('coin', 24, 'Coins'), this.coins),
          h('button.icon-button.menu', { 'aria-label': 'Menu' }, icon('menu', 28)))),
      h('div.campad', { 'aria-label': 'Camera' },
        h('button.icon-button', { 'aria-label': 'Turn left (Q)' }, icon('turnLeft', 26)),
        h('button.icon-button', { 'aria-label': 'Turn right (E)' }, icon('turnRight', 26)),
        h('button.icon-button', { 'aria-label': 'Zoom in' }, icon('zoomIn', 26)),
        h('button.icon-button', { 'aria-label': 'Zoom out' }, icon('zoomOut', 26))),
      this.tools);
    fill(this.tools, ...TOOLS.map(t => h('button.tool', { class: t.id === 'look' ? 'active' : '', 'aria-label': t.label }, icon(t.icon, 30), h('span', null, t.label))));
    root.appendChild(this.el);
  }

  set(o: { goal: string; progress: number; date: string; population: number; happiness: number; coins: number }) {
    this.goalText.textContent = o.goal;
    this.goalBar.style.width = `${Math.round(o.progress * 100)}%`;
    this.date.textContent = o.date;
    this.pop.textContent = o.population.toLocaleString('en-US');
    this.happy.textContent = `${o.happiness}%`;
    this.happy.parentElement?.setAttribute('aria-label', `The town is ${o.happiness}% happy`);
    const short = innerWidth <= 520 && o.coins >= 10000;
    this.coins.textContent = short ? `${Math.round(o.coins / 1000)}k` : o.coins.toLocaleString('en-US');
  }
}
