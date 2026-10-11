import { S } from '../app/services';
import { comfortOn } from '../app/comfort';
import { saveNow } from '../app/session';
import { sfx } from '../audio/sfx';
import { deleteSlot } from '../systems/save/saveManager';
import type { QualitySetting } from '../systems/quality';
import { saveSettings } from '../systems/save/settings';
import { h, setText } from './dom';
import { closeTopModal, openModal } from './modal';
import { readAloudOn, setReadAloud, speak, speechAvailable } from './speech';
import { toast } from './toast';
import { button, iconEl } from './widgets';

/** Called when volumes change (the audio engine listens). */
export const settingsHooks = {
  volume: (_music: number, _sfx: number) => {},
};

function slider(label: string, icon: string, value: number, onInput: (v: number) => void, testId: string): HTMLElement {
  const out = h('span', { class: 'slider-val' }, `${Math.round(value * 100)}%`);
  const input = h('input', { type: 'range', min: '0', max: '100', step: '5', value: String(Math.round(value * 100)), 'data-testid': testId, 'aria-label': label }) as HTMLInputElement;
  input.addEventListener('input', () => {
    const v = Number(input.value) / 100;
    setText(out, `${Math.round(v * 100)}%`);
    onInput(v);
  });
  input.addEventListener('change', () => sfx('click'));
  return h('div', { class: 'set-row' }, iconEl(icon), h('span', { class: 'set-label' }, label), input, out);
}

function toggle(label: string, icon: string, on: boolean, onChange: (v: boolean) => void, testId: string, disabled = false): HTMLElement {
  const btn = h('button', { class: `toggle ${on ? 'on' : ''}`, type: 'button', role: 'switch', 'aria-checked': String(on), 'data-testid': testId, disabled }, h('span', { class: 'knob' }));
  btn.addEventListener('click', () => {
    const v = !btn.classList.contains('on');
    btn.classList.toggle('on', v);
    btn.setAttribute('aria-checked', String(v));
    sfx('click');
    onChange(v);
  });
  return h('div', { class: 'set-row' }, iconEl(icon), h('span', { class: 'set-label' }, label), btn);
}

export function fullscreenAvailable(): boolean {
  const d = document as Document & { webkitFullscreenEnabled?: boolean };
  return !!(d.fullscreenEnabled || d.webkitFullscreenEnabled);
}

export function toggleFullscreen(): void {
  const d = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
  try {
    if (d.fullscreenElement || d.webkitFullscreenElement) {
      if (d.exitFullscreen) void d.exitFullscreen().catch(() => {});
      else d.webkitExitFullscreen?.();
    } else if (el.requestFullscreen) {
      void el.requestFullscreen({ navigationUI: 'hide' }).catch(() => toast('Fullscreen is not allowed here.', 'fullscreen'));
    } else el.webkitRequestFullscreen?.();
  } catch {
    toast('Fullscreen is not allowed here.', 'fullscreen');
  }
}

function controlsHelp(): void {
  const rows: Array<[string, string, string]> = [
    ['Move / steer', 'Arrow keys or W A S D', 'Drag on the left side of the screen'],
    ['Boost / jump', 'Space', 'Big orange button'],
    ['Action (land, talk, grab)', 'E or Enter', 'Blue button'],
    ['Pause', 'Esc or P', 'Pause button (top right)'],
  ];
  const table = h('div', { class: 'help-table' }, h('div', { class: 'help-row head' }, h('span', null, ''), h('span', null, 'Keyboard'), h('span', null, 'Touch')));
  for (const [what, key, touch] of rows) table.append(h('div', { class: 'help-row' }, h('span', null, what), h('span', null, key), h('span', null, touch)));
  const panel = h('div', { class: 'panel col', 'data-testid': 'controls-help' }, h('div', { class: 'h2' }, 'How to play'), table, h('div', { class: 'muted' }, 'Gamepad: left stick to steer, A to boost or jump, X to do things, Start to pause.'), button('Got it!', 'check', () => closeTopModal(), { color: 'green', id: 'btn-help-ok' }));
  openModal(panel);
}

function confirmReset(): void {
  const name = S.state.data.profile.name || 'this cadet';
  const panel = h(
    'div',
    { class: 'panel col center', 'data-testid': 'confirm-reset' },
    h('div', { class: 'h2' }, 'Erase this game?'),
    h('div', { class: 'detail-text' }, `All of ${name}'s progress will be gone. Ask a grown-up first!`),
    h('div', { class: 'row' },
      button('No, keep it', 'back', () => closeTopModal(), { color: 'green', id: 'btn-reset-no' }),
      button('Yes, erase', 'trash', () => {
        const slot = S.state.data.slot;
        closeTopModal();
        closeTopModal();
        deleteSlot(slot);
        S.state.data.slot = -1;
        toast('Game erased.', 'trash');
        void S.game.go('slots');
      }, { color: 'red', id: 'btn-reset-yes' }),
    ),
  );
  openModal(panel);
}

/** The settings panel: volume, difficulty, read aloud, fullscreen, controls and reset. */
export function openSettings(): void {
  const st = S.settings;
  const inGame = !!S.state && S.state.data.slot >= 0;
  const items: HTMLElement[] = [];
  let diffRow: HTMLElement | null = null;
  items.push(slider('Music', 'music', st.music, (v) => {
    st.music = v;
    settingsHooks.volume(st.music, st.sfx);
  }, 'set-music'));
  items.push(slider('Sounds', 'speaker', st.sfx, (v) => {
    st.sfx = v;
    settingsHooks.volume(st.music, st.sfx);
  }, 'set-sfx'));
  if (inGame) {
    const diff = h('div', { class: 'seg' });
    const mk = (d: 'easy' | 'normal', label: string) => {
      const b = button(label, d === 'easy' ? 'heart' : 'star', () => {
        S.state.data.difficulty = d;
        S.state.markDirty();
        for (const c of diff.children) c.classList.toggle('on', c === b);
        toast(d === 'easy' ? 'Easy mode: more help and more fuel!' : 'Normal mode: a bit more challenge!', d === 'easy' ? 'heart' : 'star');
      }, { size: 'small', color: 'white', id: `set-diff-${d}` });
      b.classList.toggle('on', S.state.data.difficulty === d);
      return b;
    };
    diff.append(mk('easy', 'Easy'), mk('normal', 'Normal'));
    diff.classList.add('seg-grid');
    diffRow = h('div', { class: 'set-row set-row-col' }, h('div', { class: 'set-row' }, iconEl('target'), h('span', { class: 'set-label' }, 'Difficulty')), diff);
  }
  const canSpeak = speechAvailable();
  items.push(toggle(canSpeak ? 'Read aloud' : 'Read aloud (not on this device)', 'speaker', readAloudOn(), (v) => {
    st.readAloud = v;
    setReadAloud(v);
    if (v) speak('Read aloud is on!', { force: true });
  }, 'set-read', !canSpeak));
  items.push(toggle('Helpful tips', 'question', st.tips, (v) => (st.tips = v), 'set-tips'));
  const right: HTMLElement[] = [];
  if (diffRow) right.push(diffRow);
  const qual = h('div', { class: 'seg seg-grid' });
  const qOpts: Array<[QualitySetting, string]> = [['auto', 'Auto'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High']];
  for (const [q, label] of qOpts) {
    const b = button(label, null, () => {
      st.quality = q;
      S.game.r3.setQuality(q);
      for (const c of qual.children) c.classList.toggle('on', c === b);
    }, { size: 'small', color: 'white', id: `set-quality-${q}` });
    b.classList.toggle('on', st.quality === q);
    qual.append(b);
  }
  right.push(h('div', { class: 'set-row set-row-col' }, h('div', { class: 'set-row' }, iconEl('sparkle'), h('span', { class: 'set-label' }, 'Graphics')), qual));
  items.push(toggle('Calm camera', 'eye', comfortOn(), (v) => (st.comfort = v), 'set-comfort'));
  items.push(toggle('Flip up/down', 'rocket', st.flipY, (v) => (st.flipY = v), 'set-flip'));
  const btns = h('div', { class: 'row wrap' });
  if (fullscreenAvailable()) btns.append(button('Full screen', 'fullscreen', () => toggleFullscreen(), { size: 'small', color: 'white', id: 'btn-fullscreen' }));
  btns.append(button('How to play', 'question', () => controlsHelp(), { size: 'small', color: 'white', id: 'btn-help' }));
  if (inGame) btns.append(button('Erase game', 'trash', () => confirmReset(), { size: 'small', color: 'red', id: 'btn-reset' }));
  const cols = h('div', { class: 'set-cols' }, h('div', { class: 'set-col' }, ...items), h('div', { class: 'set-col set-col-right' }, ...right));
  const panel = h('div', { class: 'panel col settings-panel scroll', 'data-testid': 'settings' }, h('div', { class: 'h2' }, 'Settings'), cols, btns, button('Done', 'check', () => closeTopModal(), { color: 'green', id: 'btn-settings-done' }));
  openModal(panel, {
    onClose: () => {
      saveSettings(st);
      if (inGame) saveNow();
    },
  });
}
