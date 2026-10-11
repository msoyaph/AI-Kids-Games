/** Reusable inventory grid + item info line (used by bag, chests, shops, shipping, gifts). */
import { tryItem } from '../data/items';
import { sellPrice } from '../sim/economy';
import type { Sim } from '../sim/sim';
import type { ItemStack } from '../sim/types';
import { fmt, h } from './dom';
import { icon } from './icons';
import { QUALITY_NAMES, iconName, itemName } from './itemview';

export interface GridOpts {
  cols?: number;
  /** click handler; `alt` = shift-click / long-press for "one" */
  onClick?: (i: number, alt: boolean) => void;
  /** grey out slots that can't be used here */
  enabled?: (s: ItemStack) => boolean;
  selected?: number;
  info?: HTMLElement;
  sim?: Sim;
  /** show toolbar row numbers for the first 10 */
  keys?: boolean;
  size?: number;
}

export function infoLine(): HTMLElement {
  return h('div', { class: 'info-line', 'aria-live': 'polite' }, 'Tap an item to see what it is.');
}

export function describe(info: HTMLElement, s: ItemStack | null, sim?: Sim): void {
  info.innerHTML = '';
  if (!s) {
    info.textContent = '';
    return;
  }
  const d = tryItem(s.id);
  const price = sim ? sellPrice(sim, s.id, s.q) : 0;
  info.appendChild(icon(iconName(s.id, sim?.p.tools), 32));
  info.appendChild(
    h(
      'div',
      null,
      h('b', null, `${itemName(s.id, sim?.p.tools)}${s.q ? ` (${QUALITY_NAMES[s.q]} star)` : ''}${s.n > 1 ? ` ×${s.n}` : ''}`),
      h('div', null, d?.desc ?? ''),
      h('div', { class: 'sub' }, [d?.energy ? `Restores ${d.energy} energy. ` : '', price ? `Sells for ${fmt(price)} coins.` : ''].join('')),
    ),
  );
}

/** Columns/size that fit the current screen. */
export function fitGrid(want = 10): { cols: number; size: number } {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const cols = w < 420 ? 6 : w < 560 ? 8 : want;
  const size = Math.max(36, Math.min(46, Math.floor((Math.min(w, 560) - 70) / cols) - 4));
  return { cols, size };
}

export function invGrid(slots: (ItemStack | null)[], opts: GridOpts = {}): HTMLElement {
  const fit = fitGrid(opts.cols ?? 10);
  const size = opts.size ?? fit.size;
  opts = { ...opts, cols: Math.min(opts.cols ?? 10, fit.cols) };
  const grid = h('div', { class: 'inv-grid', style: `grid-template-columns: repeat(${opts.cols ?? 10}, ${size}px)` });
  slots.forEach((s, i) => {
    const el = h('div', { class: 'slot' + (opts.selected === i ? ' sel' : ''), role: 'button', tabindex: '0', style: `width:${size}px;height:${size}px` });
    if (opts.keys && i < 10) el.appendChild(h('span', { class: 'k' }, String((i + 1) % 10)));
    if (s) {
      const ok = opts.enabled ? opts.enabled(s) : true;
      el.appendChild(icon(iconName(s.id, opts.sim?.p.tools), 32));
      if (s.n > 1) el.appendChild(h('span', { class: 'n' }, String(s.n)));
      if (s.q > 0) {
        const q = icon(`ui.star${s.q}`, 16);
        q.style.position = 'absolute';
        q.style.left = '0';
        q.style.bottom = '0';
        el.appendChild(q);
      }
      if (!ok) el.classList.add('off');
      el.setAttribute('aria-label', `${itemName(s.id, opts.sim?.p.tools)}${s.n > 1 ? ' ×' + s.n : ''}`);
    } else el.setAttribute('aria-label', 'Empty slot');
    let pressTimer = 0;
    let long = false;
    el.addEventListener('pointerdown', () => {
      long = false;
      pressTimer = window.setTimeout(() => {
        long = true;
        if (opts.info) describe(opts.info, s, opts.sim);
      }, 450);
    });
    el.addEventListener('pointerup', (e) => {
      clearTimeout(pressTimer);
      if (opts.info) describe(opts.info, s, opts.sim);
      if (long && e.pointerType === 'touch') {
        if (s && opts.onClick && (!opts.enabled || opts.enabled(s))) opts.onClick(i, true);
        return;
      }
      if (opts.onClick && (!s || !opts.enabled || opts.enabled(s))) opts.onClick(i, e.shiftKey);
    });
    el.addEventListener('pointerleave', () => clearTimeout(pressTimer));
    el.addEventListener('mouseenter', () => opts.info && describe(opts.info, s, opts.sim));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (opts.onClick && (!s || !opts.enabled || opts.enabled(s))) opts.onClick(i, e.shiftKey);
      }
    });
    grid.appendChild(el);
  });
  return grid;
}

export const INV_CSS = `
.inv-grid { display: grid; gap: 4px; justify-content: center; }
.inv-grid .slot.off { opacity: .35; filter: grayscale(.6); }
.info-line { display: flex; gap: 10px; align-items: flex-start; min-height: 56px; margin-top: 10px; padding: 8px 10px; background: var(--paper2); border-radius: 8px; font-size: .92em; }
.info-line .sub { color: var(--ink2); font-size: .9em; margin-top: 2px; }
.bin-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; background: var(--paper2); border-radius: 8px; margin-bottom: 10px; font-weight: 700; }
.bin-row .v { margin-left: auto; color: #7a4a10; }
.wide-modal { width: min(96vw, 560px); }
@media (max-width: 560px) { .inv-grid { gap: 3px; } }
`;
