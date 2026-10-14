// The HUD as a crisp DOM layer over the 3D garden: the top bar (compost, wave path, speed, pause)
// and the plant cards, placed from ui/layout.ts so what the pick test proves is what players see.
import { PLANTS } from '../data/roster';
import type { Layout, Rect } from './layout';

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;

export interface CardInfo { id: string; cost: number; image: string }

const COMPOST_ICON = '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="22" r="11" fill="#5e3a22" stroke="#2b1910" stroke-width="3"/><path d="M20 21c-7 0-12-4-13-9 6 0 11 3 13 9zM20 21c7 0 12-4 13-9-6 0-11 3-13 9z" fill="#8fe05a" stroke="#2b1910" stroke-width="2.5" stroke-linejoin="round"/></svg>';

const place = (el: HTMLElement, r: Rect) => {
  el.style.left = `${r.x}px`; el.style.top = `${r.y}px`; el.style.width = `${r.w}px`; el.style.height = `${r.h}px`;
};

export class Hud {
  readonly root = $('#hud');
  readonly cards = $('#cards');
  private readonly topbar = $('#topbar');
  selected = 0;
  onSelect: (index: number) => void = () => {};

  setCards(list: readonly CardInfo[]) {
    this.cards.replaceChildren(...list.map((card, i) => {
      const plant = PLANTS.find(p => p.id === card.id)!;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'card';
      button.dataset.plant = card.id;
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-label', `${plant.name}, ${card.cost} compost. ${plant.does}`);
      button.innerHTML = `<img alt="" src="${card.image}"><span class="wait"></span><span class="key" aria-hidden="true">${i + 1}</span><span class="cost">${COMPOST_ICON}${card.cost}</span><span class="name">${plant.name}</span>`;
      button.addEventListener('click', () => this.select(i));
      return button;
    }));
    this.select(this.selected);
  }

  select(index: number) {
    const buttons = [...this.cards.children] as HTMLElement[];
    if (!buttons.length) return;
    this.selected = Math.max(0, Math.min(buttons.length - 1, index));
    buttons.forEach((b, i) => b.setAttribute('aria-checked', String(i === this.selected)));
    this.onSelect(this.selected);
  }

  /**
   * A card's state: `wait` is how much of its recharge is left (0 ready, 1 just planted), shown as a
   * sweep that clears like a clock hand; `afford` is false when there isn't enough compost.
   */
  cardState(index: number, wait: number, afford: boolean) {
    const el = this.cards.children[index] as HTMLElement | undefined;
    if (!el) return;
    el.style.setProperty('--cd', `${Math.round(Math.max(0, Math.min(1, wait)) * 360)}deg`);
    el.classList.toggle('cooling', wait > 0);
    el.classList.toggle('poor', !afford);
  }

  get selectedId() { return (this.cards.children[this.selected] as HTMLElement | undefined)?.dataset.plant ?? ''; }

  layout(lay: Layout) {
    place(this.topbar, lay.topBar);
    place(this.cards, lay.cardArea);
    // the panel hugs the cards; the layout's area is the most it may take
    if (lay.cards === 'column') { this.cards.style.height = 'auto'; this.cards.style.maxHeight = `${lay.cardArea.h}px`; }
    else { this.cards.style.width = 'auto'; this.cards.style.maxWidth = `${lay.cardArea.w}px`; this.cards.style.left = `${lay.cardArea.x + lay.cardArea.w / 2}px`; this.cards.style.transform = 'translateX(-50%)'; }
    if (lay.cards === 'column') { this.cards.style.left = `${lay.cardArea.x}px`; this.cards.style.transform = ''; }
    this.cards.className = lay.cards;
    this.cards.style.setProperty('--card', `${lay.card}px`);
  }

  /** Card rectangles on screen, for tests. */
  cardRects() {
    return ([...this.cards.children] as HTMLElement[]).map(el => {
      const r = el.getBoundingClientRect();
      return { id: el.dataset.plant ?? '', x: r.x, y: r.y, w: r.width, h: r.height };
    });
  }
}
