import { S } from '../app/services';
import { sfx } from '../audio/sfx';
import { CHAR_BY_ID } from '../data/characters';
import type { Line } from '../data/dialogueTypes';
import { drawToCanvas } from '../gfx/atlas';
import { drawPortrait, type Mood } from '../gfx/art/characters';
import { h, setText } from './dom';
import { setFreeze } from './modal';
import { readAloudOn, speak, stopSpeech } from './speech';
import { button, iconEl } from './widgets';

const portraitCache = new Map<string, HTMLCanvasElement>();

function portrait(who: string, mood: Mood): HTMLCanvasElement {
  const key = `${who}|${mood}|${who === 'player' ? JSON.stringify(S.state.data.profile) : ''}`;
  let c = portraitCache.get(key);
  if (!c) {
    const ch = CHAR_BY_ID[who] ?? CHAR_BY_ID.player;
    c = drawToCanvas(150, 150, (ctx, w, hh) => drawPortrait(ctx, ch, w, hh, mood, S.state.data.profile));
    portraitCache.set(key, c);
  }
  const copy = c.cloneNode(false) as HTMLCanvasElement;
  copy.getContext('2d')?.drawImage(c, 0, 0);
  return copy;
}

export function fillName(text: string): string {
  return text.replace(/\{name\}/g, S.state?.data.profile.name || 'Cadet');
}

let active: { advance: () => void } | null = null;

export function dialogueOpen(): boolean {
  return active !== null;
}

/**
 * Show a conversation, one line at a time. Tap, click, Space, E or gamepad A to continue.
 * Resolves when the last line is dismissed.
 */
export function showDialogue(lines: Line[]): Promise<void> {
  if (!lines.length) return Promise.resolve();
  return new Promise((resolve) => {
    let i = -1;
    let shown = 0;
    let full = '';
    let typing: number | null = null;
    const pWrap = h('div', { class: 'dlg-portrait' });
    const name = h('div', { class: 'dlg-name' });
    const text = h('div', { class: 'dlg-text', 'aria-live': 'polite' });
    const speaker = button('Read to me', 'speaker', () => sayLine(true), { round: true, size: 'small', color: 'white', id: 'btn-dlg-speak', sound: null });
    const next = button('Next', 'next', () => advance(), { round: true, color: 'green', id: 'btn-dlg-next', sound: null });
    const box = h('div', { class: 'dlg-box hit', 'data-testid': 'dialogue', onclick: () => advance() }, pWrap, h('div', { class: 'dlg-body' }, name, text), h('div', { class: 'dlg-btns' }, speaker, next));
    const wrap = h('div', { class: 'dlg-wrap' }, box);
    S.game.topLayer.append(wrap);
    S.game.uiRoot.classList.add('dlg-open');
    setFreeze('dialogue', true);

    const sayLine = (force = false) => {
      const line = lines[i];
      const ch = CHAR_BY_ID[line.who];
      if (force || readAloudOn()) speak(fillName(line.text), { pitch: ch?.voice.pitch, rate: ch?.voice.rate, force });
    };

    const show = () => {
      const line = lines[i];
      const ch = CHAR_BY_ID[line.who];
      pWrap.replaceChildren(line.who === 'sign' ? iconEl('info', 'ico dlg-sign') : portrait(line.who, line.mood ?? 'happy'));
      setText(name, line.who === 'sign' ? 'Sign' : line.who === 'player' ? S.state.data.profile.name || 'You' : ch?.name ?? line.who);
      name.style.background = line.who === 'sign' ? '#ffe066' : ch?.bg ?? '#9b6bff';
      full = fillName(line.text);
      shown = 0;
      text.textContent = '';
      if (typing !== null) clearInterval(typing);
      typing = window.setInterval(() => {
        shown = Math.min(full.length, shown + 2);
        text.textContent = full.slice(0, shown);
        if (shown % 6 === 0) sfx('blip', { pitch: ch?.voice.pitch ?? 1 });
        if (shown >= full.length && typing !== null) {
          clearInterval(typing);
          typing = null;
        }
      }, 28);
      sayLine();
      box.classList.remove('pop');
      void box.offsetWidth;
      box.classList.add('pop');
    };

    const advance = () => {
      if (typing !== null) {
        clearInterval(typing);
        typing = null;
        text.textContent = full;
        return;
      }
      i++;
      if (i >= lines.length) {
        close();
        return;
      }
      if (i > 0) sfx('click');
      show();
    };

    const close = () => {
      if (typing !== null) clearInterval(typing);
      stopSpeech();
      wrap.remove();
      const idx = S.game.postStep.indexOf(poll);
      if (idx >= 0) S.game.postStep.splice(idx, 1);
      active = null;
      S.game.uiRoot.classList.remove('dlg-open');
      setFreeze('dialogue', false);
      S.input.reset();
      resolve();
    };

    // Keyboard / gamepad advance (the scene is frozen, so we poll here).
    let grace = 0.25;
    const poll = (dt: number) => {
      grace -= dt;
      const st = S.input.state;
      if (grace <= 0 && (st.actionPressed || st.boostPressed || st.confirmPressed)) advance();
    };
    S.game.postStep.push(poll);
    active = { advance };
    advance();
  });
}
