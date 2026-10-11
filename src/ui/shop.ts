/** Shop screen: Buy and Sell tabs with friendly rows and big buttons. */
import { SHOPS, type ShopEntry } from '../data/shops';
import { maxStack, tryItem } from '../data/items';
import { boughtToday, buy, sellToShop, shopBuys, shopStock } from '../sim/shops';
import type { Sim } from '../sim/sim';
import { fmt, h } from './dom';
import { icon } from './icons';
import { infoLine, invGrid } from './inventory';
import { iconName, itemName } from './itemview';
import type { Modals } from './widgets';

export const SHOP_CSS = `
.shop { width: min(88vw, 600px); }
.shop-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.shop-head .greet { flex: 1; font-style: italic; color: var(--ink2); }
.tabs { display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap; }
.tab { font: inherit; font-weight: 700; padding: 6px 14px; min-height: 40px; border: 3px solid var(--paper3); border-radius: 10px 10px 4px 4px; background: var(--paper2); cursor: pointer; }
.tab.on { background: #fff6dc; border-color: var(--wood-d); }
.rows { max-height: min(52vh, 420px); overflow: auto; display: flex; flex-direction: column; gap: 6px; padding-right: 4px; }
.row { display: flex; align-items: center; gap: 10px; padding: 6px 8px; background: var(--paper2); border-radius: 8px; }
.row .nm { flex: 1; min-width: 0; }
.row .nm b { display: block; }
.row .nm small { color: var(--ink2); display: block; font-size: .85em; }
.row .btn.small { padding: 4px 8px; }
.row .pr { font-weight: 800; color: #7a4a10; white-space: nowrap; display: flex; align-items: center; gap: 2px; }
.row.locked { opacity: .55; }
.coins-line { display: flex; align-items: center; gap: 6px; font-weight: 800; color: #7a4a10; margin-right: auto; }
`;

export function openShop(sim: Sim, shopId: string, modals: Modals, sfx: (id: string) => void, toast: (t: string) => void, portrait?: HTMLElement): void {
  const def = SHOPS[shopId];
  const wrap = h('div', { class: 'shop' });
  let tab: 'buy' | 'sell' = 'buy';
  let close = () => {};
  const info = infoLine();
  const render = () => {
    wrap.innerHTML = '';
    const coins = h('div', { class: 'coins-line' }, icon('ui.coin', 24), fmt(sim.p.coins));
    const tabs = h('div', { class: 'tabs', role: 'tablist' });
    for (const [k, label] of [['buy', 'Buy'], ['sell', 'Sell']] as const) {
      const t = h('button', { class: 'tab' + (tab === k ? ' on' : ''), role: 'tab', 'aria-selected': String(tab === k) }, label);
      t.addEventListener('click', () => {
        tab = k;
        render();
      });
      tabs.appendChild(t);
    }
    wrap.append(h('div', { class: 'shop-head' }, portrait ?? null, h('div', null, h('h2', { style: 'margin:0' }, def.name), h('div', { class: 'greet' }, def.greeting))), tabs);
    if (tab === 'buy') {
      const rows = h('div', { class: 'rows' });
      const stock = shopStock(sim, shopId);
      if (!stock.length) rows.appendChild(h('p', null, 'Nothing for sale right now. Check back soon!'));
      for (const e of stock) rows.appendChild(buyRow(e));
      wrap.append(rows);
    } else {
      wrap.append(
        h('p', { style: 'margin:4px 0' }, 'Tap an item to sell the whole stack. (Shift-click or long-press sells one.)'),
        invGrid(sim.p.inv, {
          sim,
          info,
          enabled: (s) => shopBuys(shopId, s.id),
          onClick: (i, one) => {
            const v = sellToShop(sim, shopId, i, one ? 1 : undefined);
            if (v > 0) {
              sfx('coin');
              render();
            }
          },
        }),
        info,
      );
    }
    wrap.append(h('div', { class: 'actions' }, coins, h('button', { class: 'btn green primary', onclick: () => close() }, 'Bye!')));
  };
  const buyRow = (e: ShopEntry) => {
    const d = tryItem(e.id);
    const name = e.label ?? (d ? itemName(e.id) : e.id);
    const desc = e.desc ?? d?.desc ?? '';
    const mats = (e.mats ?? []).map(([m, n]) => `${n} ${tryItem(m)?.name ?? m}`).join(', ');
    const left = e.limit !== undefined ? e.limit - boughtToday(sim, shopId, e.id) : undefined;
    const row = h(
      'div',
      { class: 'row' + (e.locked ? ' locked' : '') },
      icon(e.service && !d ? 'ui.bag' : iconName(e.id, sim.p.tools), 32),
      h('div', { class: 'nm' }, h('b', null, name), h('small', null, e.locked ?? desc), mats ? h('small', null, `Needs: ${mats}`) : null, left !== undefined ? h('small', null, `${left} left today`) : null),
      h('div', { class: 'pr' }, icon('ui.coin', 16), fmt(e.price)),
    );
    const doBuy = (qty: number) => {
      const r = buy(sim, shopId, e, qty);
      if (r.ok) {
        sfx('coin');
        if (r.msg) toast(r.msg);
        render();
      } else if (r.msg) toast(r.msg);
    };
    const stackable = !e.service && maxStack(e.id) > 1;
    row.appendChild(h('button', { class: 'btn small', disabled: !!e.locked || sim.p.coins < e.price, onclick: () => doBuy(1) }, 'Buy'));
    if (stackable) row.appendChild(h('button', { class: 'btn small gray', disabled: !!e.locked || sim.p.coins < e.price * 5, onclick: () => doBuy(5), 'aria-label': `Buy 5 ${name}` }, '×5'));
    return row;
  };
  render();
  close = modals.show(wrap, { cancel: () => {} });
}
