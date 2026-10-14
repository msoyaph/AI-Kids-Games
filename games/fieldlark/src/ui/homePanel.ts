/**
 * An animal home: who lives here, how happy each one is (in words and in shapes, never colour
 * alone), and what they're making. Feed all, brush all, collect, and welcome a new animal.
 */
import { ANIMAL, animalForHome } from '../data/animals';
import { BUILDING } from '../data/buildings';
import { CROP } from '../data/crops';
import { sfx } from '../audio/engine';
import { animalsIn, brushAll, buyAnimal, collect, feedAll, feedFor, flowersNear, happiness, happinessWord, isReady, productStars } from '../sim/animals';
import { playTimeLabel } from '../sim/clock';
import { count } from '../sim/inventory';
import type { OtherObj } from '../sim/objects';
import type { Farm } from '../sim/state';
import { levelOf } from '../sim/world';
import { fill, h } from './h';
import { icon } from './icons';
import { itemIcon, starsEl } from './itemIcons';

const HEARTS = ['♡', '♥', '♥♥'];

export function homePanel(farm: Farm, home: OtherObj, changed: () => void, say: (t: string) => void): HTMLElement {
  const root = h('div.home');
  const def = animalForHome(home.def)!;
  const b = BUILDING[home.def]!;
  const render = () => {
    const list = animalsIn(home);
    const ready = list.filter(a => isReady(farm, a)).length;
    const rows = list.map(a => h('li.animal-row', null,
      h('b', null, a.name),
      def.id === 'dog' ? h('span', null, 'Always happy to see you')
        : def.id === 'bee' ? h('span', null, isReady(farm, a) ? 'Honey is ready!' : `Making honey… ${playTimeLabel(a.readyAt - farm.t)}`)
          : h('span', null,
            h('span.hearts', { 'aria-hidden': 'true' }, HEARTS[happiness(a)]), ` ${happinessWord(a)} · `,
            isReady(farm, a) ? `${def.productName} ready!` : `${def.productName.toLowerCase()} in ${playTimeLabel(a.readyAt - farm.t)}`,
            ' ', starsEl(productStars(farm, home, a), 14))));
    const feed = feedFor(farm, def.id);
    const hungry = list.filter(a => !a.fed && !isReady(farm, a)).length;
    const unbrushed = list.filter(a => !a.brushed && !isReady(farm, a)).length;
    const canBuy = def.id !== 'bee' && def.id !== 'dog' && list.length < (b.cap ?? 0);
    fill(root,
      def.id === 'bee'
        ? h('p', null, `Bees visit flowers up to ${5} tiles away. Flowers near the hive: ${flowersNear(farm, home.x, home.z)}. More flowers make better honey, and bees help flowering crops and fruit trees nearby give more.`)
        : def.id === 'dog' ? h('p', null, 'Rufus looks after the farm and loves a pat. Dogs are always fine on their own.')
          : h('p', null, `${list.length} of ${b.cap} ${def.plural.toLowerCase()}. Fed ${def.plural.toLowerCase()} work twice as fast, and feeding and brushing make them happier, for better ${def.productName.toLowerCase()}.`),
      list.length ? h('ul.animal-list', null, ...rows) : h('p.note', null, `No ${def.plural.toLowerCase()} yet.`),
      h('div.card-buttons', null,
        ready ? h('button.primary', { onclick: () => { const r = collect(farm, home); if (r.ok) { sfx.harvest(Math.max(...r.got.map(g => g.stars))); say(`+${r.total} ${def.productName}`); changed(); } else say(r.why); render(); } }, itemIcon(def.product!, 24), `Collect ${ready}`) : null,
        def.feeds.length ? h('button', {
          disabled: hungry === 0 || !feed,
          onclick: () => { const r = feedAll(farm, home); if (r.ok) { sfx.plant(); say(`Fed ${r.fed} with ${CROP[r.feed!]?.name ?? r.feed}`); changed(); } else say(r.why); render(); },
        }, feed ? itemIcon(feed, 24) : null, hungry === 0 ? 'All fed' : feed ? `Feed (${count(farm, feed)} ${CROP[feed]?.name ?? feed})` : `Needs ${def.feeds.map(f => CROP[f]?.name ?? f).join(' or ')}`) : null,
        def.id !== 'bee' && def.id !== 'dog' ? h('button', { disabled: unbrushed === 0, onclick: () => { const r = brushAll(farm, home); if (r.ok) { sfx.clear(); say(`Brushed ${r.brushed}: shiny!`); changed(); } render(); } }, unbrushed === 0 ? 'All brushed' : 'Brush') : null,
        def.id === 'dog' ? h('button.primary', { onclick: () => { sfx.harvest(3); say('Rufus wags happily!'); } }, 'Pat Rufus') : null,
        canBuy ? h('button', {
          disabled: levelOf(farm) < def.level || farm.coins < def.cost,
          onclick: () => { const r = buyAnimal(farm, home); if (r.ok) { sfx.levelUp(); say(`Welcome, ${r.name}!`); changed(); } else say(r.why); render(); },
        }, `New ${def.name.toLowerCase()}: ${def.cost}`, icon('coin', 18)) : null),
      ANIMAL[def.id] && def.id !== 'dog' && def.id !== 'bee' ? h('p.note', null, 'Hearts: ♡ content, ♥ happy, ♥♥ delighted.') : null);
  };
  render();
  return root;
}
