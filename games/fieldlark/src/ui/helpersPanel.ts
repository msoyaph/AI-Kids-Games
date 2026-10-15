/**
 * The helpers: welcome new farmhands, give each a job (and where to do it), and see their skills grow.
 * Lives in the farmhouse. Every choice takes effect at once and can be changed any time.
 */
import { animalForHome } from '../data/animals';
import { BUILDING } from '../data/buildings';
import { HELPER_LOOK, HELPER_NAMES } from '../data/cast';
import { MACHINE } from '../data/production';
import { sfx } from '../audio/engine';
import { animalsIn, isHome } from '../sim/animals';
import { assign, helperSlots, hire, JOB_NAME, JOBS, nextHelperHint, PACE, recipesFor, SKILL_AT, skillLevel, type Helper, type Job } from '../sim/helpers';
import { AREAS, type AreaId } from '../sim/map';
import type { OtherObj } from '../sim/objects';
import { isMachine } from '../sim/production';
import type { Farm } from '../sim/state';
import { fill, h } from './h';
import { icon, type IconName } from './icons';

const JOB_ICON: Record<Job | 'rest', IconName> = { water: 'water', harvest: 'farm', animals: 'barn', workshop: 'build', deliver: 'boat', rest: 'calm' };
const JOB_HELP: Record<Job | 'rest', string> = {
  water: 'Waters growing crops that need it.',
  harvest: 'Picks ready crops and ripe fruit, into the barn.',
  animals: 'Collects, feeds and brushes in the homes you choose.',
  workshop: 'Keeps one workshop making one thing, and collects it.',
  deliver: 'Sends board orders that the barn can fill. Story requests are yours to send.',
  rest: 'Takes it easy by the cottage.',
};

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

/** A round portrait in the farmhand's own colours, with their straw hat. */
export function helperPortrait(i: number, size = 56): SVGSVGElement {
  const [shirt, , hair, skin, band] = HELPER_LOOK[i % HELPER_LOOK.length]!;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 64 64');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  const add = (tag: string, a: Record<string, string | number>) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(a)) e.setAttribute(k, String(v)); svg.appendChild(e); };
  add('circle', { cx: 32, cy: 32, r: 31, fill: '#fff4dc' });
  add('path', { d: 'M10 64c2-14 11-20 22-20s20 6 22 20z', fill: hex(shirt) });
  add('circle', { cx: 32, cy: 31, r: 12, fill: hex(skin) });
  add('path', { d: 'M20 30c0-8 5-12 12-12s12 4 12 12c-3-4-7-6-12-6s-9 2-12 6z', fill: hex(hair) });
  add('ellipse', { cx: 32, cy: 20, rx: 21, ry: 4.5, fill: '#e8cf7a' });
  add('rect', { x: 22, y: 10, width: 20, height: 10, rx: 4, fill: '#e8cf7a' });
  add('rect', { x: 22, y: 16, width: 20, height: 3.5, fill: hex(band) });
  add('circle', { cx: 27.5, cy: 32, r: 1.6, fill: '#2e2a28' });
  add('circle', { cx: 36.5, cy: 32, r: 1.6, fill: '#2e2a28' });
  add('path', { d: 'M28 37c2.5 2 5.5 2 8 0', stroke: '#8a4a3a', 'stroke-width': 1.6, fill: 'none', 'stroke-linecap': 'round' });
  return svg;
}

function skillsRow(hp: Helper) {
  return h('div.skills', null, ...JOBS.map(j => {
    const lv = skillLevel(hp.done[j]);
    const next = SKILL_AT[lv - 1];
    return h('span.skill', { title: next ? `${hp.done[j]} of ${next} to level ${lv + 1}` : 'Top level!' }, icon(JOB_ICON[j], 18), h('b', null, `${lv}`), h('small', null, JOB_NAME[j]));
  }));
}

export function helpersPanel(farm: Farm, changed: () => void, say: (t: string) => void): HTMLElement {
  const root = h('div.helpers');
  let open = 0;
  const cottage = farm.objects.find(o => o.def === 'cottage');
  const render = () => {
    const slots = helperSlots(farm);
    const hint = nextHelperHint(farm);
    const canHire = farm.helpers.length < slots;
    const welcome = canHire ? h('button.big.primary', {
      onclick: () => {
        const hp = hire(farm, cottage ? { x: cottage.x + 1, z: cottage.z + 3 } : { x: 37, z: 40 });
        if (!hp) return;
        sfx.levelUp();
        open = farm.helpers.length - 1;
        say(`${hp.name} is here to help! Choose a job for ${hp.name}.`);
        changed();
        render();
      },
    }, `Welcome ${HELPER_NAMES[farm.helpers.length]}!`) : null;
    if (!farm.helpers.length) {
      fill(root,
        h('p', null, 'Helpers are friendly volunteers from Larkford. Give each one a job, and they get better at it the more they do.'),
        welcome ?? h('p.note', null, hint ?? ''));
      return;
    }
    const cards = farm.helpers.map((hp, i) => {
      const lv = hp.job === 'rest' ? 1 : skillLevel(hp.done[hp.job]);
      const head = h('button.helper-head', { 'aria-expanded': String(open === i), onclick: () => { open = open === i ? -1 : i; render(); } },
        helperPortrait(i, 48),
        h('div', null, h('b', null, hp.name), h('small', null, hp.job === 'rest' ? 'Resting' : `${JOB_NAME[hp.job]} · level ${lv} · a task every ${PACE[lv - 1]} s`)));
      if (open !== i) return h('div.helper-card', null, head);
      return h('div.helper-card.open', null, head,
        h('div.job-grid', { role: 'radiogroup', 'aria-label': `${hp.name}'s job` }, ...[...JOBS, 'rest' as const].map(j => h('button.job', {
          role: 'radio', 'aria-checked': String(hp.job === j), class: hp.job === j ? 'chosen' : '',
          onclick: () => { setJob(i, j); },
        }, icon(JOB_ICON[j], 26), h('span', null, JOB_NAME[j])))),
        h('p.note', null, JOB_HELP[hp.job]),
        jobSettings(i, hp),
        skillsRow(hp));
    });
    fill(root,
      h('p', null, `${farm.helpers.length} helper${farm.helpers.length === 1 ? '' : 's'} on the farm. Tap a name to choose their job.`),
      ...cards,
      welcome,
      !canHire && hint ? h('p.note', null, hint) : null);
  };

  const setJob = (i: number, j: Job | 'rest') => {
    const hp = farm.helpers[i]!;
    // sensible starting choices for a new job
    const opts: Parameters<typeof assign>[3] = {};
    if (j === 'animals' && !hp.homes.length) opts.homes = farm.objects.filter(o => isHome(o) && o.def !== 'kennel' && o.def !== 'beehive').map(o => o.id);
    if (j === 'workshop' && hp.machine === null) {
      const m = farm.objects.find(isMachine);
      if (m) { opts.machine = m.id; opts.recipe = recipesFor(farm, m)[0]?.id ?? null; }
    }
    assign(farm, i, j, opts);
    sfx.tap();
    changed();
    render();
  };

  const choice = (label: string, chosen: boolean, onclick: () => void) => h('button.choice', { class: chosen ? 'chosen' : '', 'aria-pressed': String(chosen), onclick }, label);

  function jobSettings(i: number, hp: Helper): HTMLElement | null {
    const redo = (o: Parameters<typeof assign>[3]) => { assign(farm, i, hp.job, o); changed(); render(); };
    if (hp.job === 'water' || hp.job === 'harvest') {
      const areas = AREAS.filter(a => farm.unlocked.includes(a.id));
      return h('div.job-settings', null, h('b', null, 'Where'),
        h('div.choices', null, choice('Everywhere', hp.zone === 'all', () => redo({ zone: 'all' })),
          ...areas.map(a => choice(a.name, hp.zone === a.id, () => redo({ zone: a.id as AreaId })))));
    }
    if (hp.job === 'animals') {
      const homes = farm.objects.filter(o => isHome(o) && o.def !== 'kennel') as OtherObj[];
      if (!homes.length) return h('p.note', null, 'No animal homes yet. Build one from the Shop.');
      return h('div.job-settings', null, h('b', null, 'Which homes'),
        h('div.choices', null, ...homes.map(o => {
          const on = hp.homes.includes(o.id);
          const n = animalsIn(o).length;
          return choice(`${BUILDING[o.def]?.name ?? o.def} (${n} ${(animalForHome(o.def)?.plural ?? '').toLowerCase()})`, on, () => redo({ homes: on ? hp.homes.filter(x => x !== o.id) : [...hp.homes, o.id] }));
        })));
    }
    if (hp.job === 'workshop') {
      const machines = farm.objects.filter(isMachine);
      if (!machines.length) return h('p.note', null, 'No workshops yet. Build one from the Shop.');
      const m = machines.find(x => x.id === hp.machine) ?? null;
      return h('div.job-settings', null, h('b', null, 'Which workshop'),
        h('div.choices', null, ...machines.map(o => choice(MACHINE[o.def]!.name, o.id === hp.machine, () => redo({ machine: o.id, recipe: recipesFor(farm, o)[0]?.id ?? null })))),
        m ? h('b', null, 'Making') : null,
        m ? h('div.choices', null, ...recipesFor(farm, m).map(r => choice(r.name, r.id === hp.recipe, () => redo({ recipe: r.id })))) : null);
    }
    return null;
  }

  render();
  return root;
}
