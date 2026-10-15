/**
 * Contracts (Town → Contracts): each business's basket, how many drops are done, and Send. A basket
 * is wanted about once a day, and a wanted basket waits as long as it takes.
 */
import { BUSINESSES } from '../data/businesses';
import { CHAPTERS } from '../data/chapters';
import { PERSON, TOWN } from '../data/cast';
import { itemDef } from '../data/items';
import { sfx } from '../audio/engine';
import { canSendDrop, contractFor, dropWanted, sendDrop } from '../sim/contracts';
import { count } from '../sim/inventory';
import type { Farm } from '../sim/state';
import { fill, h } from './h';
import { icon } from './icons';
import { itemIcon } from './itemIcons';

export function contractsSection(farm: Farm, changed: () => void, say: (t: string) => void): HTMLElement {
  const root = h('div.contracts');
  const render = () => {
    fill(root,
      h('p', null, `${TOWN}’s shops buy baskets from the farm, a few at a time, for a better price than the board. There’s never a rush.`),
      ...BUSINESSES.map(b => {
        const owner = PERSON[b.owner]?.name ?? b.owner;
        const c = contractFor(farm, b.id);
        if (farm.story.chapter < b.chapter || !c) {
          return h('div.order.locked', null, h('div.order-head', null, h('b', null, b.name), h('small', null, `Opens in chapter ${b.chapter + 1}: ${CHAPTERS[b.chapter]?.title ?? ''}`)));
        }
        const wanted = dropWanted(farm, c);
        const ok = canSendDrop(farm, c);
        return h('div.order', { class: ok ? 'ready' : '' },
          h('div.order-head', null, h('b', null, b.name), h('small', null, `${owner} · basket ${Math.min(c.drops, c.done + c.sent + 1)} of ${c.drops}`)),
          h('span.bar.wide', null, h('i.bar-fill', { style: `width:${Math.round((c.done / c.drops) * 100)}%` })),
          h('span.inputs', null, ...c.basket.map(x => {
            const have = count(farm, x.id);
            return h('span.input', { class: have >= x.n ? 'have' : 'need', title: itemDef(x.id).name }, itemIcon(x.id, 24), `${Math.min(have, 999)}/${x.n} `, h('small.item-name', null, itemDef(x.id).name));
          })),
          h('small', null, c.done + c.sent >= c.drops ? 'Every basket is on its way!' : wanted ? 'A basket is wanted now. It will wait for you.' : 'The next basket is wanted tomorrow.', c.sent ? ` ${c.sent} on the boat.` : ''),
          h('div.order-foot', null,
            h('span.reward', null, `${c.coinsPerDrop}`, icon('coin', 16), ` a basket, +${c.bonus} at the end`),
            h('button.go', { disabled: !ok, onclick: () => { const r = sendDrop(farm, b.id); if (r.ok) { sfx.coins(); say(`A basket for ${owner} is on its way!`); changed(); } else say(r.why); render(); } }, icon('boat', 20), 'Send')));
      }));
  };
  render();
  return root;
}
