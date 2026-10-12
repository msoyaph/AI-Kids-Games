import type { App } from '../../game/app';
import type { Device, InputSource } from '../../input/manager';
import { PAD_BUTTON_NAMES, keyLabel, type Action } from '../../input/bindings';
import { button, h, type Screen } from '../ui';

/** The device a player's input source stands for ('any' = whatever was used last in the menus). */
export function deviceFor(app: App, src: InputSource): Device {
  switch (src.kind) {
    case 'touch':
      return 'touch';
    case 'gamepad':
    case 'combo':
      return 'gamepad';
    case 'keyboard':
      return 'keyboard';
    default:
      return app.input.lastDevice === 'gamepad' ? 'gamepad' : app.gr.isTouch && app.input.lastDevice === 'touch' ? 'touch' : 'keyboard';
  }
}

const ROWS: Array<{ a: Action; icon: string; what: string }> = [
  { a: 'accel', icon: '⬆️', what: 'Go' },
  { a: 'brake', icon: '⬇️', what: 'Brake / reverse' },
  { a: 'left', icon: '↔️', what: 'Steer' },
  { a: 'drift', icon: '✨', what: 'Drift (hold while turning) · hop · trick off ramps' },
  { a: 'item', icon: '🎁', what: 'Use item (hold DOWN too to throw it backwards)' },
  { a: 'lookBack', icon: '👀', what: 'Look behind' },
  { a: 'pause', icon: '⏸', what: 'Pause' },
];

const DEVICE_NAMES: Record<Device, string> = { keyboard: '⌨️ Keyboard', gamepad: '🎮 Gamepad', touch: '👆 Touch screen' };

function keys(list: string[]): HTMLElement[] {
  return list.slice(0, 3).map((c) => h('kbd', null, keyLabel(c)));
}

/** One column of the card: what each control does on this player's device. */
function column(app: App, src: InputSource, device: Device, title: string): HTMLElement {
  const rows: HTMLElement[] = [];
  if (device === 'touch') {
    const s = app.saves.settings;
    const touchRows: Array<[string, string, string]> = [
      ['⬆️', 'GO', s.autoAccel || app.gr.isTouch ? 'You speed up by yourself — hold BRAKE to slow down' : 'Hold to drive'],
      s.touchSteer === 'tilt'
        ? ['↔️', 'Tilt', 'Tilt the screen like a steering wheel']
        : s.touchSteer === 'buttons'
          ? ['↔️', '◀  ▶', 'Steer (slide your thumb across for gentle turns)']
          : ['🕹', 'Joystick', s.touch.stick === 'fixed' ? 'Push the stick left or right to steer' : `Put your ${s.touch.leftHanded ? 'right' : 'left'} thumb down anywhere on that side and slide to steer`],
      ['✨', 'DRIFT', 'Hold while turning to drift · tap to hop · tap off ramps for a trick'],
      ['🎁', 'ITEM', 'Use item · swipe down on it to throw backwards'],
      ['👀', '👀', 'Look behind'],
      ['⏸', 'II', 'Pause'],
    ];
    for (const [icon, label, what] of touchRows) rows.push(h('div', { class: 'cc-row' }, h('span', { class: 'cc-icon', 'aria-hidden': 'true' }, icon), h('span', { class: 'cc-keys' }, h('kbd', null, label)), h('span', null, what)));
  } else {
    const scheme = src.kind === 'keyboard' || src.kind === 'combo' ? src.scheme : 'solo';
    const kb = app.input.keyBindings[scheme];
    const pad = app.input.padBindings;
    for (const r of ROWS) {
      let chips: HTMLElement[];
      if (device === 'gamepad') {
        const btns = r.a === 'left' ? ['Left stick', ...pad.left.map((b) => PAD_BUTTON_NAMES[b]), ...pad.right.map((b) => PAD_BUTTON_NAMES[b])] : pad[r.a].map((b) => PAD_BUTTON_NAMES[b] ?? `#${b}`);
        chips = btns.slice(0, 3).map((b) => h('kbd', null, b));
      } else chips = r.a === 'left' ? [...keys(kb.left.slice(0, 1)), ...keys(kb.right.slice(0, 1)), ...keys(kb.left.slice(1, 2)), ...keys(kb.right.slice(1, 2))] : keys(kb[r.a]);
      rows.push(h('div', { class: 'cc-row' }, h('span', { class: 'cc-icon', 'aria-hidden': 'true' }, r.icon), h('span', { class: 'cc-keys' }, ...chips), h('span', null, r.what)));
    }
  }
  return h('div', { class: 'cc-col' }, h('div', { class: 'cc-title' }, title), ...rows);
}

/**
 * A quick controls summary, shown before a player's first race on each kind of device (keyboard, gamepad,
 * touch) and from Settings → Controls. `go` runs when it is dismissed.
 */
export function controlsCard(app: App, players: Array<{ src: InputSource; device: Device }>, go: () => void): Screen {
  const many = players.length > 1;
  const cols = players.map((p, i) => column(app, p.src, p.device, many ? `P${i + 1} · ${DEVICE_NAMES[p.device]}` : DEVICE_NAMES[p.device]));
  const ok = button("Got it — let's race! ▶", go, 'yellow');
  const el = h(
    'div',
    { class: 'dim controls-card', style: 'justify-content:center;align-items:center' },
    h(
      'div',
      { class: 'panel menu-col', style: `width:min(${many ? 900 : 600}px,94vw);max-height:100%;min-height:0;overflow:hidden` },
      h('div', { class: 'title-h' }, '🕹 Controls'),
      // the list shrinks and scrolls on short (landscape phone) screens so the card always fits
      h('div', { class: 'scroll', style: 'flex:1 1 auto;min-height:0' }, h('div', { class: `cc-cols ${many ? 'two' : ''}` }, ...cols)),
      h('div', { class: 'hint' }, 'Tip: drift round corners until the sparks show 3 chevrons ››› , then let go for a big boost!'),
      h('div', { class: 'menu-row', style: 'justify-content:center' }, ok),
      h('div', { class: 'hint', style: 'text-align:center' }, 'You can see this again in Settings → Controls.'),
    ),
  );
  return { el, onBack: go, focus: ok };
}

/** Show the controls card first if any of these players hasn't seen it on their device yet. */
export function withControlsCard(app: App, sources: InputSource[], start: () => void): void {
  const s = app.saves.settings;
  const players = sources.map((src) => ({ src, device: deviceFor(app, src) }));
  if (players.every((p) => s.controlsSeen[p.device])) {
    start();
    return;
  }
  app.ui.show(
    controlsCard(app, players, () => {
      for (const p of players) s.controlsSeen[p.device] = true;
      app.saveSettings();
      start();
    }),
  );
}
