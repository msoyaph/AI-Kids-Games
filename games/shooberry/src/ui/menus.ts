// The menu screens, as DOM: the title, the Adventure map, the Challenges, choosing seeds, pause,
// results, the Seed and Invader Books, settings and first-time tips. Plain buttons and headings (so
// keyboards, gamepads and screen readers all work); pictures are the game's own 3D thumbnails.
import { FACTS, FRIENDS_TEXT } from '../data/facts';
import { BOSS_BOOK, PROFILES } from '../data/invaderBook';
import { INVADERS, PLANTS as ROSTER, WORLDS, type WorldId } from '../data/roster';
import { BOSSES, PLANTS } from '../data/tuning';
import type { SaveData, Settings } from '../save/save';

const $ = <T extends HTMLElement = HTMLElement>(selector: string, root: ParentNode = document) => root.querySelector<T>(selector)!;
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> & { dataset?: Record<string, string> } = {}, html = '') => {
  const e = document.createElement(tag);
  const { dataset, ...rest } = props;
  Object.assign(e, rest);
  if (dataset) Object.assign(e.dataset, dataset);
  if (html) e.innerHTML = html;
  return e;
};
const starText = (n: number, of = 3) => '★'.repeat(n) + '☆'.repeat(Math.max(0, of - n));

export type ScreenId = 'title' | 'map' | 'challenges' | 'seeds' | 'paused' | 'result' | 'books' | 'settings' | 'tip';
export const SCREENS: ScreenId[] = ['title', 'map', 'challenges', 'seeds', 'paused', 'result', 'books', 'settings', 'tip'];

export function showScreen(id: ScreenId | null) {
  for (const s of SCREENS) $(`#${s}`).hidden = s !== id;
  if (!id) return;
  const first = $(`#${id}`).querySelector<HTMLElement>('[autofocus], button.big, .menu button, button:not(.back), input');
  first?.focus({ preventScroll: true });
}

/** Pictures: a function giving each plant's or critter's thumbnail (data URL). */
export type Thumb = (id: string) => string;

// ---------------------------------------------------------------- title

export function title(unlocked: { modes: boolean }, persistent: boolean) {
  for (const id of ['party', 'challenges', 'daily']) {
    const b = $(`#title [data-go="${id}"]`) as HTMLButtonElement;
    b.disabled = !unlocked.modes;
    b.title = unlocked.modes ? '' : 'Finish the Meadow Picnic first';
    b.setAttribute('aria-label', unlocked.modes ? b.textContent ?? '' : `${b.textContent} (after the Meadow Picnic)`);
  }
  $('#storage-note').hidden = persistent;
}

// ---------------------------------------------------------------- map

export interface MapLevel { id: string; world: WorldId; index: number; boss: boolean; open: boolean; stars: number }

export function map(world: WorldId, worlds: { id: WorldId; open: boolean }[], levels: MapLevel[], totalStars: number, onWorld: (w: WorldId) => void, onLevel: (id: string) => void) {
  const root = $('#map');
  $('.stars-total', root).textContent = `★ ${totalStars}`;
  $('.tabs', root).replaceChildren(...worlds.map(w => {
    const name = WORLDS.find(x => x.id === w.id)!.name;
    const b = el('button', { type: 'button', disabled: !w.open, textContent: w.open ? name : `🔒 ${name}` });
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(w.id === world));
    b.addEventListener('click', () => onWorld(w.id));
    return b;
  }));
  $('.twist', root).textContent = WORLDS.find(x => x.id === world)!.twist;
  $('.levels', root).replaceChildren(...levels.filter(l => l.world === world).map(l => {
    const b = el('button', { type: 'button', disabled: !l.open, className: `${l.boss ? 'boss' : ''} ${l.stars ? 'done' : ''}` }, `<span>${l.open ? (l.boss ? '★' : l.index + 1) : '🔒'}</span><span class="stars" aria-hidden="true">${l.open ? starText(l.stars) : ''}</span>`);
    b.setAttribute('aria-label', `Level ${l.index + 1}${l.boss ? ', the boss' : ''}${l.open ? `, ${l.stars} of 3 stars` : ', locked'}`);
    b.addEventListener('click', () => onLevel(l.id));
    return b;
  }));
}

// ---------------------------------------------------------------- challenges

export function challenges(list: { id: string; name: string; blurb: string; stars: number }[], onPick: (id: string) => void) {
  $('#challenges .list').replaceChildren(...list.map((c, i) => {
    const b = el('button', { type: 'button' }, `<span>${i + 1}. ${c.name}</span><small>${c.blurb}</small><span class="stars" aria-hidden="true">${starText(c.stars)}</span>`);
    b.setAttribute('aria-label', `${c.name}. ${c.blurb} ${c.stars} of 3 stars.`);
    b.addEventListener('click', () => onPick(c.id));
    return b;
  }));
}

// ---------------------------------------------------------------- seeds

export interface SeedChoice { title: string; slots: number; offered: string[]; chosen: string[]; critters: string[]; newCritter?: string; dusk: boolean; locked?: boolean }

export function seeds(c: SeedChoice, thumb: Thumb, onStart: (chosen: string[]) => void, recommend: () => string[]) {
  const root = $('#seeds');
  $('h2', root).textContent = c.title;
  const chosen = [...c.chosen].filter(id => c.offered.includes(id)).slice(0, c.slots);
  const nameOf = (id: string) => ROSTER.find(p => p.id === id)?.name ?? id;
  $('.critters', root).replaceChildren(...c.critters.map(id => {
    const name = INVADERS.find(i => i.id === id)?.name ?? BOSS_BOOK.find(b => b.id === id)?.name ?? id;
    return el('div', { className: 'mini' }, `<img alt="" src="${thumb(id)}"><span>${name}</span>${id === c.newCritter ? '<span class="new">New!</span>' : ''}`);
  }));
  const draw = () => {
    $('.chosen', root).replaceChildren(...Array.from({ length: c.slots }, (_, i) => {
      const id = chosen[i];
      if (!id) return el('div', { className: 'mini' }, '<img alt="" src="data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22/>"><span>Empty</span>');
      const b = el('button', { type: 'button' }, `<img alt="" src="${thumb(id)}"><span>${nameOf(id)}</span>`);
      b.setAttribute('aria-label', `Take out ${nameOf(id)}`);
      b.addEventListener('click', () => { chosen.splice(chosen.indexOf(id), 1); draw(); });
      return b;
    }));
    $('.offer', root).replaceChildren(...c.offered.map(id => {
      const st = PLANTS[id]!, on = chosen.includes(id), sleepy = !!st.dusk && !c.dusk;
      const b = el('button', { type: 'button', className: sleepy ? 'sleepy' : '' }, `<img alt="" src="${thumb(id)}"><span>${nameOf(id)}</span><span>${st.cost}</span>`);
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', `${nameOf(id)}, ${st.cost} compost. ${ROSTER.find(p => p.id === id)?.does ?? ''}${sleepy ? ' It sleeps in daylight.' : ''}`);
      b.addEventListener('click', () => {
        if (on) chosen.splice(chosen.indexOf(id), 1);
        else if (chosen.length < c.slots) chosen.push(id);
        draw();
      });
      return b;
    }));
    ($('.go', root) as HTMLButtonElement).disabled = chosen.length === 0;
  };
  ($('.pick', root) as HTMLButtonElement).onclick = () => { chosen.splice(0, chosen.length, ...recommend().slice(0, c.slots)); draw(); };
  ($('.go', root) as HTMLButtonElement).onclick = () => { if (chosen.length) onStart([...chosen]); };
  draw();
}

// ---------------------------------------------------------------- result

export interface ResultInfo { won: boolean; stars: number; title: string; message: string; unlock?: string; buttons: { label: string; big?: boolean; run: () => void }[] }

export function result(r: ResultInfo, thumb: Thumb) {
  const root = $('#result');
  $('#result-title').textContent = r.title;
  $('.stars', root).innerHTML = r.won ? [0, 1, 2].map(i => `<span class="${i < r.stars ? '' : 'off'}">★</span>`).join('') : '';
  $('.message', root).textContent = r.message;
  const unlock = $('.unlock', root);
  unlock.innerHTML = '';
  if (r.unlock) { const p = ROSTER.find(x => x.id === r.unlock); if (p) unlock.innerHTML = `<img alt="" src="${thumb(p.id)}"><span>New plant next: <b>${p.name}</b>!<br>${p.does}</span>`; }
  $('.menu', root).replaceChildren(...r.buttons.map(b => { const btn = el('button', { type: 'button', className: b.big ? 'big' : '', textContent: b.label }); btn.addEventListener('click', b.run); return btn; }));
}

// ---------------------------------------------------------------- books

export function books(kind: 'seeds' | 'critters', save: SaveData, thumb: Thumb, unlockAll: boolean, say: (text: string) => void) {
  const root = $('#books');
  root.querySelectorAll<HTMLButtonElement>('[data-book]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.book === kind)));
  const page = $('.page', root);
  const open = (id: string) => {
    if (kind === 'seeds') {
      const p = ROSTER.find(x => x.id === id)!, st = PLANTS[id]!;
      page.innerHTML = `<img alt="" src="${thumb(id)}"><h3>${p.name}</h3><p class="real">Inspired by ${p.species}</p><p>${p.does}</p><dl><dt>Compost</dt><dd>${st.cost}</dd><dt>Ready again</dt><dd>${st.recharge} seconds</dd>${st.dusk ? '<dt>When</dt><dd>Wakes at dusk</dd>' : ''}${st.tile === 'water' ? '<dt>Where</dt><dd>In water channels</dd>' : ''}</dl><p><b>Real fact:</b> ${FACTS[id] ?? ''}</p>${FRIENDS_TEXT[id] ? `<p>${FRIENDS_TEXT[id]}</p>` : ''}<button type="button" class="say">🔊 Read aloud</button>`;
      ($('.say', page) as HTMLButtonElement).onclick = () => say(`${p.name}. ${p.does} ${FACTS[id] ?? ''}`);
    } else {
      const c = INVADERS.find(x => x.id === id), b = BOSS_BOOK.find(x => x.id === id);
      const name = c?.name ?? b?.name ?? id, profile = c ? PROFILES[id] : b?.profile, tip = c?.tip ?? b?.tip ?? '';
      page.innerHTML = `<img alt="" src="${thumb(id)}"><h3>${name}</h3>${c ? `<p class="real">A ${c.animal.toLowerCase()}</p>` : '<p class="real">A boss!</p>'}<p>${profile ?? ''}</p><p><b>How to handle it:</b> ${tip}</p><button type="button" class="say">🔊 Read aloud</button>`;
      ($('.say', page) as HTMLButtonElement).onclick = () => say(`${name}. ${profile ?? ''} ${tip}`);
    }
  };
  const ids = kind === 'seeds' ? ROSTER.map(p => p.id) : [...INVADERS.map(i => i.id), ...Object.keys(BOSSES)];
  const seen = new Set(kind === 'seeds' ? save.seen.plants : save.seen.critters);
  $('.grid', root).replaceChildren(...ids.map(id => {
    const known = unlockAll || seen.has(id);
    const name = kind === 'seeds' ? ROSTER.find(p => p.id === id)!.name : INVADERS.find(i => i.id === id)?.name ?? BOSS_BOOK.find(b => b.id === id)?.name ?? id;
    const b = el('button', { type: 'button', className: known ? '' : 'locked', disabled: !known }, `<img alt="" src="${thumb(id)}"><span>${known ? name : '?'}</span>`);
    b.setAttribute('aria-label', known ? name : 'Not met yet');
    b.addEventListener('click', () => open(id));
    return b;
  }));
  const first = ids.find(id => unlockAll || seen.has(id));
  if (first) open(first); else page.innerHTML = '<p>Play to fill the book!</p>';
}

// ---------------------------------------------------------------- settings

export function settings(s: Settings, change: (next: Settings) => void, startOver: () => void) {
  const form = $('#settings form') as HTMLFormElement;
  const f = (name: string) => form.elements.namedItem(name) as HTMLInputElement & HTMLSelectElement;
  f('music').value = String(s.music); f('sfx').value = String(s.sfx);
  f('autoCollect').checked = s.autoCollect; f('fast').checked = s.speed === 2; f('patterns').checked = s.patterns;
  f('reducedMotion').checked = s.reducedMotion; f('largeText').checked = s.largeText; f('readAloud').checked = s.readAloud; f('quality').value = s.quality;
  form.oninput = form.onchange = () => change({
    music: Number(f('music').value), sfx: Number(f('sfx').value), autoCollect: f('autoCollect').checked, speed: f('fast').checked ? 2 : 1, patterns: f('patterns').checked,
    reducedMotion: f('reducedMotion').checked, largeText: f('largeText').checked, readAloud: f('readAloud').checked, quality: f('quality').value as Settings['quality'],
  });
  let armed = false;
  const button = $('#start-over') as HTMLButtonElement;
  button.textContent = 'Start over (forget my progress)';
  button.onclick = () => {
    if (!armed) { armed = true; button.textContent = 'Tap again to forget everything'; return; }
    armed = false; button.textContent = 'Start over (forget my progress)'; startOver();
  };
}

// ---------------------------------------------------------------- tips

export function tip(image: string, heading: string, text: string, onOk: () => void, say: (text: string) => void, readAloud: boolean) {
  const root = $('#tip');
  ($('img', root) as HTMLImageElement).src = image;
  $('h2', root).textContent = heading;
  $('p', root).textContent = text;
  ($('.ok', root) as HTMLButtonElement).onclick = onOk;
  ($('.say', root) as HTMLButtonElement).onclick = () => say(`${heading}. ${text}`);
  if (readAloud) say(`${heading}. ${text}`);
}
