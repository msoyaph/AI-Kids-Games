import { mapsOfWorld, TOTAL_STARS, WORLDS } from '../../data/worlds';
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
          { disabled: !unlocked, 'aria-label': `${m.name}${unlocked ? '' : ' (locked)'}`, onClick: () => nav.briefing(m, 'campaign') },
          img(mapThumbUrl(m), '', 'thumb'),
          h('span.mname', null, unlocked ? m.name : '🔒'),
          starsHtml(save.stars(m.id)),
        );
        maps.append(btn);
      });
      const card = h(
        'div.world.panel',
        { class: open ? '' : 'locked', style: { boxShadow: `inset 0 0 0 3px ${w.color}88, 0 10px 30px rgba(5,0,25,.45)` } },
        h('h3', null, w.name),
        h('div.wdesc', null, w.blurb),
        maps,
      );
      if (!open) card.append(h('div.lock-note', null, '🔒', `Collect ${w.starsToUnlock}★ to open`, h('span', { style: 'font-size:14px;opacity:.85' }, `You have ${total}★`)));
      worlds.append(card);
    }
    this.el = h(
      'div.screen.menu',
      null,
      h('div.topbar', null, h('button.btn.round', { onClick: () => nav.title(), 'aria-label': 'Back' }, '←'), h('h2', null, 'Pick a map'), h('div.stat', null, `★ ${total}/${TOTAL_STARS}`)),
      worlds,
    );
  }

  back(): boolean {
    this.nav.title();
    return true;
  }
}
