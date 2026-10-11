// The Glowpad: a phone-style menu with apps (quests, map, island glow, catalog, journal, ...).
import type { App } from '../app';
import type { Game } from '../sim/game';
import { ratingBreakdown } from '../sim/rating';
import { agents } from '../sim/agents';
import { Ground, REGION_NAMES } from '../world/types';
import { btn, clear, h, type Panel, type UIManager } from './dom';
import { questLogBody } from './story';

export interface PhoneApp {
  id: string;
  name: string;
  icon: string;
  color: string;
  render: (app: App, g: Game, body: HTMLElement, rerender: () => void) => void;
}

export const PHONE_APPS: PhoneApp[] = [];
export function registerPhoneApp(a: PhoneApp): void {
  const i = PHONE_APPS.findIndex((x) => x.id === a.id);
  if (i >= 0) PHONE_APPS[i] = a;
  else PHONE_APPS.push(a);
}

export class Phone implements Panel {
  el: HTMLElement;
  modal = true;
  private body = h('div', { class: 'phone-body scroll' });
  private title = h('div', { class: 'phone-title' });
  private current: PhoneApp | null = null;
  constructor(private ui: UIManager, private app: App, start?: string) {
    this.el = h(
      'div',
      { class: 'screen' },
      h('div', { class: 'dim', onclick: () => ui.pop(this) }),
      h('div', { class: 'phone panel' }, h('div', { class: 'phone-notch' }), h('div', { class: 'phone-head' }, this.title, h('span', { class: 'spacer' }), btn('✕', () => ui.pop(this), 'small ghost')), this.body),
    );
    const a = PHONE_APPS.find((x) => x.id === start);
    if (a) this.open(a);
    else this.home();
  }

  home(): void {
    this.current = null;
    this.title.textContent = 'Glowpad';
    clear(this.body);
    const grid = h('div', { class: 'phone-grid' });
    const order = ['quests', 'map', 'friends', 'glow', 'catalog', 'journal', 'challenges', 'settings'];
    const apps = [...PHONE_APPS].sort((a, b) => (order.indexOf(a.id) + 99) % 99 - (order.indexOf(b.id) + 99) % 99);
    for (const a of apps) {
      const b = h('button', { class: 'phone-app', 'data-nav': '' }, h('div', { class: 'pa-icon', style: `background:${a.color}` }, a.icon), h('div', { class: 'pa-name' }, a.name));
      b.addEventListener('click', () => this.open(a));
      grid.append(b);
    }
    this.body.append(grid);
    this.ui.focusFirst(this);
  }

  open(a: PhoneApp): void {
    this.current = a;
    this.title.textContent = a.name;
    const rerender = () => {
      clear(this.body);
      this.body.append(btn('‹ Apps', () => this.home(), 'small ghost'));
      const inner = h('div', { class: 'col', style: 'gap:10px' });
      this.body.append(inner);
      a.render(this.app, this.app.game!, inner, rerender);
      this.ui.focusFirst(this);
    };
    rerender();
  }

  command(c: string): boolean {
    if ((c === 'back' || c === 'cancel') && this.current) {
      this.home();
      return true;
    }
    if (c === 'phone' || c === 'pause') {
      this.ui.pop(this);
      return true;
    }
    return false;
  }
}

// ---------------------------------------------------------------- built-in apps

registerPhoneApp({
  id: 'quests',
  name: 'Missions',
  icon: '★',
  color: '#f6a5b5',
  render: (_app, g, body, rerender) => body.append(questLogBody(g, rerender)),
});

registerPhoneApp({
  id: 'map',
  name: 'Map',
  icon: '◈',
  color: '#8fd18a',
  render: (_app, g, body) => {
    const cv = h('canvas', { class: 'map-canvas' }) as HTMLCanvasElement;
    drawMap(g, cv);
    const legend = h('div', { class: 'row wrap tiny' }, h('span', { class: 'tag' }, '● You'), h('span', { class: 'tag' }, '■ Buildings'), h('span', { class: 'tag' }, '○ Neighbors'));
    body.append(cv, legend);
  },
});

registerPhoneApp({
  id: 'glow',
  name: 'Island Glow',
  icon: '✺',
  color: '#ffd166',
  render: (_app, g, body) => {
    const b = ratingBreakdown(g);
    body.append(h('div', { class: 'glow-stars' }, ...Array.from({ length: 5 }, (_, i) => h('span', { class: `lamp ${i < b.stars ? 'lit' : ''}` }, '◆'))));
    body.append(h('div', { style: 'text-align:center;font-weight:800' }, `${b.stars} lantern${b.stars === 1 ? '' : 's'} · ${b.total} glow points`));
    const rows: [string, number, string][] = [
      ['Neighbors', b.residents, 'More residents make the island lively.'],
      ['Museum', b.museum, 'Donate fish, bugs and fossils.'],
      ['Decorations', b.decor, 'Place outdoor furniture around the island.'],
      ['Flowers', b.flowers, 'Plant and breed flowers.'],
      ['Your home', b.home, 'Upgrade your house.'],
      ['Bridges & ramps', b.paths, 'Connect the island.'],
      ['Friendships', b.friends, 'Become close with neighbors.'],
      ['Weeds', b.weeds, 'Pull weeds to tidy up!'],
    ];
    for (const [n, v, tip] of rows) body.append(h('div', { class: 'glow-row' }, h('b', null, n), h('span', { class: 'muted tiny' }, tip), h('span', { class: `pts ${v < 0 ? 'neg' : ''}` }, v >= 0 ? `+${v}` : String(v))));
    body.append(h('div', { class: 'tiny muted' }, 'Lantern steps: 20 / 40 / 60 / 80 points.'));
  },
});

registerPhoneApp({
  id: 'settings',
  name: 'Settings',
  icon: '⚙',
  color: '#b9a6e0',
  render: (app, _g, body) => app.panels.settingsInline?.(body),
});

export function drawMap(g: Game, cv: HTMLCanvasElement): void {
  const N = g.world.size;
  const px = 5;
  cv.width = N * px;
  cv.height = N * px;
  const ctx = cv.getContext('2d')!;
  const w = g.world;
  for (let z = 0; z < N; z++)
    for (let x = 0; x < N; x++) {
      const i = w.idx(x, z);
      const gr = w.ground(i);
      const lvl = w.height(i);
      let c = '#7fc8e8';
      if (gr === Ground.Sand) c = '#f3e2b6';
      else if (gr === Ground.Dirt) c = '#e0c49a';
      else if (gr === Ground.Grass) c = lvl === 2 ? '#8fbf86' : lvl === 1 ? '#9ccb8e' : '#a9d896';
      else if (gr === Ground.River || gr === Ground.Pond) c = '#6fb8d8';
      const o = w.obj(i);
      if (o && (o.k === 'tree' || o.k === 'pine' || o.k === 'fruitTree')) c = '#6aa86f';
      if (o && o.k === 'deco') c = '#f6a5b5';
      ctx.fillStyle = c;
      ctx.fillRect(x * px, z * px, px, px);
    }
  // cliff outlines
  ctx.fillStyle = 'rgba(90,70,60,0.35)';
  for (let z = 1; z < N; z++)
    for (let x = 1; x < N; x++) {
      const a = w.height(w.idx(x, z)), b = w.height(w.idx(x, z - 1)), c2 = w.height(w.idx(x - 1, z));
      if (a !== b) ctx.fillRect(x * px, z * px - 1, px, 2);
      if (a !== c2) ctx.fillRect(x * px - 1, z * px, 2, px);
    }
  for (const s of g.state.world.structures) {
    ctx.fillStyle = s.type === 'bridge' || s.type === 'dock' || s.type === 'ramp' ? '#c9945f' : s.type === 'villagerHome' || s.type === 'plot' ? '#f28e6b' : '#6f6a8a';
    ctx.fillRect(s.x * px, s.z * px, s.w * px, s.d * px);
  }
  for (const a of agents(g).values()) {
    if (!a.visible) continue;
    ctx.beginPath();
    ctx.arc(a.x * px, a.z * px, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#5b4a68';
    ctx.stroke();
  }
  const p = g.state.player;
  ctx.beginPath();
  ctx.arc(p.x * px, p.z * px, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#ff6f8f';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#fff';
  ctx.stroke();
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = '#5b4a68';
  const lots = g.world.gen.lots;
  ctx.fillText('Plaza', lots.plaza.x * px, (lots.plaza.z + lots.plaza.d / 2) * px);
  ctx.fillText(REGION_NAMES[5]!, (lots.lighthouse.x - 6) * px, (lots.lighthouse.z - 1) * px);
}
