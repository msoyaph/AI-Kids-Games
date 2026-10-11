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
    const parade = h(
      'div.parade',
      { 'aria-hidden': 'true' },
      img(atlasIconUrl(a, enemyTexName('gloop', 'water'), 96)),
      img(towerIconUrl('flame', 3, 112)),
      img(atlasIconUrl(a, enemyTexName('zoomkin', null), 96)),
      img(pipUrl('cheeky', 128)),
      img(atlasIconUrl(a, enemyTexName('puffbat', 'light'), 96)),
      img(towerIconUrl('eclipse', 4, 112)),
      img(atlasIconUrl(a, enemyTexName('clankbot', null), 96)),
    );
    const play = h('button.btn.green.big', { onClick: () => nav.worlds() }, '▶ Play');
    const buttons = h(
      'div.menu-buttons',
      null,
      play,
      h('button.btn', { onClick: () => nav.tutorial() }, save.tutorialDone ? '🦊 Tutorial' : '🦊 How to play'),
      h(
        'button.btn',
        {
          onClick: () => (endlessOpen ? nav.endless() : nav.toast('Finish Sunny Meadow to unlock Endless!')),
          class: endlessOpen ? '' : 'disabled',
          'aria-label': endlessOpen ? 'Endless mode' : 'Endless mode (locked)',
        },
        endlessOpen ? '♾ Endless' : '🔒 Endless',
      ),
      h('button.btn', { onClick: () => nav.encyclopedia() }, '📖 Book'),
      h('button.btn', { onClick: () => nav.badges() }, '🏅 Badges'),
      h('button.btn', { onClick: () => nav.settings() }, '⚙ Settings'),
      fullscreenAvailable() ? h('button.btn.ghost', { onClick: () => toggleFullscreen() }, '⛶ Full screen') : null,
    );
    this.el = h(
      'div.screen.menu',
      null,
      h(
        'div.title',
        null,
        parade,
        h('div.logo', { role: 'heading', 'aria-level': '1' }, 'Vanex Defense'),
        h('div.tag', null, 'The Grumblewumps want to borrow the shiny crystals of Vanex! Build elemental towers to keep them safe.'),
        buttons,
      ),
      h('div.version', null, `v1.0 · ${app.save.totalStars()}★`),
    );
  }
}
