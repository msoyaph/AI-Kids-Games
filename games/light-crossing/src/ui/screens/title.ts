// Title screen.
import { btn, h, type Panel, type UIManager } from '../dom';

export class TitleScreen implements Panel {
  el: HTMLElement;
  modal = true;
  covers = true;
  sticky = true;
  constructor(ui: UIManager, opts: { onStart: () => void; onSettings: () => void; onCredits: () => void; hasSaves: boolean }) {
    this.el = h(
      'div',
      { class: 'screen title' },
      h('div', { class: 'logo' }, 'Light Crossing', h('small', null, 'A COZY ISLAND LIFE')),
      h(
        'div',
        { class: 'title-menu' },
        btn(opts.hasSaves ? 'Continue / New Game' : 'Start', opts.onStart, 'primary'),
        btn('Settings', opts.onSettings),
        btn('Credits', opts.onCredits),
      ),
      h('div', { class: 'title-foot' }, 'All art and music are procedurally generated · Keyboard, gamepad & touch'),
    );
    void ui;
  }
}
