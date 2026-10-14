/**
 * A shop: fixed prices in coins you earn by playing. Buy one at a time with big buttons; nothing
 * random, nothing for real money.
 */
import { addItem } from '../core/state';
import { ITEMS } from '../data/items';
import { SHOPS } from '../data/shops';
import type { Game } from '../game/game';
import { canvasUrl } from '../render/atlas';
import { itemIcon } from '../art/icons';
import { h } from './dom';

export function openShop(game: Game, id: string): Promise<void> {
  const s = game.session!.state;
  return new Promise(resolve => {
    const coins = h('p.coins', {});
    const update = () => {
      coins.textContent = `Coins: ${s.coins}`;
      for (const b of list.querySelectorAll<HTMLButtonElement>('button[data-item]')) {
        const item = ITEMS[b.dataset.item!]!;
        b.disabled = s.coins < item.price;
        b.querySelector('.have')!.textContent = `You have ${s.bag[item.id] ?? 0}`;
      }
    };
    const list = h('div.shop-list', {}, ...(SHOPS[id] ?? []).map(itemId => {
      const item = ITEMS[itemId]!;
      return h('button.shop-item', { type: 'button', 'data-item': itemId, onclick: () => {
        if (s.coins < item.price) return;
        s.coins -= item.price;
        addItem(s, itemId, 1);
        game.toast(`Bought ${item.name}!`, 1200);
        update();
      } }, h('img.px.icon', { src: canvasUrl(itemIcon(itemId), 4), alt: '' }), h('span.name', {}, item.name), h('span.price', {}, `${item.price} coins`), h('span.desc', {}, item.desc), h('span.have', {}));
    }));
    const close = () => { game.focus.pop(layer); el.remove(); resolve(); };
    const el = h('div.menu-screen', { role: 'dialog', 'aria-label': 'Shop' }, h('div.panel.menu.shop', {}, h('h2', {}, 'Shop'), coins, list, h('button.primary', { type: 'button', onclick: close }, 'Done')));
    const layer = { el, back: close };
    game.app.ui.appendChild(el);
    game.focus.push(layer);
    update();
  });
}
