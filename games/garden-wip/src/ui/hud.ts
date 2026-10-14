// The HUD as a crisp DOM layer over the 3D garden: the top bar (compost, wave path, speed, pause)
// and the plant cards, placed from ui/layout.ts so what the pick test proves is what players see.
import { PLANTS } from '../data/roster';
import type { Layout, Rect } from './layout';

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;

export interface CardInfo { id: string; cost: number; image: string }

const LEAF_CHIP = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M3 25c2-6 7-9 13-9s11 3 13 9z" fill="#6f4a2e"/><path d="M16 16c0-6 4-10 10-11-1 6-4 10-10 11z" fill="#6cbc58"/></svg>';

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
      button.innerHTML = `<img alt="" src="${card.image}"><span class="cost">${LEAF_CHIP}${card.cost}</span><span class="name">${plant.name}</span>`;
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
