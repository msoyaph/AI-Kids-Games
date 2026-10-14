/**
 * Story screens: dialogue cards (a portrait, the speaker's name, one line at a time, read aloud if
 * wanted), the goals list, the seasonal fair, and the credits.
 */
import { NEIGHBOR, PERSON } from '../data/cast';
import { CHAPTERS, SPEAKERS, type Line } from '../data/chapters';
import { itemDef } from '../data/items';
import { sfx } from '../audio/engine';
import { bestEntries, categoryOf, type Entry, type FairCategory, type FairResult } from '../sim/fair';
import { bestStars, type Stars } from '../sim/inventory';
import type { Farm } from '../sim/state';
import { chapterOf, endlessProgress, goalProgress, readyForGrandFair, storyDone } from '../sim/story';
import { fill, h } from './h';
import { icon } from './icons';
import { itemIcon, starsEl } from './itemIcons';
import { speak, speechAvailable } from './speech';

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

/** A round portrait: hair, face and coat in the person's colours (no images needed). */
export function portrait(who: string, size = 64): SVGSVGElement {
  const c = PERSON[who]?.color ?? NEIGHBOR[who]?.color ?? { coat: 0x6fbf73, hair: 0x5a3d2a, skin: 0xe9b48f };
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 64 64');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  const add = (tag: string, a: Record<string, string | number>) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(a)) e.setAttribute(k, String(v)); svg.appendChild(e); };
  add('circle', { cx: 32, cy: 32, r: 31, fill: '#e6f5dc' });
  add('path', { d: 'M10 64c2-14 11-20 22-20s20 6 22 20z', fill: hex(c.coat) });
  add('circle', { cx: 32, cy: 28, r: 13, fill: hex(c.skin) });
  add('path', { d: 'M18 27c0-10 6-15 14-15s14 5 14 15c-3-5-8-7-14-7s-11 2-14 7z', fill: hex(c.hair) });
  add('circle', { cx: 27, cy: 29, r: 1.8, fill: '#3d3a35' });
  add('circle', { cx: 37, cy: 29, r: 1.8, fill: '#3d3a35' });
  add('path', { d: 'M27 35c3 3 7 3 10 0', stroke: '#3d3a35', 'stroke-width': 1.8, fill: 'none', 'stroke-linecap': 'round' });
  return svg;
}

/** Plays dialogue lines one at a time. */
export function dialogue(lines: Line[], readAloud: boolean, done: () => void): HTMLElement {
  let i = 0;
  const root = h('div.dialogue');
  const render = () => {
    const line = lines[i]!;
    const name = SPEAKERS[line.who] ?? line.who;
    fill(root,
      h('div.dialogue-row', null, portrait(line.who, 72), h('div.dialogue-text', null, h('b', null, name), h('p', { 'aria-live': 'polite' }, line.text))),
      h('div.card-buttons', null,
        speechAvailable() ? h('button', { 'aria-label': 'Read it out loud', onclick: () => speak(`${name}: ${line.text}`) }, icon('speak', 24)) : null,
        h('button.primary', { autofocus: true, onclick: () => { sfx.tap(); if (++i < lines.length) render(); else done(); } }, i + 1 < lines.length ? 'Next' : 'OK!')));
    if (readAloud) speak(`${name}: ${line.text}`);
    requestAnimationFrame(() => root.querySelector<HTMLElement>('.primary')?.focus({ preventScroll: true }));
  };
  render();
  return root;
}

/** The goals list for the chapter (or the endless goals after the story). */
export function goalsPanel(farm: Farm, onGrandFair: () => void): HTMLElement {
  if (storyDone(farm)) {
    return h('div.goals', null,
      h('p', null, 'The farm is wide awake. Here are some goals to keep going. New ones arrive as you finish them!'),
      h('ul.goal-list', null, ...farm.story.endless.map(g => {
        const p = endlessProgress(farm, g);
        return h('li', { class: p.done ? 'done' : '' }, h('b', null, p.done ? '✓ ' : '', g.text), h('span.bar.wide', null, h('i.bar-fill', { style: `width:${Math.round((p.have / p.need) * 100)}%` })), h('small', null, `${p.have} of ${p.need} · reward ${g.coins} coins`));
      })));
  }
  const ch = chapterOf(farm)!;
  return h('div.goals', null,
    h('p.chapter', null, `Chapter ${farm.story.chapter + 1} of ${CHAPTERS.length}: `, h('b', null, ch.title)),
    h('ul.goal-list', null, ...ch.goals.map(g => {
      const p = goalProgress(farm, g);
      return h('li', { class: p.done ? 'done' : '' },
        h('b', null, p.done ? '✓ ' : '○ ', g.text),
        p.need > 1 && !p.done ? h('span.bar.wide', null, h('i.bar-fill', { style: `width:${Math.round((p.have / p.need) * 100)}%` })) : null,
        h('small', null, p.done ? 'Done!' : `${p.need > 1 ? `${p.have} of ${p.need}. ` : ''}${g.hint}`));
    })),
    readyForGrandFair(farm) ? h('button.big.primary', { onclick: onGrandFair }, 'Start the Grand Harvest Fair!') : null);
}

const CATS: [FairCategory, string][] = [['grown', 'Grown'], ['animal', 'From animals'], ['made', 'Made']];

/** Choosing fair entries: one per category, from what's in the barn (best stars shown). */
export function fairPanel(farm: Farm, name: string, enter: (entries: Entry[]) => void): HTMLElement {
  const chosen: Partial<Record<FairCategory, Entry>> = {};
  for (const e of bestEntries(farm)) chosen[categoryOf(e.id)!] = e;
  const root = h('div.fair');
  const render = () => {
    fill(root,
      h('p', null, `Welcome to the ${name}! Enter one thing in each class. The judge looks at stars, at what it is, and at how lovely your farm is. Everything comes home with you afterwards.`),
      ...CATS.map(([cat, label]) => {
        const options = Object.keys(farm.inv).filter(id => categoryOf(id) === cat && bestStars(farm, id) > 0).sort((a, b) => bestStars(farm, b) - bestStars(farm, a));
        const cur = chosen[cat];
        return h('div.fair-cat', null,
          h('h3', null, label),
          options.length ? h('div.fair-options', null, ...options.slice(0, 8).map(id => h('button.fair-option', {
            class: cur?.id === id ? 'chosen' : '', 'aria-pressed': String(cur?.id === id),
            onclick: () => { chosen[cat] = cur?.id === id ? undefined : { id, stars: bestStars(farm, id) as Stars }; render(); },
          }, itemIcon(id, 32), h('small', null, itemDef(id).name), starsEl(bestStars(farm, id), 12)))) : h('p.note', null, 'Nothing for this class yet.'));
      }),
      h('button.big.primary', { disabled: !Object.values(chosen).some(Boolean), onclick: () => enter(Object.values(chosen).filter((e): e is Entry => !!e)) }, 'Enter the fair!'));
  };
  render();
  return root;
}

const PLACES = ['', 'First place! A gold rosette!', 'Second place! A silver rosette!', 'Third place! A bronze rosette!', 'A “thank you for coming” ribbon!'];

export function fairResults(r: FairResult): HTMLElement {
  return h('div.fair-results', null,
    h('p.fair-place', null, PLACES[Math.min(4, r.place)] ?? ''),
    h('ol.scores', null, ...r.scores.map(s => h('li', { class: s.you ? 'you' : '' }, h('b', null, s.who), h('span', null, `${s.score} points`)))),
    h('p', null, r.coins ? `Prize: ${r.coins} coins` : '', r.prize ? ' and a decoration for your farm (in Decorate → storage).' : '.'),
    h('p.note', null, 'Your entries are back in the barn.'));
}

export function credits(): HTMLElement {
  return h('div.credits', null,
    h('h3', null, 'The farm is wide awake!'),
    h('p', null, 'Larkford has its Harvest Fair back, and it’s all thanks to you, keeper.'),
    h('p', null, 'Starring Hattie, Silas, Tomasz, Amara, Rosa, Mr. Hollis, Wendell, Mrs. Penrose, Ingrid, Femi, Mr. Lu, and Rufus the dog.'),
    h('p', null, 'With Fen, Juno, Wren, Bea, Kit and Moss, the best farmhands in Larkford.'),
    h('p', null, 'Every crop and every fact is real. Everything else was made up with care.'),
    h('p', null, 'Made for AI Kids Games. Built with Claude.'),
    h('p', null, 'The farm keeps going: new goals, new seasons, a fair at the end of every season. Happy farming!'));
}
