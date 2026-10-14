/**
 * The barn and the market: everything you have, by stars, with today's price. A ↑ marks a good day
 * to sell (the price is above usual); otherwise it may pay to keep it until another season. Nothing
 * in the barn ever spoils.
 */
import { itemDef } from '../data/items';
import { TUNING } from '../data/tuning';
import { sfx } from '../audio/engine';
import { barnCap, totalItems, type Stars } from '../sim/inventory';
import { goodTimeToSell, priceOf, sell } from '../sim/market';
import type { Farm } from '../sim/state';
import { spend } from '../sim/world';
import { fill, h } from './h';
import { icon } from './icons';
import { itemIcon, starsEl } from './itemIcons';

export function barnPanel(farm: Farm, changed: () => void): HTMLElement {
  const root = h('div.barn');
  const render = () => {
    const used = totalItems(farm), cap = barnCap(farm);
    const rows: HTMLElement[] = [];
    for (const id of Object.keys(farm.inv).sort((a, b) => itemDef(a).name.localeCompare(itemDef(b).name))) {
      const d = itemDef(id);
      const stack = farm.inv[id]!;
      for (const stars of [3, 2, 1] as Stars[]) {
        const n = stack[stars - 1];
        if (!n) continue;
        const price = priceOf(farm, id, stars);
        const doSell = (k: number) => { const r = sell(farm, id, stars, k); if (r.ok) { sfx.coins(); changed(); render(); } };
        rows.push(h('div.barn-row', null,
          itemIcon(id, 36),
          h('div.barn-name', null, h('b', null, d.name), h('span', null, d.sellable ? starsEl(stars) : null, d.sellable ? ` × ${n}` : `${n} bag${n === 1 ? '' : 's'}`)),
          d.sellable
            ? h('div.barn-sell', null,
              h('span.price', { title: goodTimeToSell(farm, id) ? 'A good price today' : 'An ordinary price today' }, `${price}`, icon('coin', 16), goodTimeToSell(farm, id) ? h('span.up', { 'aria-label': 'good price' }, '↑') : null),
              h('button', { onclick: () => doSell(1), 'aria-label': `Sell one ${d.name}` }, 'Sell 1'),
              n > 1 ? h('button', { onclick: () => doSell(n), 'aria-label': `Sell all ${n} ${d.name}` }, 'All') : null)
            : h('small', null, 'For the farm')));
      }
    }
    const next = farm.barnLevel + 1 < TUNING.barnCap.length ? TUNING.barnUpgrade[farm.barnLevel + 1]! : null;
    fill(root,
      h('div.barn-cap', null, h('span', null, `Space: ${used} of ${cap}`), h('span.bar', null, h('i.bar-fill', { style: `width:${Math.round((used / cap) * 100)}%` }))),
      rows.length ? h('div.barn-list', null, ...rows) : h('p.note', null, 'The barn is empty. Pick some crops!'),
      next !== null ? h('button', {
        disabled: farm.coins < next,
        onclick: () => { if (spend(farm, next)) { farm.barnLevel++; sfx.levelUp(); changed(); render(); } },
      }, `Make the barn bigger (${TUNING.barnCap[farm.barnLevel + 1]} spaces): ${next}`, icon('coin', 18)) : null);
  };
  render();
  return root;
}
