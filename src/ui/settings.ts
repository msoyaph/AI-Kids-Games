/** Settings panel (used in the menu and on the title screen). */
import type { Settings } from '../game/settings';
import { h } from './dom';

export interface SettingsHooks {
  apply(s: Settings): void;
  save(s: Settings): void;
  testPerformance(): void;
  speechAvailable: boolean;
  inGame: boolean;
  quit?: () => void;
  storageInfo(): string;
}

function slider(label: string, value: number, onInput: (v: number) => void): HTMLElement {
  const inp = h('input', { type: 'range', min: '0', max: '100', value: String(Math.round(value * 100)), 'aria-label': label, style: 'width:100%' }) as HTMLInputElement;
  inp.addEventListener('input', () => onInput(Number(inp.value) / 100));
  return h('div', { class: 'form-row' }, h('label', null, label), inp);
}

function toggle(label: string, value: boolean, onChange: (v: boolean) => void, hint?: string, disabled = false): HTMLElement {
  const b = h('button', { class: 'choice' + (value ? ' on' : ''), role: 'switch', 'aria-checked': String(value), disabled }, value ? 'On' : 'Off');
  b.addEventListener('click', () => {
    value = !value;
    b.classList.toggle('on', value);
    b.textContent = value ? 'On' : 'Off';
    b.setAttribute('aria-checked', String(value));
    onChange(value);
  });
  return h('div', { class: 'form-row', style: 'flex-direction:row;align-items:center;justify-content:space-between;gap:10px' }, h('div', null, h('label', null, label), hint ? h('div', { class: 'hint' }, hint) : null), b);
}

function choice<T extends string | number>(label: string, opts: [T, string][], value: T, onPick: (v: T) => void): HTMLElement {
  const row = h('div', { class: 'choice-row', role: 'radiogroup', 'aria-label': label });
  for (const [v, l] of opts) {
    const b = h('button', { class: 'choice' + (v === value ? ' on' : ''), role: 'radio', 'aria-checked': String(v === value) }, l);
    b.addEventListener('click', () => {
      row.querySelectorAll('.choice').forEach((x) => { x.classList.remove('on'); x.setAttribute('aria-checked', 'false'); });
      b.classList.add('on');
      b.setAttribute('aria-checked', 'true');
      onPick(v);
    });
    row.appendChild(b);
  }
  return h('div', { class: 'form-row' }, h('label', null, label), row);
}

export function settingsPanel(s: Settings, hooks: SettingsHooks): HTMLElement {
  const change = () => {
    hooks.apply(s);
    hooks.save(s);
  };
  return h(
    'div',
    { class: 'settings', style: 'max-height:60vh;overflow:auto;padding-right:6px' },
    h('h3', { style: 'margin:4px 0' }, 'Sound'),
    slider('Music volume', s.music, (v) => { s.music = v; change(); }),
    slider('Sound effects volume', s.sfx, (v) => { s.sfx = v; change(); }),
    h('h3', { style: 'margin:10px 0 4px' }, 'Reading'),
    choice('Text size', [[0, 'Small'], [1, 'Normal'], [2, 'Large'], [3, 'Huge']], s.textSize, (v) => { s.textSize = v; change(); }),
    toggle('Read dialogue aloud', s.readAloud, (v) => { s.readAloud = v; change(); }, hooks.speechAvailable ? 'Your device will read what villagers say.' : 'Not available on this device.', !hooks.speechAvailable),
    toggle('Gentle hints', s.hints, (v) => { s.hints = v; change(); }, 'Little tips if you seem stuck.'),
    h('h3', { style: 'margin:10px 0 4px' }, 'Comfort'),
    toggle('Reduced motion', s.reducedMotion, (v) => { s.reducedMotion = v; change(); }, 'Fewer particles and no bouncing.'),
    toggle('Screen shake', s.screenShake, (v) => { s.screenShake = v; change(); }),
    choice('Zoom', [[-1, 'Far'], [0, 'Normal'], [1, 'Close']], s.zoom, (v) => { s.zoom = v; change(); }),
    h('h3', { style: 'margin:10px 0 4px' }, 'Touch'),
    toggle('Virtual joystick', s.joystick, (v) => { s.joystick = v; change(); }, 'Use a thumb stick instead of tapping where to walk.'),
    toggle('Left-handed buttons', s.leftHanded, (v) => { s.leftHanded = v; change(); }),
    h('h3', { style: 'margin:10px 0 4px' }, 'Performance'),
    choice('Graphics quality', [['auto', 'Auto'], ['high', 'High'], ['low', 'Low']], s.quality, (v) => { s.quality = v; change(); }),
    toggle('Show FPS', s.showFps, (v) => { s.showFps = v; change(); }),
    h('div', { class: 'form-row' }, h('button', { class: 'btn blue small', onclick: () => hooks.testPerformance() }, 'Test performance')),
    h('p', { class: 'hint', style: 'font-size:.85em;color:var(--ink2)' }, hooks.storageInfo()),
    hooks.inGame && hooks.quit ? h('div', { class: 'form-row' }, h('button', { class: 'btn', onclick: () => hooks.quit!() }, 'Save & quit to title')) : null,
  );
}
