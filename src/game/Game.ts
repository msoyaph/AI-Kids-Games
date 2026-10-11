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
import { glassFor, TouchControls } from '../input/touch';
import { GOVERNOR, QualityGovernor, stepDown } from './governor';
import { touchFirstDevice } from '../input/mode';
import { autoCameraTurn } from '../render/autoCamera';
import type { Quality as RenderQuality } from '../render/Renderer';
import { applyAccessClasses, reducedMotionOn, watchReducedMotion } from '../ui/access';
import { BENCH, BenchRecorder, GAME_VERSION, gpuName, tierForGpu, type BenchResult } from './benchmark';
import { Bot } from '../sim/bot';
import { spawnBoss } from '../sim/bosses';
import { enemyIndex } from '../config/enemies';
import { TABLET_CROWD } from '../config/difficulty';

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
  private touchFrames = 0;
  /** The boss banner line waiting for its intro card. */
  private bossLine = '';
  /** When the level-up picker opens (after the hit-stop); 0 = none pending. */
  private levelUpAt = 0;
  private touch: TouchControls;
  private touchDevice: boolean;
  private store: KeyValueStore;
  private tuneSaveT = 0;
  /** Quality 'auto' on desktops: a first guess from the graphics card's name. */
  private autoTier: RenderQuality = 'high';
  /** The quality governor stepped Auto down this session (sticks until reload, never saved). */
  private sessionTier: RenderQuality | null = null;
  private governor = new QualityGovernor();
  /** A step down waiting for a screen to cover the scene (level-up / chest), and since when. */
  private govPending: RenderQuality | null = null;
  private govPendingAt = 0;
  /** Governor steps this run, for playtest records. */
  private govDrops: Array<{ at: number; from: RenderQuality; to: RenderQuality }> = [];
  /** The performance test in progress (?bench=1, Settings → Test performance). */
  private bench: { rec: BenchRecorder; bot: Bot; seconds: number; boss: boolean; map: MapId; prevQuality: RenderQuality | null; controls: 'none' | 'fake' | 'blur'; t: number } | null = null;
  private benchBadge: HTMLElement;

  constructor(
    private canvas: HTMLCanvasElement,
    overlay: HTMLCanvasElement,
    uiRoot: HTMLElement,
  ) {
    this.store = new SafeLocalStore();
    this.save = new SaveManager(this.store);
    // unlocks added since the save was written (e.g. heroes earned by past progress) apply now
    if (checkAchievements(this.save.data).length > 0) this.save.save();
    // phones / tablets (a finger is the primary pointer) start in touch mode on the Tablet
    // tier; touchscreen laptops keep their desktop tier and switch to touch when touched
    this.touchDevice = touchFirstDevice();
    this.renderer = new GameRenderer(canvas, overlay, this.effectiveQuality());
    this.autoTier = tierForGpu(gpuName(this.renderer.renderer.getContext()));
    if (this.renderer.quality !== this.effectiveQuality()) this.renderer.setQuality(this.effectiveQuality());
    this.input = new InputManager(canvas);
    this.ui = new UI(uiRoot);
    // touch: on-screen controls, touch-sized menus, landscape only
    this.touch = new TouchControls(uiRoot);
    this.input.touch = this.touch;
    this.touch.onPause = () => this.onAction('pause');
    this.input.onModeChange = (on) => this.setTouchMode(on);
    uiRoot.append(h('div', { class: 'rotate-hint' }, h('div', { class: 'rotate-phone' }), h('div', null, 'Turn your device sideways to play')));
    this.setTouchMode(this.touchDevice);
    if (this.touchDevice && this.save.data.stats.runsPlayed === 0 && this.save.data.lastDifficulty === 'normal') {
      // first time on a phone / tablet: start gentle (the player can still pick Normal)
      this.save.data.lastDifficulty = 'relaxed';
    }
    this.menus = new Menus(this);
    this.fpsEl = h('div', { class: 'fps hidden' });
    this.benchBadge = h('div', { class: 'bench-badge hidden' }, 'PERFORMANCE TEST — Esc stops');
    uiRoot.append(this.fpsEl, this.benchBadge);
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
      // the quality governor starts afresh when the tab comes back
      else this.governor.reset(performance.now() / 1000, GOVERNOR.settle);
    });
    document.addEventListener('pointerlockchange', () => {
      // a lock granted late (after a modal opened) must not trap the cursor
      if (this.input.pointerLocked && !this.input.gameplay) {
        this.input.releaseLock();
        return;
      }
      // (touch taking over releases the lock on purpose: that's not a reason to pause)
      if (!this.input.pointerLocked && !this.input.touchMode && this.world && this.world.state === 'playing' && !this.paused) {
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
        input: this.touchFrames >= Math.max(this.padFrames, this.kbFrames) && this.touchFrames > 0 ? 'touch' : this.padFrames > this.kbFrames ? 'gamepad' : 'kbm',
        quality: this.save.data.settings.quality,
        controls:
          this.touchFrames > 0
            ? (() => {
                const t = this.save.data.settings.touch;
                return { size: t.size, autoCamera: t.autoCamera, fixedStick: t.fixedStick, leftHanded: t.leftHanded, glass: this.touch.glassMode, governor: this.govDrops.map((d): [number, string, string] => [d.at, d.from, d.to]) };
              })()
            : undefined,
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

  /**
   * Touch input in use: on-screen controls during runs, touch-sized menus, no speedometer.
   * Hybrid devices flip back and forth mid-run; each side's held state is dropped on the
   * switch (no stuck stick, key or slide). Back on the mouse, the next click re-locks.
   */
  private setTouchMode(on: boolean): void {
    this.input.touchMode = on;
    document.documentElement.classList.toggle('touch', on);
    this.touch.setVisible(on && this.input.gameplay);
    if (on) {
      this.input.releaseLock();
      this.input.clearKeys();
    }
  }

  /**
   * The render tier to use: ?quality= (testing / CI) wins, then the setting; 'auto' is Tablet
   * on touch devices and a guess from the graphics card elsewhere (old / software GPUs → Low).
   */
  private effectiveQuality(): RenderQuality {
    const forced = urlParam('quality');
    if (forced === 'low' || forced === 'medium' || forced === 'high' || forced === 'tablet') return forced;
    const q = this.save.data.settings.quality;
    return q === 'auto' ? this.autoQuality() : q;
  }

  /** What 'auto' picks on this device (or what the governor stepped it down to this session). */
  autoQuality(): RenderQuality {
    return this.sessionTier ?? (this.touchDevice ? 'tablet' : this.autoTier);
  }

  /** Phones / tablets on their light tiers field the smaller, tougher crowd (TABLET_CROWD). */
  private lightCrowd(q: RenderQuality): boolean {
    return q === 'tablet' || (q === 'low' && this.touchDevice);
  }

  /** The governor only steps in for Auto quality (not a chosen tier, ?quality=, or the test). */
  private governing(): boolean {
    return this.save.data.settings.quality === 'auto' && !urlParam('quality') && !this.bench;
  }

  /** Step Auto down one tier now (behind a covering screen, or after waiting too long). */
  private applyQualityStep(w: World): void {
    const to = this.govPending;
    this.govPending = null;
    if (!to) return;
    const from = this.renderer.quality;
    this.sessionTier = to;
    this.renderer.setQuality(to);
    // the touch glass cross-fades to fake glass (no pop)
    this.touch.setGlass(glassFor(to, this.touchDevice));
    this.governor.reset(performance.now() / 1000, GOVERNOR.settle);
    this.govDrops.push({ at: Math.round(w.time), from, to });
  }

  start(): void {
    this.last = performance.now();
    this.menus.title();
    this.onMode?.('menu', null);
    if (urlParam('bench') === '1') {
      this.startBenchmark({ seconds: Number(urlParam('seconds')) || undefined, map: urlParam('map'), enemies: Number(urlParam('enemies')) || undefined, controls: urlParam('controls') });
    }
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
    // ?glass=fake|blur forces the style (screenshots / comparisons); else the measured rule
    const forced = urlParam('glass');
    this.touch.setGlass(this.bench ? this.touch.glassMode : forced === 'fake' || forced === 'blur' ? forced : glassFor(this.renderer.quality, this.touchDevice));
    this.touch.sensitivity = s.touch.lookSensitivity;
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
    const t = s.touch;
    this.touch.setLook({
      reducedMotion: reduced,
      // the high-contrast HUD brings high-contrast controls with it
      highContrast: t.highContrast || s.access.highContrast,
      size: t.size,
      opacity: t.opacity,
      leftHanded: t.leftHanded,
      fixedStick: t.fixedStick,
    });
    this.touch.setLayout(t.layout);
    this.touch.autoCamera = t.autoCamera;
    this.touch.haptics = t.haptics;
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
      tablet: this.lightCrowd(this.renderer.quality),
      stress,
      // the daily is the same for everyone: no shop bonuses or unlocked extras
      meta: daily ? undefined : metaBonuses(d),
      unlockedWeapons: daily ? [] : d.unlockedWeapons,
      tuning: overrides,
      tuned: !!this.tuningPanel?.isTuned,
    });
    this.enterRun(this.world);
  }

  /** Common run start: scene, camera, HUD, input. */
  private enterRun(w: World, gameplay = true): void {
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
    this.padFrames = this.kbFrames = this.touchFrames = 0;
    this.paused = false;
    this.lastWorldState = 'playing';
    this.governor.reset(performance.now() / 1000);
    this.govPending = null;
    this.govDrops = [];
    this.ui.close();
    this.ui.hud.show(true);
    this.ui.hud.showBanner(bannerText(w.map, BANNER.start));
    this.setGameplayInput(gameplay);
    this.onMode?.('run', w);
  }

  // ───────────────────────────── benchmark ─────────────────────────────

  /** Show the touch controls behind a menu (Touch controls settings / layout editor), or not. */
  touchPreview(mode: 'play' | 'preview' | 'edit'): void {
    this.touch.setMode(mode);
  }

  /** The touch controls (the layout editor reads and moves them). */
  touchControls(): TouchControls {
    return this.touch;
  }

  /** Show the HUD for reference behind the layout editor (menus only; runs show it anyway). */
  hudPreview(on: boolean): void {
    if (!this.world) this.ui.hud.show(on);
  }

  private hintBot: Bot | null = null;
  private hintWorld: World | null = null;
  private hintInput = emptyInput();

  /**
   * Test hook (touch playthrough e2e): where the bot would move Thea right now (world x / z,
   * plus whether it wants to jump / slide). Read-only — it never feeds the simulation.
   */
  botHint(): { x: number; z: number; jump: boolean; slide: boolean } | null {
    const w = this.world;
    if (!w || w.state !== 'playing') return null;
    if (this.hintWorld !== w || !this.hintBot) {
      this.hintBot = new Bot(w.seed, 0.8);
      this.hintWorld = w;
    }
    this.hintBot.decide(w, this.hintInput);
    const i = this.hintInput;
    return { x: i.moveX, z: i.moveZ, jump: i.jump, slide: i.slide };
  }

  /** Whether a run (or the performance test) is on screen. */
  inRun(): boolean {
    return !!this.world;
  }

  /**
   * Performance test: a fixed-seed run (Thea, invulnerable, played by the bot) with an
   * 800-strong horde and the map's final boss at 20 s, while the camera slowly circles.
   * Frames are measured after a short warm-up; the result card / window.__benchResult
   * follow. Nothing is saved. `quality` overrides the tier for this test only.
   */
  startBenchmark(opts: { seconds?: number; quality?: string | null; map?: string | null; enemies?: number; controls?: string | null } = {}): void {
    if (this.world) this.clearRun();
    const q = opts.quality;
    const quality: RenderQuality = q === 'low' || q === 'medium' || q === 'high' || q === 'tablet' ? q : this.renderer.quality;
    const prevQuality = quality !== this.renderer.quality ? this.renderer.quality : null;
    if (prevQuality) this.renderer.setQuality(quality);
    const map: MapId = opts.map && isMapId(opts.map) ? opts.map : 'meadow';
    const horde = opts.enemies && opts.enemies > 0 ? Math.min(3000, Math.floor(opts.enemies)) : BENCH.enemies;
    const seconds = Math.min(600, Math.max(BENCH.warmup + 2, opts.seconds && opts.seconds > 0 ? opts.seconds : BENCH.seconds));
    this.dailyDate = null;
    this.world = newRun({
      seed: BENCH.seed,
      characterId: 'thea',
      map,
      // the tablet tier fields fewer Gloom, as in its real runs
      stress: quality === 'tablet' ? Math.round(horde * TABLET_CROWD) : horde,
      god: true,
      tablet: this.lightCrowd(quality),
    });
    const controls = opts.controls === 'fake' || opts.controls === 'blur' ? opts.controls : 'none';
    this.bench = { rec: new BenchRecorder(), bot: new Bot(BENCH.seed, 0.9), seconds, boss: false, map, prevQuality, controls, t: 0 };
    // touch controls overlay: a scripted thumb works them, so their real cost is measured
    if (controls !== 'none') {
      this.touch.setMode('preview');
      this.touch.setGlass(controls);
    }
    this.enterRun(this.world, false);
    this.benchBadge.classList.remove('hidden');
  }

  /** Benchmark autopilot between sim steps: level-ups, chests and the boss resolve themselves. */
  private benchAutoplay(w: World, b: NonNullable<Game['bench']>): void {
    for (let guard = 0; w.state === 'levelup' && guard < 20; guard++) resolveLevelUp(w, b.bot.chooseUpgrade(w));
    if (w.state === 'chest') closeChest(w);
    if (!b.boss && w.time >= BENCH.bossAt) {
      b.boss = true;
      spawnBoss(w, enemyIndex(w.map.finalBoss));
    }
  }

  /** Record one frame (after the warm-up); finish when the test time is up. */
  private benchFrame(w: World, b: NonNullable<Game['bench']>, frameMs: number, cpuMs: number, simMs: number): void {
    const info = this.renderer.renderer.info.render;
    // a hidden tab stalls rAF: that gap isn't a frame the game rendered slowly
    if (w.time >= BENCH.warmup && frameMs < 1000) b.rec.frame(frameMs, cpuMs, simMs, info.calls, info.triangles, w.enemies.count);
    if (w.time >= b.seconds) this.endBenchmark(true);
  }

  /** Stop the test (finished: show the result card; cancelled: back to the title). */
  private endBenchmark(finished: boolean): void {
    const b = this.bench;
    if (!b) return;
    this.bench = null;
    this.benchBadge.classList.add('hidden');
    const r = this.renderer.renderer;
    const result = finished
      ? b.rec.result({ version: GAME_VERSION, map: b.map, quality: this.renderer.quality, width: r.domElement.width, height: r.domElement.height, dpr: r.getPixelRatio(), gpu: gpuName(r.getContext()), seconds: b.seconds, controls: b.controls })
      : null;
    this.clearRun();
    if (b.prevQuality) this.renderer.setQuality(b.prevQuality);
    if (b.controls !== 'none') this.touch.setMode('play');
    this.touch.setGlass(glassFor(this.renderer.quality, this.touchDevice));
    if (result) {
      (window as unknown as { __benchResult?: BenchResult }).__benchResult = result;
      this.menus.benchResult(result);
    } else this.menus.title();
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
    if (!w || this.paused || w.state !== 'playing' || this.bench) return;
    this.paused = true;
    this.setGameplayInput(false);
    this.menus.pause(w);
    this.onMode?.('paused', w);
  }

  private autoPause(): void {
    if (this.bench) return;
    if (this.world && this.world.state === 'playing' && !this.paused && !this.ui.hasScreen) this.pause();
  }

  private onAction(a: UiAction): void {
    if (this.bench && (a === 'pause' || a === 'back')) {
      this.endBenchmark(false);
      return;
    }
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
        this.applyQualityStep(w);
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
    // a pending governor step happens behind the picker (no visible hitch mid-action)
    this.applyQualityStep(w);
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
    if (w.options.tuned || this.bench) return;
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
        if (this.input.touchMode) this.touch.buzz([30, 60, 30]);
        const def = ENEMIES[ev.i[n]];
        if (def) this.ui.hud.bossIntro(enemyIconUrl(def.id, def.color, true, true), def.name, def.epithet ?? '', this.bossLine);
        this.bossLine = '';

      } else if (t === Ev.PlayerHurt) {
        this.ui.hud.hurt();
        this.renderer.playerView.hurt();
        if (this.input.touchMode) {
          this.touch.hurt();
          this.touch.buzz(25);
        }
        this.input.rumble(0.7, 0.45, 160);
      } else if (t === Ev.Explosion) {
        // boss slams / blasts close by thump through the controller
        const d = Math.hypot(ev.get(n, 0) - w.player.x, ev.get(n, 2) - w.player.z);
        if (ev.get(n, 4) === 1 && d < 9) {
          this.input.rumble(0.55 * (1 - d / 9), 0.3 * (1 - d / 9), 140);
          if (this.input.touchMode && d < 6) this.touch.buzz(35);
        }
      } else if (t === Ev.LevelUp) {
        this.input.rumble(0.1, 0.35, 90);
        if (this.input.touchMode) this.touch.buzz(40);
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
    const rawMs = now - this.last;
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
      const b = this.bench;
      if (running) {
        if (b) {
          // benchmark: the camera slowly circles the action
          this.renderer.rig.yaw += dt * BENCH.orbit;
        } else {
          this.input.consumeLook(dt, this.look);
          this.renderer.rig.look(this.look.x, this.look.y);
          if (this.input.touchMode) this.autoCamera(w, dt);
          if (this.input.wheel !== 0) {
            const rig = this.renderer.rig;
            rig.zoom = Math.max(6 - rig.tuning.distance, Math.min(20 - rig.tuning.distance, rig.zoom + this.input.wheel * 0.8));
            this.input.wheel = 0;
          }
          if (this.input.touchMode) this.touchFrames++;
          else if (this.input.usingGamepad) this.padFrames++;
          else this.kbFrames++;
        }
        this.acc += dt;
        let steps = 0;
        const s0 = performance.now();
        while (this.acc >= DT && steps < MAX_STEPS_PER_FRAME && w.state === 'playing') {
          if (b) b.bot.decide(w, this.simInput);
          else {
            this.buildSimInput();
            const fresh = this.input.consumeJump();
            // auto-hop: holding jump on the ground hops again (these hops get no bunny-hop boost)
            const auto = !fresh && this.input.autoHop && w.player.onGround && this.input.jumpHeld();
            this.simInput.jump = fresh || auto;
            this.simInput.autoHop = auto;
          }
          const wasSliding = w.player.sliding;
          step(w, this.simInput);
          if (b) this.benchAutoplay(w, b);
          // a toggled slide switches itself off when the slide ends
          else if (wasSliding && !w.player.sliding && w.player.onGround) this.input.slideEnded();
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
        if (this.touch.visible) this.touchFeedback(w);
      }
      this.onWorldState(w);
      this.simMs = this.simMs * 0.9 + simT * 0.1;
      if (b) {
        b.t += dt;
        if (b.controls !== 'none') this.touch.demo(b.t);
        this.benchFrame(w, b, rawMs, performance.now() - t0, simT);
      } else if (running && this.governing()) {
        // quality governor: step down when Auto keeps running well under 60 fps
        const nowS = performance.now() / 1000;
        if (!this.govPending && stepDown(this.renderer.quality) && this.governor.frame(nowS, rawMs)) {
          this.govPending = stepDown(this.renderer.quality);
          this.govPendingAt = nowS;
        }
        if (this.govPending && nowS - this.govPendingAt > GOVERNOR.applyWithin) this.applyQualityStep(w);
      }
    } else {
      this.renderer.renderMenu(dt);
    }
    this.onFrame?.();
    if (!w) this.menuTicker?.();
    this.frameMs = this.frameMs * 0.9 + (performance.now() - t0) * 0.1;
    this.updateDebug(dt);
  };

  /**
   * Touch auto camera: swings in behind Thea's movement; a camera drag takes over at once,
   * and it eases back in `autoCamDelay` seconds after the finger lifts.
   */
  private autoCamera(w: World, dt: number): void {
    const t = this.touch;
    if (!t.autoCamera || t.looking) return;
    const rig = this.renderer.rig;
    const since = (performance.now() - t.lookReleasedAt) / 1000 - rig.tuning.autoCamDelay;
    if (since <= 0) return;
    const gain = Math.min(1, since / 0.6) * (this.renderer.reducedMotion ? 0.6 : 1);
    rig.yaw += autoCameraTurn(rig.yaw, w.player.vx, w.player.vz, dt, rig.tuning, gain);
  }

  /** Fast slides light up the touch stick, with chevrons along the way Thea is going. */
  private touchFeedback(w: World): void {
    const p = w.player;
    const fast = p.sliding && Math.hypot(p.vx, p.vz) > w.tuning.movement.walkSpeed * 1.35;
    let ang = 0;
    if (fast) {
      // velocity in screen terms: camera forward = up, camera right = right
      const f = this.ui.hud.camFwd;
      ang = (Math.atan2(-p.vx * f.z + p.vz * f.x, p.vx * f.x + p.vz * f.z) * 180) / Math.PI;
    }
    this.touch.setFast(fast, ang);
  }

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
