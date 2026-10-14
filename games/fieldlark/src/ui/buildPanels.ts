/** Build mode's pickers: decorations (with painted pieces, earned sets and storage) and new land. */
import { BUILDING } from '../data/buildings';
import { DECOR, LAND, PATHS, SETS, type DecorDef } from '../data/decor';
import { TREE } from '../data/orchard';
import { canOpen, setEarned, stored } from '../sim/decorate';
import { areaDef } from '../sim/map';
import type { Farm } from '../sim/state';
import { levelOf } from '../sim/world';
import { CHANNEL_COST, waterOpen } from '../sim/water';
import { h } from './h';
import { icon } from './icons';

export type DecorChoice = { kind: 'path'; id: number } | { kind: 'channel' } | { kind: 'paint'; def: string } | { kind: 'place'; def: string } | { kind: 'stored'; what: 'building' | 'tree' | 'decor'; def: string };

function swatch(color: number) { return h('span.swatch', { style: `background:#${color.toString(16).padStart(6, '0')}` }); }

const DECOR_COLORS: Record<string, number> = { fence: 0xb07a4f, picket: 0xfaf6ee, hedge: 0x5fa85a, flowers_sun: 0xffd34d, flowers_rose: 0xff9fb8, flowers_sky: 0x8fc8ff, flowers_mix: 0xb59cff };

export function decorPanel(farm: Farm, choose: (c: DecorChoice) => void): HTMLElement {
  const level = levelOf(farm);
  const card = (label: string, sub: string, picture: Node, enabled: boolean, onclick: () => void, extra?: string) =>
    h('button.seed-card', { disabled: !enabled, 'aria-label': `${label}. ${sub}${extra ? ` ${extra}` : ''}`, onclick }, picture, h('b', null, label), h('small', null, sub), extra ? h('small.hint', null, extra) : null);
  const decorCard = (d: DecorDef) => {
    const have = stored(farm, `decor:${d.id}`);
    if (d.set) {
      const earned = setEarned(farm, d.set) || have > 0;
      return card(d.name, earned ? (have ? `${have} in storage` : 'Earned: free') : `From ${SETS[d.set]!.how}`, d.paint ? swatch(DECOR_COLORS[d.id] ?? 0xcccccc) : icon(earned ? 'star' : 'lock', 32), earned, () => choose({ kind: 'place', def: d.id }), `Beauty +${d.beauty}`);
    }
    const locked = (level < d.level || (d.chapter !== undefined && farm.story.chapter < d.chapter)) && have === 0;
    return card(d.name, locked ? `Level ${d.level}` : have ? `${have} in storage` : `${d.cost} coins${d.paint ? ' a tile' : ''}`, d.paint ? swatch(DECOR_COLORS[d.id] ?? 0xcccccc) : icon(locked ? 'lock' : 'star', 32), !locked, () => choose(d.paint ? { kind: 'paint', def: d.id } : { kind: 'place', def: d.id }), `Beauty +${d.beauty}`);
  };
  const storedThings = Object.entries(farm.storage).filter(([k, n]) => n > 0 && !k.startsWith('decor:'));
  return h('div.seeds', null,
    h('p.note', null, 'Paths, fences and flower beds: choose one, then tap or drag over the farm.'),
    h('h3', null, 'Paths'),
    h('div.seed-grid', null, ...PATHS.map(p => card(p.name, level < p.level ? `Level ${p.level}` : `${p.cost} a tile`, swatch(p.color), level >= p.level, () => choose({ kind: 'path', id: p.id })))),
    h('h3', null, 'Water'),
    waterOpen(farm)
      ? h('div.seed-grid', null,
        card('Channel', `${CHANNEL_COST} a tile`, swatch(0x5fa8d8), true, () => choose({ kind: 'channel' }), 'Join it to the river or a pond'),
        ...DECOR.filter(d => d.id === 'sprinkler').map(decorCard))
      : h('p.note', null, 'Channels and sprinklers come in chapter 5.'),
    h('h3', null, 'Fences and flowers'),
    h('div.seed-grid', null, ...DECOR.filter(d => d.paint).map(decorCard)),
    h('h3', null, 'Decorations'),
    h('div.seed-grid', null, ...DECOR.filter(d => !d.paint && !d.set && d.id !== 'sprinkler').map(decorCard)),
    h('h3', null, 'Earned sets'),
    h('div.seed-grid', null, ...DECOR.filter(d => d.set).map(decorCard)),
    storedThings.length ? h('h3', null, 'In storage') : null,
    storedThings.length ? h('div.seed-grid', null, ...storedThings.map(([k, n]) => {
      const [what, def] = k.split(':') as ['building' | 'tree', string];
      const name = what === 'tree' ? TREE[def]?.name : BUILDING[def]?.name;
      return card(name ?? def, `${n} in storage`, icon('build', 32), true, () => choose({ kind: 'stored', what, def }));
    })) : null);
}

export function landPanel(farm: Farm, open: (area: (typeof LAND)[number]['area']) => void): HTMLElement {
  return h('div.land', null,
    h('p', null, 'Open more land for your farm. Each area brings room for new things.'),
    h('div.land-list', null, ...LAND.map(l => {
      const name = areaDef(l.area).name;
      const owned = farm.unlocked.includes(l.area);
      const why = canOpen(farm, l.area);
      return h('div.land-row', { class: owned ? 'owned' : '' },
        h('div', null, h('b', null, name), h('small', null, l.blurb)),
        owned ? h('span.owned-tag', null, icon('check', 20), 'Yours')
          : h('button', { disabled: !!why, 'aria-label': why ?? `Open ${name} for ${l.cost} coins`, onclick: () => open(l.area) },
            levelOf(farm) < l.level ? [icon('lock', 18), `Level ${l.level}`] : [`Open: ${l.cost}`, icon('coin', 16)]));
    })));
}
