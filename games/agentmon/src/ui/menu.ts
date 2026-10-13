/**
 * The pause menu (first version: your team, save, settings, title). Phase 8 grows it into the full
 * menu (bag, Field Guide, map, quests, Agent Base).
 */
import { maxEnergy } from '../core/creature';
import { DEX } from '../data/index';
import { SPECIES } from '../data/species';
import type { Game } from '../game/game';
import { h } from './dom';

export function openPauseMenu(game: Game): Promise<void> {
  const session = game.session!;
  return new Promise(resolve => {
    const close = () => { game.focus.pop(layer); el.remove(); resolve(); };
    const team = h('div.team-list', {}, ...session.state.team.map(c => {
      const max = maxEnergy(DEX, c);
      return h('div.team-row', {}, h('b', {}, session.friendName(c)), ` ${SPECIES[c.species]!.name} · Lv ${c.level} · Energy ${c.energy}/${max}`);
    }));
    const saved = h('p.note', {});
    const el = h('div.menu-screen', { role: 'dialog', 'aria-label': 'Menu' },
      h('div.panel.menu', {},
        h('h2', {}, 'Menu'),
        team,
        h('div.menu-buttons', {},
          h('button', { type: 'button', onclick: () => { const r = session.save(); saved.textContent = r === 'ok' || r === null ? 'Saved!' : r === 'blocked' ? 'This browser can\'t save. Your progress lasts until you close the game.' : 'Storage is full. Your last save is still safe.'; } }, 'Save'),
          h('button', { type: 'button', onclick: () => { game.settings.readAloud = !game.settings.readAloud; game.saveSettings(); readBtn.textContent = `Read aloud: ${game.settings.readAloud ? 'on' : 'off'}`; } }, ''),
          h('button.primary', { type: 'button', 'data-autofocus': true, onclick: close }, 'Back to playing'),
        ),
        saved,
      ));
    const readBtn = el.querySelectorAll('button')[1] as HTMLButtonElement;
    readBtn.textContent = `Read aloud: ${game.settings.readAloud ? 'on' : 'off'}`;
    const layer = { el, back: close };
    game.app.ui.appendChild(el);
    game.focus.push(layer);
  });
}
