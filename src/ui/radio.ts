import { S } from '../app/services';
import { sfx } from '../audio/sfx';
import { CHAR_BY_ID } from '../data/characters';
import type { Line } from '../data/dialogueTypes';
import { fillName } from './dialogue';
import { h } from './dom';
import { readAloudOn, speak } from './speech';
import { portraitEl } from './portraits';

const queue: Line[] = [];
let showing = false;

/**
 * "Radio" messages: a crew member talks to you without stopping the game
 * (used for little story moments while you fly or explore).
 */
export function radio(lines: Line[]): void {
  queue.push(...lines);
  if (!showing) next();
}

function next(): void {
  const line = queue.shift();
  if (!line) {
    showing = false;
    return;
  }
  showing = true;
  const ch = CHAR_BY_ID[line.who] ?? CHAR_BY_ID.stella;
  const text = fillName(line.text);
  const face = portraitEl(ch.id, 84, line.mood ?? 'happy', S.state.data.profile);
  const card = h('div', { class: 'radio-card hit', 'data-testid': 'radio' }, face, h('div', { class: 'grow' }, h('div', { class: 'radio-name' }, ch.name), h('div', { class: 'radio-text' }, text)));
  S.game.topLayer.append(card);
  sfx('blip', { pitch: ch.voice.pitch });
  if (readAloudOn()) speak(text, { pitch: ch.voice.pitch, rate: ch.voice.rate });
  let done = false;
  const close = () => {
    if (done) return;
    done = true;
    card.classList.add('out');
    setTimeout(() => {
      card.remove();
      next();
    }, 300);
  };
  card.addEventListener('click', close);
  setTimeout(close, 2600 + text.length * 55);
}
