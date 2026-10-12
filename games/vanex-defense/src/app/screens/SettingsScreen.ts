import { FIL_REVIEW_STATUS } from '../../i18n/fil';
import { availableLocales, detectLocale, getLocale, resolveLocale, setLocale, t, type LocaleSetting } from '../../i18n';
import type { QualitySetting } from '../../render/quality';
import { h } from '../../ui/dom';
import { pipSays, showModal } from '../../ui/modals';
import type { App, Screen } from '../App';
import { fullscreenAvailable, toggleFullscreen } from './TitleScreen';
import { applyA11y, motionReduced, TEXT_SCALES } from '../a11y';
import { bindable, HOTKEY_ACTIONS, keyLabel, rebind, resolveHotkeys, type HotkeyAction } from '../hotkeys';

/** Translated name of a key action. */
export function actionLabel(a: HotkeyAction): string {
  if (a.startsWith('build')) return t('keys.build', { n: Number(a.slice(5)) });
  if (a.startsWith('ability')) return t('keys.ability', { n: Number(a.slice(7)) });
  return t(`keys.${a as 'pause'}`);
}

/** Only devices with a real pointer/keyboard get the key list (pure touch phones don't need it). */
function hasKeyboard(): boolean {
  try {
    return matchMedia('(any-pointer: fine)').matches;
  } catch {
    return true;
  }
}

/** `langOf` marks options written in another language (language names are shown in their own language). */
function seg<T extends string | number>(options: [T, string][], value: T, onPick: (v: T) => void, langOf?: (v: T) => string | undefined): HTMLElement {
  const wrap = h('div.seg', { role: 'radiogroup' });
  const render = (cur: T): void => {
    wrap.replaceChildren(
      ...options.map(([v, label]) =>
        h('button.btn', { class: v === cur ? 'on' : '', role: 'radio', 'aria-checked': String(v === cur), lang: langOf?.(v), onClick: () => (onPick(v), render(v)) }, label),
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
    /** Rebuilds this screen (after the language changes). */
    private readonly reopen: () => void = onBack,
    /** Settings → Test performance. */
    runPerfTest?: () => void,
  ) {
    const s = app.save.data.settings;
    const save = (): void => app.save.save();
    const locales = availableLocales(import.meta.env.DEV);
    const deviceName = locales.find((l) => l.id === detectLocale())?.name ?? 'English';
    const rows = h(
      'div.settings',
      null,
      h('h3.section', null, t('settings.section.language')),
      h(
        'div.setting.panel',
        null,
        h('label', null, t('settings.language')),
        seg<LocaleSetting>(
          [['auto', t('settings.lang.auto', { name: deviceName })], ...locales.map((l): [LocaleSetting, string] => [l.id, l.name])],
          s.language,
          (v) => {
            s.language = v;
            save();
            if (resolveLocale(v) !== getLocale()) {
              setLocale(resolveLocale(v));
              this.reopen();
            }
          },
          (v) => (v === 'en' ? 'en' : v === 'fil' ? 'fil' : undefined),
        ),
      ),
      getLocale() === 'fil' && FIL_REVIEW_STATUS === 'needs-native-review' ? h('p.note', null, t('settings.lang.review')) : null,
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
      h('h3.section', null, t('settings.section.access')),
      h(
        'div.setting.panel',
        null,
        h('label', null, t('settings.textSize')),
        seg<number>(
          TEXT_SCALES.map((v): [number, string] => [v, t('fmt.pct', { n: Math.round(v * 100) })]),
          s.textScale,
          (v) => {
            s.textScale = v;
            applyA11y(s);
            save();
          },
        ),
      ),
      h(
        'div.setting.panel',
        null,
        h('label', null, t('settings.contrast')),
        seg<'on' | 'off'>(
          [
            ['on', t('settings.on')],
            ['off', t('settings.off')],
          ],
          s.highContrast ? 'on' : 'off',
          (v) => {
            s.highContrast = v === 'on';
            applyA11y(s);
            save();
          },
        ),
      ),
      h(
        'div.setting.panel',
        null,
        h('label', null, t('settings.motion')),
        seg<'auto' | 'on' | 'off'>(
          [
            ['auto', t('settings.motion.auto', { state: motionReduced({ reducedMotion: 'auto' }) ? t('settings.on') : t('settings.off') })],
            ['on', t('settings.on')],
            ['off', t('settings.off')],
          ],
          s.reducedMotion,
          (v) => {
            s.reducedMotion = v;
            applyA11y(s);
            save();
          },
        ),
      ),
      h('p.note', null, t('settings.motion.help'), ' ', t('settings.flashNote')),
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
      hasKeyboard() ? this.keysSection() : null,
      runPerfTest ? h('h3.section', null, t('settings.section.device')) : null,
      runPerfTest ? h('div.setting.panel', null, h('label', null, t('perf.help')), h('button.btn', { onClick: () => runPerfTest() }, t('perf.button'))) : null,
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

  /** Keyboard section: every action with its key; select one, press the new key. */
  private keysSection(): HTMLElement {
    const s = this.app.save.data.settings;
    const list = h('div.keys-grid', { role: 'list' });
    const status = h('p.note', { role: 'status' });
    let listening: ((e: KeyboardEvent) => void) | null = null;
    const stop = (): void => {
      if (listening) removeEventListener('keydown', listening, true);
      listening = null;
    };
    const render = (): void => {
      const map = resolveHotkeys(s.hotkeys);
      list.replaceChildren(
        ...HOTKEY_ACTIONS.map((a) => {
          const btn = h('button.btn.keycap', { 'aria-label': `${actionLabel(a)}: ${keyLabel(map[a])}` }, keyLabel(map[a]));
          btn.addEventListener('click', () => {
            stop();
            btn.textContent = t('settings.keys.press');
            btn.classList.add('on');
            listening = (e: KeyboardEvent): void => {
              e.preventDefault();
              e.stopPropagation();
              stop();
              if (e.code === 'Escape') {
                status.textContent = '';
              } else if (!bindable(e.code)) {
                status.textContent = t('settings.keys.bad');
              } else {
                const before = resolveHotkeys(s.hotkeys);
                const other = HOTKEY_ACTIONS.find((x) => x !== a && before[x] === e.code);
                s.hotkeys = rebind(s.hotkeys, a, e.code);
                this.app.save.save();
                status.textContent = other ? t('settings.keys.swapped', { action: actionLabel(other) }) : '';
              }
              render();
            };
            addEventListener('keydown', listening, true);
          });
          return h('div.keys-row', { role: 'listitem' }, h('span', null, actionLabel(a)), btn);
        }),
      );
    };
    render();
    this.cleanupKeys = stop;
    return h(
      'div',
      null,
      h('h3.section', null, t('settings.section.controls')),
      h('p.note', null, t('settings.keys.help')),
      list,
      status,
      h(
        'div.row',
        null,
        h(
          'button.btn',
          {
            onClick: () => {
              stop();
              s.hotkeys = {};
              this.app.save.save();
              status.textContent = '';
              render();
            },
          },
          t('settings.keys.reset'),
        ),
      ),
    );
  }

  private cleanupKeys: () => void = () => {};

  exit(): void {
    this.cleanupKeys();
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
