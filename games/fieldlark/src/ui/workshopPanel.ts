/**
 * A workshop: what it's making, what's waiting, what's finished, and every recipe with its
 * ingredients (what you have of each). Start a job, collect finished goods, or upgrade.
 */
import { MACHINE, RECIPES } from '../data/production';
import { itemDef } from '../data/items';
import { sfx } from '../audio/engine';
import { playTimeLabel } from '../sim/clock';
import { count } from '../sim/inventory';
import type { OtherObj } from '../sim/objects';
import { cantStart, collectGoods, jobLeft, machineState, slotsOf, speedOf, startJob, upgradeMachine } from '../sim/production';
import type { Farm } from '../sim/state';
import { levelOf } from '../sim/world';
import { fill, h } from './h';
import { icon } from './icons';
import { itemIcon } from './itemIcons';

export function workshopPanel(farm: Farm, o: OtherObj, changed: () => void, say: (t: string) => void): HTMLElement {
  const def = MACHINE[o.def]!;
  const root = h('div.workshop');
  const queueEl = h('div.ws-queue');
  let timer = 0, shelfSeen = -1;
  // the queue's timers tick every second; the rest is redrawn only when something changes, so
  // keyboard and gamepad focus stays put
  const renderQueue = () => {
    const s = machineState(o);
    const left = jobLeft(farm, o);
    fill(queueEl, ...Array.from({ length: slotsOf(o, farm) }, (_, i) => {
      const job = s.queue[i];
      if (!job) return h('div.slot.empty', null, 'Free');
      return h('div.slot', { class: i === 0 ? 'running' : '' }, itemIcon(job.recipe, 30), h('small', null, i === 0 && left !== null ? playTimeLabel(left) : 'Waiting'));
    }));
  };
  const tick = () => {
    if (!root.isConnected) { clearInterval(timer); return; }
    if (machineState(o).shelf.length !== shelfSeen) render(); else renderQueue();
  };
  const render = () => {
    const s = machineState(o);
    shelfSeen = s.shelf.length;
    const recipes = RECIPES.filter(r => r.machine === def.id);
    renderQueue();
    fill(root,
      h('div.ws-status', null,
        h('span', null, `Level ${s.level} · ${slotsOf(o, farm)} slots`),
        s.level < 3 ? h('button', {
          disabled: farm.coins < def.upgrade[s.level - 1]!,
          onclick: () => { const r = upgradeMachine(farm, o); if (r.ok) { sfx.levelUp(); say(`${def.name} is now level ${r.level}: faster, with more slots!`); changed(); } else say(r.why); render(); },
        }, `Upgrade: ${def.upgrade[s.level - 1]}`, icon('coin', 16)) : h('span', null, 'Fully upgraded!')),
      queueEl,
      s.shelf.length ? h('button.primary', { onclick: () => {
        const r = collectGoods(farm, o);
        if (r.ok) { sfx.harvest(Math.max(...r.got.map(g => g.stars))); say(`+${r.got.length} ${r.got.length === 1 ? itemDef(r.got[0]!.recipe).name : 'goods'}`); changed(); } else say(r.why);
        render();
      } }, `Collect ${s.shelf.length} finished`) : null,
      h('div.recipes', null, ...recipes.map(rec => {
        const why = cantStart(farm, o, rec);
        const locked = levelOf(farm) < rec.level;
        return h('div.recipe', { class: locked ? 'locked' : '' },
          itemIcon(rec.id, 40),
          h('div.recipe-body', null,
            h('b', null, rec.name),
            locked ? h('small', null, icon('lock', 14), ` Farm level ${rec.level}`)
              : h('span.inputs', null, ...Object.entries(rec.inputs).map(([id, n]) => {
                const have = count(farm, id);
                return h('span.input', { class: have >= n ? 'have' : 'need', title: itemDef(id).name }, itemIcon(id, 22), `${Math.min(have, 99)}/${n}`, h('span.sr', null, ` ${itemDef(id).name}`));
              })),
            !locked ? h('small', null, `${playTimeLabel(rec.minutes * speedOf(o, farm) * 60)} · sells for about ${itemDef(rec.id).price}`, icon('coin', 12)) : null),
          !locked ? h('button', {
            disabled: !!why,
            'aria-label': `Make ${rec.name}`,
            onclick: () => { const r = startJob(farm, o, rec.id); if (r.ok) { sfx.plant(); changed(); } else say(r.why); render(); },
          }, 'Make') : null);
      })));
  };
  render();
  timer = window.setInterval(tick, 1000);
  return root;
}
