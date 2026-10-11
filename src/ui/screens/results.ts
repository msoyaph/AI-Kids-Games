import type { App } from '../../game/app';
import type { SessionResult } from '../../game/session';
import { findRacer } from '../../data/racers';
import { findTrack } from '../../data/tracks/index';
import { findArena } from '../../data/arenas';
import { formatTime, ordinal } from '../../core/math';
import { KART_COLORS } from '../minimap';
import { replayScreen } from './replay';
import { button, h, type Screen } from '../ui';
import { TROPHY_SVG } from '../icons';
import type { UnlockRef } from '../../data/types';
import { BODIES, DECALS, GLIDERS, PAINTS, WHEELS } from '../../data/parts';
import { ARENAS } from '../../data/arenas';
import { findCup } from '../../data/cups';
import type { Medal } from '../../sim/rules';

export interface ResultsExtra {
  title?: string;
  /** GP / custom cup: points this race and standings. */
  points?: number[];
  standings?: Array<{ id: number; points: number }>;
  raceNo?: number;
  races?: number;
  notes?: string[];
  buttons: Array<{ label: string; cls?: string; action: () => void }>;
}

function nameOf(r: SessionResult, idx: number): string {
  const res = r.results.find((x) => x.index === idx)!;
  const base = findRacer(res.racerId).name;
  return res.player >= 0 && r.config.players.length > 1 ? `${base} (P${res.player + 1})` : base;
}

export function resultsScreen(app: App, r: SessionResult, extra: ResultsExtra): Screen {
  const battle = r.config.mode === 'battle';
  const course = battle ? findArena(r.config.arenaId ?? '').name : findTrack(r.config.trackId ?? '').name;
  const table = h('table', { class: 'table' });
  for (const res of r.results) {
    const isMe = res.player >= 0;
    const time = battle ? `${r.config.battleRule === 'coins' ? '🪙' : '★'} ${res.score}` : res.projected ? '—' : formatTime(res.finishTime);
    const pts = extra.points ? h('span', { class: 'pts-add' }, `+${extra.points[res.index]}`) : null;
    table.appendChild(
      h('tr', { class: isMe ? 'me' : '' }, h('td', null, ordinal(res.rank)), h('td', null, h('span', { class: 'dot', style: `background:${KART_COLORS[res.index % KART_COLORS.length]}` }), nameOf(r, res.index)), h('td', null, time, pts)),
    );
  }
  const cols: HTMLElement[] = [h('div', { class: 'panel scroll', style: 'flex:1;min-width:0;max-height:100%' }, h('div', { style: 'font-weight:900;margin-bottom:6px' }, extra.raceNo ? `Race ${extra.raceNo}/${extra.races}: ${course}` : course), table)];
  if (extra.standings) {
    const st = h('table', { class: 'table' });
    extra.standings.forEach((s, i) => {
      const res = r.results.find((x) => x.index === s.id)!;
      st.appendChild(h('tr', { class: res.player >= 0 ? 'me' : '' }, h('td', null, ordinal(i + 1)), h('td', null, h('span', { class: 'dot', style: `background:${KART_COLORS[s.id % KART_COLORS.length]}` }), nameOf(r, s.id)), h('td', null, `${s.points} pts`)));
    });
    cols.push(h('div', { class: 'panel scroll', style: 'flex:1;min-width:0;max-height:100%' }, h('div', { style: 'font-weight:900;margin-bottom:6px' }, 'Cup standings'), st));
  }
  const notes = (extra.notes ?? []).map((n) => h('div', { class: 'hint', style: 'color:#ffe45c;font-size:clamp(14px,2.4vh,18px)' }, n));
  const btns = h('div', { class: 'menu-row', style: 'justify-content:flex-end' }, ...extra.buttons.map((b) => button(b.label, b.action, b.cls ?? '')));
  // Instant replay of the race that just finished (kept in memory only)
  if ((app.session?.replayRec?.frames ?? 0) > 30) {
    btns.insertBefore(
      button('Replay 🎬', () => {
        const rs = replayScreen(app, () => app.ui.show(self));
        if (rs) app.ui.show(rs);
      }, 'small'),
      btns.firstChild,
    );
  }
  const me = r.results.find((x) => x.player === 0)!;
  const headline = extra.title ?? (battle ? (me.rank === 1 ? 'You win the battle!' : `${ordinal(me.rank)} place!`) : me.rank === 1 ? 'Victory!' : me.rank <= 3 ? `${ordinal(me.rank)} place — great race!` : `${ordinal(me.rank)} place`);
  const el = h(
    'div',
    { class: 'dim', style: 'gap:10px' },
    h('div', { class: 'topbar' }, h('div', { class: 'title-h' }, headline)),
    ...notes,
    h('div', { style: 'flex:1;display:flex;gap:12px;min-height:0;flex-wrap:wrap' }, ...cols),
    btns,
  );
  const first = (btns.querySelector('.yellow[data-nav]') ?? btns.querySelector('[data-nav]')) as HTMLElement | null;
  const self: Screen = { el, focus: first, onBack: () => extra.buttons[extra.buttons.length - 1]?.action() };
  return self;
}

const MEDAL_TEXT: Record<Medal, string> = { gold: 'GOLD TROPHY!', silver: 'SILVER TROPHY!', bronze: 'BRONZE TROPHY!' };
const MEDAL_COLOR: Record<Medal, string> = { gold: '#ffd23f', silver: '#d9dee8', bronze: '#d98a5f' };

export function podiumScreen(app: App, cupName: string, place: number, medal: Medal | null, top: Array<{ racerId: string; cfg: import('../../data/types').KartConfig }>, onDone: () => void): Screen {
  app.menu.setView('podium');
  app.menu.showPodium(top);
  app.audio.ui(medal ? 'fanfare' : 'cheer');
  app.audio.playMusic('podium');
  const big = medal ? h('div', { class: 'unlock-card panel' }, h('div', { class: 'trophy', style: 'width:72px;height:72px', html: TROPHY_SVG(MEDAL_COLOR[medal]) }), h('div', { class: 'burst', style: `color:${MEDAL_COLOR[medal]}` }, MEDAL_TEXT[medal]), h('div', null, `${cupName} · ${ordinal(place)} place`)) : h('div', { class: 'unlock-card panel' }, h('div', { class: 'burst', style: 'color:#fff' }, `${ordinal(place)} place`), h('div', null, `${cupName} — finish in the top 3 for a trophy!`));
  const el = h('div', { style: 'align-items:center;justify-content:flex-end;gap:12px' }, big, button('Continue ▶', onDone, 'big yellow'));
  return { el, onBack: onDone };
}

export function describeUnlock(ref: UnlockRef): { title: string; name: string } {
  switch (ref.kind) {
    case 'racer':
      return { title: 'NEW RACER!', name: findRacer(ref.id).name };
    case 'body':
      return { title: 'NEW KART BODY!', name: BODIES.find((b) => b.id === ref.id)?.name ?? ref.id };
    case 'wheels':
      return { title: 'NEW WHEELS!', name: WHEELS.find((b) => b.id === ref.id)?.name ?? ref.id };
    case 'glider':
      return { title: 'NEW GLIDER!', name: GLIDERS.find((b) => b.id === ref.id)?.name ?? ref.id };
    case 'paint':
      return { title: 'NEW PAINT!', name: PAINTS.find((b) => b.id === ref.id)?.name ?? ref.id };
    case 'decal':
      return { title: 'NEW DECAL!', name: DECALS.find((b) => b.id === ref.id)?.name ?? ref.id };
    case 'arena':
      return { title: 'NEW BATTLE ARENA!', name: ARENAS.find((a) => a.id === ref.id)?.name ?? ref.id };
    case 'cup':
      return { title: 'NEW CUP!', name: findCup(ref.id).name };
    case 'class':
      return { title: 'NEW SPEED CLASS!', name: ref.id === 'mirror' ? 'Mirror Mode' : 'Champion' };
  }
}

/** Show queued "NEW!" unlock pop-ups one after another, then continue. */
export function showUnlocks(app: App, then: () => void): void {
  const next = app.save.newUnlocks.shift();
  if (!next) {
    app.saves.markDirty();
    then();
    return;
  }
  const d = describeUnlock(next);
  app.audio.ui('unlock');
  if (next.kind === 'racer') {
    app.menu.setView('showcase');
    app.menu.showKart(next.id, { ...findRacer(next.id).defaultKart, paint: 'cherry', decal: 'none' });
  }
  const el = h('div', { class: 'unlock-card panel' }, h('div', { class: 'burst' }, d.title), h('div', { style: 'font-size:clamp(22px,4vh,34px);font-weight:900;margin:8px 0 14px' }, d.name), button('Awesome!', () => {
    app.ui.closeOverlay(false);
    showUnlocks(app, then);
  }, 'big yellow'));
  app.ui.showOverlay({ el, onBack: () => {
    app.ui.closeOverlay(false);
    showUnlocks(app, then);
  } });
}
