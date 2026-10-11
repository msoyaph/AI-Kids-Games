import { ACHIEVEMENTS } from '../../data/achievements';
import { t } from '../../i18n';
import { badgeUrl } from '../../render/atlas/drawBadge';
import { h, img } from '../../ui/dom';
import type { App, Screen } from '../App';
import type { Nav } from '../flow';

export class BadgesScreen implements Screen {
  readonly el: HTMLElement;

  constructor(app: App, private readonly nav: Nav) {
    const got = app.save.data.achievements;
    const n = ACHIEVEMENTS.filter((a) => got[a.id]).length;
    const grid = h('div.cards-grid');
    for (const a of ACHIEVEMENTS) {
      const on = !!got[a.id];
      grid.append(
        h(
          'div.badge-card.panel',
          { class: on ? '' : 'locked', 'aria-label': t(on ? 'badges.cardLabelEarned' : 'badges.cardLabel', { name: a.name, desc: a.desc }) },
          img(badgeUrl(a.id, a.icon, a.color, on), '', 'medal'),
          h('div', null, h('h4', null, a.name), h('p', null, a.desc), on ? h('p.earned', null, t('badges.earned')) : null),
        ),
      );
    }
    this.el = h(
      'div.screen.menu',
      null,
      h('div.topbar', null, h('button.btn.round', { onClick: () => nav.title(), 'aria-label': t('common.back') }, '←'), h('h2', null, t('badges.title')), h('div.stat', null, t('hud.waveOf', { n, total: ACHIEVEMENTS.length }))),
      grid,
    );
  }

  back(): boolean {
    this.nav.title();
    return true;
  }
}
