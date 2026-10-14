/**
 * Choosing seeds: what grows this season first, then what grows in other seasons, then what a higher
 * farm level brings. Each card says the cost, the growing time and what a field sells for, plus a
 * planning hint: about how many coins a field earns for every minute it grows.
 */
import { CROPS, profitPerMinute, type CropDef } from '../data/crops';
import { seasonName, seasonOf } from '../sim/clock';
import { freePlanting } from '../sim/fields';
import { seedPrice, varietyChoice } from '../sim/varieties';
import type { VarietyDef } from '../data/varieties';
import type { Farm } from '../sim/state';
import { levelOf } from '../sim/world';
import { h } from './h';
import { icon } from './icons';
import { itemIcon } from './itemIcons';

/** `choose` gets a crop id, or a variety id (src/data/varieties.ts). `glass`: a greenhouse bed, where every season is fine (but rice stays in its paddy). */
export function seedsPanel(farm: Farm, current: string | null, choose: (id: string) => void, glass = false): HTMLElement {
  const season = seasonOf(farm.t), level = levelOf(farm);
  const now: CropDef[] = [], later: CropDef[] = [], locked: CropDef[] = [];
  for (const c of CROPS) {
    if (glass && c.wet) continue;
    (c.level > level ? locked : glass || c.seasons.includes(season) ? now : later).push(c);
  }
  const card = (c: CropDef, state: 'now' | 'later' | 'locked') => {
    const free = state === 'now' && freePlanting(farm, c);
    const affordable = free || farm.coins >= c.seed;
    const ppm = profitPerMinute(c);
    return h('button.seed-card', {
      class: `${state} ${c.id === current ? 'current' : ''}`,
      disabled: state !== 'now' || !affordable,
      'aria-label': `${c.name}. ${state === 'locked' ? `Farm level ${c.level}.` : state === 'later' ? `Grows in ${c.seasons.map(seasonName).join(' and ')}.` : `${free ? 'Free' : `${c.seed} coins`}, ready in ${c.growMin} minutes.`}`,
      onclick: () => choose(c.id),
    },
    itemIcon(c.id, 40),
    h('b', null, c.name),
    state === 'locked' ? h('small', null, icon('lock', 14), ` Level ${c.level}`)
      : state === 'later' ? h('small', null, c.seasons.map(seasonName).join(', '))
        : h('small', null, free ? 'Free!' : `${c.seed}`, free ? null : icon('coin', 14), ` · ${c.growMin} min`),
    state === 'now' ? h('small.hint', { title: 'Coins a field earns for each minute it grows' }, `≈ ${ppm < 10 ? ppm.toFixed(1) : Math.round(ppm)} a minute`) : null);
  };
  const varietyCard = (c: CropDef, v: VarietyDef) => {
    const price = seedPrice(c, v.id);
    return h('button.seed-card.variety', {
      class: v.id === current ? 'current' : '',
      disabled: farm.coins < price,
      'aria-label': `${v.name}, ${v.heirloom ? 'heirloom' : 'your own variety'}. ${price} coins, ready in ${c.growMin} minutes.`,
      onclick: () => choose(v.id),
    },
    itemIcon(v.id, 40),
    h('b', null, v.name),
    h('small', null, `${price}`, icon('coin', 14), ` · ${c.growMin} min`),
    h('small.tag', null, v.heirloom ? 'Heirloom' : 'Your own!'));
  };
  return h('div.seeds', null,
    farm.freeSeeds > 0 ? h('p.free-note', null, `You have ${farm.freeSeeds} free plantings of the cheapest seeds!`) : null,
    h('h3', null, glass ? 'Grows under glass' : `Grows in ${seasonName(season)}`),
    h('div.seed-grid', null, ...now.flatMap(c => [card(c, 'now'), ...varietyChoice(farm, c.id).map(v => varietyCard(c, v))])),
    later.length ? h('h3', null, 'Other seasons') : null,
    later.length ? h('div.seed-grid', null, ...later.map(c => card(c, 'later'))) : null,
    locked.length ? h('h3', null, 'Coming at higher farm levels') : null,
    locked.length ? h('div.seed-grid', null, ...locked.slice(0, 6).map(c => card(c, 'locked'))) : null);
}
