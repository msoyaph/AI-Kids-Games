import { h } from '../ui/dom';

/** Daily challenges and races tabs are filled in by their systems (phase 7). */
export const boardHooks = {
  daily: (list: HTMLElement, _detail: HTMLElement) => {
    list.append(h('div', { class: 'empty-note' }, 'Daily challenges are coming soon!'));
  },
  races: (list: HTMLElement, _detail: HTMLElement) => {
    list.append(h('div', { class: 'empty-note' }, 'Races open at Saturn!'));
  },
};
