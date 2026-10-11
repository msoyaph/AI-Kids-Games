import { ACHIEVEMENTS } from '../../data/achievements';
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
          { class: on ? '' : 'locked', 'aria-label': `${a.name}: ${a.desc}${on ? ' (earned)' : ''}` },
          img(badgeUrl(a.id, a.icon, a.color, on), '', 'medal'),
          h('div', null, h('h4', null, on ? a.name : `${a.name}`), h('p', null, a.desc), on ? h('p', { style: 'color:#9cff7a;font-weight:800' }, '✓ Earned!') : null),
        ),
      );
    }
    this.el = h(
      'div.screen.menu',
      null,
      h('div.topbar', null, h('button.btn.round', { onClick: () => nav.title(), 'aria-label': 'Back' }, '←'), h('h2', null, '🏅 Badges'), h('div.stat', null, `${n}/${ACHIEVEMENTS.length}`)),
      grid,
    );
  }

  back(): boolean {
    this.nav.title();
    return true;
  }
}
