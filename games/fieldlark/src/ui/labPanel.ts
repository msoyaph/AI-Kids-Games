/**
 * The Farm Lab (in the farmhouse, from chapter 6): six branches of ideas, tried in order, paid with
 * Lab ideas. Shows where ideas come from, so kids know how to earn more (they are never for sale).
 */
import { BRANCHES, LAB } from '../data/lab';
import { sfx } from '../audio/engine';
import { cantLearn, hasIdea, learn } from '../sim/lab';
import type { Farm } from '../sim/state';
import { fill, h } from './h';
import { icon, type IconName } from './icons';

export function labPanel(farm: Farm, changed: () => void, say: (t: string) => void): HTMLElement {
  const root = h('div.lab');
  const render = () => {
    fill(root,
      h('p.lab-ideas', null, icon('star', 26), h('b', null, `${farm.ideas} Lab idea${farm.ideas === 1 ? '' : 's'}`)),
      h('p.note', null, 'Earn ideas by levelling up, finishing contracts, winning fair ribbons and finding new varieties.'),
      ...BRANCHES.map(b => h('div.lab-branch', null,
        h('h3', null, icon(b.icon as IconName, 24), b.name),
        h('ol.lab-row', null, ...LAB.filter(l => l.branch === b.id).map(l => {
          const done = hasIdea(farm, l.id);
          const why = cantLearn(farm, l.id);
          return h('li', null, h('button.lab-idea', {
            class: done ? 'done' : '',
            disabled: !!why,
            'aria-label': `${l.name}. ${l.text} ${done ? 'Tried.' : why ?? `${l.cost} ideas.`}`,
            onclick: () => { const r = learn(farm, l.id); if (r.ok) { sfx.levelUp(); say(`${l.name}: done!`); changed(); } else say(r.why); render(); },
          }, h('b', null, done ? `✓ ${l.name}` : l.name), h('small', null, l.text), h('small.cost', null, done ? 'Tried' : `${l.cost} idea${l.cost === 1 ? '' : 's'}`)));
        })))));
  };
  render();
  return root;
}
