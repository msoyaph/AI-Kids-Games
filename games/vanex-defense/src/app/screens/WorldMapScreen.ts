import { mapsOfWorld, TOTAL_STARS, WORLDS } from '../../data/worlds';
import { t } from '../../i18n';
import { h, img } from '../../ui/dom';
import { starsHtml } from '../../ui/modals';
import { mapThumbUrl } from '../../ui/thumbs';
import type { App, Screen } from '../App';
import type { Nav } from '../flow';

export class WorldMapScreen implements Screen {
  readonly el: HTMLElement;

  constructor(app: App, private readonly nav: Nav) {
    const save = app.save;
    const total = save.totalStars();
    const worlds = h('div.worlds');
    for (const w of WORLDS) {
      const open = nav.worldUnlocked(w.id);
      const maps = h('div.maps');
      mapsOfWorld(w.id).forEach((m) => {
        const unlocked = open && nav.mapUnlocked(m.id);
        const btn = h(
          'button.mapbtn',
          { disabled: !unlocked, 'aria-label': unlocked ? m.name : t('sectors.locked', { name: m.name }), onClick: () => nav.briefing(m, 'campaign') },
          img(mapThumbUrl(m), '', 'thumb'),
          h('span.mname', { class: unlocked ? '' : 'locked' }, unlocked ? m.name : t('sectors.lockedShort')),
          starsHtml(save.stars(m.id)),
        );
        maps.append(btn);
      });
      const card = h(
        'div.world.panel',
        { class: open ? '' : 'locked', style: `--world:${w.color}` },
        h('h3', null, w.name),
        h('div.wdesc', null, w.blurb),
        maps,
      );
      if (!open) card.append(h('div.lock-note', null, t('sectors.collect', { n: w.starsToUnlock }), h('span.have', null, t('sectors.have', { n: total }))));
      worlds.append(card);
    }
    this.el = h(
      'div.screen.menu',
      null,
      h('div.topbar', null, h('button.btn.round', { onClick: () => nav.title(), 'aria-label': t('common.back') }, '←'), h('h2', null, t('sectors.title')), h('div.stat', null, t('sectors.starsTotal', { n: total, total: TOTAL_STARS }))),
      worlds,
    );
  }

  back(): boolean {
    this.nav.title();
    return true;
  }
}
