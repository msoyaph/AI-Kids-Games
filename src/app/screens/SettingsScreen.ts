import type { QualitySetting } from '../../render/quality';
import { h } from '../../ui/dom';
import { pipSays, showModal } from '../../ui/modals';
import type { App, Screen } from '../App';
import { fullscreenAvailable, toggleFullscreen } from './TitleScreen';

function seg<T extends string | number>(options: [T, string][], value: T, onPick: (v: T) => void): HTMLElement {
  const wrap = h('div.seg', { role: 'radiogroup' });
  const render = (cur: T): void => {
    wrap.replaceChildren(
      ...options.map(([v, label]) =>
        h('button.btn', { class: v === cur ? 'on' : '', role: 'radio', 'aria-checked': String(v === cur), onClick: () => (onPick(v), render(v)) }, label),
      ),
    );
  };
  render(value);
  return wrap;
}

function slider(label: string, value: number, onChange: (v: number) => void): HTMLElement {
  const id = `s_${label.replace(/\W/g, '')}`;
  const input = h('input', { type: 'range', min: '0', max: '100', step: '5', value: String(Math.round(value * 100)), id, 'aria-label': label });
  input.addEventListener('input', () => onChange(Number(input.value) / 100));
  return h('div.setting.panel', null, h('label', { for: id }, label), input);
}

export class SettingsScreen implements Screen {
  readonly el: HTMLElement;

  constructor(
    private readonly app: App,
    private readonly onBack: () => void,
  ) {
    const s = app.save.data.settings;
    const save = (): void => app.save.save();
    const rows = h(
      'div.settings',
      null,
      slider('🎵 Music', s.music, (v) => {
        s.music = v;
        app.audio.setVolumes(s.music, s.sfx);
        save();
      }),
      slider('🔊 Sounds', s.sfx, (v) => {
        s.sfx = v;
        app.audio.setVolumes(s.music, s.sfx);
        app.audio.ui('click');
        save();
      }),
      h(
        'div.setting.panel',
        null,
        h('label', null, '✨ Picture quality'),
        seg<QualitySetting>(
          [
            ['auto', 'Auto'],
            ['low', 'Low'],
            ['medium', 'Medium'],
            ['high', 'High'],
          ],
          s.quality,
          (v) => {
            s.quality = v;
            app.setQualitySetting();
            save();
          },
        ),
      ),
      h(
        'div.setting.panel',
        null,
        h('label', null, '📳 Screen shake'),
        seg<'on' | 'off'>(
          [
            ['on', 'On'],
            ['off', 'Off'],
          ],
          s.shake ? 'on' : 'off',
          (v) => {
            s.shake = v === 'on';
            save();
          },
        ),
      ),
      h(
        'div.setting.panel',
        null,
        h('label', null, '🔢 Damage numbers'),
        seg<'on' | 'off'>(
          [
            ['on', 'On'],
            ['off', 'Off'],
          ],
          s.damageNumbers ? 'on' : 'off',
          (v) => {
            s.damageNumbers = v === 'on';
            save();
          },
        ),
      ),
      h(
        'div.setting.panel',
        null,
        h('label', null, '⏩ Starting speed'),
        seg<1 | 2 | 3>(
          [
            [1, '1x'],
            [2, '2x'],
            [3, '3x'],
          ],
          s.speed,
          (v) => {
            s.speed = v;
            save();
          },
        ),
      ),
      fullscreenAvailable() ? h('div.setting.panel', null, h('label', null, '⛶ Full screen'), h('button.btn', { onClick: () => toggleFullscreen() }, 'Toggle')) : null,
      h(
        'div.setting.panel',
        null,
        h('label', null, '🗑 Start over'),
        h('button.btn.red', { onClick: () => this.confirmReset() }, 'Reset progress'),
      ),
      app.save.persistent ? null : h('p', { style: 'text-align:center;opacity:.85' }, 'Saving is turned off in this browser, so progress lasts until you close the page.'),
    );
    this.el = h(
      'div.screen.menu',
      null,
      h('div.topbar', null, h('button.btn.round', { onClick: () => onBack(), 'aria-label': 'Back' }, '←'), h('h2', null, '⚙ Settings')),
      rows,
    );
  }

  private confirmReset(): void {
    const m = showModal(this.app.ui, [
      h('h2', null, 'Start over?'),
      pipSays('This removes all your stars, badges and records. Your settings stay the same. Are you sure?'),
      h(
        'div.row',
        null,
        h('button.btn.green.big', { onClick: () => m.close() }, 'No, keep them!'),
        h(
          'button.btn.red',
          {
            onClick: () => {
              this.app.save.reset();
              m.close();
              this.onBack();
            },
          },
          'Yes, reset',
        ),
      ),
    ]);
  }

  back(): boolean {
    this.onBack();
    return true;
  }
}
