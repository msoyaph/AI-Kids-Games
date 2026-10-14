/** The Settings panel: sound, text size, read-aloud, colour-blind badges, motion, hints, tool side and quality. */
import type { Settings } from '../save/settings';
import { h } from './h';
import { speechAvailable } from './speech';

function choice<T extends string | number>(label: string, value: T, options: [T, string][], set: (v: T) => void) {
  const row = h('div.setting', { role: 'radiogroup', 'aria-label': label }, h('span.setting-label', null, label));
  const group = h('div.segmented');
  for (const [v, text] of options) {
    const b = h('button', { 'aria-pressed': String(v === value), role: 'radio', 'aria-checked': String(v === value), onclick: () => {
      for (const other of group.children) { other.setAttribute('aria-pressed', 'false'); other.setAttribute('aria-checked', 'false'); }
      b.setAttribute('aria-pressed', 'true'); b.setAttribute('aria-checked', 'true');
      set(v);
    } }, text);
    group.appendChild(b);
  }
  row.appendChild(group);
  return row;
}

function toggle(label: string, on: boolean, set: (v: boolean) => void, note?: string, disabled = false) {
  const b = h('button.switch', { role: 'switch', 'aria-checked': String(on), disabled, onclick: () => {
    on = !on;
    b.setAttribute('aria-checked', String(on));
    b.textContent = on ? 'On' : 'Off';
    set(on);
  } }, on ? 'On' : 'Off');
  return h('div.setting', null, h('span.setting-label', null, label, note ? h('small', null, note) : null), b);
}

function slider(label: string, value: number, set: (v: number) => void) {
  const input = h('input', { type: 'range', min: '0', max: '100', step: '5', value: String(Math.round(value * 100)), 'aria-label': label, oninput: () => set(Number(input.value) / 100) });
  return h('div.setting', null, h('span.setting-label', null, label), input);
}

export function settingsPanel(s: Settings, onChange: (s: Settings) => void): HTMLElement {
  const change = (patch: Partial<Settings>) => { Object.assign(s, patch); onChange(s); };
  const speech = speechAvailable();
  return h('div.settings', null,
    h('h3', null, 'Sound'),
    slider('All sound', s.volume.master, v => change({ volume: { ...s.volume, master: v } })),
    slider('Music', s.volume.music, v => change({ volume: { ...s.volume, music: v } })),
    slider('Effects', s.volume.sfx, v => change({ volume: { ...s.volume, sfx: v } })),
    h('h3', null, 'Reading'),
    choice('Text size', s.textSize, [[0, 'Normal'], [1, 'Big'], [2, 'Bigger']], v => change({ textSize: v })),
    toggle('Read aloud', s.readAloud && speech, v => change({ readAloud: v }), speech ? 'Reads stories and tips out loud' : 'Not available on this device', !speech),
    h('h3', null, 'Seeing and moving'),
    toggle('Shape badges', s.colorblind, v => change({ colorblind: v }), 'Shapes as well as colours for ready crops and stars'),
    toggle('Less motion', s.reducedMotion, v => change({ reducedMotion: v }), 'No camera glides, sways or bouncing'),
    toggle('Hints', s.hints, v => change({ hints: v }), 'A friendly nudge if you seem stuck'),
    toggle('Tools on the left', s.leftHanded, v => change({ leftHanded: v }), 'For left hands, when a phone is held sideways'),
    choice('Graphics', s.quality, [['auto', 'Auto'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High']], v => change({ quality: v })),
  );
}
