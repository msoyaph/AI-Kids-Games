import { DIFFICULTIES, DIFFICULTY_ORDER, starsFor, type Difficulty } from '../data/difficulty';
import { CAMPAIGN_MAPS, nextMap, TUTORIAL_MAP } from '../data/maps';
import type { MapDef } from '../data/maps/types';
import { mapsOfWorld, WORLDS } from '../data/worlds';
import { TOWERS } from '../data/towers';
import { t, type MessageKey } from '../i18n';
import { bonusesFrom } from '../data/research';
import { dailyFor, dailyScore, dateKey, MODIFIER_IDS, type ModifierId, type MutatorId } from '../data/modes';
import { TUNING } from '../data/tuning';
import { buildWaves, type WaveDef } from '../data/waves';
import { ResearchScreen } from './screens/ResearchScreen';
import { WorkshopScreen } from './screens/WorkshopScreen';
import { WorkshopEditor } from './screens/WorkshopEditor';
import { DailyScreen } from './screens/DailyScreen';
import type { RunResult } from './GameScreen';
import { HERO_IDS, HEROES } from '../data/heroes';
import { atlasIconUrl, heroTexName } from '../render/atlas/bake';
import { chosenHero, heroUnlocked, unlockedAbilities } from './unlocks';
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
  research(): void;
  daily(): void;
  workshop(): void;
  workshopEdit(slot: number): void;
  playWorkshop(map: MapDef): void;
  playDaily(): void;
  dailyUnlocked(): boolean;
  briefing(map: MapDef, mode: GameMode): void;
  play(map: MapDef, diff: Difficulty, mode: GameMode, modifiers?: ModifierId[]): void;
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

  /** Start any run: campaign, endless, tutorial or the daily challenge. */
  const startRun = (map: MapDef, diff: Difficulty, mode: GameMode, modifiers: ModifierId[], mutators: MutatorId[], fixedSeed: number | undefined, waves: WaveDef[] | undefined): void => {
    closeModal();
    const next = mode === 'campaign' ? nextMap(map.id) : null;
    const extra =
      mode === 'tutorial'
        ? { waves: TUTORIAL_WAVES, startCoins: 60, startCrystals: 0, autoWaves: false }
        : { hero: chosenHero(save.data), abilities: unlockedAbilities(save.data), bonuses: bonusesFrom(save.data.research), modifiers, mutators, waves };
    // ?seed=N replays a run exactly (handy for bug reports)
    const seed = fixedSeed ?? (Number(new URLSearchParams(location.search).get('seed')) || undefined);
    const screen: GameScreen = new GameScreen(
      app,
      { map, difficulty: diff, mode, seed, ...extra },
      {
        quit: () =>
          mode === 'endless' ? nav.endless() : mode === 'tutorial' ? nav.title() : mode === 'daily' ? nav.daily() : mode === 'workshop' ? nav.workshop() : nav.worlds(),
        restart: () => (mode === 'daily' ? nav.playDaily() : startRun(map, diff, mode, modifiers, mutators, fixedSeed, waves)),
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
          pipSays(t('flow.offerTraining')),
          h(
            'div.row',
            null,
            h('button.btn.green.big', { onClick: () => nav.tutorial() }, t('flow.startTraining')),
            h('button.btn.ghost', { onClick: () => closeModal() }, t('common.skip')),
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
    research: () => {
      closeModal();
      app.show(new ResearchScreen(app, nav));
    },
    workshop: () => {
      closeModal();
      app.show(new WorkshopScreen(app, nav));
    },
    workshopEdit: (slot) => {
      closeModal();
      app.show(new WorkshopEditor(app, nav, slot));
    },
    playWorkshop: (map) => {
      closeModal();
      startRun(map, save.data.lastDifficulty, 'workshop', [], [], undefined, undefined);
    },
    daily: () => {
      closeModal();
      app.show(new DailyScreen(app, nav));
    },
    dailyUnlocked: () => Object.values(save.data.maps).some((m) => Object.values(m.stars).some((n) => (n ?? 0) > 0)),
    playDaily: () => {
      closeModal();
      const d = dailyFor(dateKey());
      startRun(d.map, 'normal', 'daily', d.modifiers, d.mutators, d.seed, buildWaves(d.map).slice(0, d.waves));
    },
    settings: () => {
      closeModal();
      if (hooks.settings) app.show(hooks.settings(app, nav, () => nav.title()));
    },
    briefing: (map, mode) => {
      closeModal();
      let diff: Difficulty = save.data.lastDifficulty;
      const diffRow = h('div.diff-row', { role: 'radiogroup', 'aria-label': t('brief.difficulty') });
      const render = (): void => {
        diffRow.replaceChildren();
        for (const d of DIFFICULTY_ORDER) {
          const def = DIFFICULTIES[d];
          const b = h(
            'button.btn',
            { class: d === diff ? 'gold' : '', role: 'radio', 'aria-checked': String(d === diff), onClick: () => ((diff = d), render(), (blurb.textContent = DIFFICULTIES[d].blurb)) },
            h('span', null, def.label),
            mode === 'campaign' ? starsHtml(save.stars(map.id, d)) : h('span.sub', null, t('brief.lives', { n: def.lives })),
          );
          diffRow.append(b);
        }
      };
      const blurb = h('p', null, DIFFICULTIES[diff].blurb);
      render();
      // commander picker (locked ones point to research)
      const heroRow = h('div.hero-row', { role: 'radiogroup', 'aria-label': t('hero.pick') });
      const renderHeroes = (): void => {
        const cur = chosenHero(save.data);
        heroRow.replaceChildren(
          h('span.hero-row-label', null, t('hero.pick')),
          ...HERO_IDS.map((id) => {
            const def = HEROES[id];
            const ok = heroUnlocked(save.data, id);
            return h(
              'button.hero-pick',
              {
                class: id === cur ? 'on' : ok ? '' : 'locked',
                role: 'radio',
                'aria-checked': String(id === cur),
                disabled: !ok,
                title: ok ? `${def.name} · ${def.role}: ${def.blurb}` : t('hero.locked'),
                'aria-label': ok ? `${def.name}, ${def.role}` : `${def.name} (${t('hero.locked')})`,
                onClick: () => {
                  save.data.hero = id;
                  save.save();
                  renderHeroes();
                },
              },
              img(atlasIconUrl(app.atlas, heroTexName(id), 96), def.name),
              h('span', null, def.name),
            );
          }),
        );
      };
      renderHeroes();
      // challenge modifiers (campaign): each one earns a medal when you win on Normal or harder
      const mods = new Set<ModifierId>();
      const medals = save.medals(map.id);
      const modRow = h('div.mod-row', { role: 'group', 'aria-label': t('modifier.title') });
      const renderMods = (): void => {
        modRow.replaceChildren(
          h('span.hero-row-label', null, t('modifier.title')),
          ...MODIFIER_IDS.map((m) =>
            h(
              'button.mod-chip',
              {
                class: `${mods.has(m) ? 'on' : ''} ${medals.includes(m) ? 'medal' : ''}`,
                'aria-pressed': String(mods.has(m)),
                title: t(`modifier.${m}.desc` as MessageKey),
                onClick: () => {
                  if (mods.has(m)) mods.delete(m);
                  else mods.add(m);
                  renderMods();
                },
              },
              t(`modifier.${m}` as MessageKey),
            ),
          ),
          h('p.note', null, t('modifier.help')),
        );
      };
      renderMods();
      const best = save.data.endlessBest[map.id];
      const actions = h(
        'div.row',
        null,
        h('button.btn.ghost', { onClick: () => closeModal() }, t('common.back')),
        h(
          'button.btn.green.big',
          {
            onClick: () => {
              save.data.lastDifficulty = diff;
              save.save();
              nav.play(map, diff, mode, mode === 'campaign' ? [...mods] : []);
            },
          },
          t('brief.deploy'),
        ),
      );
      modal = showModal(
        app.ui,
        [
          h('h2', null, mode === 'endless' ? t('brief.endlessTitle', { name: map.name }) : map.name),
          h(
            'div.brief',
            null,
            h('div.brief-left', null, img(mapThumbUrl(map), map.name, 'thumb')),
            h(
              'div.brief-right',
              null,
              pipSays(mode === 'endless' ? `${t('brief.endlessStory')} ${t('endless.mutatorsEvery')}${best ? ' ' + t('brief.endlessBest', { n: best }) : ''}` : map.story),
              diffRow,
              blurb,
              mode === 'tutorial' ? null : heroRow,
              mode === 'campaign' ? modRow : null,
              actions,
            ),
          ),
        ],
        { onBackdrop: () => closeModal(), label: map.name, cls: 'wide' },
      );
    },
    play: (map, diff, mode, modifiers = []) => {
      closeModal();
      startRun(map, diff, mode, modifiers, [], undefined, undefined);
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
function recordRun(app: App, game: Game, won: boolean, mode: GameMode, hooks: FlowHooks): RunResult {
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
  let medals: string[] = [];
  if (mode === 'campaign' && won && game.modifiers.length && DIFFICULTY_ORDER.indexOf(game.diff.id) >= DIFFICULTY_ORDER.indexOf(TUNING.modifiers.medalMinDifficulty)) {
    medals = save.addMedals(game.map.id, game.modifiers);
  }
  let dailyScoreValue: number | undefined;
  let dailyBest: number | undefined;
  if (mode === 'daily') {
    const key = dateKey();
    const cleared = won ? game.waveNum : Math.max(0, game.waveNum - 1);
    dailyScoreValue = dailyScore(cleared, game.lives, won);
    const prev = d.daily[key] ?? 0;
    if (dailyScoreValue > prev) {
      d.daily[key] = dailyScoreValue;
      newBest = true;
    }
    dailyBest = Math.max(prev, dailyScoreValue);
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
  return { newBest, badges, medals, dailyScore: dailyScoreValue, dailyBest };
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
          { disabled: !ok, onClick: () => nav.briefing(m, 'endless'), 'aria-label': ok ? m.name : t('endless.locked', { name: m.name }) },
          img(mapThumbUrl(m), '', 'thumb'),
          h('span.mname', null, ok ? m.name : t('endless.winFirst')),
          h('span', { style: 'font-size:13px;font-weight:800' }, best ? t('endless.best', { n: best }) : ok ? t('endless.noRecord') : ''),
        ),
      );
    }
    this.el = h(
      'div.screen.menu',
      null,
      h('div.topbar', null, h('button.btn.round', { onClick: () => nav.title(), 'aria-label': t('common.back') }, '←'), h('h2', null, t('endless.title'))),
      h('p', { style: 'margin:0 0 12px;font-size:16px' }, t('endless.intro')),
      grid,
    );
  }
  back(): boolean {
    this.nav.title();
    return true;
  }
}
