/**
 * A greenhouse's beds: plant any crop in any season, see how long each has left, and pick what's
 * ready (or pick everything at once).
 */
import { CROP } from '../data/crops';
import { VARIETY } from '../data/varieties';
import { itemDef } from '../data/items';
import { sfx } from '../audio/engine';
import { playTimeLabel } from '../sim/clock';
import { pickPlot, plantPlot, plotState, plotStars, plotsOf } from '../sim/greenhouse';
import type { OtherObj } from '../sim/objects';
import type { Farm } from '../sim/state';
import { fill, h } from './h';
import { itemIcon, starsEl } from './itemIcons';
import { seedsPanel } from './seedsPanel';

export function greenhousePanel(farm: Farm, o: OtherObj, changed: () => void, say: (t: string) => void): HTMLElement {
  const root = h('div.greenhouse');
  let choosing: number | null = null;
  let last: string | null = null;
  const render = () => {
    const plots = plotsOf(o);
    if (choosing !== null) {
      const i = choosing;
      fill(root,
        h('p', null, 'Under glass, any crop grows in any season.'),
        seedsPanel(farm, last, id => {
          const v = VARIETY[id];
          const r = plantPlot(farm, o, i, v ? v.crop : id, v ? v.id : null);
          if (r.ok) { sfx.plant(); last = id; changed(); } else say(r.why);
          choosing = null;
          render();
        }, true),
        h('button', { onclick: () => { choosing = null; render(); } }, 'Back'));
      return;
    }
    const ready = plots.map((p, i) => ({ p, i })).filter(x => plotState(farm, x.p) === 'ready');
    const empty = plots.map((p, i) => ({ p, i })).filter(x => !x.p.crop);
    fill(root,
      h('p', null, `Beds under glass: always watered and cosy, so crops here have `, starsEl(plotStars(farm), 14), ' stars.'),
      h('div.beds', null, ...plots.map((p, i) => {
        const st = plotState(farm, p);
        if (st === 'empty') return h('button.bed.empty', { onclick: () => { choosing = i; render(); } }, h('b', null, 'Empty bed'), h('small', null, 'Plant'));
        const name = p.variety ? itemDef(p.variety).name : CROP[p.crop!]!.name;
        return h('button.bed', {
          class: st,
          disabled: st !== 'ready',
          onclick: () => { const r = pickPlot(farm, o, i); if (r.ok) { sfx.harvest(r.stars); say(`+${r.amount} ${itemDef(r.item).name}`); changed(); } else say(r.why); render(); },
        }, itemIcon(p.variety ?? p.crop!, 32), h('b', null, name), h('small', null, st === 'ready' ? 'Pick!' : playTimeLabel(p.readyAt - farm.t)));
      })),
      h('div.card-buttons', null,
        ready.length > 1 ? h('button.primary', { onclick: () => { for (const x of ready) { const r = pickPlot(farm, o, x.i); if (!r.ok) { say(r.why); break; } } sfx.harvest(plotStars(farm)); changed(); render(); } }, `Pick all ${ready.length}`) : null,
        last && empty.length > 1 ? h('button', { onclick: () => { const v = VARIETY[last!]; for (const x of empty) { const r = plantPlot(farm, o, x.i, v ? v.crop : last!, v ? v.id : null); if (!r.ok) { say(r.why); break; } } sfx.plant(); changed(); render(); } }, `Plant ${itemDef(last).name} in every empty bed`) : null));
  };
  render();
  return root;
}
