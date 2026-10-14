/**
 * The HUD: a top bar (goal tracker on the left; date, coins, level and the menu on the right), a
 * tool bar along the bottom, and a little camera pad (turn and zoom) for anyone who prefers buttons
 * to gestures. Counters are calm pills: there are no red dots and no badges that nag.
 */
import { dateLabel, seasonOf } from '../sim/clock';
import { fill, h } from './h';
import { icon, type IconName } from './icons';

export interface HudTool { id: string; label: string; icon: IconName; key?: string }

export interface HudHandlers {
  menu(): void;
  turn(dir: 1 | -1): void;
  zoom(dir: 1 | -1): void;
  tool(id: string): void;
  goals(): void;
}

export class Hud {
  readonly el: HTMLElement;
  private date: HTMLElement;
  private dateIcon: HTMLElement;
  private coins: HTMLElement;
  private level: HTMLElement;
  private levelBar: HTMLElement;
  private goal: HTMLElement;
  private goalText: HTMLElement;
  private goalBar: HTMLElement;
  private tools: HTMLElement;
  private lastDate = '';
  private lastCoins = -1;

  constructor(root: HTMLElement, private on: HudHandlers) {
    this.date = h('span.pill-text');
    this.dateIcon = h('span.pill-icon');
    this.coins = h('b');
    this.level = h('b');
    this.levelBar = h('i.bar-fill');
    this.goalText = h('span.goal-text', null, 'Welcome to the farm!');
    this.goalBar = h('i.bar-fill');
    this.goal = h('button.goal', { 'aria-label': 'Goals', onclick: () => on.goals() },
      icon('star', 26), h('span.goal-body', null, this.goalText, h('span.bar', null, this.goalBar)));
    this.tools = h('nav.toolbar', { 'aria-label': 'Tools' });
    this.el = h('div#hud', null,
      h('div.topbar', null,
        this.goal,
        h('div.pills', null,
          h('span.pill.date', { title: 'Season and day' }, this.dateIcon, this.date),
          h('span.pill.coins', { title: 'Coins' }, icon('coin', 24, 'Coins'), this.coins),
          h('span.pill.level', { title: 'Farm level' }, icon('level', 24, 'Farm level'), this.level, h('span.bar.mini', null, this.levelBar)),
          h('button.icon-button.menu', { 'aria-label': 'Menu', onclick: () => on.menu() }, icon('menu', 28)))),
      h('div.campad', { 'aria-label': 'Camera' },
        h('button.icon-button', { 'aria-label': 'Turn left (Q)', onclick: () => on.turn(-1) }, icon('turnLeft', 26)),
        h('button.icon-button', { 'aria-label': 'Turn right (E)', onclick: () => on.turn(1) }, icon('turnRight', 26)),
        h('button.icon-button', { 'aria-label': 'Zoom in', onclick: () => on.zoom(1) }, icon('zoomIn', 26)),
        h('button.icon-button', { 'aria-label': 'Zoom out', onclick: () => on.zoom(-1) }, icon('zoomOut', 26))),
      this.tools);
    root.appendChild(this.el);
  }

  set visible(v: boolean) { this.el.hidden = !v; }

  setDate(t: number) {
    const label = dateLabel(t);
    if (label === this.lastDate) return;
    this.lastDate = label;
    this.date.textContent = label;
    fill(this.dateIcon, icon(seasonOf(t) as IconName, 22));
  }

  setCoins(n: number) {
    if (n === this.lastCoins) return;
    this.lastCoins = n;
    this.coins.textContent = n.toLocaleString('en-US');
  }

  setLevel(level: number, progress: number) {
    this.level.textContent = String(level);
    this.levelBar.style.width = `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%`;
  }

  setGoal(text: string, progress: number | null) {
    this.goalText.textContent = text;
    this.goalBar.parentElement!.hidden = progress === null;
    if (progress !== null) this.goalBar.style.width = `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%`;
  }

  setTools(tools: HudTool[], active: string | null) {
    fill(this.tools, ...tools.map(t => h('button.tool', {
      class: t.id === active ? 'active' : '',
      'aria-pressed': String(t.id === active),
      'aria-label': t.key ? `${t.label} (${t.key})` : t.label,
      onclick: () => this.on.tool(t.id),
      dataset: { tool: t.id },
    }, icon(t.icon, 30), h('span', null, t.label))));
  }
}
