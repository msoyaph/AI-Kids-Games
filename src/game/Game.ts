import { DT } from '../config/balance';
import { bannerText, isMapId, mapDef, type MapId } from '../config/maps';
import { isDifficultyId, type DifficultyId } from '../config/difficulty';
import { dailySpec, utcDate } from '../meta/daily';
import { BANNER } from '../config/waves';
import { Ev } from '../core/events';
import { randomSeed } from '../core/rng';
import { urlParam } from '../core/env';
import { SafeLocalStore, type KeyValueStore } from '../core/storage';
import { mergeTuning, TUNING_DEFAULTS, xpToNextWith, type TuningGroup } from '../config/tuning';
import { TuningPanel } from '../ui/TuningPanel';
import { PlaytestStore, recordRun } from '../meta/playtest';
import { exportJson } from '../ui/exporter';
import { InputManager, type Captured, type UiAction } from '../input/InputManager';
import type { PadFamily } from '../input/actions';
import type { StdPad } from '../input/gamepad';
import { applyRunResult, checkAchievements, metaBonuses, summarize, type RunOutcome } from '../meta/progression';
import { SaveManager } from '../meta/save';
import { GameRenderer } from '../render/Renderer';
import { characterDef } from '../config/characters';
import { newRun } from '../sim/run';
import { closeChest, step } from '../sim/sim';
import { Terrain } from '../sim/terrain';
import { banish, reroll, resolveLevelUp } from '../sim/upgrades';
import { emptyInput, type UpgradeChoice, type World } from '../sim/world';
import { h } from '../ui/dom';
import { Menus, rewardText, type GameApi } from '../ui/menus';
import { UI } from '../ui/UI';
import { ENEMIES } from '../config/enemies';
import { enemyIconUrl } from '../ui/icons';
import { isTouchDevice, TouchControls } from '../input/touch';
import type { Quality as RenderQuality } from '../render/Renderer';
import { applyAccessClasses, reducedMotionOn, watchReducedMotion } from '../ui/access';

const MAX_STEPS_PER_FRAME = 5;
const TUNING_KEY = 'theabonk.tuning';

function unrecordedOutcome(): RunOutcome {
  return { gold: { coins: 0, kills: 0, time: 0, bosses: 0, victory: 0, total: 0 }, achievements: [], newBest: false, newMaps: [] };
}
const MENU_SEED = 1337;

export type SoundName = 'click' | 'buy' | 'error' | 'back' | 'open' | 'achievement';

/**
 * Application root: owns renderer, input, UI, save data and the active run.
 * Runs the fixed-timestep loop (60 Hz sim, interpolated rendering).
 */
export class Game implements GameApi {
  readonly renderer: GameRenderer;
  readonly input: InputManager;
  readonly ui: UI;
  readonly save: SaveManager;
  readonly menus: Menus;
  world: World | null = null;
  paused = false;
  /** Hook for the audio engine (set in main). */
  onSound: ((name: SoundName) => void) | null = null;
  /** Called every frame with the world events before they are cleared (audio). */
  onEvents: ((w: World) => void) | null = null;
  /** Called once per rendered frame (music scheduling). */
  onFrame: (() => void) | null = null;
  /** Called when entering/leaving a run (music). */
  onMode: ((mode: 'menu' | 'run' | 'paused' | 'end', w: World | null) => void) | null = null;

  private acc = 0;
  private last = 0;
  private simInput = emptyInput();
  private move = { x: 0, y: 0 };
  private look = { x: 0, y: 0 };
  private fwd = { x: 0, z: 0 };
  private lastWorldState: World['state'] = 'playing';
  private lockLostAt = -1e9;
  private achT = 0;
  /** Menu backdrops, built on first use per map. */
  private menuTerrains = new Map<MapId, Terrain>();
  private fpsEl: HTMLElement;
  // debug overlay
  private showDebug = false;
  private fpsFrames = 0;
  private fpsTime = 0;
  private fps = 0;
  private simMs = 0;
  private frameMs = 0;
  private debugT = 0;

  /** Live tuning panel (only with ?tune=1). */
  tuningPanel: TuningPanel | null = null;
  /** On-device playtest recorder (only with ?playtest=1). */
  playtest: PlaytestStore | null = null;
  private padFrames = 0;
  private kbFrames = 0;
  /** The boss banner line waiting for its intro card. */
  private bossLine = '';
  /** When the level-up picker opens (after the hit-stop); 0 = none pending. */
  private levelUpAt = 0;
  private touch: TouchControls;
  private touchDevice: boolean;
  private store: KeyValueStore;
  private tuneSaveT = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    overlay: HTMLCanvasElement,
    uiRoot: HTMLElement,
  ) {
    this.store = new SafeLocalStore();
    this.save = new SaveManager(this.store);
    // unlocks added since the save was written (e.g. heroes earned by past progress) apply now
    if (checkAchievements(this.save.data).length > 0) this.save.save();
    this.touchDevice = isTouchDevice();
    this.renderer = new GameRenderer(canvas, overlay, this.effectiveQuality());
    this.input = new InputManager(canvas);
    this.ui = new UI(uiRoot);
    // touch: on-screen controls, touch-sized menus, landscape only
    this.touch = new TouchControls(uiRoot);
    this.input.touch = this.touch;
    this.touch.onPause = () => this.onAction('pause');
    this.touch.onTouch = () => this.setTouchMode(true);
    uiRoot.append(h('div', { class: 'rotate-hint' }, h('div', { class: 'rotate-phone' }), h('div', null, 'Turn your device sideways to play')));
    this.setTouchMode(this.touchDevice);
    if (this.touchDevice && this.save.data.stats.runsPlayed === 0 && this.save.data.lastDifficulty === 'normal') {
      // first time on a phone / tablet: start gentle (the player can still pick Normal)
      this.save.data.lastDifficulty = 'relaxed';
    }
    this.menus = new Menus(this);
    this.fpsEl = h('div', { class: 'fps hidden' });
    uiRoot.append(this.fpsEl);
    this.showMenuMap(this.save.data.lastMap);
    this.input.onAction = (a) => this.onAction(a);
    this.input.uiKey = (e) => this.ui.handleKey(e);
    this.input.onLockFailed = () => this.ui.hud.toast('Mouse look', 'Pointer lock isn’t available here — hold a mouse button and drag to look.');
    watchReducedMotion(() => this.applySettings());
    this.applySettings();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    // pause when the tab / iframe loses focus
    window.addEventListener('blur', () => this.autoPause());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.autoPause();
    });
    document.addEventListener('pointerlockchange', () => {
      // a lock granted late (after a modal opened) must not trap the cursor
      if (this.input.pointerLocked && !this.input.gameplay) {
        this.input.releaseLock();
        return;
      }
      if (!this.input.pointerLocked && this.world && this.world.state === 'playing' && !this.paused) {
        this.lockLostAt = performance.now();
        this.pause();
      }
    });
    this.ui.escapeAllowed = () => performance.now() - this.lockLostAt > 300;
    if (urlParam('tune') === '1') this.initTuning(uiRoot);
    if (urlParam('playtest') === '1') {
      this.playtest = new PlaytestStore(this.store);
      uiRoot.append(h('div', { class: 'playtest-badge' }, '● PLAYTEST — recording on this device only'));
    }
  }

  // ───────────────────────────── playtest (?playtest=1) ─────────────────────────────

  playtestCount(): number | null {
    return this.playtest ? this.playtest.load().length : null;
  }

  exportPlaytests(): void {
    if (this.playtest) exportJson(`theabonk-playtests-${new Date().toISOString().slice(0, 10)}.json`, this.playtest.file(), this.ui.root);
  }

  clearPlaytests(): void {
    this.playtest?.clear();
  }

  private recordPlaytest(w: World, result: 'dead' | 'won' | 'quit'): void {
    if (!this.playtest) return;
    this.playtest.add(
      recordRun(w, {
        player: 'human',
        result,
        input: this.padFrames > this.kbFrames ? 'gamepad' : 'kbm',
        quality: this.save.data.settings.quality,
        difficulty: w.tier > 0 ? `${w.difficulty}${w.tier}` : w.difficulty,
      }),
    );
  }

  /** ?tune=1: developer tuning panel. Overrides persist under `theabonk.tuning` (tune mode only). */
  private initTuning(uiRoot: HTMLElement): void {
    let saved: unknown = null;
    try {
      saved = JSON.parse(this.store.get(TUNING_KEY) ?? 'null');
    } catch {
      saved = null;
    }
    const initial = mergeTuning(TUNING_DEFAULTS, saved);
    this.tuningPanel = new TuningPanel(uiRoot, {
      live: () => this.world?.tuning ?? null,
      camera: () => this.renderer.rig.tuning,
      changed: (g: TuningGroup) => this.onTuningChanged(g),
    }, initial);
    // sliders need a free cursor: drag-to-look while tuning
    this.input.setMouseMode('drag');
  }

  private onTuningChanged(g: TuningGroup): void {
    const w = this.world;
    if (w && this.tuningPanel?.isTuned) w.options.tuned = true;
    if (w && g === 'xp') w.player.xpNext = xpToNextWith(w.player.level, w.tuning.xp);
    // debounce persistence
    clearTimeout(this.tuneSaveT);
    this.tuneSaveT = window.setTimeout(() => {
      if (this.tuningPanel) this.store.set(TUNING_KEY, JSON.stringify(this.tuningPanel.overrides));
    }, 300);
  }

  resize(): void {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.resize(w, h);
    // turning a phone upright mid-run pauses it (the rotate hint covers the screen)
    if (this.input.touchMode && h > w && this.world?.state === 'playing' && !this.paused) this.pause();
  }

  /** Touch input in use: on-screen controls during runs, touch-sized menus. */
  private setTouchMode(on: boolean): void {
    if (this.input.touchMode === on) return;
    this.input.touchMode = on;
    document.documentElement.classList.toggle('touch', on);
    this.touch.setVisible(on && this.input.gameplay);
    if (on) this.input.releaseLock();
  }

  /** The render tier to use: 'auto' is Tablet on touch devices, High elsewhere. */
  private effectiveQuality(): RenderQuality {
    const q = this.save.data.settings.quality;
    return q === 'auto' ? (this.touchDevice ? 'tablet' : 'high') : q;
  }

  start(): void {
    this.last = performance.now();
    this.menus.title();
    this.onMode?.('menu', null);
    requestAnimationFrame(this.frame);
  }

  // ───────────────────────────── GameApi ─────────────────────────────

  sound(name: SoundName): void {
    this.onSound?.(name);
  }

  showcase(characterId: string, mapId?: string): void {
    this.renderer.setCharacter(characterDef(characterId));
    if (mapId && !this.world) this.showMenuMap(mapId);
  }

  captureInput(cb: (c: Captured) => void): void {
    this.input.captureNext(cb);
  }

  padFamily(): PadFamily {
    return this.input.padFamily;
  }

  /** Menus that animate every frame (the controller test) register here. */
  private menuTicker: (() => void) | null = null;
  setMenuTicker(fn: (() => void) | null): void {
    this.menuTicker = fn;
  }

  /** Live controller readout for the controller test screen. */
  controllers(): { pads: StdPad[]; seen: boolean; active: number } {
    return { pads: this.input.pads, seen: this.input.padSeen, active: this.input.pad?.index ?? -1 };
  }

  showcaseEnemy(id: string | null): void {
    this.renderer.showcaseEnemy(id);
  }

  /** Menu backdrop on a map (each built once, then cached). */
  private showMenuMap(id: string): void {
    const map = mapDef(id);
    let t = this.menuTerrains.get(map.id);
    if (!t) {
      t = new Terrain(MENU_SEED, map.terrain);
      this.menuTerrains.set(map.id, t);
    }
    this.renderer.setTerrain(t, map);
  }

  applySettings(): void {
    const s = this.save.data.settings;
    const q = this.effectiveQuality();
    if (this.renderer.quality !== q) this.renderer.setQuality(q);
    this.touch.sensitivity = s.sensitivity;
    this.touch.slideToggle = s.controls.slideToggle;
    this.input.sensitivity = s.sensitivity;
    this.input.invertY = s.invertY;
    this.input.setBindings(s.controls.bindings);
    this.input.slideToggle = s.controls.slideToggle;
    this.input.autoHop = s.controls.autoHop;
    this.input.rumbleEnabled = s.controls.rumble;
    const reduced = reducedMotionOn(s.access);
    applyAccessClasses(s.access, reduced);
    this.renderer.setAccess(reduced, s.access.colorblind);
    this.input.setMouseMode(this.tuningPanel ? 'drag' : s.mouseMode);
    this.renderer.rig.shakeEnabled = s.screenShake;
    this.renderer.fx.numbers.enabled = s.damageNumbers;
    this.fpsEl.classList.toggle('hidden', !s.showFps);
    this.onSettings?.();
  }

  /** Audio volume hook (set in main). */
  onSettings: (() => void) | null = null;

  /** The run being played is today's daily (its UTC date), else null. */
  private dailyDate: string | null = null;

  startRun(characterId: string, mapId?: string, opts: { seed?: number; difficulty?: DifficultyId; tier?: number; daily?: string } = {}): void {
    const params = new URLSearchParams(location.search);
    const stress = Number(params.get('stress') || 0);
    const fixedSeed = params.get('seed');
    const d = this.save.data;
    const overrides = this.tuningPanel?.overrides;
    // ?map=rimewood (testing) > the requested map > the last one played
    const want = urlParam('map') ?? mapId ?? d.lastMap;
    const map: MapId = isMapId(want) ? want : 'meadow';
    const daily = opts.daily ?? null;
    const wantDiff = urlParam('difficulty') ?? opts.difficulty ?? d.lastDifficulty;
    const difficulty: DifficultyId = daily ? 'normal' : isDifficultyId(wantDiff) ? wantDiff : 'normal';
    this.dailyDate = daily;
    this.world = newRun({
      seed: fixedSeed ? Number(fixedSeed) : (opts.seed ?? randomSeed()),
      characterId,
      map,
      difficulty,
      tier: difficulty === 'hard' ? Math.min(opts.tier ?? d.lastTier, d.unlockedTier) : 0,
      daily: !!daily,
      // the tablet tier fields fewer (but tougher, richer) Gloom
      tablet: this.renderer.quality === 'tablet',
      stress,
      // the daily is the same for everyone: no shop bonuses or unlocked extras
      meta: daily ? undefined : metaBonuses(d),
      unlockedWeapons: daily ? [] : d.unlockedWeapons,
      tuning: overrides,
      tuned: !!this.tuningPanel?.isTuned,
    });
    const w = this.world;
    this.renderer.showcaseEnemy(null);
    this.renderer.setTerrain(w.terrain, w.map);
    this.renderer.setCharacter(w.player.character);
    this.renderer.rig.yaw = 0;
    this.renderer.rig.pitch = this.renderer.rig.tuning.pitch;
    this.renderer.rig.snap(w.player.x, w.player.y, w.player.z);
    this.renderer.resetTransient();
    this.acc = 0;
    this.achT = 1;
    this.levelUpAt = 0;
    this.padFrames = this.kbFrames = 0;
    this.paused = false;
    this.lastWorldState = 'playing';
    this.ui.close();
    this.ui.hud.show(true);
    this.ui.hud.showBanner(bannerText(w.map, BANNER.start));
    this.setGameplayInput(true);
    this.onMode?.('run', w);
  }

  /** Today's daily run (UTC date → seed, map, hero; Normal, no shop bonuses). */
  startDaily(): void {
    const spec = dailySpec(utcDate());
    this.startRun(spec.hero, spec.map, { seed: spec.seed, daily: spec.date });
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.ui.close();
    this.setGameplayInput(true);
    this.onMode?.('run', this.world);
  }

  quitToTitle(): void {
    const w = this.world;
    if (w && w.state !== 'dead' && w.state !== 'won') {
      // abandoning still banks what was earned (and quitting during the dawn
      // countdown still counts as the victory it is)
      w.state = w.director.victoryT > 0 ? 'won' : 'dead';
      this.recordPlaytest(w, w.state === 'won' ? 'won' : 'quit');
      if (!w.options.tuned) {
        applyRunResult(this.save.data, summarize(w, this.dailyDate));
        this.save.save();
      }
    }
    this.clearRun();
    this.menus.title();
  }

  clearRun(): void {
    this.world = null;
    this.levelUpAt = 0;
    this.paused = false;
    this.setGameplayInput(false);
    this.ui.hud.show(false);
    this.showMenuMap(this.save.data.lastMap);
    this.renderer.resetTransient();
    this.renderer.playerView.hurt(0);
    this.onMode?.('menu', null);
  }

  // ───────────────────────────── run flow ─────────────────────────────

  private setGameplayInput(on: boolean): void {
    this.input.gameplay = on;
    this.input.clearTransient();
    this.touch.setVisible(on && this.input.touchMode);
    if (on) this.input.requestLock();
    else this.input.releaseLock();
  }

  pause(): void {
    const w = this.world;
    if (!w || this.paused || w.state !== 'playing') return;
    this.paused = true;
    this.setGameplayInput(false);
    this.menus.pause(w);
    this.onMode?.('paused', w);
  }

  private autoPause(): void {
    if (this.world && this.world.state === 'playing' && !this.paused && !this.ui.hasScreen) this.pause();
  }

  private onAction(a: UiAction): void {
    if (a === 'debug') {
      this.showDebug = !this.showDebug;
      this.ui.debug.classList.toggle('hidden', !this.showDebug);
      return;
    }
    if (a === 'pause') {
      // the Escape that released pointer lock already paused us; don't instantly resume
      if (performance.now() - this.lockLostAt < 300) return;
      if (this.paused && this.ui.screenName === 'pause') this.resume();
      else if (this.world && this.world.state === 'playing' && !this.ui.hasScreen) this.pause();
      else if (this.ui.hasScreen) this.ui.handleAction('back');
      return;
    }
    if (this.ui.handleAction(a)) this.sound('click');
  }

  /** React to sim state transitions (level-up, chest, death, victory). */
  private onWorldState(w: World): void {
    if (w.state === this.lastWorldState) return;
    this.lastWorldState = w.state;
    switch (w.state) {
      case 'levelup':
        // a beat of hit-stop: the burst and light pillar play before the picker opens
        this.levelUpAt = performance.now() + (this.renderer.reducedMotion ? 120 : 380);
        break;
      case 'chest':
        this.setGameplayInput(false);
        this.sound('open');
        this.ui.showChest(w.chestRewards, () => {
          closeChest(w);
          this.ui.close();
          this.lastWorldState = w.state;
          this.setGameplayInput(true);
        });
        break;
      case 'dead':
      case 'won':
        this.finishRun(w);
        break;
      default:
        break;
    }
  }

  private finishRun(w: World): void {
    this.setGameplayInput(false);
    this.ui.hud.show(false);
    const summary = summarize(w, this.dailyDate);
    this.recordPlaytest(w, w.state === 'won' ? 'won' : 'dead');
    // tuned runs (?tune=1 with changed values) never touch the save
    const outcome = w.options.tuned ? unrecordedOutcome() : applyRunResult(this.save.data, summary);
    if (!w.options.tuned) this.save.save();
    this.onMode?.('end', w);
    const daily = this.dailyDate;
    const retry = daily
      ? () => this.startRun(summary.characterId, summary.mapId, { seed: w.seed, daily })
      : () => this.startRun(summary.characterId, summary.mapId, { difficulty: summary.difficulty, tier: summary.tier });
    this.menus.gameOver(summary, outcome, retry, w.options.tuned ? 'Tuned run — not recorded (gold, records and achievements unchanged).' : undefined);
  }

  private showLevelUp(w: World): void {
    this.setGameplayInput(false);
    const pick = (c: UpgradeChoice | null): void => {
      this.sound(c ? 'buy' : 'back');
      const more = resolveLevelUp(w, c);
      if (more) this.showLevelUp(w);
      else {
        this.ui.close();
        this.lastWorldState = w.state;
        this.setGameplayInput(true);
      }
    };
    this.ui.showLevelUp(
      w,
      pick,
      () => {
        if (reroll(w)) {
          this.sound('click');
          this.showLevelUp(w);
        } else this.sound('error');
      },
      (index) => {
        if (banish(w, index)) {
          this.sound('back');
          this.showLevelUp(w);
          this.liveAchievements(w);
        } else this.sound('error');
      },
    );
  }

  /** Achievements can pop mid-run (e.g. kill counts); rewards apply immediately. */
  private liveAchievements(w: World): void {
    if (w.options.tuned) return;
    const earned = checkAchievements(this.save.data, summarize(w, this.dailyDate));
    if (earned.length === 0) return;
    this.sound('achievement');
    for (const a of earned) {
      this.ui.hud.toast('Achievement unlocked', `${a.name} — ${rewardText(a)}`);
      if (a.reward.weapon) w.unlockedWeapons.add(a.reward.weapon);
    }
    this.save.save();
  }

  // ───────────────────────────── frame loop ─────────────────────────────

  /** Debug/testing: run frames synchronously (works even when rAF is throttled). */
  advance(seconds: number): void {
    const frames = Math.round(seconds * 60);
    for (let i = 0; i < frames; i++) {
      this.last -= 1000 / 60;
      this.frame(performance.now(), false);
    }
  }

  private buildSimInput(): void {
    const i = this.simInput;
    this.input.move(this.move);
    this.renderer.rig.forward(this.fwd);
    const rx = -this.fwd.z;
    const rz = this.fwd.x;
    i.moveX = rx * this.move.x + this.fwd.x * this.move.y;
    i.moveZ = rz * this.move.x + this.fwd.z * this.move.y;
    i.slide = this.input.slideHeld();
  }

  private processEvents(w: World): void {
    const ev = w.events;
    for (let n = 0; n < ev.count; n++) {
      const t = ev.type[n];
      if (t === Ev.Banner) {
        const id = ev.i[n];
        // boss banners become the boss's intro card (shown on its spawn event)
        if (id >= 1 && id <= 3) this.bossLine = bannerText(w.map, id);
        else this.ui.hud.showBanner(bannerText(w.map, id), false);
      } else if (t === Ev.BossSpawn) {
        const def = ENEMIES[ev.i[n]];
        if (def) this.ui.hud.bossIntro(enemyIconUrl(def.id, def.color, true, true), def.name, def.epithet ?? '', this.bossLine);
        this.bossLine = '';

      } else if (t === Ev.PlayerHurt) {
        this.ui.hud.hurt();
        this.renderer.playerView.hurt();
        this.input.rumble(0.7, 0.45, 160);
      } else if (t === Ev.Explosion) {
        // boss slams / blasts close by thump through the controller
        const d = Math.hypot(ev.get(n, 0) - w.player.x, ev.get(n, 2) - w.player.z);
        if (ev.get(n, 4) === 1 && d < 9) this.input.rumble(0.55 * (1 - d / 9), 0.3 * (1 - d / 9), 140);
      } else if (t === Ev.LevelUp) {
        this.input.rumble(0.1, 0.35, 90);
      } else if (t === Ev.Land) {
        this.renderer.playerView.land(ev.get(n, 3));
      } else if (t === Ev.Evolve) {
        this.ui.hud.showBanner('Evolution!');
        this.renderer.rig.orbit(1.4, 1.1);
        this.input.rumble(0.8, 0.8, 450);
      }
    }
  }

  private frame = (now: number, schedule = true): void => {
    if (schedule) requestAnimationFrame(this.frame);
    const t0 = performance.now();
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (!(dt > 0)) dt = 0;
    dt = Math.min(dt, 0.25);
    this.input.poll(dt);

    const w = this.world;
    if (w) {
      let simT = 0;
      if (this.levelUpAt > 0 && performance.now() >= this.levelUpAt) {
        this.levelUpAt = 0;
        if (w.state === 'levelup') this.showLevelUp(w);
      }
      // the evolution camera swing holds the action
      const running = !this.paused && w.state === 'playing' && !this.renderer.rig.orbiting;
      if (running) {
        this.input.consumeLook(dt, this.look);
        this.renderer.rig.look(this.look.x, this.look.y);
        if (this.input.wheel !== 0) {
          const rig = this.renderer.rig;
          rig.zoom = Math.max(6 - rig.tuning.distance, Math.min(20 - rig.tuning.distance, rig.zoom + this.input.wheel * 0.8));
          this.input.wheel = 0;
        }
        if (this.input.usingGamepad) this.padFrames++;
        else this.kbFrames++;
        this.acc += dt;
        let steps = 0;
        const s0 = performance.now();
        while (this.acc >= DT && steps < MAX_STEPS_PER_FRAME && w.state === 'playing') {
          this.buildSimInput();
          const fresh = this.input.consumeJump();
          // auto-hop: holding jump on the ground hops again (these hops get no bunny-hop boost)
          const auto = !fresh && this.input.autoHop && w.player.onGround && this.input.jumpHeld();
          this.simInput.jump = fresh || auto;
          this.simInput.autoHop = auto;
          const wasSliding = w.player.sliding;
          step(w, this.simInput);
          // a toggled slide switches itself off when the slide ends
          if (wasSliding && !w.player.sliding && w.player.onGround) this.input.slideEnded();
          this.acc -= DT;
          steps++;
        }
        simT = performance.now() - s0;
        if (steps >= MAX_STEPS_PER_FRAME) this.acc = 0;
        this.achT -= dt;
        if (this.achT <= 0) {
          this.achT = 1;
          this.liveAchievements(w);
        }
      }
      this.processEvents(w);
      this.onEvents?.(w);
      this.renderer.fx.consume(w.events, w.player.x, w.player.y, w.player.z);
      w.events.clear();
      this.renderer.renderGame(w, running ? this.acc / DT : 1, running ? dt : 0);
      if (w.state !== 'dead' && w.state !== 'won') {
        this.renderer.rig.forward(this.ui.hud.camFwd);
        this.ui.hud.update(w, dt, w.stats.coins);
      }
      this.onWorldState(w);
      this.simMs = this.simMs * 0.9 + simT * 0.1;
    } else {
      this.renderer.renderMenu(dt);
    }
    this.onFrame?.();
    if (!w) this.menuTicker?.();
    this.frameMs = this.frameMs * 0.9 + (performance.now() - t0) * 0.1;
    this.updateDebug(dt);
  };

  private updateDebug(dt: number): void {
    this.fpsFrames++;
    this.fpsTime += dt;
    if (this.fpsTime >= 0.5) {
      this.fps = this.fpsFrames / this.fpsTime;
      this.fpsFrames = 0;
      this.fpsTime = 0;
      if (this.save.data.settings.showFps) this.fpsEl.textContent = `${this.fps.toFixed(0)} fps`;
    }
    if (!this.showDebug) return;
    this.debugT -= dt;
    if (this.debugT > 0) return;
    this.debugT = 0.25;
    const info = this.renderer.renderer.info;
    const w = this.world;
    this.ui.debug.textContent = [
      `FPS        ${this.fps.toFixed(0)}`,
      `frame ms   ${this.frameMs.toFixed(2)}  (sim ${this.simMs.toFixed(2)})`,
      `draw calls ${info.render.calls}`,
      `triangles  ${info.render.triangles.toLocaleString()}`,
      w ? `enemies    ${w.enemies.count}` : '',
      w ? `projectile ${w.projectiles.count} (+${w.enemyShots.count} hostile)` : '',
      w ? `gems       ${w.gems.count}   pickups ${w.pickups.count}` : '',
      w ? `hazards    ${w.hazards.count}   particles ${this.renderer.particles.count}` : '',
      w ? `seed       ${w.seed}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }
}
