import { atlasIconUrl, enemyTexName, towerIconUrl } from '../../render/atlas/bake';
import { h, img } from '../../ui/dom';
import { t } from '../../i18n';
import { pipUrl } from '../../ui/modals';
import type { App, Screen } from '../App';
import type { Nav } from '../flow';

export function fullscreenAvailable(): boolean {
  try {
    return !!document.fullscreenEnabled && typeof document.documentElement.requestFullscreen === 'function';
  } catch {
    return false;
  }
}

export function toggleFullscreen(): void {
  try {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  } catch {
    /* not allowed in this frame */
  }
}

export class TitleScreen implements Screen {
  readonly el: HTMLElement;

  constructor(app: App, nav: Nav) {
    const a = app.atlas;
    const save = app.save.data;
    const endlessOpen = nav.endlessUnlocked();
    const showcase = h(
      'div.showcase',
      { 'aria-hidden': 'true' },
      img(towerIconUrl('eclipse', 4, 128)),
      img(towerIconUrl('flame', 3, 128)),
      img(towerIconUrl('crystal', 4, 128)),
      img(pipUrl('happy', 128)),
      img(atlasIconUrl(a, enemyTexName('clankbot', null), 112)),
      img(atlasIconUrl(a, enemyTexName('gloop', 'fire'), 112)),
      img(atlasIconUrl(a, enemyTexName('puffbat', null), 112)),
    );
    const buttons = h(
      'div.menu-buttons',
      null,
      h('button.btn.green.big', { onClick: () => nav.worlds() }, t('title.campaign')),
      h(
        'div.row2',
        null,
        h('button.btn', { onClick: () => nav.tutorial() }, save.tutorialDone ? t('title.training') : t('title.startTraining')),
        h(
          'button.btn',
          {
            onClick: () => (endlessOpen ? nav.endless() : nav.toast(t('title.endlessHint'))),
            class: endlessOpen ? '' : 'disabled',
            'aria-label': endlessOpen ? t('title.endless') : t('title.endlessLocked'),
          },
          endlessOpen ? t('title.endless') : t('title.endlessLockedShort'),
        ),
      ),
      h(
        'div.row2',
        null,
        h(
          'button.btn',
          {
            onClick: () => (nav.dailyUnlocked() ? nav.daily() : nav.toast(t('daily.locked'))),
            class: nav.dailyUnlocked() ? '' : 'disabled',
          },
          t('title.daily'),
        ),
        h('button.btn', { onClick: () => nav.research() }, t('title.research')),
      ),
      h('div.row2', null, h('button.btn', { onClick: () => nav.encyclopedia() }, t('title.codex')), h('button.btn', { onClick: () => nav.badges() }, t('title.badges'))),
      h('div.row2', null, h('button.btn', { onClick: () => nav.settings() }, t('title.settings')), fullscreenAvailable() ? h('button.btn.ghost', { onClick: () => toggleFullscreen() }, t('title.fullscreen')) : null),
    );
    this.el = h(
      'div.screen.menu',
      null,
      h(
        'div.title',
        null,
        h(
          'div.hero-art',
          null,
          h('div.logo', { role: 'heading', 'aria-level': '1' }, h('small', null, t('title.kicker')), t('title.name')),
          h('div.tag', null, t('title.tag')),
          showcase,
        ),
        buttons,
      ),
      h('div.version', null, t('title.version', { v: '2.0', stars: t('unit.stars', { count: app.save.totalStars() }) })),
    );
  }
}
