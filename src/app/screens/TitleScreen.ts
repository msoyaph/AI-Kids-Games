import { atlasIconUrl, enemyTexName, towerIconUrl } from '../../render/atlas/bake';
import { h, img } from '../../ui/dom';
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
      h('button.btn.green.big', { onClick: () => nav.worlds() }, 'Campaign'),
      h(
        'div.row2',
        null,
        h('button.btn', { onClick: () => nav.tutorial() }, save.tutorialDone ? 'Training' : 'Start training'),
        h(
          'button.btn',
          {
            onClick: () => (endlessOpen ? nav.endless() : nav.toast('Clear the Verdant Reach to unlock Endless.')),
            class: endlessOpen ? '' : 'disabled',
            'aria-label': endlessOpen ? 'Endless' : 'Endless (locked)',
          },
          endlessOpen ? 'Endless' : 'Endless · locked',
        ),
      ),
      h('div.row2', null, h('button.btn', { onClick: () => nav.encyclopedia() }, 'Codex'), h('button.btn', { onClick: () => nav.badges() }, 'Badges')),
      h('div.row2', null, h('button.btn', { onClick: () => nav.settings() }, 'Settings'), fullscreenAvailable() ? h('button.btn.ghost', { onClick: () => toggleFullscreen() }, 'Full screen') : null),
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
          h('div.logo', { role: 'heading', 'aria-level': '1' }, h('small', null, 'Crystal Defense Grid'), 'Vanex Defense'),
          h('div.tag', null, 'The Shardbound are pouring through the rifts. Build the grid, master six elements and hold the line, Commander.'),
          showcase,
        ),
        buttons,
      ),
      h('div.version', null, `v2.0 · ${app.save.totalStars()} STARS`),
    );
  }
}
