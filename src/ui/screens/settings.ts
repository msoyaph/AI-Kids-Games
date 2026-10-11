import type { App } from '../../game/app';
import { ACTIONS, ACTION_LABELS, PAD_BUTTON_NAMES, keyLabel, type Action } from '../../input/bindings';
import { TouchControls } from '../../input/touch';
import type { QualitySetting } from '../../render/quality';
import { button, h, type Screen } from '../ui';
import { choice } from './setup';
import { renderPlaytest } from './playtest';
import { startBenchmark } from './benchmark';
import type { AssistSetting } from '../../tuning/balance';

const ASSIST_HINTS: Record<AssistSetting, string> = {
  auto: 'Auto: Light on touch screens, Off on keyboard and gamepad.',
  off: 'Off: you steer everything yourself.',
  light: 'Light: gently keeps you on the road and away from edges. Great for new racers!',
  full: 'Full: steers along the best line with you and stops most falls off the edge.',
};

/** A keyboard/gamepad-friendly slider (left/right nudges, tap/drag on touch). */
export function slider(label: string, get: () => number, set: (v: number) => void, step = 0.1): HTMLElement {
  const fill = h('i');
  const pct = h('span', { style: 'min-width:44px;text-align:right' });
  const track = h('div', { class: 'track' }, fill);
  const b = button(h('div', { class: 'slider' }, track, pct), () => {}, 'small ghost', { 'data-slider': '1' });
  const render = (): void => {
    fill.style.width = `${Math.round(get() * 100)}%`;
    pct.textContent = `${Math.round(get() * 100)}%`;
  };
  b.addEventListener('nudge', (e) => {
    set(Math.max(0, Math.min(1, Math.round((get() + (e as CustomEvent).detail * step) * 100) / 100)));
    render();
  });
  const fromPointer = (e: PointerEvent): void => {
    const r = track.getBoundingClientRect();
    set(Math.max(0, Math.min(1, Math.round(((e.clientX - r.left) / r.width) * 20) / 20)));
    render();
  };
  track.addEventListener('pointerdown', (e) => {
    track.setPointerCapture(e.pointerId);
    fromPointer(e);
  });
  track.addEventListener('pointermove', (e) => {
    if (track.hasPointerCapture(e.pointerId)) fromPointer(e);
  });
  render();
  return h('div', { class: 'setting-row' }, h('div', null, label), b);
}

export type SettingsTab = 'audio' | 'graphics' | 'gameplay' | 'controls' | 'playtest';
type Tab = SettingsTab;

/** The hidden Playtest tab appears after tapping the Settings title 5 times (or while playtest mode is on). */
let playtestRevealed = false;

export function settingsScreen(app: App, back: () => void, tab: Tab = 'audio'): Screen {
  const s = app.saves.settings;
  const save = (): void => app.saveSettings();
  const tabs = h('div', { class: 'tabs' });
  const body = h('div', { class: 'panel menu-col scroll', style: 'flex:1;min-height:0' });
  const order: Tab[] = ['audio', 'graphics', 'gameplay', 'controls'];
  const names: Record<Tab, string> = { audio: '🔊 Sound', graphics: '🎨 Graphics', gameplay: '🏎 Gameplay', controls: '🎮 Controls', playtest: '🧪 Playtest' };
  const syncOrder = (): void => {
    const want = playtestRevealed || s.playtest;
    if (want && !order.includes('playtest')) order.push('playtest');
  };
  syncOrder();
  const render = (t: Tab): void => {
    syncOrder();
    tab = t;
    tabs.innerHTML = '';
    for (const id of order) tabs.appendChild(button(names[id], () => render(id), `small ${id === t ? 'active' : ''}`));
    body.innerHTML = '';
    if (t === 'audio') {
      body.append(
        slider('Master volume', () => s.master, (v) => ((s.master = v), save())),
        slider('Music', () => s.music, (v) => ((s.music = v), save())),
        slider('Sound effects', () => s.sfx, (v) => ((s.sfx = v), save(), app.audio.ui('coin'))),
      );
    } else if (t === 'graphics') {
      body.append(
        choice<QualitySetting>('Graphics quality', [['auto', 'Auto'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High']], () => s.quality, (v) => ((s.quality = v), save())),
        h('div', { class: 'hint' }, 'Auto picks the best look your device can run smoothly, and lowers detail if the game slows down.'),
        choice('Show FPS', [[false, 'Off'], [true, 'On']], () => s.showFps, (v) => ((s.showFps = v), save())),
        choice('Screen shake', [[true, 'On'], [false, 'Off']], () => s.screenShake, (v) => ((s.screenShake = v), save())),
        choice('Reduce effects', [[false, 'Off'], [true, 'On']], () => s.reduceEffects, (v) => ((s.reduceEffects = v), save())),
        h('div', { class: 'hint' }, 'Turns off camera shake, speed blur and lines, hit pauses and flashing for a calmer view.'),
        choice('Split-screen', [['horizontal', 'Top / bottom'], ['vertical', 'Side by side']], () => s.splitMode, (v) => ((s.splitMode = v), save())),
        h(
          'div',
          { class: 'setting-row' },
          h('div', null, 'Performance'),
          button('Test performance (60 s)', () => startBenchmark(app, () => app.screens.settings(back, 'graphics')), 'small'),
        ),
        h('div', { class: 'hint' }, 'Races a busy track by itself for a minute and shows how smoothly this device runs the game.'),
      );
    } else if (t === 'gameplay') {
      body.append(
        choice<AssistSetting>('Steering assist', [['auto', 'Auto'], ['off', 'Off'], ['light', 'Light'], ['full', 'Full']], () => s.assist, (v) => ((s.assist = v), save(), render('gameplay'))),
        h('div', { class: 'hint' }, ASSIST_HINTS[s.assist]),
        choice('Auto-accelerate', [[false, 'Off'], [true, 'On']], () => s.autoAccel, (v) => ((s.autoAccel = v), save())),
        choice('Camera distance', [[0.85, 'Close'], [1, 'Normal'], [1.18, 'Far']], () => s.cameraDistance, (v) => ((s.cameraDistance = v), save())),
        choice('Rumble', [[true, 'On'], [false, 'Off']], () => s.rumble, (v) => ((s.rumble = v), save())),
        choice('Touch steering', [['buttons', 'Buttons'], ['tilt', 'Tilt']], () => s.touchSteer, (v) => {
          if (v === 'tilt') {
            void TouchControls.requestTiltPermission().then((ok) => {
              if (!ok) {
                app.toast('Tilt isn’t available here — using buttons.');
                s.touchSteer = 'buttons';
              } else s.touchSteer = 'tilt';
              save();
              render('gameplay');
            });
          } else {
            s.touchSteer = v;
            save();
          }
        }),
      );
    } else if (t === 'playtest') {
      renderPlaytest(app, body, () => render('playtest'));
    } else {
      renderControls(app, body, () => render('controls'));
    }
  };
  render(tab);
  const title = h('div', { class: 'title-h' }, 'Settings');
  let taps = 0;
  let tapTimer: ReturnType<typeof setTimeout> | null = null;
  title.addEventListener('pointerdown', () => {
    taps++;
    if (tapTimer) clearTimeout(tapTimer);
    tapTimer = setTimeout(() => (taps = 0), 1500);
    if (taps >= 5 && !playtestRevealed) {
      playtestRevealed = true;
      taps = 0;
      render('playtest');
    }
  });
  const el = h('div', { class: 'dim', style: 'gap:10px' }, h('div', { class: 'topbar' }, title, h('div', { class: 'spacer' }), button('Done', back, 'small yellow')), tabs, body);
  return {
    el,
    onBack: back,
    onMenu: (a) => {
      if (a === 'tabNext' || a === 'tabPrev') {
        const i = order.indexOf(tab);
        render(order[(i + (a === 'tabNext' ? 1 : order.length - 1)) % order.length]);
        return true;
      }
      return false;
    },
  };
}

function renderControls(app: App, body: HTMLElement, rerender: () => void): void {
  const input = app.input;
  const s = app.saves.settings;
  const persist = (): void => {
    s.keyBindings = input.keyBindings;
    s.padBindings = input.padBindings;
    app.saveSettings();
  };
  body.appendChild(h('div', { style: 'font-weight:900' }, 'Keyboard (1 player)'));
  for (const a of ACTIONS) {
    const keys = input.keyBindings.solo[a];
    body.appendChild(
      h(
        'div',
        { class: 'setting-row' },
        h('div', null, ACTION_LABELS[a]),
        button(keys.map(keyLabel).join(' / ') || '—', () => {
          app.toast(`Press a key for "${ACTION_LABELS[a]}" (Esc to cancel)`, 4000);
          input.captureNextKey((code) => {
            if (code !== 'Escape') {
              input.keyBindings.solo[a] = [code, ...keys.filter((k) => k !== code)].slice(0, 3);
              persist();
            }
            rerender();
          });
        }, 'small ghost'),
      ),
    );
  }
  body.appendChild(h('div', { style: 'font-weight:900;margin-top:10px' }, 'Gamepad'));
  const padActions: Action[] = ['accel', 'brake', 'drift', 'item', 'lookBack', 'pause'];
  for (const a of padActions) {
    const btns = input.padBindings[a];
    body.appendChild(
      h(
        'div',
        { class: 'setting-row' },
        h('div', null, ACTION_LABELS[a]),
        button(btns.map((b) => PAD_BUTTON_NAMES[b] ?? `B${b}`).join(' / ') || '—', () => {
          app.toast(`Press a gamepad button for "${ACTION_LABELS[a]}"`, 4000);
          input.captureNextPadButton((b) => {
            input.padBindings[a] = [b, ...btns.filter((x) => x !== b)].slice(0, 2);
            persist();
            rerender();
          });
        }, 'small ghost'),
      ),
    );
  }
  body.appendChild(h('div', { class: 'hint' }, 'Steer with the left stick or D-pad. Hold drift while turning to charge sparks; tap it off a ramp for a trick.'));
  body.appendChild(
    button('Reset controls', () => {
      input.resetBindings();
      persist();
      rerender();
    }, 'small pink'),
  );
}

export function pauseOverlay(app: App): Screen {
  const el = h(
    'div',
    { class: 'panel menu-col', style: 'width:min(420px,90vw);text-align:center' },
    h('div', { class: 'title-h', style: 'justify-content:center' }, 'Paused'),
    button('▶ Resume', () => app.resume(), 'big yellow'),
    app.flow.mode !== 'battle' || true ? button('↻ Restart', () => app.screens.restart(), '') : null,
    button('⚙️ Settings', () => {
      app.ui.closeOverlay(false);
      app.ui.showOverlay({ ...settingsScreen(app, () => app.screens.pause()), fullCover: true });
    }, ''),
    button('🏠 Quit to menu', () => app.screens.confirm('Quit this race?', () => app.quitToMenu(), () => app.screens.pause()), 'pink'),
  );
  return { el, onBack: () => app.resume() };
}

export function confirmOverlay(app: App, text: string, yes: () => void, no?: () => void): Screen {
  const cancel = (): void => {
    app.ui.closeOverlay();
    no?.();
  };
  const el = h(
    'div',
    { class: 'panel menu-col', style: 'width:min(460px,90vw);text-align:center' },
    h('div', { style: 'font-size:clamp(18px,3vh,24px);font-weight:900;margin:6px 0 10px' }, text),
    h('div', { class: 'menu-row', style: 'justify-content:center' }, button('Yes', () => {
      app.ui.closeOverlay(false);
      yes();
    }, 'pink'), button('No', cancel, 'yellow')),
  );
  return { el, onBack: cancel, focus: el.querySelectorAll<HTMLElement>('[data-nav]')[1] };
}
