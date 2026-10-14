// The HUD as a crisp DOM layer over the 3D garden: the top bar (compost, snacks, the wave path with
// its picnic flags, speed, pause), the plant cards (cost, recharge sweep, not-enough-compost) with
// the trowel, the wave banner and the plant info popover. Placed from ui/layout.ts, so what the pick
// test proves is what players see.
import { PLANTS as ROSTER } from '../data/roster';
import { PLANTS } from '../data/tuning';
import { CURLING } from '../sim/game';
import type { GameState, LevelSpec } from '../sim/types';
import type { Banner } from '../game/play';
import { ICONS } from './icons';
import type { Layout, Rect } from './layout';

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;

export interface CardInfo { id: string; image: string }
export const TROWEL = 'trowel';

const place = (el: HTMLElement, r: Rect) => { el.style.left = `${r.x}px`; el.style.top = `${r.y}px`; el.style.width = `${r.w}px`; el.style.height = `${r.h}px`; };

export class Hud {
  readonly root = $('#hud');
  readonly cards = $('#cards');
  private readonly topbar = $('#topbar');
  private readonly count = $('#compost-count');
  private readonly compost = $('#compost');
  private readonly snacks = $('#snacks');
  private readonly waves = $('#waves');
  private readonly banner = $('#banner');
  readonly info = $('#info');
  selected = 0;
  private shownBanner: Banner | null = null;
  private lastCompost = -1;
  private lastSnacks = -1;

  constructor() {
    this.snacks.replaceChildren(...[ICONS.sandwich, ICONS.apple, ICONS.cupcake].map(svg => { const s = document.createElement('span'); s.className = 'snack'; s.innerHTML = svg; return s; }));
  }

  /** Sets up the cards (and the trowel, when planting is allowed) and the wave path's flags. */
  setLevel(spec: LevelSpec, cards: readonly CardInfo[], withTrowel: boolean) {
    const nodes = cards.map((card, i) => {
      const plant = ROSTER.find(p => p.id === card.id), cost = card.id === CURLING.card ? CURLING.cost : PLANTS[card.id]?.cost ?? 0;
      const name = plant?.name ?? 'Pinecone', does = plant?.does ?? 'Slides down a lane and knocks a critter home.';
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'card'; b.dataset.plant = card.id; b.setAttribute('role', 'radio');
      b.setAttribute('aria-label', `${name}, ${cost} compost. ${does}`);
      b.innerHTML = `<img alt="" src="${card.image}"><span class="wait"></span><span class="key" aria-hidden="true">${i + 1}</span><span class="cost">${ICONS.compost}${cost}</span><span class="name">${name}</span>`;
      return b;
    });
    if (withTrowel) {
      const t = document.createElement('button');
      t.type = 'button'; t.className = 'card tool'; t.dataset.plant = TROWEL; t.setAttribute('role', 'radio');
      t.setAttribute('aria-label', 'Trowel: dig up a plant to make room (no compost back)');
      t.innerHTML = `${ICONS.trowel}<span class="key" aria-hidden="true">T</span>`;
      nodes.push(t);
    }
    this.cards.replaceChildren(...nodes);
    this.select(0);
    // the wave path's picnic flags, where each big wave starts along the level's critters
    const flags = this.waves.querySelector('.flags')!;
    flags.replaceChildren();
    const pts = spec.waves.map(w => w.spawns.length);
    const total = pts.reduce((a, b) => a + b, 0) || 1;
    let sum = 0;
    spec.waves.forEach((w, i) => {
      if (w.flag) { const f = document.createElement('span'); f.className = `flag${i === spec.waves.length - 1 ? ' last' : ''}`; f.style.left = `${Math.min(100, ((sum + pts[i]! * 0.5) / total) * 100)}%`; flags.appendChild(f); }
      sum += pts[i]!;
    });
    this.waves.hidden = !!spec.endless;
    this.lastCompost = this.lastSnacks = -1;
  }

  select(index: number) {
    const buttons = [...this.cards.children] as HTMLElement[];
    if (!buttons.length) return;
    this.selected = Math.max(0, Math.min(buttons.length - 1, index));
    buttons.forEach((b, i) => b.setAttribute('aria-checked', String(i === this.selected)));
  }

  get selectedId() { return (this.cards.children[this.selected] as HTMLElement | undefined)?.dataset.plant ?? ''; }
  get cardCount() { return this.cards.children.length; }

  layout(lay: Layout) {
    place(this.topbar, lay.topBar);
    place(this.cards, lay.cardArea);
    if (lay.cards === 'column') { this.cards.style.height = 'auto'; this.cards.style.maxHeight = `${lay.cardArea.h}px`; this.cards.style.transform = ''; }
    else { this.cards.style.width = 'auto'; this.cards.style.maxWidth = `${lay.cardArea.w}px`; this.cards.style.left = `${lay.cardArea.x + lay.cardArea.w / 2}px`; this.cards.style.transform = 'translateX(-50%)'; }
    this.cards.className = lay.cards;
    this.cards.style.setProperty('--card', `${lay.card}px`);
  }

  /** Refreshes the HUD from the game (cheap: only what changed is written). */
  update(g: GameState, bump: number, banner: Banner | null) {
    if (g.compost !== this.lastCompost) { this.count.textContent = String(g.compost); this.compost.setAttribute('aria-label', `Compost: ${g.compost}`); this.lastCompost = g.compost; }
    this.compost.classList.toggle('bump', bump > 0);
    if (g.snacks !== this.lastSnacks) {
      [...this.snacks.children].forEach((s, i) => s.classList.toggle('gone', i >= g.snacks));
      this.snacks.setAttribute('aria-label', `Snacks left: ${g.snacks}`);
      this.lastSnacks = g.snacks;
    }
    const pct = Math.round(g.progress * 100);
    (this.waves.querySelector('.fill') as HTMLElement).style.width = `${pct}%`;
    (this.waves.querySelector('.head') as HTMLElement).style.left = `${pct}%`;
    this.waves.setAttribute('aria-valuenow', String(pct));
    ([...this.cards.children] as HTMLElement[]).forEach((el, i) => {
      const card = g.cards[i];
      if (!card) return;
      const cost = card.plant === CURLING.card ? CURLING.cost : PLANTS[card.plant]?.cost ?? 0, full = card.plant === CURLING.card ? CURLING.recharge : PLANTS[card.plant]?.recharge ?? 1;
      const wait = card.wait / full;
      el.style.setProperty('--cd', `${Math.round(Math.max(0, Math.min(1, wait)) * 360)}deg`);
      el.classList.toggle('cooling', wait > 0);
      el.classList.toggle('poor', g.compost < cost);
    });
    if (banner !== this.shownBanner) {
      this.shownBanner = banner;
      if (banner) { this.banner.textContent = banner.text; this.banner.className = `show ${banner.kind}`; }
    }
    if (banner && g.t > banner.until) this.banner.className = '';
  }

  /** Card rectangles on screen, for tests. */
  cardRects() {
    return ([...this.cards.children] as HTMLElement[]).map(el => {
      const r = el.getBoundingClientRect();
      return { id: el.dataset.plant ?? '', x: r.x, y: r.y, w: r.width, h: r.height };
    });
  }

  /** The plant info popover (a long press on a card or a plant). */
  showInfo(id: string, x: number, y: number) {
    const p = ROSTER.find(r => r.id === id);
    if (!p) return this.hideInfo();
    const st = PLANTS[id]!;
    this.info.innerHTML = `<h3>${p.name}</h3><p>${p.does}</p><p>${st.cost} compost · ready again in ${st.recharge} s${st.dusk ? ' · wakes at dusk' : ''}${st.tile === 'water' ? ' · grows in water' : ''}</p>`;
    this.info.hidden = false;
    const r = this.info.getBoundingClientRect();
    this.info.style.left = `${Math.max(8, Math.min(innerWidth - r.width - 8, x - r.width / 2))}px`;
    this.info.style.top = `${Math.max(8, Math.min(innerHeight - r.height - 8, y - r.height - 16))}px`;
  }
  hideInfo() { this.info.hidden = true; }
}
