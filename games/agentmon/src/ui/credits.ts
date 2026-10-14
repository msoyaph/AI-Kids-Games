/**
 * The credits: a gentle scroll over the night sky with the friends you made. Any press, click or
 * tap skips to the end. Respects reduced motion (shows each part for a moment instead of scrolling).
 */
import type { Game } from '../game/game';
import { h } from './dom';

const LINES: [string, string][] = [
  ['Agentmon', 'A Field Agent story from Sunreach'],
  ['Thank you for playing!', 'Every Beacon shines because of you.'],
  ['Story, world and friends', 'Made for Ai Kids Games'],
  ['Pixel art, music and sounds', 'Made in code, one pixel and one note at a time'],
  ['Real nature facts', 'Popcorn, capybaras, manatees, tardigrades, ferns, leafcutter ants, geodes, wombats, maple seeds, hummingbirds, hail, snow leopards, platypuses, lemons, glowworms and fluorite'],
  ['Special thanks', 'Gran, Chief Nell, Juno, the six Keepers, and the Spotlight Club'],
  ['And you, Field Agent', 'See you in the Starlit Meadow!'],
];

export function playCredits(game: Game, friends: string[]): Promise<void> {
  const before = game.music.playing;
  game.music.play('credits');
  return new Promise(resolve => {
    const reduced = game.settings.reducedMotion;
    const roll = h('div.credits-roll', {},
      ...LINES.map(([t, s]) => h('div.credit', {}, h('h2', {}, t), h('p', {}, s))),
      friends.length ? h('div.credit', {}, h('h2', {}, 'Your friends'), h('p', {}, friends.join(' · '))) : '',
      h('div.credit', {}, h('h2', {}, 'The End'), h('p', {}, '…for now!')));
    const el = h('div.credits', { role: 'dialog', 'aria-label': 'Credits' }, roll, h('button.credits-skip', { type: 'button', onclick: () => done() }, 'Skip'));
    const layer = { el, back: () => done() };
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      removeEventListener('keydown', onKey);
      game.focus.pop(layer);
      el.remove();
      game.music.play(before);
      resolve();
    };
    const onKey = (e: KeyboardEvent) => { if (['Enter', 'Space', 'KeyZ', 'Escape', 'KeyX'].includes(e.code)) done(); };
    addEventListener('keydown', onKey);
    game.app.ui.appendChild(el);
    game.focus.push(layer);
    const total = reduced ? 9000 : 26000;
    if (!reduced) roll.style.animationDuration = `${total}ms`;
    else roll.classList.add('still');
    setTimeout(done, total + 600);
  });
}
