/**
 * The HUD: a top bar (the goal on the left; the date, population, happiness, coins and the menu on
 * the right), a tool bar along the bottom (a slim rail down the side on phones held sideways), and a
 * little camera pad. The same layout, sizes and tool-bar behaviour as games/fieldlark/src/ui/hud.ts
 * (style.css and ui/layout.ts), with the town's tools and counters. Counters are calm pills: there
 * are no red dots and no badges that nag.
 */
import { fill, h } from './h';
import { icon, type IconName } from './icons';

export type ToolId = 'look' | 'road' | 'zones' | 'build' | 'park' | 'services' | 'transit' | 'maps' | 'cityhall';
export interface HudTool { id: ToolId; label: string; icon: IconName }

/** Every tool, in tool-bar order (the story opens them; ui shows only the open ones). */
export const TOOLS: readonly HudTool[] = [
  { id: 'look', label: 'Look', icon: 'look' },
  { id: 'road', label: 'Roads', icon: 'road' },
  { id: 'zones', label: 'Zones', icon: 'zones' },
  { id: 'park', label: 'Parks', icon: 'park' },
  { id: 'services', label: 'Services', icon: 'services' },
  { id: 'transit', label: 'Transit', icon: 'transit' },
  { id: 'build', label: 'Build', icon: 'build' },
  { id: 'maps', label: 'Maps', icon: 'overlays' },
  { id: 'cityhall', label: 'City Hall', icon: 'cityhall' },
];

export interface HudHandlers {
  menu(): void;
  turn(dir: 1 | -1): void;
  zoom(dir: 1 | -1): void;
  tool(id: ToolId): void;
  goals(): void;
}

export class Hud {
  readonly el: HTMLElement;
  /** The tool bar (gamepad X / the T key move focus into it). */
  readonly tools: HTMLElement;
  private goalText: HTMLElement;
  private goalBar: HTMLElement;
  private pop = h('b');
  private happy = h('b');
  private happyIcon: HTMLElement;
  private coins = h('b');
  private date = h('span.pill-text');
  private edges: () => void = () => {};
  private toolKey = '';
  private last = '';

  constructor(root: HTMLElement, private on: HudHandlers) {
    this.goalText = h('span.goal-text', null, 'Welcome to Breezeport!');
    this.goalBar = h('i.bar-fill');
    this.tools = h('nav.toolbar', { 'aria-label': 'Tools' });
    this.happyIcon = h('span.pill-icon', null, icon('smile', 24));
    const edges = () => {
      const t = this.tools;
      t.classList.toggle('more-left', t.scrollLeft > 4);
      t.classList.toggle('more-right', t.scrollLeft + t.clientWidth < t.scrollWidth - 4);
      t.classList.toggle('more-up', t.scrollTop > 4);
      t.classList.toggle('more-down', t.scrollTop + t.clientHeight < t.scrollHeight - 4);
    };
    this.tools.addEventListener('scroll', edges, { passive: true });
    addEventListener('resize', edges);
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(edges).observe(this.tools);
    this.edges = edges;
    this.el = h('div#hud', null,
      h('div.topbar', null,
        h('button.goal', { 'aria-label': 'Goals', onclick: () => on.goals() }, icon('star', 26), h('span.goal-body', null, this.goalText, h('span.bar', null, this.goalBar))),
        h('div.pills', null,
          h('span.pill.date', { title: 'Season and day' }, icon('summer', 22), this.date),
          h('span.pill.pop', { title: 'People living in town' }, icon('people', 24, 'Population'), this.pop),
          h('span.pill.happy', { title: 'How happy the town is' }, this.happyIcon, this.happy),
          h('span.pill.coins', { title: 'The town’s budget' }, icon('coin', 24, 'Coins'), this.coins),
          h('button.icon-button.menu', { 'aria-label': 'Menu', onclick: () => on.menu() }, icon('menu', 28)))),
      h('div.campad', { 'aria-label': 'Camera' },
        h('button.icon-button', { 'aria-label': 'Turn left (Q)', onclick: () => on.turn(-1) }, icon('turnLeft', 26)),
        h('button.icon-button', { 'aria-label': 'Turn right (E)', onclick: () => on.turn(1) }, icon('turnRight', 26)),
        h('button.icon-button', { 'aria-label': 'Zoom in', onclick: () => on.zoom(1) }, icon('zoomIn', 26)),
        h('button.icon-button', { 'aria-label': 'Zoom out', onclick: () => on.zoom(-1) }, icon('zoomOut', 26))),
      this.tools);
    root.appendChild(this.el);
  }

  /** The tools that are open, and which one is in use. */
  setTools(open: readonly ToolId[], active: ToolId) {
    const key = `${open.join(',')}|${active}`;
    if (key === this.toolKey) return;
    this.toolKey = key;
    fill(this.tools, ...TOOLS.filter(t => open.includes(t.id)).map((t, i) => h('button.tool', {
      class: t.id === active ? 'active' : '', 'aria-label': `${t.label} (${i + 1})`, 'aria-pressed': String(t.id === active), dataset: { tool: t.id },
      onclick: () => this.on.tool(t.id),
    }, icon(t.icon, 30), h('span', null, t.label))));
    requestAnimationFrame(this.edges);
  }

  /** Move keyboard / gamepad focus into the tool bar, on the tool in use. */
  focusTools() {
    const b = this.tools.querySelector<HTMLElement>('.tool.active') ?? this.tools.querySelector<HTMLElement>('.tool');
    b?.focus({ preventScroll: true });
    b?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }

  get toolsFocused() { return this.tools.contains(document.activeElement); }

  set visible(v: boolean) {
    this.el.hidden = !v;
    if (v) requestAnimationFrame(() => requestAnimationFrame(this.edges));
  }

  set(o: { date: string; population: number; happiness: number | null; coins: number; creative: boolean }) {
    const key = `${o.date}|${o.population}|${o.happiness}|${Math.floor(o.coins)}|${o.creative}|${innerWidth <= 520}`;
    if (key === this.last) return;
    this.last = key;
    this.date.textContent = o.date;
    this.pop.textContent = o.population.toLocaleString('en-US');
    this.pop.parentElement?.setAttribute('aria-label', `${o.population.toLocaleString('en-US')} people live in town`);
    this.happy.textContent = o.happiness === null ? '–' : `${o.happiness}%`;
    this.happy.parentElement?.setAttribute('aria-label', o.happiness === null ? 'No one lives in town yet' : `The town is ${o.happiness}% happy`);
    fill(this.happyIcon, icon(o.happiness === null || o.happiness >= 66 ? 'smile' : o.happiness >= 50 ? 'calmFace' : 'glumFace', 24));
    const coins = Math.floor(o.coins);
    const short = innerWidth <= 520 && coins >= 10000;
    this.coins.textContent = o.creative ? '∞' : short ? `${Math.round(coins / 1000)}k` : coins.toLocaleString('en-US');
    this.coins.parentElement?.setAttribute('aria-label', o.creative ? 'Unlimited coins in Creative mode' : `${coins.toLocaleString('en-US')} coins`);
  }

  setGoal(text: string, progress: number | null) {
    this.goalText.textContent = text;
    this.goalBar.parentElement!.hidden = progress === null;
    if (progress !== null) this.goalBar.style.width = `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%`;
  }
}
