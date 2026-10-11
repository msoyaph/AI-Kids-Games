// Pause menu.
import { btn, h, type Panel, type UIManager } from '../dom';

export class PauseMenu implements Panel {
  el: HTMLElement;
  modal = true;
  constructor(ui: UIManager, opts: { onSave: () => void; onSettings: () => void; onControls: () => void; onQuit: () => void }) {
    const close = () => ui.pop(this);
    this.el = h(
      'div',
      { class: 'screen' },
      h('div', { class: 'dim' }),
      h(
        'div',
        { class: 'panel center pause' },
        h('h2', null, 'Paused'),
        h(
          'div',
          { class: 'menu-list' },
          btn('Resume', close, 'primary'),
          btn('Save game', () => {
            opts.onSave();
            close();
          }),
          btn('Settings', opts.onSettings),
          btn('Controls', opts.onControls),
          btn('Save & quit to title', opts.onQuit),
        ),
      ),
    );
  }
  command(c: string): boolean {
    if (c === 'pause') {
      return false;
    }
    return false;
  }
}

export function controlsPanel(ui: UIManager): Panel {
  const rows: [string, string, string][] = [
    ['Move', 'WASD / Arrows', 'Left stick'],
    ['Run', 'Shift (hold)', 'B / RT (hold)'],
    ['Interact / use tool', 'E / Space / Click', 'A'],
    ['Sneak with net', 'Hold E', 'Hold A'],
    ['Tools', '1–6, [ ]', 'LB / RB'],
    ['Tool ring', 'R', 'Y'],
    ['Put away tool', 'Q', '—'],
    ['Pockets', 'I', 'X'],
    ['Glowpad (phone)', 'Tab / P', 'Start'],
    ['Map', 'M', 'Select'],
    ['Pause / back', 'Esc', 'B'],
  ];
  const p: Panel = {
    modal: true,
    el: h(
      'div',
      { class: 'screen' },
      h('div', { class: 'dim' }),
      h(
        'div',
        { class: 'panel center', style: 'padding:22px;width:min(560px,94vw)' },
        h('h2', null, 'Controls'),
        h(
          'table',
          { style: 'width:100%;border-collapse:collapse;font-size:15px' },
          h('tr', null, h('th', { style: 'text-align:left' }, ''), h('th', { style: 'text-align:left' }, 'Keyboard'), h('th', { style: 'text-align:left' }, 'Gamepad')),
          rows.map(([a, b, c]) => h('tr', null, h('td', { style: 'padding:4px 0;font-weight:800' }, a), h('td', null, b), h('td', null, c))),
        ),
        h('p', { class: 'muted tiny' }, 'On touch screens, use the on-screen joystick and buttons.'),
        h('div', { class: 'row', style: 'justify-content:flex-end' }, btn('Close', () => ui.pop(p), 'primary')),
      ),
    ),
  };
  return p;
}
