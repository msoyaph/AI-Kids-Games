/**
 * The farm shop: animal homes, orchard trees and bushes, and farm buildings. Choosing one starts
 * placing it on the farm (nothing is paid until it's placed).
 */
import { ANIMAL } from '../data/animals';
import { BUILDINGS } from '../data/buildings';
import { TREES } from '../data/orchard';
import { MACHINES, RECIPES } from '../data/production';
import type { Buyable } from '../sim/build';
import { buyableInfo } from '../sim/build';
import type { Farm } from '../sim/state';
import { levelOf } from '../sim/world';
import { h } from './h';
import { icon } from './icons';
import { itemIcon } from './itemIcons';

export function shopPanel(farm: Farm, choose: (b: Buyable) => void): HTMLElement {
  const level = levelOf(farm);
  const card = (b: Buyable, picture: Node, note: string) => {
    const info = buyableInfo(b)!;
    const locked = info.level > level;
    return h('button.seed-card', {
      class: locked ? 'locked' : '',
      disabled: locked || farm.coins < info.cost,
      'aria-label': `${info.name}. ${locked ? `Farm level ${info.level}.` : `${info.cost} coins.`} ${note}`,
      onclick: () => choose(b),
    }, picture, h('b', null, info.name),
    locked ? h('small', null, icon('lock', 14), ` Level ${info.level}`) : h('small', null, `${info.cost}`, icon('coin', 14)),
    h('small.hint', null, note));
  };
  const homes = BUILDINGS.filter(b => b.holds && b.id !== 'kennel');
  return h('div.seeds', null,
    h('h3', null, 'Animal homes'),
    h('div.seed-grid', null, ...homes.map(b => {
      const a = ANIMAL[b.holds!]!;
      return card({ kind: 'building', def: b.id }, a.product ? itemIcon(a.product, 40) : icon('farm', 40), a.id === 'bee' ? 'Comes with bees' : `Holds ${b.cap} ${a.plural.toLowerCase()}`);
    })),
    h('h3', null, 'Workshops'),
    h('div.seed-grid', null, ...MACHINES.map(m => {
      const first = RECIPES.find(r => r.machine === m.id)!;
      return card({ kind: 'building', def: m.id }, itemIcon(first.id, 40), `Makes ${RECIPES.filter(r => r.machine === m.id).slice(0, 2).map(r => r.name.toLowerCase()).join(', ')}…`);
    })),
    h('h3', null, 'Orchard'),
    h('div.seed-grid', null, ...TREES.map(t => card({ kind: 'tree', def: t.id }, itemIcon(t.fruit, 40), `${t.fruitName} again and again`))),
    h('h3', null, 'Farm'),
    h('div.seed-grid', null, card({ kind: 'building', def: 'compost' }, itemIcon('fertilizer', 40), 'Turns scraps into compost')));
}
