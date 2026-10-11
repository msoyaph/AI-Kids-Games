import { h, svg } from './dom';
import { icon } from './icons';

export type BtnColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple' | 'orange' | 'red' | 'white' | 'ghost';

export interface BtnOpts {
  color?: BtnColor;
  size?: 'small' | 'big';
  round?: boolean;
  id?: string;
  title?: string;
  disabled?: boolean;
  /** Sound to play on press (default "click"). */
  sound?: string | null;
}

/** Hook set by the audio system so every button clicks. */
export const uiHooks = {
  sfx: (_name: string) => {},
  say: (_text: string) => {},
};

/** A big friendly button: icon + words. */
export function button(label: string, iconName: string | null, onClick: (e: Event) => void, opts: BtnOpts = {}): HTMLButtonElement {
  const cls = ['btn', opts.color && opts.color !== 'yellow' ? opts.color : '', opts.size ?? '', opts.round ? 'round' : ''].filter(Boolean).join(' ');
  const b = h('button', { class: cls, type: 'button', 'data-testid': opts.id, 'aria-label': opts.round ? label : undefined, title: opts.title ?? (opts.round ? label : undefined) });
  if (iconName) b.append(svg(icon(iconName)));
  if (!opts.round && label) b.append(h('span', { class: 'lbl' }, label));
  if (opts.disabled) b.disabled = true;
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    if (b.disabled) return;
    if (opts.sound !== null) uiHooks.sfx(opts.sound ?? 'click');
    onClick(e);
  });
  return b;
}

export function setLabel(b: HTMLButtonElement, label: string): void {
  const l = b.querySelector('.lbl');
  if (l && l.textContent !== label) l.textContent = label;
}

/** Row of 1-5 stars. */
export function starRow(n: number, max = 5): HTMLElement {
  const row = h('span', { class: 'stars', 'aria-label': `${n} of ${max} stars` });
  for (let i = 0; i < max; i++) row.append(svg(icon(i < n ? 'star' : 'starEmpty')));
  return row;
}

export function iconEl(name: string, cls = 'ico'): HTMLElement {
  return svg(icon(name), cls);
}

export function pill(iconName: string, text: string, testId?: string): { el: HTMLElement; text: HTMLElement } {
  const t = h('span', null, text);
  const el = h('div', { class: 'pill', 'data-testid': testId }, iconEl(iconName), t);
  return { el, text: t };
}
