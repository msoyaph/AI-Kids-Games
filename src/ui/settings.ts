// Settings: audio, text speed, camera, visuals, controls, onboarding tips.
import type { App } from '../app';
import { sharedUniforms } from '../render/curve';
import { btn, h, type Panel } from './dom';
import { playtestSettings } from './playtest';
import { SEASONS, SEASON_NAME, setSeasonsPaused } from '../sim/seasons';

export function settingsBody(app: App, body: HTMLElement): void {
  const s = app.settings;
  const save = () => app.applySettings();
  const slider = (label: string, get: () => number, set: (v: number) => void, min = 0, max = 1, step = 0.05) => {
    const input = h('input', { type: 'range', min: String(min), max: String(max), step: String(step), value: String(get()), class: 'slider', 'data-nav': '' }) as HTMLInputElement;
    const val = h('span', { class: 'tiny muted', style: 'width:40px;text-align:right' }, String(Math.round(get() * 100) / 100));
    input.addEventListener('input', () => {
      set(Number(input.value));
      val.textContent = String(Math.round(Number(input.value) * 100) / 100);
      save();
    });
    input.addEventListener('keydown', (e) => e.stopPropagation());
    return h('div', { class: 'opt-row' }, h('label', null, label), input, val);
  };
  const choice = <T extends string>(label: string, options: [T, string][], get: () => T, set: (v: T) => void) => {
    const row = h('div', { class: 'row wrap' });
    for (const [v, l] of options) {
      const b = h('button', { class: `chip ${get() === v ? 'sel' : ''}`, 'data-nav': '' }, l);
      b.addEventListener('click', () => {
        set(v);
        row.querySelectorAll('.chip').forEach((c) => c.classList.remove('sel'));
        b.classList.add('sel');
        save();
      });
      row.append(b);
    }
    return h('div', { class: 'opt-row' }, h('label', null, label), row);
  };
  body.append(
    h('h3', null, 'Sound'),
    slider('Master', () => s.master, (v) => (s.master = v)),
    slider('Music', () => s.music, (v) => (s.music = v)),
    slider('Effects', () => s.sfx, (v) => (s.sfx = v)),
    h('h3', null, 'Text'),
    choice('Text speed', [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast'], ['instant', 'Instant']], () => s.textSpeed, (v) => (s.textSpeed = v)),
    choice('Text size', [['1', 'Normal'], ['1.25', 'Big'], ['1.5', 'Bigger']], () => String(s.textSize || 1) as '1' | '1.25' | '1.5', (v) => (s.textSize = Number(v))),
    app.speech.available
      ? choice('Read aloud', [['on', 'On'], ['off', 'Off']], () => (s.readAloud ? 'on' : 'off'), (v) => {
          s.readAloud = v === 'on';
          if (s.readAloud) app.speech.speak('Hello! I will read the words for you.', 1, true);
        })
      : h('div', { class: 'opt-row' }, h('label', null, 'Read aloud'), h('span', { class: 'muted tiny' }, 'Not available on this device.')),
    h('h3', null, 'Camera'),
    slider('Zoom', () => s.camera.zoom, (v) => (s.camera.zoom = v), 0.7, 1.4, 0.05),
    slider('Tilt', () => s.camera.tilt, (v) => (s.camera.tilt = v), 28, 64, 1),
    slider('Smoothing', () => s.camera.smoothing, (v) => (s.camera.smoothing = v), 2, 14, 0.5),
    slider('World curve', () => s.curve, (v) => (s.curve = v), 0, 2, 0.1),
    h('h3', null, 'Visuals & controls'),
    choice('Shadows', [['on', 'On'], ['off', 'Off']], () => (s.shadows ? 'on' : 'off'), (v) => (s.shadows = v === 'on')),
    choice('Reduce motion', [['off', 'Off'], ['on', 'On']], () => (s.reduceMotion ? 'on' : 'off'), (v) => (s.reduceMotion = v === 'on')),
    choice('Touch controls', [['auto', 'Auto'], ['on', 'Always'], ['off', 'Hidden']], () => s.touch, (v) => (s.touch = v)),
    choice('Tutorial tips', [['on', 'On'], ['off', 'Off']], () => (s.tips ? 'on' : 'off'), (v) => (s.tips = v === 'on')),
    ...(app.game
      ? [
          choice(
            'Seasons',
            [
              ['go', 'Change'],
              ['stay', `Stay in ${SEASON_NAME[SEASONS[app.game.state.season.index]!]}`],
            ],
            () => (app.game!.state.season.paused ? 'stay' : 'go'),
            (v) => setSeasonsPaused(app.game!, v === 'stay'),
          ),
        ]
      : []),
    h('div', { class: 'row', style: 'margin-top:8px' }, btn('Show tips again', () => {
      if (app.game) app.game.state.tips = {};
      app.hud.toast('Tutorial tips will show again.');
    }, 'small')),
  );
  playtestSettings(app, body);
  void sharedUniforms;
}

export function settingsPanel(app: App): Panel {
  const body = h('div', { class: 'col scroll', style: 'max-height:70vh;gap:4px' });
  settingsBody(app, body);
  const p: Panel = {
    name: 'settings',
    modal: true,
    el: h(
      'div',
      { class: 'screen', style: 'z-index:9' },
      h('div', { class: 'dim' }),
      h('div', { class: 'panel center', style: 'padding:20px;width:min(560px,94vw)' }, h('h2', null, 'Settings', h('span', { class: 'spacer' }), btn('✕', () => app.ui.pop(p), 'small ghost')), body),
    ),
  };
  return p;
}
