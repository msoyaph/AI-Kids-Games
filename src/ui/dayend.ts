/** End-of-day earnings summary. */
import { tryItem } from '../data/items';
import { SEASON_NAMES, dayOfSeason, seasonOf, WEEKDAY_NAMES } from '../sim/state';
import type { DayReport } from '../sim/systems';
import { fmt, h } from './dom';
import { icon } from './icons';
import { iconName } from './itemview';

export function dayEndView(r: DayReport, nextDay: number, onDone: () => void): HTMLElement {
  const lines = h('div', { class: 'list' });
  if (r.shipped.length === 0) lines.appendChild(h('p', null, 'Nothing was shipped today. Put things in the shipping bin to earn coins overnight!'));
  for (const s of r.shipped) {
    lines.appendChild(
      h('div', { class: 'line' }, icon(iconName(s.id), 24), h('span', null, `${tryItem(s.id)?.name ?? s.id}${s.n > 1 ? ' ×' + s.n : ''}`), s.q ? icon(`ui.star${s.q}`, 16) : null, h('span', { class: 'v' }, fmt(s.v))),
    );
  }
  const notes = r.notes.map((n) => h('p', null, n));
  const lvl = r.levelUps.map((l) => h('p', { style: 'font-weight:700;color:#2c6a30' }, `⬆ ${l.skill[0].toUpperCase() + l.skill.slice(1)} reached level ${l.level}!`));
  const btn = h('button', { class: 'btn green primary', onclick: onDone }, 'Good morning!');
  return h(
    'div',
    { class: 'dayend panel', role: 'dialog', 'aria-label': 'Day summary' },
    h('h2', { style: 'margin:0' }, r.passedOut ? 'You dozed off!' : 'Day complete!'),
    r.passedOut ? h('p', null, 'You got so sleepy you nodded off. Good thing your pet nudged you home — nothing was lost!') : null,
    h('div', { style: 'display:flex;align-items:center;gap:6px;font-weight:700' }, icon('ui.coin', 24), 'Shipping'),
    lines,
    h('div', { class: 'total' }, `Total: ${fmt(r.total)} coins`),
    ...lvl,
    ...notes,
    h('p', { style: 'color:#6a5040' }, `Today is ${WEEKDAY_NAMES[nextDay % 5]}, ${SEASON_NAMES[seasonOf(nextDay)]} ${dayOfSeason(nextDay)}.`),
    h('div', { class: 'actions' }, btn),
  );
}
