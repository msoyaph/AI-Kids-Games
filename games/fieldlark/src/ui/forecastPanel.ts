/** The forecast card (tap the date): today and the next two days, and getting ready for wind. */
import { dayOfSeason, DAY_SEC, seasonName, seasonOf } from '../sim/clock';
import { EVENT_INFO, forecast, hayTied, tieHay } from '../sim/forecast';
import type { Farm } from '../sim/state';
import { fill, h } from './h';
import { icon, type IconName } from './icons';

export function forecastPanel(farm: Farm, changed: () => void, say: (t: string) => void): HTMLElement {
  const root = h('div.forecast');
  const render = () => {
    const days = forecast(farm, 3);
    fill(root,
      h('ul.forecast-days', null, ...days.map((d, i) => {
        const info = d.event ? EVENT_INFO[d.event] : null;
        const t = d.day * DAY_SEC + 1;
        const when = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `${seasonName(seasonOf(t))}, day ${dayOfSeason(t)}`;
        return h('li', null,
          icon((info?.icon ?? 'calm') as IconName, 44),
          h('div', null,
            h('small', null, when),
            h('b', null, info?.name ?? 'A calm day'),
            h('p', null, info?.text ?? 'Nothing special: a good day for farming.'),
            d.event === 'windy' ? (hayTied(farm, d.day)
              ? h('p.done-note', null, '✓ The hay is tied down.')
              : h('button.primary', { onclick: () => { if (tieHay(farm, d.day)) { say('The hay is tied down. The animals will be glad!'); changed(); render(); } } }, 'Tie down the hay')) : null));
      })),
      h('p.note', null, 'Weather on the farm only ever helps. Getting ready helps a little more.'));
  };
  render();
  return root;
}
