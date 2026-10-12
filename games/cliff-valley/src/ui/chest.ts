/** Chest screen (two grids, color labels, quick stack) and the Lost & Found box. */
import { CHEST_COLORS, CHEST_COLOR_NAMES, CHEST_SLOTS } from '../data/placeables';
import { tryItem } from '../data/items';
import { addItem, sortSlots } from '../sim/inventory';
import type { Sim } from '../sim/sim';
import type { ItemStack, WorldObject } from '../sim/types';
import { h } from './dom';
import { infoLine, invGrid } from './inventory';
import type { Modals } from './widgets';

function moveStack(from: (ItemStack | null)[], i: number, to: (ItemStack | null)[], one: boolean): boolean {
  const s = from[i];
  if (!s) return false;
  const n = one ? 1 : s.n;
  const left = addItem(to, s.id, n, s.q);
  const moved = n - left;
  if (moved <= 0) return false;
  s.n -= moved;
  if (s.n <= 0) from[i] = null;
  return true;
}

export function openChestUI(sim: Sim, chest: WorldObject, modals: Modals, sfx: (id: string) => void, onChange: () => void): void {
  if (!chest.items) chest.items = new Array(CHEST_SLOTS).fill(null);
  const items = chest.items;
  const wrap = h('div', { class: 'wide-modal' });
  const info = infoLine();
  let close = () => {};
  const render = () => {
    wrap.innerHTML = '';
    const colors = h('div', { class: 'choice-row', role: 'radiogroup', 'aria-label': 'Chest color' });
    CHEST_COLORS.forEach((c, i) => {
      const b = h('button', { class: 'swatch' + ((chest.col ?? 0) === i ? ' on' : ''), style: `background:#${c.toString(16).padStart(6, '0')};width:30px;height:30px`, 'aria-label': `${CHEST_COLOR_NAMES[i]} label`, title: CHEST_COLOR_NAMES[i] });
      b.addEventListener('click', () => {
        chest.col = i;
        onChange();
        render();
      });
      colors.appendChild(b);
    });
    wrap.append(
      h('h2', null, 'Chest'),
      colors,
      h('p', { style: 'margin:6px 0 4px;font-weight:700' }, 'In the chest'),
      invGrid(items, { cols: 8, sim, info, onClick: (i, one) => { if (moveStack(items, i, sim.p.inv, one)) { sfx('click'); render(); } } }),
      h('p', { style: 'margin:10px 0 4px;font-weight:700' }, 'Your bag'),
      invGrid(sim.p.inv, { sim, info, enabled: (s) => !s.id.startsWith('tool.'), onClick: (i, one) => { const s = sim.p.inv[i]; if (s && !s.id.startsWith('tool.') && moveStack(sim.p.inv, i, items, one)) { sfx('click'); render(); } } }),
      info,
      h(
        'div',
        { class: 'actions' },
        h('button', { class: 'btn small', onclick: () => { sortSlots(items, (id) => tryItem(id)?.cat ?? 'special'); render(); } }, 'Sort chest'),
        h('button', {
          class: 'btn small',
          title: 'Move items you already keep in this chest',
          onclick: () => {
            const ids = new Set(items.filter(Boolean).map((s) => s!.id));
            for (let i = 0; i < sim.p.inv.length; i++) {
              const s = sim.p.inv[i];
              if (s && ids.has(s.id)) moveStack(sim.p.inv, i, items, false);
            }
            sfx('click');
            render();
          },
        }, 'Stack matching'),
        h('button', {
          class: 'btn small',
          onclick: () => {
            for (let i = 0; i < items.length; i++) moveStack(items, i, sim.p.inv, false);
            render();
          },
        }, 'Take all'),
        h('button', { class: 'btn green primary', onclick: () => close() }, 'Done'),
      ),
    );
  };
  render();
  close = modals.show(wrap, { cancel: () => {}, onClose: onChange });
}

export function openLostAndFound(sim: Sim, modals: Modals, sfx: (id: string) => void): void {
  const wrap = h('div', { class: 'wide-modal' });
  const info = infoLine();
  let close = () => {};
  const render = () => {
    wrap.innerHTML = '';
    const slots: (ItemStack | null)[] = sim.state.overflow.slice();
    while (slots.length < 8) slots.push(null);
    wrap.append(
      h('h2', null, 'Lost & Found Box'),
      h('p', null, sim.state.overflow.length ? 'Things that didn\'t fit in your bag wait here. Tap to take them.' : 'The box is empty right now.'),
      invGrid(slots, {
        cols: 8,
        sim,
        info,
        onClick: (i) => {
          const s = sim.state.overflow[i];
          if (!s) return;
          const left = addItem(sim.p.inv, s.id, s.n, s.q);
          if (left === s.n) return;
          s.n = left;
          if (s.n <= 0) sim.state.overflow.splice(i, 1);
          sfx('click');
          render();
        },
      }),
      info,
      h('div', { class: 'actions' }, h('button', { class: 'btn green primary', onclick: () => close() }, 'Done')),
    );
  };
  render();
  close = modals.show(wrap, { cancel: () => {} });
}
