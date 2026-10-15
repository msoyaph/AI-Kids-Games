/**
 * Story screens: dialogue cards (a portrait, the speaker's name, one line at a time, read aloud if
 * wanted), the goals list, the seasonal fair, and the credits.
 */
import { NEIGHBOR, PERSON } from '../data/cast';
import { CHAPTERS, SPEAKERS, type Line } from '../data/chapters';
import { itemDef } from '../data/items';
import { sfx } from '../audio/engine';
import { bestEntries, CAT_NAME, categoryOf, ENTRY_CATS, type Entry, type EntryCategory, type FairResult } from '../sim/fair';
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

const ENTRY_HELP: Record<EntryCategory, string> = {
  produce: 'Your best crop, fruit or animal product.',
  made: 'Something from your workshops. More steps of making score more.',
  variety: 'A variety you found by crossing two kinds.',
};

/** Choosing fair entries: one per class, from what's in the barn (best stars shown). */
export function fairPanel(farm: Farm, name: string, enter: (entries: Entry[]) => void): HTMLElement {
  const chosen: Partial<Record<EntryCategory, Entry>> = {};
  for (const e of bestEntries(farm)) chosen[categoryOf(e.id)!] = e;
  const root = h('div.fair');
  const render = () => {
    fill(root,
      h('p', null, `Welcome to the ${name}! Enter one thing in each class. The judge also walks round for the prettiest farm. Everything comes home with you afterwards.`),
      ...ENTRY_CATS.map(cat => {
        const options = Object.keys(farm.inv).filter(id => categoryOf(id) === cat && bestStars(farm, id) > 0).sort((a, b) => bestStars(farm, b) - bestStars(farm, a));
        const cur = chosen[cat];
        return h('div.fair-cat', null,
          h('h3', null, CAT_NAME[cat]),
          h('small', null, ENTRY_HELP[cat]),
          options.length ? h('div.fair-options', null, ...options.slice(0, 8).map(id => h('button.fair-option', {
            class: cur?.id === id ? 'chosen' : '', 'aria-pressed': String(cur?.id === id),
            onclick: () => { chosen[cat] = cur?.id === id ? undefined : { id, stars: bestStars(farm, id) as Stars }; render(); },
          }, itemIcon(id, 32), h('small', null, itemDef(id).name), starsEl(bestStars(farm, id), 12)))) : h('p.note', null, cat === 'variety' ? 'None yet. Cross two kinds of a crop near a beehive!' : 'Nothing for this class yet.'));
      }),
      h('div.fair-cat', null, h('h3', null, CAT_NAME.pretty), h('small', null, 'No entry needed: paths, flowers and decorations all count.')),
      h('button.big.primary', { onclick: () => enter(Object.values(chosen).filter((e): e is Entry => !!e)) }, 'Enter the fair!'));
  };
  render();
  return root;
}

export const RIBBON_NAME = ['', 'Gold rosette', 'Silver rosette', 'Bronze rosette', 'Thank-you ribbon'] as const;
const RIBBON_COLOR = ['', '#ffc93d', '#d9dde4', '#d9925a', '#7cc4f2'];

/** A rosette drawn in SVG (shape and words, not colour alone). */
export function rosette(place: number, size = 40): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 40 48');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size * 1.2));
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', RIBBON_NAME[place] ?? 'Ribbon');
  const c = RIBBON_COLOR[place] ?? '#7cc4f2';
  const add = (tag: string, a: Record<string, string | number>) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(a)) e.setAttribute(k, String(v)); svg.appendChild(e); };
  add('path', { d: 'M12 26l-5 20 7-4 4 6 3-20z', fill: c, stroke: '#00000022' });
  add('path', { d: 'M28 26l5 20-7-4-4 6-3-20z', fill: c, stroke: '#00000022' });
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; add('circle', { cx: 20 + Math.cos(a) * 12, cy: 18 + Math.sin(a) * 12, r: 5, fill: c }); }
  add('circle', { cx: 20, cy: 18, r: 10, fill: '#fffaf0' });
  add('text', { x: 20, y: 22, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: '#3d3a2f' });
  svg.lastElementChild!.textContent = place <= 3 ? String(place) : '♥';
  return svg;
}

export function fairResults(r: FairResult): HTMLElement {
  return h('div.fair-results', null,
    h('ul.fair-classes', null, ...r.cats.map(c => h('li', null,
      rosette(c.place, 36),
      h('div', null,
        h('b', null, CAT_NAME[c.cat]),
        h('small', null, `${RIBBON_NAME[c.place]}${c.entry ? ` for your ${itemDef(c.entry.id).name}` : ''}${c.giant ? ' (a giant one!)' : ''} · ${c.scores.find(s => s.you)!.score} points`))))),
    h('p', null, `Prizes: ${r.coins} coins`, r.ideas ? ` and ${r.ideas} Lab idea${r.ideas === 1 ? '' : 's'}` : '', '.'),
    r.prize ? h('p', null, 'A gold rosette! A prize decoration is waiting in Decorate → In storage.') : null,
    r.wall ? h('p', null, 'Your first ribbon! A ribbon wall for your yard is in Build → Decorate.') : null,
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
