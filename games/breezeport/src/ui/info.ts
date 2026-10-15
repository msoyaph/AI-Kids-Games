/**
 * A thing's card (Look, then tap): what it is, who lives or works there, how happy its people are
 * and what would help (each need with a tick or a friendly hint), what a shop earns, how far a
 * service reaches. Buttons to paint it a new colour, add solar panels, move it or take it away.
 */
import { THING } from '../data/things';
import { TUNING } from '../data/tuning';
import type { Census } from '../sim/census';
import { residents, jobs } from '../sim/census';
import { bubbleSize } from '../sim/payouts';
import { act, SOLAR_COST } from '../sim/actions';
import type { Thing, Town } from '../sim/state';
import { chapterOf } from '../sim/unlocks';
import { h } from './h';
import { icon } from './icons';
import type { Play } from '../game/play';

interface InfoDeps { play: Play; say(text: string): void; changed(): void }

const NEED_HINT: Record<string, string> = {
  work: 'No jobs to reach: zone workplaces or shops on a road that connects here.',
  fun: 'Nothing fun nearby: shops, a playground or a community center would help.',
  nature: 'Not much green nearby: plant trees or build a park.',
  calm: 'The street outside is busy: a bus route or another road would help.',
  school: 'No school nearby.', clinic: 'No clinic nearby.', safety: 'No safety station nearby.', library: 'No library nearby.', community: 'No community center nearby.', recycling: 'No recycling center nearby.',
};
const NEED_OK: Record<string, string> = {
  work: 'Jobs to go to', fun: 'Fun things nearby', nature: 'Green and leafy', calm: 'A calm street',
  school: 'School', clinic: 'Clinic', safety: 'Safety station', library: 'Library', community: 'Community center', recycling: 'Recycling',
};

export function infoCard(town: Town, c: Census, t: Thing, d: InfoDeps): HTMLElement {
  const def = THING[t.def]!;
  const rows: Node[] = [h('p', null, def.blurb)];
  if (def.zone) rows.unshift(h('p.level', null, '★'.repeat(def.level ?? 1) + '☆'.repeat(3 - (def.level ?? 1)), h('span.sr', null, ` Level ${def.level}`)));
  if (def.class === 'home') {
    const n = c.needs.get(t.id);
    rows.push(h('p', null, h('b', null, `${residents(t)} people live here.`), n ? ` They are ${n.happy}% happy.` : ''));
    if (n) {
      const list = h('ul.needs');
      const add = (key: string, ok: boolean) => list.appendChild(h('li', { class: ok ? 'ok' : 'want' }, ok ? icon('check', 18) : icon('info', 18), ok ? NEED_OK[key]! : NEED_HINT[key]!));
      add('work', n.work >= 0.8);
      add('fun', n.fun >= 0.5);
      add('nature', n.nature >= 0.5);
      if (c.traffic) add('calm', n.calm >= 0.7);
      for (const [s, on] of Object.entries(n.services)) if (chapterOf(town) >= (THING[s]?.chapter ?? 0)) add(s, !!on);
      rows.push(list);
      if ((def.level ?? 1) < 3) rows.push(h('p.note', null, (def.level ?? 1) === 1 ? `At ${TUNING.growth.levelHappy[1]}% happy it grows into a bigger home.` : `At ${TUNING.growth.levelHappy[2]}% happy, with a school and a clinic nearby, it grows into flats.`));
    }
  } else if (def.class === 'shop' || def.class === 'work') {
    const s = c.strength.get(t.id) ?? 0.3;
    const full = bubbleSize(t);
    rows.push(h('p', null, h('b', null, `${jobs(t)} jobs.`), def.class === 'shop' ? ` ${c.shoppers.get(t.id) ?? 0} shoppers live nearby.` : ''));
    rows.push(h('p', null, `It earns about ${Math.round(full * s)} coins a minute${s < 0.95 ? (def.class === 'shop' ? ': more homes nearby would bring more shoppers.' : ': more homes on its roads would bring more workers.') : '.'}`));
    if (t.pay >= 1) rows.push(h('button.go', { onclick: () => { const r = act(town, { type: 'collect', id: t.id }); if (r.ok) { d.say(`+${-(r.coins ?? 0)} coins!`); d.changed(); } } }, icon('coin', 22), `Collect ${Math.floor(t.pay)} coins`));
  } else if (def.service) {
    const r = TUNING.services.radius[def.service];
    let homes = 0;
    for (const hm of c.homes) { const n = c.needs.get(hm.id); if (n?.services[def.service]) homes++; }
    rows.push(h('p', null, `It reaches homes up to ${r} tiles away: ${homes} home${homes === 1 ? '' : 's'} so far.`));
    rows.push(h('p.note', null, `Upkeep: ${TUNING.services.upkeep[def.service]} coins a minute.`));
  } else if (def.green) {
    rows.push(h('p.note', null, 'Homes nearby feel happier with more green around them.'));
  }
  const actions: Node[] = [];
  if (def.looks?.length) actions.push(h('button', { onclick: () => { act(town, { type: 'paint', id: t.id, look: t.look + 1 }); d.changed(); } }, 'New colour'));
  if (def.zone && !t.solar && chapterOf(town) >= 5) actions.push(h('button', { onclick: () => { const r = act(town, { type: 'solar', id: t.id }); d.say(r.ok ? 'Solar panels! Sunshine makes electricity now.' : r.why); d.changed(); } }, `Solar panels · ${SOLAR_COST}`));
  if (t.def !== 'pier' && t.def !== 'cityhall') {
    actions.push(h('button', { onclick: () => { d.play.pickTool('build'); d.play.placing = { def: t.def, x: t.x, z: t.z, rot: t.rot, moved: false, moving: t.id }; d.play.hover({ x: t.x, z: t.z }); document.querySelector<HTMLElement>('.panel .close')?.click(); } }, icon('move', 22), 'Move'));
  }
  if (actions.length) rows.push(h('div.row.actions', null, ...actions));
  return h('div.info', null, ...rows);
}
