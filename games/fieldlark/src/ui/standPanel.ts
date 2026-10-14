/**
 * The farm stand (Town → Stand): what's on each shelf, its price (Cheaper / Dearer with a word for
 * it: Bargain, Fair, A bit pricey, Pricey), and how today went, with one plain tip.
 */
import { itemDef } from '../data/items';
import { sfx } from '../audio/engine';
import { dayIndex } from '../sim/clock';
import type { Stars } from '../sim/inventory';
import { priceWord, PRICE_MAX, PRICE_MIN, PRICE_STEP, setKeep, setPrice, SHELF_MAX, shelfPrice, shelves, standTip, stock, unstock } from '../sim/stand';
import type { Farm } from '../sim/state';
import { fill, h } from './h';
import { icon } from './icons';
import { itemIcon, starsEl } from './itemIcons';

export function standSection(farm: Farm, changed: () => void, say: (t: string) => void): HTMLElement {
  const root = h('div.stand');
  let picking: number | null = null;
  const render = () => {
    const list = shelves(farm);
    const d = dayIndex(farm.t);
    const todayPage = farm.stand.days.find(p => p.day === d);
    const yesterday = farm.stand.days.find(p => p.day === d - 1);
    const sold = todayPage ? Object.values(todayPage.sold).reduce((s, r) => s + r.n, 0) : 0;
    const coins = todayPage ? Object.values(todayPage.sold).reduce((s, r) => s + r.coins, 0) : 0;
    const kinds = new Set(list.filter(s => s.item && s.n > 0).map(s => s.item)).size;
    const tip = standTip(todayPage, kinds) ?? standTip(yesterday, kinds);
    const helpersStock = farm.helpers.some(x => x.job === 'deliver');
    if (picking !== null) {
      const i = picking;
      const options = Object.keys(farm.inv).filter(id => itemDef(id).sellable).sort((a, b) => itemDef(a).name.localeCompare(itemDef(b).name));
      fill(root,
        h('p', null, `What should go on shelf ${i + 1}?`),
        options.length ? h('div.fair-options', null, ...options.flatMap(id => ([3, 2, 1] as Stars[]).filter(st => (farm.inv[id]?.[st - 1] ?? 0) > 0).map(st => h('button.fair-option', {
          onclick: () => { const r = stock(farm, i, id, st, 6); if (r.ok) { sfx.plant(); changed(); } else say(r.why); picking = null; render(); },
        }, itemIcon(id, 32), h('small', null, `${itemDef(id).name} × ${farm.inv[id]![st - 1]}`), starsEl(st, 12))))) : h('p.note', null, 'The barn is empty. Pick some crops first!'),
        h('button', { onclick: () => { picking = null; render(); } }, 'Back'));
      return;
    }
    fill(root,
      h('p', null, 'Your stall on the Larkford square. Shoppers come by while you play. A fair price sells steadily; cheaper sells faster, dearer earns more each.'),
      h('p.stand-today', null, sold ? `Today: ${sold} sold for ${coins} coins.` : 'Nothing sold yet today.'),
      tip ? h('p.book-game', null, tip) : null,
      h('ul.shelves', null, ...list.map((s, i) => {
        if (!s.item) return h('li.shelf.empty', null, h('span', null, `Shelf ${i + 1} is empty`), h('button.primary', { onclick: () => { picking = i; render(); } }, 'Stock it'));
        const name = itemDef(s.item).name;
        const more = (farm.inv[s.item]?.[s.stars - 1] ?? 0) > 0 && s.n < SHELF_MAX;
        return h('li.shelf', null,
          h('div.shelf-head', null, itemIcon(s.item, 36), h('div', null, h('b', null, name), h('small', null, starsEl(s.stars, 12), s.n ? ` ${s.n} on the shelf` : ' Sold out!'))),
          h('div.price-row', { role: 'group', 'aria-label': `Price for ${name}` },
            h('button', { 'aria-label': 'Cheaper', disabled: s.price <= PRICE_MIN, onclick: () => { setPrice(farm, i, s.price - PRICE_STEP); sfx.tap(); changed(); render(); } }, '−'),
            h('span.price-word', null, h('b', null, priceWord(s.price)), h('small', null, `${shelfPrice(farm, s)}`, icon('coin', 14), ' each')),
            h('button', { 'aria-label': 'Dearer', disabled: s.price >= PRICE_MAX, onclick: () => { setPrice(farm, i, s.price + PRICE_STEP); sfx.tap(); changed(); render(); } }, '+')),
          helpersStock ? h('div.price-row', { role: 'group', 'aria-label': `Helpers keep ${name} at` },
            h('button', { 'aria-label': 'Keep fewer', disabled: s.keep <= 0, onclick: () => { setKeep(farm, i, s.keep - 1); changed(); render(); } }, '−'),
            h('span.price-word', null, h('small', null, `Helpers keep ${s.keep}`)),
            h('button', { 'aria-label': 'Keep more', disabled: s.keep >= SHELF_MAX, onclick: () => { setKeep(farm, i, s.keep + 1); changed(); render(); } }, '+')) : null,
          h('div.card-buttons', null,
            more ? h('button', { onclick: () => { const r = stock(farm, i, s.item!, s.stars, SHELF_MAX); if (r.ok) { sfx.plant(); changed(); } else say(r.why); render(); } }, 'Add more') : null,
            h('button', { onclick: () => { const r = unstock(farm, i); if (r.ok) { sfx.back(); changed(); } else say(r.why); render(); } }, s.n ? 'Take back' : 'Clear shelf')));
      })),
      h('p.note', null, 'Things on the stand never spoil, and anything can go back to the barn.'));
  };
  render();
  return root;
}
