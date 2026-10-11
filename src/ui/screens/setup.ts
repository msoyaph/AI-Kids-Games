import type { App } from '../../game/app';
import { RACERS, findRacer } from '../../data/racers';
import { BODIES, DECALS, GLIDERS, PAINTS, WHEELS, findPaint } from '../../data/parts';
import { CUPS, findCup } from '../../data/cups';
import { findTrack } from '../../data/tracks/index';
import { ARENAS } from '../../data/arenas';
import { ITEM_SETS, type ItemSet } from '../../data/items';
import type { KartConfig, Stats, SpeedClass } from '../../data/types';
import { kartStats } from '../../sim/factory';
import { SPEED_CLASSES } from '../../sim/tuning';
import { formatTime } from '../../core/math';
import { button, h, hex, type Screen } from '../ui';
import { cupLocked, cupProgress } from './menus';
import { unlockHint } from './unlockHints';
import { staffGhost } from '../../game/modes/timeTrial';

const STAT_NAMES: Array<[keyof Stats, string]> = [
  ['speed', 'Speed'],
  ['accel', 'Acceleration'],
  ['handling', 'Handling'],
  ['weight', 'Weight'],
  ['traction', 'Traction'],
];

export function statsBlock(stats: Stats, compare?: Stats): HTMLElement {
  const el = h('div', { class: 'stats' });
  for (const [k, name] of STAT_NAMES) {
    const v = stats[k];
    const c = compare?.[k];
    const cls = c === undefined || c === v ? '' : v > c ? 'delta-up' : 'delta-down';
    el.append(h('div', null, name), h('div', { class: 'bar' }, h('i', { class: cls, style: `width:${(v / 10) * 100}%` })));
  }
  return el;
}

// ---------------------------------------------------------------------------
// Racer select
// ---------------------------------------------------------------------------
export function racerSelectScreen(app: App, player: number, next: () => void): Screen {
  app.menu.setView('showcase');
  app.menu.offsetX = 3.4;
  const s = app.save;
  let current = app.flow.racers[player] ?? s.racer;
  if (!s.unlocks.racers.includes(current)) current = s.unlocks.racers[0];
  const kart = (): KartConfig => (player === 0 ? s.kart : app.kartFor(1));
  const info = h('div', { class: 'panel menu-col', style: 'width:min(360px,40vw);min-width:220px' });
  const grid = h('div', { class: 'grid scroll', style: 'grid-template-columns:repeat(auto-fill,minmax(clamp(74px,11vw,104px),1fr));flex:1;min-height:0;align-content:start;padding:4px' });
  const cards = new Map<string, HTMLButtonElement>();
  const show = (id: string): void => {
    const r = findRacer(id);
    const locked = !s.unlocks.racers.includes(id);
    app.menu.showKart(id, { ...kart(), paint: locked ? kart().paint : kart().paint });
    info.innerHTML = '';
    info.append(
      h('div', { style: 'font-size:clamp(20px,3.6vh,30px);font-weight:900;color:' + hex(r.color) }, r.name),
      h('div', { class: 'hint' }, `${r.weight[0].toUpperCase()}${r.weight.slice(1)} · ${r.kind}`),
      h('div', { style: 'font-size:clamp(12px,2vh,15px);font-weight:700' }, locked ? `🔒 ${unlockHint({ kind: 'racer', id })}` : r.bio),
      statsBlock(kartStats(id, kart())),
    );
  };
  for (const r of RACERS) {
    const locked = !s.unlocks.racers.includes(r.id);
    const card = button(
      h('div', { class: 'card', style: 'padding:4px' }, h('div', { class: 'swatch', style: `background:${locked ? '#555' : `linear-gradient(135deg, ${hex(r.color)}, ${hex(r.color2)})`}` }), h('div', { class: 'label' }, locked ? '???' : r.name), locked ? h('div', { class: 'lock' }, '🔒') : null),
      () => {
        if (locked) {
          app.audio.ui('error');
          show(r.id);
          return;
        }
        current = r.id;
        app.flow.racers[player] = r.id;
        if (player === 0) {
          s.racer = r.id;
          app.saves.markDirty();
        } else app.flow.karts[1] = { ...r.defaultKart, paint: 'ocean', decal: 'none' };
        next();
      },
      'small',
    );
    card.addEventListener('pointerenter', () => show(r.id));
    card.addEventListener('focusin', () => show(r.id));
    if (locked) card.classList.add('locked');
    cards.set(r.id, card);
    grid.appendChild(card);
  }
  // keyboard/gamepad focus changes preview too
  const obs = new MutationObserver(() => {
    for (const [id, c] of cards) if (c.classList.contains('focus') && id !== current) {
      current = id;
      show(id);
    }
  });
  obs.observe(grid, { subtree: true, attributes: true, attributeFilter: ['class'] });
  show(current);
  const title = app.flow.players === 2 ? `Player ${player + 1}: choose your racer` : 'Choose your racer';
  const el = h(
    'div',
    { class: 'dim' },
    h('div', { class: 'topbar' }, h('div', { class: 'title-h' }, title), h('div', { class: 'spacer' }), player === 0 ? button('🔧 Customize kart', () => app.screens.garage(() => app.screens.racerSelect(player, next)), 'small teal') : null),
    h('div', { style: 'flex:1;display:flex;gap:14px;min-height:0' }, h('div', { style: 'flex:1;display:flex;flex-direction:column;min-height:0;min-width:0' }, grid), info),
  );
  return {
    el,
    focus: cards.get(current),
    onBack: () => (player === 1 ? app.screens.racerSelect(0, () => app.screens.racerSelect(1, next)) : app.flow.mode === 'timeTrial' ? app.screens.mainMenu() : app.screens.players()),
    onExit: () => {
      obs.disconnect();
      app.menu.offsetX = 0;
    },
  };
}

// ---------------------------------------------------------------------------
// Garage
// ---------------------------------------------------------------------------
type GarageTab = 'body' | 'wheels' | 'glider' | 'paint' | 'decal';

export function garageScreen(app: App, back: () => void, tab: GarageTab = 'body'): Screen {
  app.menu.setView('garage');
  app.menu.offsetX = 3.2;
  const s = app.save;
  const before = kartStats(s.racer, s.kart);
  const preview = (): void => app.menu.showKart(s.racer, s.kart);
  preview();
  const statsHost = h('div');
  const refreshStats = (): void => {
    statsHost.innerHTML = '';
    statsHost.appendChild(statsBlock(kartStats(s.racer, s.kart), before));
  };
  refreshStats();
  const grid = h('div', { class: 'grid scroll', style: 'grid-template-columns:repeat(auto-fill,minmax(clamp(90px,13vw,130px),1fr));flex:1;min-height:0;align-content:start;padding:4px' });
  const tabs = h('div', { class: 'tabs' });
  const tabNames: Array<[GarageTab, string]> = [
    ['body', 'Body'],
    ['wheels', 'Wheels'],
    ['glider', 'Glider'],
    ['paint', 'Paint'],
    ['decal', 'Decal'],
  ];
  const renderTab = (t: GarageTab): void => {
    tab = t;
    tabs.innerHTML = '';
    for (const [id, name] of tabNames) tabs.appendChild(button(name, () => renderTab(id), `small ${id === t ? 'active' : ''}`));
    grid.innerHTML = '';
    const list: Array<{ id: string; name: string; unlocked: boolean; swatch: string }> =
      t === 'body'
        ? BODIES.map((b) => ({ id: b.id, name: b.name, unlocked: s.unlocks.bodies.includes(b.id), swatch: '' }))
        : t === 'wheels'
          ? WHEELS.map((b) => ({ id: b.id, name: b.name, unlocked: s.unlocks.wheels.includes(b.id), swatch: '' }))
          : t === 'glider'
            ? GLIDERS.map((b) => ({ id: b.id, name: b.name, unlocked: s.unlocks.gliders.includes(b.id), swatch: '' }))
            : t === 'paint'
              ? PAINTS.map((p) => ({ id: p.id, name: p.name, unlocked: s.unlocks.paints.includes(p.id), swatch: `linear-gradient(135deg, ${hex(p.color)} 50%, ${hex(p.color2)} 50%)` }))
              : DECALS.map((d) => ({ id: d.id, name: d.name, unlocked: s.unlocks.decals.includes(d.id), swatch: '' }));
    for (const it of list) {
      const selected = (s.kart as unknown as Record<string, string>)[t === 'glider' ? 'glider' : t] === it.id;
      const icon = it.swatch ? h('div', { class: 'swatch', style: `background:${it.swatch}` }) : h('div', { style: 'font-size:26px' }, t === 'body' ? '🏎' : t === 'wheels' ? '⚙️' : t === 'glider' ? '🪁' : '✨');
      const b = button(
        h('div', { class: 'card' }, icon, h('div', { class: 'label' }, it.unlocked ? it.name : '???'), !it.unlocked ? h('div', { class: 'lock' }, '🔒') : null, selected ? h('div', { class: 'badge' }, 'ON') : null),
        () => {
          if (!it.unlocked) {
            app.toast(`🔒 ${unlockHint({ kind: t === 'glider' ? 'glider' : t, id: it.id } as never)}`);
            app.audio.ui('error');
            return;
          }
          (s.kart as unknown as Record<string, string>)[t] = it.id;
          app.saves.markDirty();
          preview();
          refreshStats();
          renderTab(t);
        },
        'small',
      );
      if (!it.unlocked) b.classList.add('locked');
      grid.appendChild(b);
    }
  };
  renderTab(tab);
  const el = h(
    'div',
    { class: 'dim' },
    h('div', { class: 'topbar' }, h('div', { class: 'title-h' }, 'Garage'), h('div', { class: 'spacer' }), button('Done', back, 'small yellow')),
    tabs,
    h('div', { style: 'flex:1;display:flex;gap:14px;min-height:0;margin-top:8px' }, h('div', { style: 'flex:1;display:flex;flex-direction:column;min-height:0;min-width:0' }, grid), h('div', { class: 'panel', style: 'width:min(300px,34vw);min-width:200px;align-self:flex-start' }, h('div', { style: 'font-weight:900;margin-bottom:6px' }, findRacer(s.racer).name), statsHost, h('div', { class: 'hint', style: 'margin-top:8px' }, 'Green bars went up, orange bars went down.'))),
  );
  const order: GarageTab[] = ['body', 'wheels', 'glider', 'paint', 'decal'];
  return {
    el,
    onBack: back,
    onMenu: (a) => {
      if (a === 'tabNext' || a === 'tabPrev') {
        const i = order.indexOf(tab);
        renderTab(order[(i + (a === 'tabNext' ? 1 : order.length - 1)) % order.length]);
        return true;
      }
      return false;
    },
    onExit: () => (app.menu.offsetX = 0),
  };
}

// ---------------------------------------------------------------------------
// Cups and tracks
// ---------------------------------------------------------------------------
export function cupSelectScreen(app: App, onPick: (cupId: string) => void, onBack: () => void): Screen {
  app.menu.setView('title');
  const detail = h('div', { class: 'panel', style: 'min-height:120px' });
  const showCup = (id: string): void => {
    const c = findCup(id);
    detail.innerHTML = '';
    detail.append(
      h('div', { style: 'font-size:22px;font-weight:900;color:' + hex(c.color) }, c.name),
      cupLocked(app, id) ? h('div', { class: 'hint' }, `🔒 ${unlockHint({ kind: 'cup', id: c.id })}`) : h('ol', { style: 'margin:6px 0 0;padding-left:22px;font-weight:800' }, ...c.tracks.map((t) => h('li', null, findTrack(t).name))),
    );
  };
  const row = h('div', { class: 'grid', style: 'grid-template-columns:repeat(auto-fit,minmax(min(200px,42vw),1fr))' });
  let firstUnlocked: HTMLButtonElement | null = null;
  for (const c of CUPS) {
    const locked = cupLocked(app, c.id);
    const b = button(
      h('div', { class: 'card', style: 'min-height:clamp(80px,18vh,150px)' }, h('div', { class: 'swatch', style: `background:${hex(c.color)};width:clamp(46px,9vh,72px);height:clamp(46px,9vh,72px)` }), h('div', { class: 'label', style: 'font-size:clamp(15px,2.6vh,20px)' }, c.name), locked ? h('div', { class: 'lock' }, '🔒') : h('div', { class: 'trophy', html: cupProgress(app, c.id) })),
      () => {
        if (locked) {
          app.audio.ui('error');
          showCup(c.id);
          return;
        }
        onPick(c.id);
      },
    );
    if (locked) b.classList.add('locked');
    else firstUnlocked = firstUnlocked ?? b;
    b.addEventListener('pointerenter', () => showCup(c.id));
    b.addEventListener('click', () => showCup(c.id));
    row.appendChild(b);
  }
  showCup(app.flow.cupId);
  const cls = app.flow.mirror ? 'Mirror' : SPEED_CLASSES[app.flow.speedClass].name;
  const el = h('div', { class: 'dim', style: 'gap:12px' }, h('div', { class: 'title-h' }, 'Choose a cup', h('span', { class: 'sub' }, `· ${cls}`)), row, detail);
  return { el, onBack, focus: firstUnlocked };
}

export function trackSelectScreen(app: App, onPick: (trackId: string) => void, onBack: () => void, showRecords: boolean, allowRandom: boolean): Screen {
  app.menu.setView('title');
  let cup = app.flow.cupId;
  const tabs = h('div', { class: 'tabs' });
  const grid = h('div', { class: 'grid', style: 'grid-template-columns:repeat(auto-fit,minmax(min(200px,42vw),1fr));flex:1;align-content:start' });
  const unlockedCups = CUPS.filter((c) => !cupLocked(app, c.id));
  const render = (): void => {
    tabs.innerHTML = '';
    for (const c of CUPS) {
      const locked = cupLocked(app, c.id);
      const b = button(`${locked ? '🔒 ' : ''}${c.name}`, () => {
        if (locked) {
          app.toast(`🔒 ${unlockHint({ kind: 'cup', id: c.id })}`);
          return;
        }
        cup = c.id;
        render();
      }, `small ${c.id === cup ? 'active' : ''}`);
      tabs.appendChild(b);
    }
    grid.innerHTML = '';
    for (const id of findCup(cup).tracks) {
      const t = findTrack(id);
      const rec = app.save.records[id];
      const sub = showRecords ? `Best ${rec ? formatTime(rec.bestTime) : '—'}${rec?.beatStaff ? ' ⭐' : ''}` : t.feature;
      grid.appendChild(button(h('div', { class: 'card', style: 'align-items:flex-start;text-align:left' }, h('div', { style: 'font-size:clamp(15px,2.6vh,20px)' }, t.name), h('div', { class: 'hint' }, sub)), () => onPick(id)));
    }
    if (allowRandom) {
      grid.appendChild(
        button(h('div', { class: 'card' }, '🎲 Random track'), () => {
          const pool = unlockedCups.flatMap((c) => c.tracks);
          onPick(pool[Math.floor(Math.random() * pool.length)]);
        }, 'pink'),
      );
    }
  };
  render();
  const el = h('div', { class: 'dim', style: 'gap:10px' }, h('div', { class: 'title-h' }, 'Choose a track'), tabs, grid);
  return {
    el,
    onBack,
    onMenu: (a) => {
      if (a === 'tabNext' || a === 'tabPrev') {
        const i = unlockedCups.findIndex((c) => c.id === cup);
        cup = unlockedCups[(i + (a === 'tabNext' ? 1 : unlockedCups.length - 1)) % unlockedCups.length].id;
        render();
        return true;
      }
      return false;
    },
  };
}

// ---------------------------------------------------------------------------
// Option widgets
// ---------------------------------------------------------------------------
export function choice<T extends string | number | boolean>(label: string, options: Array<[T, string]>, get: () => T, set: (v: T) => void): HTMLElement {
  const row = h('div', { class: 'setting-row' }, h('div', null, label));
  const box = h('div', { class: 'menu-row', style: 'justify-content:flex-end' });
  const render = (): void => {
    box.innerHTML = '';
    for (const [v, name] of options) box.appendChild(button(name, () => (set(v), render()), `small ${get() === v ? 'active pink' : 'ghost'}`));
  };
  render();
  row.appendChild(box);
  return row;
}

export function vsOptionsScreen(app: App): Screen {
  app.menu.setView('title');
  const f = app.flow;
  const maxAi = f.players === 2 ? 6 : 7;
  f.vs.aiCount = Math.min(f.vs.aiCount, maxAi);
  const classes: Array<[string, string]> = (['rookie', 'pro', 'champion'] as SpeedClass[]).filter((c) => app.save.unlocks.classes.includes(c)).map((c) => [c, SPEED_CLASSES[c].name]);
  if (app.save.unlocks.classes.includes('mirror')) classes.push(['mirror', 'Mirror']);
  const panel = h(
    'div',
    { class: 'panel menu-col scroll', style: 'width:min(760px,100%);margin:0 auto;flex:1;min-height:0' },
    choice('Race', [[false, 'Single race'], [true, 'Custom cup (4 races)']], () => f.vs.cup, (v) => (f.vs.cup = v)),
    choice('Speed', classes, () => (f.mirror ? 'mirror' : f.speedClass), (v) => {
      f.mirror = v === 'mirror';
      f.speedClass = (v === 'mirror' ? 'champion' : v) as SpeedClass;
    }),
    choice('Items', [[true, 'On'], [false, 'Off']], () => f.vs.items, (v) => (f.vs.items = v)),
    choice('Item set', (Object.keys(ITEM_SETS) as ItemSet[]).map((k) => [k, ITEM_SETS[k].name] as [ItemSet, string]), () => f.vs.itemSet, (v) => (f.vs.itemSet = v)),
    choice('AI racers', Array.from({ length: maxAi + 1 }, (_, i) => [i, String(i)] as [number, string]), () => f.vs.aiCount, (v) => (f.vs.aiCount = v)),
    choice('Laps', [[1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5']], () => f.vs.laps, (v) => (f.vs.laps = v)),
  );
  const go = (): void => {
    if (f.vs.cup) app.screens.vsCupPick();
    else app.screens.trackSelect();
  };
  const el = h('div', { class: 'dim', style: 'gap:10px' }, h('div', { class: 'topbar' }, h('div', { class: 'title-h' }, 'Versus rules'), h('div', { class: 'spacer' }), button('Next ▶', go, 'yellow')), panel);
  return { el, onBack: () => app.screens.players() };
}

export function battleSetupScreen(app: App): Screen {
  app.menu.setView('title');
  const f = app.flow;
  const maxAi = f.players === 2 ? 6 : 7;
  f.battle.aiCount = Math.min(f.battle.aiCount, maxAi);
  const grid = h('div', { class: 'grid', style: 'grid-template-columns:repeat(auto-fit,minmax(min(190px,42vw),1fr))' });
  const render = (): void => {
    grid.innerHTML = '';
    for (const a of ARENAS) {
      const locked = !app.save.unlocks.arenas.includes(a.id);
      const b = button(h('div', { class: 'card' }, h('div', { style: 'font-size:clamp(15px,2.6vh,20px)' }, locked ? '🔒 ???' : a.name), h('div', { class: 'hint' }, locked ? unlockHint({ kind: 'arena', id: a.id }) : `${a.shape} arena`)), () => {
        if (locked) {
          app.audio.ui('error');
          return;
        }
        f.arenaId = a.id;
        render();
      }, f.arenaId === a.id ? 'pink' : '');
      if (locked) b.classList.add('locked');
      grid.appendChild(b);
    }
  };
  render();
  const start = (): void => app.screens.startBattle();
  const el = h(
    'div',
    { class: 'dim', style: 'gap:10px' },
    h('div', { class: 'topbar' }, h('div', { class: 'title-h' }, 'Balloon Battle'), h('div', { class: 'spacer' }), button('Start! ▶', start, 'yellow')),
    grid,
    h(
      'div',
      { class: 'panel menu-col' },
      choice('Time', [[120, '2 min'], [150, '2½ min'], [180, '3 min'], [240, '4 min']], () => f.battle.time, (v) => (f.battle.time = v)),
      choice('AI racers', Array.from({ length: maxAi }, (_, i) => [i + 1, String(i + 1)] as [number, string]), () => f.battle.aiCount, (v) => (f.battle.aiCount = v)),
      h('div', { class: 'hint' }, 'Hit rivals with items to pop their balloons. Each pop = 1 point. Run out of balloons? You get a fresh set!'),
    ),
  );
  return { el, onBack: () => app.screens.players() };
}

export function ttSetupScreen(app: App, trackId: string): Screen {
  app.menu.setView('title');
  const t = findTrack(trackId);
  const rec = app.save.records[trackId];
  const staff = staffGhost(trackId);
  const f = app.flow;
  if (!rec && (f.tt.ghost === 'best' || f.tt.ghost === 'both')) f.tt.ghost = 'staff';
  const opts: Array<[typeof f.tt.ghost, string]> = [['staff', 'Staff ghost']];
  if (rec) opts.unshift(['both', 'Both ghosts'], ['best', 'My best']);
  opts.push(['none', 'No ghost']);
  const el = h(
    'div',
    { class: 'dim', style: 'align-items:center;justify-content:center;gap:12px' },
    h('div', { class: 'title-h' }, t.name),
    h(
      'div',
      { class: 'panel menu-col', style: 'width:min(560px,92vw)' },
      h('div', { class: 'setting-row' }, h('div', null, 'Your best'), h('div', null, rec ? `${formatTime(rec.bestTime)} (lap ${formatTime(rec.bestLap)})` : '—')),
      h('div', { class: 'setting-row' }, h('div', null, 'Staff ghost'), h('div', null, `${formatTime(staff.time)} ${rec?.beatStaff ? '⭐ beaten!' : ''}`)),
      choice('Race against', opts, () => f.tt.ghost, (v) => (f.tt.ghost = v)),
      h('div', { class: 'hint' }, `You get 3 Turbo Cans. Tip: ${t.shortcuts[0]?.hint ?? 'Find the fastest line!'}`),
    ),
    button('Start! ▶', () => app.screens.startTimeTrial(trackId), 'big yellow'),
  );
  return { el, onBack: () => app.screens.trackSelect() };
}

export function paintName(id: string): string {
  return findPaint(id).name;
}
