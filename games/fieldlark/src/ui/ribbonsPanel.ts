/** The ribbon wall: every fair ribbon you have won, newest first, and how many of each. */
import { CAT_NAME, type FairCategory } from '../sim/fair';
import { pageLabel } from '../sim/ledger';
import type { Farm } from '../sim/state';
import { h } from './h';
import { RIBBON_NAME, rosette } from './storyUi';

export function ribbonsPanel(farm: Farm): HTMLElement {
  const [gold, silver, bronze, thanks] = farm.ribbonCount;
  const total = gold + silver + bronze + thanks;
  return h('div.ribbons', null,
    total
      ? h('p', null, `You have won ${total} ribbon${total === 1 ? '' : 's'} at the fairs.`)
      : h('p', null, 'No ribbons yet. The fair opens on the last day of each season, from the autumn on. Everyone who enters gets a ribbon!'),
    total ? h('div.ribbon-counts', null, ...[1, 2, 3, 4].map(p => h('div.ribbon-count', null, rosette(p, 30), h('b', null, String(farm.ribbonCount[p - 1])), h('small', null, RIBBON_NAME[p])))) : null,
    farm.ribbons.length ? h('ul.ribbon-wall', null, ...[...farm.ribbons].reverse().map(r => h('li', null,
      rosette(r.place, 34),
      h('div', null, h('b', null, CAT_NAME[r.cat as FairCategory] ?? r.cat), h('small', null, `${r.grand ? 'Grand Harvest Fair' : `${pageLabel(r.season).split(',')[0]} Fair`}, year ${Math.floor(r.season / 4) + 1}`))))) : null);
}
