/**
 * The Farm Book: a page for every crop, fruit tree, berry bush and animal, each with one real fact
 * (src/data/facts.ts) and the numbers a farmer plans with, plus "Farm science" pages on soil,
 * rotation, bees and water. Things you haven't reached yet are still there to read, so a kid can
 * plan ahead.
 */
import { ANIMALS, type AnimalDef } from '../data/animals';
import { BUILDING } from '../data/buildings';
import { CROP, CROPS, type CropDef, type CropFamily } from '../data/crops';
import { factAbout } from '../data/facts';
import { itemDef } from '../data/items';
import { TREES, type TreeDef } from '../data/orchard';
import { SCIENCE } from '../data/science';
import { VARIETY } from '../data/varieties';
import { varietiesOf } from '../sim/varieties';
import type { Season } from '../sim/clock';
import type { Farm } from '../sim/state';
import { levelOf } from '../sim/world';
import { fill, h } from './h';
import { icon, type IconName } from './icons';
import { itemIcon } from './itemIcons';
import { speak, speechAvailable } from './speech';

export const FAMILY_NAME: Record<CropFamily, string> = {
  grain: 'Grains', legume: 'Beans and peas (legumes)', brassica: 'Cabbage family', allium: 'Onion family',
  root: 'Roots', squash: 'Squash family', garden: 'Garden fruit', fibre: 'Fibre plants', herb: 'Herbs',
};

type Tab = 'crops' | 'trees' | 'animals' | 'science';
type Page = { tab: 'crops'; def: CropDef } | { tab: 'trees'; def: TreeDef } | { tab: 'animals'; def: AnimalDef } | { tab: 'science'; id: string };

const seasonChips = (seasons: Season[]) => h('span.season-chips', null, ...seasons.map(s => h('span.chip', null, icon(s as IconName, 18), s[0]!.toUpperCase() + s.slice(1))));
const row = (label: string, value: Node | string) => h('div.book-row', null, h('span', null, label), typeof value === 'string' ? h('b', null, value) : value);

function readButton(text: string) {
  return speechAvailable() ? h('button', { onclick: () => speak(text) }, icon('speak', 22), 'Read aloud') : null;
}

export function bookPanel(farm: Farm, start: Tab = 'crops'): HTMLElement {
  const root = h('div.book');
  let tab: Tab = start;
  let page: Page | null = null;
  const level = levelOf(farm);
  const grown = (id: string) => farm.stats[`harvest:${id}`] ?? 0;

  const entry = (id: string, name: string, open: () => void, needLevel: number, count: number, countWord: string) =>
    h('button.book-entry', { class: needLevel > level ? 'later' : '', onclick: open, 'aria-label': `${name}${needLevel > level ? `, farm level ${needLevel}` : ''}` },
      itemIcon(id, 40), h('b', null, name),
      h('small', null, needLevel > level ? `Level ${needLevel}` : count ? `${countWord} ${count}` : 'Not yet'));

  const detail = (p: Page): HTMLElement[] => {
    const back = h('button.book-back', { onclick: () => { page = null; render(); } }, icon('turnLeft', 22), 'Back');
    if (p.tab === 'science') {
      const s = SCIENCE.find(x => x.id === p.id)!;
      const text = s.facts.map(f => factAbout(f)?.text ?? '').join(' ');
      return [back, h('div.card-head', null, icon(s.icon as IconName, 48), h('h3', null, s.title)),
        ...s.facts.map(f => h('p.fact', null, factAbout(f)?.text ?? '')),
        h('div.book-game', null, h('b', null, 'On your farm'), ...s.game.map(g => h('p', null, g))),
        h('div.card-buttons', null, readButton(`${s.title}. ${text} ${s.game.join(' ')}`))];
    }
    if (p.tab === 'crops') {
      const c = p.def;
      const fact = factAbout(`crop:${c.id}`)?.text ?? '';
      return [back, h('div.card-head', null, itemIcon(c.id, 56), h('div', null, h('h3', null, c.name), h('p', null, FAMILY_NAME[c.family]))),
        h('p.fact', null, fact),
        h('div.book-rows', null,
          row('Grows in', seasonChips(c.seasons)),
          row('Ready in', `${c.growMin} minute${c.growMin === 1 ? '' : 's'}`),
          row('Seeds for a field', `${c.seed} coins`),
          row('One harvest', `${c.yield} × ${c.price} coins`),
          c.flowers ? row('Bees', 'Help it give more') : null,
          c.wet ? row('Needs', 'Wet ground by the water') : null,
          row('You grew', String(grown(c.id))),
          c.level > level ? row('Seeds from', `Farm level ${c.level}`) : null),
        ...varietyRows(c),
        h('div.card-buttons', null, readButton(`${c.name}. ${fact}`))];
    }
    if (p.tab === 'trees') {
      const t = p.def;
      const fact = factAbout(`tree:${t.id}`)?.text ?? '';
      return [back, h('div.card-head', null, itemIcon(t.fruit, 56), h('div', null, h('h3', null, t.name), h('p', null, t.kind === 'tree' ? 'Fruit tree' : 'Berry bush'))),
        h('p.fact', null, fact),
        h('div.book-rows', null,
          row('Fruit in', seasonChips(t.seasons)),
          row('First fruit', `${t.firstMin} minutes`),
          row('Then every', `${t.againMin} minutes`),
          row('One picking', `${t.yield} × ${t.price} coins`),
          row('Bees', t.bees ? 'Help it give more' : 'Not needed'),
          row('You picked', String(grown(t.fruit))),
          t.level > level ? row('In the shop from', `Farm level ${t.level}`) : null),
        h('div.card-buttons', null, readButton(`${t.name}. ${fact}`))];
    }
    const a = p.def;
    const fact = factAbout(`animal:${a.id}`)?.text ?? '';
    return [back, h('div.card-head', null, a.product ? itemIcon(a.product, 56) : icon('farm', 56), h('div', null, h('h3', null, a.plural), h('p', null, `Home: ${BUILDING[a.home]?.name ?? a.home}`))),
      h('p.fact', null, fact),
      h('div.book-rows', null,
        a.product ? row('Gives', `${a.productName}, every ${a.everyMin} min when fed`) : row('Gives', 'Friendship'),
        a.feeds.length ? row('Eats', a.feeds.map(f => CROP[f]?.name ?? itemDef(f).name).join(', ')) : null,
        a.product ? row('You collected', String(farm.stats[`collect:${a.product}`] ?? 0)) : null,
        a.level > level ? row('Home in the shop from', `Farm level ${a.level}`) : null),
      h('div.card-buttons', null, readButton(`${a.plural}. ${fact}`))];
  };

  /** A crop's varieties: heirlooms and the ones you found are named; the rest are a puzzle with a clue. */
  const varietyRows = (c: CropDef): HTMLElement[] => {
    const list = varietiesOf(c.id);
    if (!list.length) return [];
    const nameOf = (id: string) => (id === c.id ? `ordinary ${c.name}` : VARIETY[id]?.name ?? id);
    return [h('div.book-game', null, h('b', null, 'Varieties'), ...list.map(v => {
      const known = v.heirloom || farm.discovered.includes(v.id);
      return h('div.variety-row', null, known ? itemIcon(v.id, 28) : icon('lock', 28),
        h('div', null, h('b', null, known ? v.name : 'Not found yet'),
          h('small', null, v.heirloom ? 'Heirloom seeds, from chapter 4' : known ? 'You found it!' : `Clue: ${nameOf(v.parents![0])} next to ${nameOf(v.parents![1])}, near bees`)));
    }))];
  };

  const render = () => {
    if (page) { fill(root, ...detail(page)); return; }
    const tabBtn = (id: Tab, label: string, ic: IconName) => h('button', { role: 'tab', 'aria-selected': String(tab === id), onclick: () => { tab = id; render(); } }, icon(ic, 22), label);
    const tabs = h('div.tabs', { role: 'tablist' }, tabBtn('crops', 'Crops', 'seeds'), tabBtn('trees', 'Trees', 'farm'), tabBtn('animals', 'Animals', 'barn'), tabBtn('science', 'Science', 'books'));
    let body: HTMLElement;
    if (tab === 'crops') {
      const done = CROPS.filter(c => grown(c.id) > 0).length;
      body = h('div', null, h('p', null, `You have grown ${done} of ${CROPS.length} crops. Tap one to read about it.`),
        h('div.book-grid', null, ...CROPS.map(c => entry(c.id, c.name, () => { page = { tab: 'crops', def: c }; render(); }, c.level, grown(c.id), 'Grew'))));
    } else if (tab === 'trees') {
      body = h('div', null, h('p', null, 'Trees and bushes are planted once and give fruit again and again.'),
        h('div.book-grid', null, ...TREES.map(t => entry(t.fruit, t.name, () => { page = { tab: 'trees', def: t }; render(); }, t.level, grown(t.fruit), 'Picked'))));
    } else if (tab === 'animals') {
      body = h('div', null, h('p', null, 'Animals are always fine on their own. Feeding and brushing make them happier.'),
        h('div.book-grid', null, ...ANIMALS.map(a => a.product
          ? entry(a.product, a.plural, () => { page = { tab: 'animals', def: a }; render(); }, a.level, farm.stats[`collect:${a.product}`] ?? 0, 'Collected')
          : h('button.book-entry', { onclick: () => { page = { tab: 'animals', def: a }; render(); } }, icon('farm', 40), h('b', null, 'Rufus the dog'), h('small', null, 'Always here')))));
    } else {
      body = h('div', null, h('p', null, 'How a real farm works, and how it works on yours.'),
        h('div.book-grid.science', null, ...SCIENCE.map(s => h('button.book-entry', { onclick: () => { page = { tab: 'science', id: s.id }; render(); } }, icon(s.icon as IconName, 40), h('b', null, s.title)))));
    }
    fill(root, tabs, body);
  };
  render();
  return root;
}
