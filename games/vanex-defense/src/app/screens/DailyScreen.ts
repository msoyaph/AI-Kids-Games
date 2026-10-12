import { dailyFor, dateKey } from '../../data/modes';
import { formatNumber, t, type MessageKey } from '../../i18n';
import { h, img } from '../../ui/dom';
import { mapThumbUrl } from '../../ui/thumbs';
import type { App, Screen } from '../App';
import type { Nav } from '../flow';

/** Today's seeded challenge plus the local best scores of recent days. */
export class DailyScreen implements Screen {
  readonly el: HTMLElement;

  constructor(app: App, private readonly nav: Nav) {
    const today = dateKey();
    const d = dailyFor(today);
    const best = app.save.data.daily[today];
    const chips = [
      ...d.modifiers.map((m) => h('span.chip.spec', { title: t(`modifier.${m}.desc` as MessageKey) }, t(`modifier.${m}` as MessageKey))),
      ...d.mutators.map((m) => h('span.chip', { title: t(`mutator.${m}.desc` as MessageKey) }, t(`mutator.${m}` as MessageKey))),
    ];
    const history = Object.keys(app.save.data.daily)
      .filter((k) => k !== today)
      .sort()
      .reverse()
      .slice(0, 7)
      .map((k) => h('div.kv', null, h('span', null, k), h('b', null, formatNumber(app.save.data.daily[k]!))));
    this.el = h(
      'div.screen.menu',
      null,
      h('div.topbar', null, h('button.btn.round', { onClick: () => nav.title(), 'aria-label': t('common.back') }, '←'), h('h2', null, t('daily.title'))),
      h('p.note', null, t('daily.intro')),
      h(
        'div.daily-card.panel',
        null,
        img(mapThumbUrl(d.map), d.map.name, 'thumb'),
        h(
          'div.daily-main',
          null,
          h('small', null, t('daily.today', { date: today })),
          h('h3', null, d.map.name),
          h('p', null, t('daily.waves', { n: d.waves })),
          h('div.chips', null, ...chips),
          h('p.daily-best', null, best ? t('daily.best', { n: formatNumber(best) }) : t('daily.noBest')),
          h('button.btn.green.big', { onClick: () => nav.playDaily() }, t('daily.play')),
        ),
      ),
      history.length ? h('section.panel.daily-history', null, h('h3.section', null, t('daily.history')), ...history) : null,
    );
  }

  back(): boolean {
    this.nav.title();
    return true;
  }
}
