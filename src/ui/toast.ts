import { S } from '../app/services';
import { h } from './dom';
import { iconEl } from './widgets';

let wrap: HTMLElement | null = null;

/** Small message that slides in at the top and fades away. */
export function toast(text: string, icon = 'star', ms = 2600): void {
  if (!wrap || !wrap.isConnected) {
    wrap = h('div', { class: 'toast-wrap' });
    S.game.topLayer.append(wrap);
  }
  const el = h('div', { class: 'toast', role: 'status' }, iconEl(icon), h('span', null, text));
  wrap.append(el);
  while (wrap.children.length > 3) wrap.firstElementChild?.remove();
  setTimeout(() => el.classList.add('out'), ms);
  setTimeout(() => el.remove(), ms + 350);
}
