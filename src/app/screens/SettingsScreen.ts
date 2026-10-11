import { t } from '../../i18n';
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
      h('h3.section', null, t('settings.section.audio')),
      slider(t('settings.music'), s.music, (v) => {
        s.music = v;
        app.audio.setVolumes(s.music, s.sfx);
        save();
      }),
      slider(t('settings.sfx'), s.sfx, (v) => {
        s.sfx = v;
        app.audio.setVolumes(s.music, s.sfx);
        app.audio.ui('click');
        save();
      }),
      h('h3.section', null, t('settings.section.display')),
      h(
        'div.setting.panel',
        null,
        h('label', null, t('settings.quality')),
        seg<QualitySetting>(
          [
            ['auto', t('settings.q.auto')],
            ['low', t('settings.q.low')],
            ['medium', t('settings.q.medium')],
            ['high', t('settings.q.high')],
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
        h('label', null, t('settings.shake')),
        seg<'on' | 'off'>(
          [
            ['on', t('settings.on')],
            ['off', t('settings.off')],
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
        h('label', null, t('settings.damageNumbers')),
        seg<'on' | 'off'>(
          [
            ['on', t('settings.on')],
            ['off', t('settings.off')],
          ],
          s.damageNumbers ? 'on' : 'off',
          (v) => {
            s.damageNumbers = v === 'on';
            save();
          },
        ),
      ),
      h('h3.section', null, t('settings.section.gameplay')),
      h(
        'div.setting.panel',
        null,
        h('label', null, t('settings.speed')),
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
      fullscreenAvailable() ? h('div.setting.panel', null, h('label', null, t('settings.fullscreen')), h('button.btn', { onClick: () => toggleFullscreen() }, t('settings.toggle'))) : null,
      h('h3.section', null, t('settings.section.data')),
      h(
        'div.setting.panel',
        null,
        h('label', null, t('settings.resetLabel')),
        h('button.btn.red', { onClick: () => this.confirmReset() }, t('settings.reset')),
      ),
      app.save.persistent ? null : h('p', { style: 'text-align:center;opacity:.85' }, t('settings.noStorage')),
    );
    this.el = h(
      'div.screen.menu',
      null,
      h('div.topbar', null, h('button.btn.round', { onClick: () => onBack(), 'aria-label': t('common.back') }, '←'), h('h2', null, t('settings.title'))),
      rows,
    );
  }

  private confirmReset(): void {
    const m = showModal(this.app.ui, [
      h('h2', null, t('settings.resetTitle')),
      pipSays(t('settings.resetBody')),
      h(
        'div.row',
        null,
        h('button.btn.green.big', { onClick: () => m.close() }, t('settings.resetKeep')),
        h(
          'button.btn.red',
          {
            onClick: () => {
              this.app.save.reset();
              m.close();
              this.onBack();
            },
          },
          t('settings.resetYes'),
        ),
      ),
    ]);
  }

  back(): boolean {
    this.onBack();
    return true;
  }
}
