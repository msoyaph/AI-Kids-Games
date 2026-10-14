/**
 * Starting a new adventure: make your Field Agent (look), pick a name from the list (no typing),
 * and choose how tricky it should be. Big buttons, one choice per screen.
 */
import { drawCharacter, playerLook } from '../art/characters';
import { HAIR_COLORS, OUTFITS, SKIN } from '../art/palette';
import { HAIR_STYLES } from '../art/characters';
import { Rng } from '../core/rng';
import type { Look } from '../core/state';
import type { Difficulty } from '../core/types';
import { PLAYER_NAMES } from '../data/names';
import type { Game } from '../game/game';
import { canvasUrl } from '../render/atlas';
import { h } from './dom';

export interface NewGameChoice { look: Look; name: number; difficulty: Difficulty }

export function chooseNewGame(game: Game): Promise<NewGameChoice | null> {
  const rng = new Rng(Date.now() >>> 0);
  const look: Look = { skin: rng.int(SKIN.length), hair: rng.int(HAIR_STYLES), hairColor: rng.int(HAIR_COLORS.length), outfit: rng.int(OUTFITS.length) };
  let name = rng.int(PLAYER_NAMES.length);
  let difficulty: Difficulty = 'normal';
  return new Promise(resolve => {
    const root = h('div.menu-screen.newgame', { role: 'dialog', 'aria-label': 'New adventure' });
    const panel = h('div.panel.menu');
    root.appendChild(panel);
    const layer = { el: root, back: () => step === 0 ? finish(null) : show(step - 1) };
    let step = 0;
    const finish = (r: NewGameChoice | null) => { game.focus.pop(layer); root.remove(); resolve(r); };

    const preview = () => {
      const l = playerLook(look.skin, look.hair, look.hairColor, look.outfit);
      return h('div.agent-preview', {}, ...[0, 2, 3].map(d => h('img.px', { src: canvasUrl(drawCharacter(l, d, 0), 5), alt: d === 0 ? 'Your Field Agent' : '' })));
    };
    const cycler = (label: string, get: () => number, set: (v: number) => void, count: number) =>
      h('div.cycler', {}, h('button', { type: 'button', 'aria-label': `Previous ${label}`, onclick: () => { set((get() + count - 1) % count); show(0); } }, '◀'), h('span', {}, label), h('button', { type: 'button', 'aria-label': `Next ${label}`, onclick: () => { set((get() + 1) % count); show(0); } }, '▶'));

    const show = (n: number) => {
      step = n;
      panel.replaceChildren();
      if (n === 0) {
        panel.append(h('h2', {}, 'Make your Field Agent'), preview(),
          cycler('Skin', () => look.skin, v => (look.skin = v), SKIN.length),
          cycler('Hair', () => look.hair, v => (look.hair = v), HAIR_STYLES),
          cycler('Hair colour', () => look.hairColor, v => (look.hairColor = v), HAIR_COLORS.length),
          cycler('Outfit', () => look.outfit, v => (look.outfit = v), OUTFITS.length),
          h('div.menu-buttons', {}, h('button', { type: 'button', onclick: () => finish(null) }, 'Back'), h('button.primary', { type: 'button', 'data-autofocus': true, onclick: () => show(1) }, 'Next')));
      } else if (n === 1) {
        const picks = [name, ...Array.from({ length: 5 }, () => rng.int(PLAYER_NAMES.length))].filter((v, i, a) => a.indexOf(v) === i).slice(0, 6);
        panel.append(h('h2', {}, 'Pick your name'), h('div.name-grid', {}, ...picks.map(i => h('button', { type: 'button', class: i === name ? 'picked' : '', 'aria-pressed': String(i === name), onclick: () => { name = i; show(1); } }, PLAYER_NAMES[i]!))),
          h('div.menu-buttons', {}, h('button', { type: 'button', onclick: () => { name = rng.int(PLAYER_NAMES.length); show(1); } }, 'More names'), h('button', { type: 'button', onclick: () => show(0) }, 'Back'), h('button.primary', { type: 'button', 'data-autofocus': true, onclick: () => show(2) }, `I'm ${PLAYER_NAMES[name]}!`)));
      } else {
        const opt = (d: Difficulty, title: string, desc: string) => h('button.difficulty', { type: 'button', class: d === difficulty ? 'picked' : '', 'aria-pressed': String(d === difficulty), onclick: () => { difficulty = d; show(2); } }, h('b', {}, title), h('span', {}, desc));
        panel.append(h('h2', {}, 'How tricky?'),
          opt('easy', 'Easy', 'Gentle spars and easy friends. Great for a first adventure.'),
          opt('normal', 'Normal', 'A good, fair adventure.'),
          opt('hard', 'Hard', 'Smart Keepers and tougher spars.'),
          h('p.note', {}, 'You can change this any time in Settings.'),
          h('div.menu-buttons', {}, h('button', { type: 'button', onclick: () => show(1) }, 'Back'), h('button.primary', { type: 'button', 'data-autofocus': true, onclick: () => finish({ look: { ...look }, name, difficulty }) }, 'Start!')));
      }
      game.focus.focusFirst(root);
    };
    game.app.ui.appendChild(root);
    game.focus.push(layer, false);
    show(0);
  });
}
