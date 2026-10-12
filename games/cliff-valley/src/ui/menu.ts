/** The main menu with tabs. Systems register tabs; the bag tab lives here. */
import { tryItem } from '../data/items';
import { sortSlots } from '../sim/inventory';
import type { Sim } from '../sim/sim';
import { fmt, h } from './dom';
import { icon } from './icons';
import { describe, infoLine, invGrid } from './inventory';
import { SHOP_CSS } from './shop';
import type { Modals, Toasts } from './widgets';

export interface MenuHost {
  sim: Sim;
  modals: Modals;
  toasts: Toasts;
  sfx(id: string): void;
  settingsPanel(onChange: () => void): HTMLElement;
  quitToTitle(): void;
}

export interface MenuTab {
  id: string;
  label: string;
  icon: string;
  render(host: MenuHost, rerender: () => void): HTMLElement;
}

export const MENU_TABS: MenuTab[] = [];
export function registerTab(t: MenuTab, index?: number): void {
  const i = MENU_TABS.findIndex((x) => x.id === t.id);
  if (i >= 0) MENU_TABS.splice(i, 1);
  if (index === undefined) MENU_TABS.push(t);
  else MENU_TABS.splice(index, 0, t);
}

export const MENU_CSS = `
.menu { width: min(90vw, 640px); min-height: min(80vh, 520px); }
.menu .tabs { justify-content: center; }
.menu .tab { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; }
.menu .tab .lbl { font-size: .9em; }
@media (max-width: 560px) { .menu .tab .lbl { display: none; } .menu .tab { padding: 4px 6px; } }
.menu-body { min-height: 300px; }
.bag-top { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; flex-wrap: wrap; }
.bag-top .who { flex: 1; font-weight: 700; }
` + SHOP_CSS;

export function openMenu(host: MenuHost, initial = 'bag'): void {
  let cur = MENU_TABS.find((t) => t.id === initial) ?? MENU_TABS[0];
  const wrap = h('div', { class: 'menu' });
  let close = () => {};
  const render = () => {
    wrap.innerHTML = '';
    const tabs = h('div', { class: 'tabs', role: 'tablist' });
    for (const t of MENU_TABS) {
      const b = h('button', { class: 'tab' + (t === cur ? ' on' : ''), role: 'tab', 'aria-selected': String(t === cur), title: t.label }, icon(t.icon, 24), h('span', { class: 'lbl' }, t.label));
      b.addEventListener('click', () => {
        cur = t;
        render();
      });
      tabs.appendChild(b);
    }
    const body = h('div', { class: 'menu-body' });
    body.appendChild(cur.render(host, render));
    wrap.append(tabs, body, h('div', { class: 'actions' }, h('button', { class: 'btn green primary', onclick: () => close() }, 'Close')));
  };
  render();
  close = host.modals.show(wrap, { cancel: () => {} });
}

// ── Bag tab ─────────────────────────────────────────────────
let picked = -1;
registerTab({
  id: 'bag',
  label: 'Bag',
  icon: 'ui.bag',
  render(host, rerender) {
    const sim = host.sim, p = sim.p;
    const info = infoLine();
    const el = h('div');
    el.appendChild(
      h('div', { class: 'bag-top' },
        h('div', { class: 'who' }, `${p.name} of ${p.farm} Farm`),
        h('span', { style: 'display:flex;align-items:center;gap:4px;font-weight:800;color:#7a4a10' }, icon('ui.coin', 24), fmt(p.coins)),
        h('span', { style: 'display:flex;align-items:center;gap:4px;font-weight:700' }, icon('ui.energy', 24), `${Math.round(p.energy)}/${p.maxEnergy}`),
      ),
    );
    el.appendChild(h('p', { style: 'margin:2px 0 8px;font-size:.9em' }, 'Tap an item, then tap another slot to move it. The top row is your toolbar.'));
    el.appendChild(
      invGrid(p.inv, {
        sim,
        info,
        keys: true,
        selected: picked,
        onClick: (i) => {
          if (picked < 0) {
            if (p.inv[i]) picked = i;
          } else {
            const a = p.inv[picked], b = p.inv[i];
            if (a && b && a.id === b.id && a.q === b.q && picked !== i) {
              b.n += a.n;
              p.inv[picked] = null;
            } else {
              p.inv[picked] = b;
              p.inv[i] = a;
            }
            picked = -1;
            host.sfx('click');
          }
          rerender();
        },
      }),
    );
    if (picked >= 0) describe(info, p.inv[picked], sim);
    el.appendChild(info);
    const acts = h('div', { class: 'actions', style: 'justify-content:flex-start' });
    acts.appendChild(
      h('button', {
        class: 'btn small',
        onclick: () => {
          sortSlots(p.inv, (id) => tryItem(id)?.cat ?? 'special');
          picked = -1;
          rerender();
        },
      }, 'Sort'),
    );
    acts.appendChild(
      h('button', {
        class: 'btn small gray',
        disabled: picked < 0 || !!p.inv[picked]?.id.startsWith('tool.'),
        onclick: () => {
          const s = p.inv[picked];
          if (!s) return;
          host.modals.ask('Toss it?', `Toss ${s.n > 1 ? 'all ' + s.n + ' ' : ''}${tryItem(s.id)?.name ?? s.id} away?`, [
            { label: 'Keep', cls: 'gray' },
            { label: 'Toss', cls: 'red', onClick: () => { p.inv[picked] = null; picked = -1; rerender(); } },
          ]);
        },
      }, 'Toss'),
    );
    el.appendChild(acts);
    return el;
  },
});
