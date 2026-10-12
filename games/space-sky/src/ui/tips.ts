import { S } from '../app/services';
import { sfx } from '../audio/sfx';
import { TIPS } from '../data/tips';
import { h } from './dom';
import { readAloudOn, speak } from './speech';
import { button, iconEl } from './widgets';

let current: HTMLElement | null = null;
const queue: string[] = [];

/** Tips belong to the screen they were shown on: clear them when the scene changes. */
export function clearTips(): void {
  queue.length = 0;
  if (current) {
    current.remove();
    current = null;
  }
}

function touchMode(): boolean {
  return S.game.uiRoot.classList.contains('touch-on');
}

/** Show a first-time tip (once per save). Non-blocking; the game keeps running. */
export function tip(id: string): void {
  const st = S.state;
  if (!st || st.data.slot < 0 || !S.settings.tips) return;
  if (st.data.tipsSeen.includes(id) || queue.includes(id)) return;
  if (!TIPS[id]) return;
  queue.push(id);
  if (!current) next();
}

function next(): void {
  const id = queue.shift();
  if (!id) return;
  const def = TIPS[id];
  S.state.addUnique(S.state.data.tipsSeen, id);
  const text = touchMode() ? def.touch : def.keys;
  const close = () => {
    if (!current) return;
    const el = current;
    current = null;
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
    setTimeout(next, 400);
  };
  const el = h(
    'div',
    { class: 'tip-card hit', 'data-testid': 'tip', role: 'status' },
    iconEl(def.icon),
    h('div', { class: 'tip-words' }, text),
    button('Got it', 'check', () => close(), { size: 'small', color: 'green', id: 'btn-tip-ok' }),
    h('button', { class: 'tip-off', type: 'button', onclick: () => {
      S.settings.tips = false;
      queue.length = 0;
      close();
    } }, 'No more tips'),
  );
  current = el;
  S.game.topLayer.append(el);
  sfx('fact');
  if (readAloudOn()) speak(text);
  setTimeout(close, 7500);
}
