/**
 * The farmhouse: the hub for everything that isn't out in the fields. Tap the Keeper's Cottage (or
 * Menu → Farmhouse) for the Farm Book, the Ledger and your goals; later chapters add the farmhands,
 * the Farm Lab and the ribbon wall here.
 */
import { h } from './h';
import { icon, type IconName } from './icons';

export interface HubEntry {
  id: string;
  title: string;
  text: string;
  icon: IconName;
  open(): void;
  /** Shown instead of opening, while it isn't ready yet ("After chapter 3"). */
  later?: string;
}

export function farmhousePanel(entries: HubEntry[]): HTMLElement {
  return h('div.hub', null,
    h('p', null, 'Hattie’s old desk is still here, full of books and notes.'),
    h('div.hub-grid', null, ...entries.map(e => h('button.hub-entry', {
      disabled: !!e.later,
      dataset: { hub: e.id },
      onclick: () => e.open(),
    }, icon(e.icon, 40), h('b', null, e.title), h('small', null, e.later ?? e.text)))));
}
