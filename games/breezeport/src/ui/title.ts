/**
 * The title screen, over the town: the name, Continue, the three town slots (each with its name,
 * mode, chapter, people and time played), and Settings. A new town picks Story or Creative (Creative
 * opens once any town has finished chapter 1), then a name from friendly word parts (no typing, so
 * nothing needs checking), and off it goes.
 */
import { sfx } from '../audio/engine';
import type { Settings } from '../save/settings';
import { deleteSlot, slotCards, type SlotCard, type SlotNo } from '../save/slots';
import type { Town } from '../sim/state';
import { fill, h } from './h';
import { icon } from './icons';
import type { Panels } from './panels';

export interface TitleDeps {
  settings: Settings;
  persistent: boolean;
  panels: Panels;
  open(n: SlotNo): void;
  create(n: SlotNo, mode: Town['mode'], name: string): void;
  settingsPanel(): void;
}

const FIRST = ['Breeze', 'Sunny', 'Shell', 'Kite', 'Coral', 'Pebble', 'Maple', 'Wave', 'Star', 'Tide', 'Willow', 'Clover', 'Lark', 'Puffin', 'Honey', 'Silver'];
const SECOND = ['port', 'cove', 'bay', 'wick', 'ton', 'field', 'view', 'side', 'point', 'shore', 'brook', 'harbour', 'dale', 'beach'];

const playTime = (t = 0) => { const m = Math.round(t / 60); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`; };

export function titleScreen(d: TitleDeps): HTMLElement {
  const cards = slotCards();
  const last = cards.find(c => c.n === d.settings.lastSlot && !c.empty && !c.unreadable);
  const el = h('section.title-screen', { 'aria-label': 'Breezeport' },
    h('div.title-card', null,
      h('h1.logo', null, h('span.logo-mark', { 'aria-hidden': 'true' }, icon('coin', 54)), 'Breezeport', h('small', null, 'Grow a sleepy seaside town into a happy city')),
      h('div.title-buttons', null,
        last ? h('button.big.primary', { onclick: () => { sfx.open(); d.open(last.n); } }, `Continue ${last.name}`) : null,
        h('button.big', { class: last ? '' : 'primary', onclick: () => showSlots() }, last ? 'All towns' : 'Play'),
        h('button', { onclick: () => d.settingsPanel() }, icon('gear', 24), ' Settings')),
      !d.persistent ? h('p.note.storage-note', null, 'This browser can’t keep your town, so it lasts until you close the game.') : null));
  requestAnimationFrame(() => el.querySelector<HTMLElement>('.primary')?.focus({ preventScroll: true }));

  function showSlots() {
    const list = h('div.slots');
    const render = () => fill(list, ...slotCards().map(c => slotCard(c, render)));
    render();
    d.panels.show('Your towns', list, { kind: 'card', className: 'slots-panel' });
  }

  function slotCard(c: SlotCard, rerender: () => void): HTMLElement {
    if (c.empty) return h('div.slot-card.empty', null, h('b', null, `Slot ${c.n}`), h('span', null, 'Empty'), h('button.go', { onclick: () => newTown(c.n) }, 'New town'));
    if (c.unreadable) return h('div.slot-card', null, h('b', null, `Slot ${c.n}`), h('span', null, 'This town couldn’t be read.'), h('button', { onclick: () => d.open(c.n) }, 'Try it'));
    return h('div.slot-card', null,
      h('b', null, c.name!),
      h('span', null, c.mode === 'creative' ? `Creative · ${c.pop} people` : `Chapter ${c.chapter! + 1} · ${c.pop} people · ${playTime(c.t)}`),
      h('div.row', null,
        h('button.go', { onclick: () => { d.panels.closeAll(); d.open(c.n); } }, 'Play'),
        h('button.icon-button', { 'aria-label': `Delete ${c.name}`, onclick: () => confirmDelete(c, rerender) }, icon('trash', 24))));
  }

  function confirmDelete(c: SlotCard, rerender: () => void) {
    d.panels.show(`Delete ${c.name}?`, h('div', null,
      h('p', null, 'This town will be gone for good. Are you sure?'),
      h('div.row', null,
        h('button', { onclick: () => d.panels.close() }, 'Keep it'),
        h('button.danger', { onclick: () => { deleteSlot(c.n); d.panels.close(); rerender(); } }, 'Delete it'))), { kind: 'card' });
  }

  function newTown(n: SlotNo) {
    const creative = d.settings.creative;
    d.panels.show('A new town', h('div.mode-pick', null,
      h('button.mode', { onclick: () => pickName(n, 'story') }, h('b', null, 'Story'), h('span', null, 'Be the junior mayor and bring Breezeport back to life, chapter by chapter.')),
      h('button.mode', { disabled: !creative, onclick: () => pickName(n, 'creative') }, h('b', null, 'Creative'), h('span', null, creative ? 'Unlimited coins and everything open. Build anything!' : 'Finish chapter 1 of the story to open Creative mode.'))), { kind: 'card' });
  }

  function pickName(n: SlotNo, mode: Town['mode']) {
    let a = 0, b = 0;
    const name = () => `${FIRST[a]}${SECOND[b]}`;
    const shown = h('div.town-name', { 'aria-live': 'polite' }, name());
    const update = () => { shown.textContent = name(); sfx.tap(); };
    d.panels.show('Name your town', h('div.name-pick', null,
      shown,
      h('div.row', null,
        h('button', { 'aria-label': 'Previous first part', onclick: () => { a = (a + FIRST.length - 1) % FIRST.length; update(); } }, '‹'),
        h('span.part', null, 'First part'),
        h('button', { 'aria-label': 'Next first part', onclick: () => { a = (a + 1) % FIRST.length; update(); } }, '›')),
      h('div.row', null,
        h('button', { 'aria-label': 'Previous second part', onclick: () => { b = (b + SECOND.length - 1) % SECOND.length; update(); } }, '‹'),
        h('span.part', null, 'Second part'),
        h('button', { 'aria-label': 'Next second part', onclick: () => { b = (b + 1) % SECOND.length; update(); } }, '›')),
      h('button', { onclick: () => { a = Math.floor(Math.random() * FIRST.length); b = Math.floor(Math.random() * SECOND.length); update(); } }, 'Surprise me'),
      h('button.big.primary', { onclick: () => { d.panels.closeAll(); d.create(n, mode, name()); } }, mode === 'creative' ? 'Start building!' : 'Become the mayor!')), { kind: 'card' });
  }

  return el;
}
