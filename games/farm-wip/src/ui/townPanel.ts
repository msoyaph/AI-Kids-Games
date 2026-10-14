/**
 * Town: the order board (deliver an order or swap it for a new one, free), where the Little Lark is,
 * and the neighbours (today's swap, the co-op order, and friendship hearts).
 */
import { BOAT_TITLE, NEIGHBOR, NEIGHBORS, PERSON, TOWN } from '../data/cast';
import { itemDef } from '../data/items';
import { sfx } from '../audio/engine';
import { playTimeLabel } from '../sim/clock';
import { count } from '../sim/inventory';
import { acceptTrade, giveToCoop, neighborState, NEIGHBOR_LEVEL, startCoop, tradeOffer } from '../sim/neighbors';
import { boatCapacity, canFill, deliver, skipOrder, type Order } from '../sim/orders';
import type { Farm } from '../sim/state';
import { levelOf } from '../sim/world';
import { fill, h } from './h';
import { icon } from './icons';
import { itemIcon } from './itemIcons';

const hearts = (n: number) => '♥'.repeat(Math.floor(n)) + (n % 1 >= 0.5 ? '♡' : '') || '♡';

function itemsRow(farm: Farm, items: { id: string; n: number }[]) {
  return h('span.inputs', null, ...items.map(x => {
    const have = count(farm, x.id);
    return h('span.input', { class: have >= x.n ? 'have' : 'need', title: itemDef(x.id).name }, itemIcon(x.id, 24), `${Math.min(have, 999)}/${x.n} `, h('small.item-name', null, itemDef(x.id).name));
  }));
}

export function townPanel(farm: Farm, changed: () => void, say: (t: string) => void): HTMLElement {
  const root = h('div.town');
  let tab: 'orders' | 'neighbours' = 'orders';
  const render = () => {
    const b = farm.boat;
    const boatLine = b.backAt === null
      ? (b.crates.length ? `${BOAT_TITLE} is loading…` : `${BOAT_TITLE} is at the dock, ready to sail.`)
      : `${BOAT_TITLE} is off to ${TOWN}: back in ${playTimeLabel(b.backAt - farm.t)}${b.crates.length ? `, then ${b.crates.length} more crate${b.crates.length > 1 ? 's' : ''}` : ''}.`;
    const order = (o: Order) => {
      const p = PERSON[o.who];
      const ok = canFill(farm, o);
      return h('div.order', { class: ok ? 'ready' : '' },
        h('div.order-head', null, h('b', null, p?.name ?? 'Someone'), h('small', null, o.note ?? p?.role ?? '')),
        itemsRow(farm, o.items),
        h('div.order-foot', null,
          h('span.reward', null, `${o.coins}`, icon('coin', 16), ` +${o.xp} XP`),
          h('span.btns', null,
            !o.story ? h('button', { 'aria-label': `Swap ${p?.name ?? 'this'}’s order for a new one`, onclick: () => { skipOrder(farm, o.id); sfx.back(); changed(); render(); } }, 'Swap') : null,
            h('button.go', { disabled: !ok, onclick: () => { const r = deliver(farm, o.id); if (r.ok) { sfx.coins(); say(`Crate on its way to ${TOWN}!`); changed(); } else say(r.why); render(); } }, icon('boat', 20), 'Deliver'))));
    };
    const neighbours = () => {
      if (levelOf(farm) < NEIGHBOR_LEVEL) return [h('p.note', null, `The neighbours will come and say hello at farm level ${NEIGHBOR_LEVEL}.`)];
      const c = farm.coop;
      return [
        ...NEIGHBORS.map(n => {
          const s = neighborState(farm, n.id);
          const t = tradeOffer(farm, n.id);
          return h('div.neighbor', null,
            h('div.order-head', null, h('b', null, `${n.who} · ${n.farm}`), h('span.hearts', { 'aria-label': `${Math.floor(s.hearts)} hearts` }, hearts(s.hearts))),
            h('small', null, n.personality),
            t ? h('div.trade', null,
              h('span', null, 'Swap: your ', itemIcon(t.want.id, 22), ` ${t.want.n} ${itemDef(t.want.id).name} for their `, itemIcon(t.give.id, 22), ` ${t.give.n} ${itemDef(t.give.id).name}`),
              h('button', { disabled: count(farm, t.want.id) < t.want.n, onclick: () => { const r = acceptTrade(farm, t); if (r.ok) { sfx.coins(); say(`Thanks! says ${n.who}.`); changed(); } else say(r.why); render(); } }, 'Swap'))
              : h('small', null, 'No swap today: come back tomorrow.'));
        }),
        h('h3', null, 'Co-op order'),
        c ? h('div.order', null,
          h('div.order-head', null, h('b', null, `With ${NEIGHBOR[c.neighbor]!.who}`), h('small', null, `${c.mine + c.theirs} of ${c.need} ${itemDef(c.item).name}`)),
          h('span.bar.wide', null, h('i.bar-fill', { style: `width:${Math.round(((c.mine + c.theirs) / c.need) * 100)}%` })),
          h('small', null, `They add theirs as time goes by; you add yours from the barn. No hurry, ever.`),
          h('div.order-foot', null,
            h('span.reward', null, `${c.coins}`, icon('coin', 16)),
            h('span.btns', null,
              h('button', { disabled: count(farm, c.item) === 0, onclick: () => { const k = giveToCoop(farm, 5); if (k) { sfx.plant(); changed(); } render(); } }, itemIcon(c.item, 20), 'Add 5'),
              h('button', { disabled: count(farm, c.item) === 0, onclick: () => { const k = giveToCoop(farm, 999); if (k) { sfx.plant(); changed(); } render(); } }, 'Add all'))))
          : h('button', { disabled: levelOf(farm) < NEIGHBOR_LEVEL + 1, onclick: () => { const r = startCoop(farm); if (r) { sfx.open(); say(`${NEIGHBOR[r.neighbor]!.who} wants to fill a big order together!`); changed(); } render(); } }, levelOf(farm) < NEIGHBOR_LEVEL + 1 ? `Co-op orders at level ${NEIGHBOR_LEVEL + 1}` : 'Start a co-op order'),
      ];
    };
    fill(root,
      h('div.tabs', { role: 'tablist' },
        h('button', { role: 'tab', 'aria-selected': String(tab === 'orders'), onclick: () => { tab = 'orders'; render(); } }, icon('orders', 22), 'Orders'),
        h('button', { role: 'tab', 'aria-selected': String(tab === 'neighbours'), onclick: () => { tab = 'neighbours'; render(); } }, icon('farm', 22), 'Neighbours')),
      tab === 'orders'
        ? [
          h('p.boat-line', null, icon('boat', 22), boatLine, boatCapacity(farm) > 1 ? h('small', null, ` (carries ${boatCapacity(farm)} crates)`) : null),
          farm.orders.length ? h('div.orders', null, ...farm.orders.map(order)) : h('p.note', null, 'New orders arrive soon. Keep farming!'),
        ]
        : neighbours());
  };
  render();
  return root;
}
