import { DIFFICULTIES, DIFFICULTY_ORDER, starsFor, type Difficulty } from '../data/difficulty';
import { CAMPAIGN_MAPS, nextMap, TUTORIAL_MAP } from '../data/maps';
import type { MapDef } from '../data/maps/types';
import { mapsOfWorld, WORLDS } from '../data/worlds';
import { TOWERS } from '../data/towers';
import type { Game, GameMode } from '../sim/Game';
import { h, img } from '../ui/dom';
import { pipSays, showModal, starsHtml, type ModalHandle } from '../ui/modals';
import { mapThumbUrl } from '../ui/thumbs';
import type { App, Screen } from './App';
import { GameScreen } from './GameScreen';
import { Tutorial, TUTORIAL_WAVES } from './tutorial';
import { TitleScreen } from './screens/TitleScreen';
import { WorldMapScreen } from './screens/WorldMapScreen';

export interface Nav {
  title(): void;
  worlds(): void;
  endless(): void;
  tutorial(): void;
  encyclopedia(): void;
  badges(): void;
  settings(): void;
  briefing(map: MapDef, mode: GameMode): void;
  play(map: MapDef, diff: Difficulty, mode: GameMode): void;
  toast(msg: string): void;
  worldUnlocked(id: number): boolean;
  mapUnlocked(id: string): boolean;
  endlessUnlocked(): boolean;
}

/** Optional hooks that later systems (achievements, tutorial) plug into. */
export interface FlowHooks {
  /** Returns names of newly earned badges. */
  onRunEnd?(game: Game, won: boolean, mode: GameMode): string[];
  /** Attach extra behaviour to a running game screen (tutorial, trackers). */
  onGameStart?(screen: GameScreen, mode: GameMode): void;
  encyclopedia?(app: App, nav: Nav): Screen;
  badges?(app: App, nav: Nav): Screen;
  settings?(app: App, nav: Nav, back: () => void): Screen;
}

export function createNav(app: App, hooks: FlowHooks = {}): Nav {
  const save = app.save;
  let modal: ModalHandle | null = null;

  const closeModal = (): void => {
    modal?.close();
    modal = null;
  };

  const nav: Nav = {
    title: () => {
      closeModal();
      app.show(new TitleScreen(app, nav));
      app.audio.playMusic('title');
    },
    worlds: () => {
      closeModal();
      if (!save.data.tutorialDone && !sessionStorageFlag('tutorialOffered')) {
        app.show(new WorldMapScreen(app, nav));
        modal = showModal(app.ui, [
          pipSays('New here? I can show you how to play in my garden. It only takes a minute!'),
          h(
            'div.row',
            null,
            h('button.btn.green.big', { onClick: () => nav.tutorial() }, '🦊 Show me!'),
            h('button.btn.ghost', { onClick: () => closeModal() }, 'Skip'),
          ),
        ]);
        return;
      }
      app.show(new WorldMapScreen(app, nav));
      app.audio.playMusic('title');
    },
    endless: () => {
      closeModal();
      app.show(new EndlessScreen(app, nav));
    },
    tutorial: () => {
      closeModal();
      nav.play(TUTORIAL_MAP, 'easy', 'tutorial');
    },
    encyclopedia: () => {
      closeModal();
      if (hooks.encyclopedia) app.show(hooks.encyclopedia(app, nav));
    },
    badges: () => {
      closeModal();
      if (hooks.badges) app.show(hooks.badges(app, nav));
    },
    settings: () => {
      closeModal();
      if (hooks.settings) app.show(hooks.settings(app, nav, () => nav.title()));
    },
    briefing: (map, mode) => {
      closeModal();
      let diff: Difficulty = save.data.lastDifficulty;
      const diffRow = h('div.diff-row', { role: 'radiogroup', 'aria-label': 'Difficulty' });
      const render = (): void => {
        diffRow.replaceChildren();
        for (const d of DIFFICULTY_ORDER) {
          const def = DIFFICULTIES[d];
          const b = h(
            'button.btn',
            { class: d === diff ? 'gold' : '', role: 'radio', 'aria-checked': String(d === diff), onClick: () => ((diff = d), render(), (blurb.textContent = DIFFICULTIES[d].blurb)) },
            h('span', null, def.label),
            mode === 'campaign' ? starsHtml(save.stars(map.id, d)) : h('span.sub', null, `${def.lives} ❤`),
          );
          diffRow.append(b);
        }
      };
      const blurb = h('p', null, DIFFICULTIES[diff].blurb);
      render();
      const best = save.data.endlessBest[map.id];
      const actions = h(
        'div.row',
        null,
        h('button.btn.ghost', { onClick: () => closeModal() }, 'Back'),
        h(
          'button.btn.green.big',
          {
            onClick: () => {
              save.data.lastDifficulty = diff;
              save.save();
              nav.play(map, diff, mode);
            },
          },
          '▶ Play!',
        ),
      );
      modal = showModal(
        app.ui,
        [
          h('h2', null, mode === 'endless' ? `♾ ${map.name}` : map.name),
          h(
            'div.brief',
            null,
            h('div.brief-left', null, img(mapThumbUrl(map), map.name, 'thumb')),
            h(
              'div.brief-right',
              null,
              pipSays(mode === 'endless' ? `Waves never stop here! How far can you go?${best ? ` Your best: wave ${best}.` : ''}` : map.story),
              diffRow,
              blurb,
              actions,
            ),
          ),
        ],
        { onBackdrop: () => closeModal(), label: map.name, cls: 'wide' },
      );
    },
    play: (map, diff, mode) => {
      closeModal();
      const next = mode === 'campaign' ? nextMap(map.id) : null;
      const extra = mode === 'tutorial' ? { waves: TUTORIAL_WAVES, startCoins: 60, startCrystals: 0, autoWaves: false } : {};
      // ?seed=N replays a run exactly (handy for bug reports)
      const seed = Number(new URLSearchParams(location.search).get('seed')) || undefined;
      const screen: GameScreen = new GameScreen(
        app,
        { map, difficulty: diff, mode, seed, ...extra },
        {
          quit: () => (mode === 'endless' ? nav.endless() : mode === 'tutorial' ? nav.title() : nav.worlds()),
          restart: () => nav.play(map, diff, mode),
          next: next ? () => (nav.mapUnlocked(next.id) && nav.worldUnlocked(next.world) ? nav.briefing(next, 'campaign') : nav.worlds()) : undefined,
          onEnd: (game, won) => recordRun(app, game, won, mode, hooks),
        },
      );
      app.show(screen);
      if (mode === 'tutorial')
        new Tutorial(screen, () => {
          save.data.tutorialDone = true;
          save.flush();
          app.achievements.checkEnd(null, false, null);
          nav.title();
        });
      hooks.onGameStart?.(screen, mode);
      if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__game = screen;
    },
    toast: (msg) => {
      const t = h('div.toast', { role: 'status', style: { bottom: 'calc(var(--safe-bottom) + 24px)' } }, msg);
      app.ui.append(t);
      setTimeout(() => t.remove(), 1800);
    },
    worldUnlocked: (id) => {
      const w = WORLDS.find((x) => x.id === id);
      if (!w) return false;
      if (save.totalStars() >= w.starsToUnlock) return true;
      // Always allow the next world once the previous one is fully cleared.
      const prev = mapsOfWorld(id - 1);
      return prev.length > 0 && prev.every((m) => save.isCompleted(m.id)) && save.totalStars() >= w.starsToUnlock - 3;
    },
    mapUnlocked: (id) => {
      const i = CAMPAIGN_MAPS.findIndex((m) => m.id === id);
      if (i < 0) return false;
      const m = CAMPAIGN_MAPS[i]!;
      const first = CAMPAIGN_MAPS.findIndex((x) => x.world === m.world);
      return i === first || save.isCompleted(CAMPAIGN_MAPS[i - 1]!.id);
    },
    endlessUnlocked: () => mapsOfWorld(1).every((m) => save.isCompleted(m.id)),
  };
  return nav;
}

function sessionStorageFlag(key: string): boolean {
  // Only nag once per session; works even when storage is blocked.
  const g = globalThis as unknown as Record<string, boolean>;
  if (g[`__vanex_${key}`]) return true;
  g[`__vanex_${key}`] = true;
  return false;
}

/** Persist progress after a run. Returns info for the result screen. */
function recordRun(app: App, game: Game, won: boolean, mode: GameMode, hooks: FlowHooks): { newBest?: boolean; badges?: string[] } {
  const save = app.save;
  const d = save.data;
  const life = d.lifetime;
  life.kills += game.stats.kills;
  life.bossKills += game.stats.bossKills;
  life.towersBuilt += game.stats.towersBuilt;
  for (const t of game.stats.towerTypes) if (TOWERS[t].kind === 'combo' && !life.combos.includes(t)) life.combos.push(t);
  let newBest = false;
  if (mode === 'campaign' && won) {
    life.wins++;
    save.recordWin(game.map.id, game.diff.id, starsFor(game.lives, game.maxLives));
  }
  if (mode === 'tutorial' && won) d.tutorialDone = true;
  if (mode === 'endless') {
    const reached = game.waveNum;
    if (reached > (d.endlessBest[game.map.id] ?? 0)) {
      d.endlessBest[game.map.id] = reached;
      newBest = true;
    }
  }
  const badges = hooks.onRunEnd?.(game, won, mode) ?? [];
  save.flush();
  return { newBest, badges };
}

/** Pick a cleared map to play forever. */
class EndlessScreen implements Screen {
  readonly el: HTMLElement;
  constructor(app: App, private readonly nav: Nav) {
    const save = app.save;
    const grid = h('div.maps', { style: 'display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px' });
    for (const m of CAMPAIGN_MAPS) {
      const ok = save.isCompleted(m.id);
      const best = save.data.endlessBest[m.id];
      grid.append(
        h(
          'button.mapbtn',
          { disabled: !ok, onClick: () => nav.briefing(m, 'endless'), 'aria-label': `${m.name}${ok ? '' : ' (locked)'}` },
          img(mapThumbUrl(m), '', 'thumb'),
          h('span.mname', null, ok ? m.name : '🔒 Win it first'),
          h('span', { style: 'font-size:13px;font-weight:800' }, best ? `Best: wave ${best}` : ok ? 'No record yet' : ''),
        ),
      );
    }
    this.el = h(
      'div.screen.menu',
      null,
      h('div.topbar', null, h('button.btn.round', { onClick: () => nav.title(), 'aria-label': 'Back' }, '←'), h('h2', null, '♾ Endless')),
      h('p', { style: 'margin:0 0 12px;font-size:16px' }, 'Creatures keep coming and get stronger every wave. How far can you go?'),
      grid,
    );
  }
  back(): boolean {
    this.nav.title();
    return true;
  }
}
