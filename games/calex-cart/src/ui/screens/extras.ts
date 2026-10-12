import type { App } from '../../game/app';
import { RACERS } from '../../data/racers';
import { ITEMS } from '../../data/items';
import { CHALLENGES } from '../../data/challenges';
import { CUPS } from '../../data/cups';
import { findTrack } from '../../data/tracks/index';
import { BODIES, GLIDERS, WHEELS, DECALS, PAINTS } from '../../data/parts';
import { formatTime } from '../../core/math';
import { button, h, hex, type Screen } from '../ui';
import { ITEM_ICONS } from '../icons';
import { unlockHint } from './unlockHints';
import { describeUnlock } from './results';
import { staffGhost } from '../../game/modes/timeTrial';
import { challengeProgress } from '../../game/challenges';

type Tab = 'racers' | 'items' | 'parts';

export function collectionScreen(app: App, tab: Tab = 'racers'): Screen {
  app.menu.setView('title');
  const s = app.save;
  const tabs = h('div', { class: 'tabs' });
  const body = h('div', { class: 'grid scroll', style: 'grid-template-columns:repeat(auto-fill,minmax(min(260px,90vw),1fr));flex:1;min-height:0;align-content:start' });
  const order: Tab[] = ['racers', 'items', 'parts'];
  const render = (t: Tab): void => {
    tab = t;
    tabs.innerHTML = '';
    for (const [id, name] of [
      ['racers', 'Racers'],
      ['items', 'Items'],
      ['parts', 'Kart parts'],
    ] as Array<[Tab, string]>)
      tabs.appendChild(button(name, () => render(id), `small ${id === t ? 'active' : ''}`));
    body.innerHTML = '';
    if (t === 'racers') {
      for (const r of RACERS) {
        const un = s.unlocks.racers.includes(r.id);
        body.appendChild(
          h(
            'div',
            { class: 'panel', 'data-nav': '1', style: 'display:flex;gap:10px;align-items:flex-start' },
            h('div', { class: 'swatch', style: `flex:none;width:46px;height:46px;border-radius:50%;border:3px solid #fff;background:${un ? `linear-gradient(135deg,${hex(r.color)},${hex(r.color2)})` : '#555'}` }),
            h('div', null, h('div', { style: 'font-weight:900;font-size:18px' }, un ? r.name : '🔒 ???'), h('div', { class: 'hint' }, un ? `${r.weight} · ${r.personality}` : unlockHint({ kind: 'racer', id: r.id })), un ? h('div', { style: 'font-size:13px;font-weight:700;margin-top:4px' }, r.bio) : null),
          ),
        );
      }
    } else if (t === 'items') {
      for (const it of ITEMS) {
        body.appendChild(
          h(
            'div',
            { class: 'panel', 'data-nav': '1', style: 'display:flex;gap:10px;align-items:flex-start' },
            h('div', { style: 'flex:none;width:52px;height:52px', html: ITEM_ICONS[it.id] }),
            h('div', null, h('div', { style: 'font-weight:900;font-size:18px' }, it.name), h('div', { style: 'font-size:13px;font-weight:700' }, it.description), h('div', { class: 'hint', style: 'margin-top:4px;color:#4ce0d2' }, `Counter: ${it.counter}`)),
          ),
        );
      }
    } else {
      const groups: Array<[string, Array<{ id: string; name: string }>, keyof typeof s.unlocks, 'body' | 'wheels' | 'glider' | 'paint' | 'decal']> = [
        ['Bodies', BODIES, 'bodies', 'body'],
        ['Wheels', WHEELS, 'wheels', 'wheels'],
        ['Gliders', GLIDERS, 'gliders', 'glider'],
        ['Paints', PAINTS, 'paints', 'paint'],
        ['Decals', DECALS, 'decals', 'decal'],
      ];
      for (const [title, list, key, kind] of groups) {
        const have = list.filter((p) => (s.unlocks[key] as string[]).includes(p.id));
        body.appendChild(
          h(
            'div',
            { class: 'panel', 'data-nav': '1' },
            h('div', { style: 'font-weight:900;font-size:18px' }, `${title} ${have.length}/${list.length}`),
            ...list.map((p) => h('div', { class: 'hint' }, (s.unlocks[key] as string[]).includes(p.id) ? `✔ ${p.name}` : `🔒 ${unlockHint({ kind, id: p.id } as never)}`)),
          ),
        );
      }
    }
  };
  render(tab);
  const el = h('div', { class: 'dim', style: 'gap:10px' }, h('div', { class: 'topbar' }, h('div', { class: 'title-h' }, 'Collection'), h('div', { class: 'spacer' }), button('Back', () => app.screens.mainMenu(), 'small yellow')), tabs, body);
  return {
    el,
    onBack: () => app.screens.mainMenu(),
    onMenu: (a) => {
      if (a === 'tabNext' || a === 'tabPrev') {
        const i = order.indexOf(tab);
        render(order[(i + (a === 'tabNext' ? 1 : order.length - 1)) % order.length]);
        return true;
      }
      return false;
    },
  };
}

export function challengesScreen(app: App): Screen {
  app.menu.setView('title');
  const s = app.save;
  const done = CHALLENGES.filter((c) => s.challenges[c.id]?.done).length;
  const list = h('div', { class: 'grid scroll', style: 'grid-template-columns:repeat(auto-fill,minmax(min(300px,90vw),1fr));flex:1;min-height:0;align-content:start' });
  for (const c of CHALLENGES) {
    const st = s.challenges[c.id];
    const prog = challengeProgress(c, s);
    const reward = describeUnlock(c.reward);
    list.appendChild(
      h(
        'div',
        { class: 'panel', 'data-nav': '1', style: st?.done ? 'border-color:#8cff6b' : '' },
        h('div', { style: 'font-weight:900;font-size:17px' }, `${st?.done ? '✅ ' : ''}${c.name}`),
        h('div', { style: 'font-size:13px;font-weight:700' }, c.description),
        prog ? h('div', { class: 'bar', style: 'margin-top:6px' }, h('i', { style: `width:${Math.round(Math.min(1, prog.value / prog.target) * 100)}%` })) : null,
        h('div', { class: 'hint', style: 'margin-top:4px' }, `${prog ? `${Math.min(prog.value, prog.target)}/${prog.target} · ` : ''}Reward: ${reward.name}`),
      ),
    );
  }
  const el = h('div', { class: 'dim', style: 'gap:10px' }, h('div', { class: 'topbar' }, h('div', { class: 'title-h' }, 'Challenges', h('span', { class: 'sub' }, `${done}/${CHALLENGES.length} done`)), h('div', { class: 'spacer' }), button('Back', () => app.screens.mainMenu(), 'small yellow')), list);
  return { el, onBack: () => app.screens.mainMenu() };
}

export function recordsScreen(app: App): Screen {
  app.menu.setView('title');
  const s = app.save;
  const table = h('table', { class: 'table' });
  for (const cup of CUPS) {
    table.appendChild(h('tr', null, h('td', { colspan: '4', style: 'background:transparent;text-align:left;font-weight:900;padding-top:10px' }, cup.name)));
    for (const id of cup.tracks) {
      const r = s.records[id];
      const staff = s.unlocks.cups.includes(cup.id) ? staffGhost(id).time : NaN;
      table.appendChild(h('tr', null, h('td', null, r?.beatStaff ? '⭐' : ''), h('td', { style: 'text-align:left' }, findTrack(id).name), h('td', null, r ? `${formatTime(r.bestTime)} · lap ${formatTime(r.bestLap)}` : '—'), h('td', null, `Staff ${isNaN(staff) ? '🔒' : formatTime(staff)}`)));
    }
  }
  const el = h('div', { class: 'dim', style: 'gap:10px' }, h('div', { class: 'topbar' }, h('div', { class: 'title-h' }, 'Records'), h('div', { class: 'spacer' }), button('Back', () => app.screens.mainMenu(), 'small yellow')), h('div', { class: 'panel scroll', style: 'flex:1;min-height:0', 'data-nav': '1' }, table), h('div', { class: 'hint' }, 'Beat the staff ghost in Time Trial to earn a ⭐.'));
  return { el, onBack: () => app.screens.mainMenu() };
}
