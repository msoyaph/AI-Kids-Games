import type { CupId, KartConfig, SpeedClass } from '../data/types';
import type { ItemSet } from '../data/items';
import { GameLoop } from '../core/loop';
import { GameRenderer } from '../render/renderer';
import { InputManager, type InputSource } from '../input/manager';
import { MenuScene } from '../render/menuScene';
import { SaveManager, type SaveData } from '../save/save';
import { Ui, h } from '../ui/ui';
import type { GameAudio } from '../audio/types';
import { RaceSession, type GameMode, type SessionConfig, type SessionResult } from './session';
import { GrandPrix } from './modes/grandPrix';
import { findRacer } from '../data/racers';
import { cloneKeys, clonePad } from '../input/bindings';
import { PlaytestStore } from '../save/playtest';
import { buildPlaytestRecord } from './playtest';

export interface Flow {
  mode: GameMode;
  players: 1 | 2;
  speedClass: SpeedClass;
  mirror: boolean;
  racers: string[];
  karts: KartConfig[];
  cupId: CupId;
  trackId: string;
  arenaId: string;
  vs: { items: boolean; itemSet: ItemSet; aiCount: number; laps: number; cup: boolean };
  battle: { time: number; aiCount: number; rule: 'balloons' | 'coins' };
  tt: { ghost: 'best' | 'staff' | 'both' | 'none' };
}

/**
 * Top-level game object: renderer, input, audio, saves, UI, menus and the active race session.
 * Screens (src/ui/screens/*) call into the App to navigate and start races.
 */
export class App {
  readonly gr: GameRenderer;
  readonly input: InputManager;
  readonly ui: Ui;
  readonly saves: SaveManager;
  readonly menu: MenuScene;
  readonly loop: GameLoop;
  session: RaceSession | null = null;
  gp: GrandPrix | null = null;
  paused = false;
  readonly flow: Flow;
  private fpsEl: HTMLDivElement;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  /** Screen factory registry (set by screens/index.ts to avoid import cycles). */
  screens!: import('../ui/screens/index').ScreenRegistry;
  onPauseRequest?: () => void;
  /** Rolling timing stats (ms) for the FPS overlay and perf tests. */
  readonly perf = { step: 0, render: 0, frames: 0, frameTimes: new Float32Array(600), cursor: 0 };
  /** Anonymous per-race playtest log (only written while Settings → playtest is on). */
  readonly playtest = new PlaytestStore();
  private playtestBadge: HTMLDivElement;
  private sessionFrames = 0;
  private sessionStart = 0;

  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly uiRoot: HTMLElement,
    readonly audio: GameAudio,
  ) {
    this.gr = new GameRenderer(canvas);
    this.input = new InputManager(uiRoot);
    this.saves = new SaveManager(this.gr.isTouch);
    // Full storage: first give up our own playtest log, then tell the player (once) — saves are never corrupted.
    this.saves.freeSpace = () => this.playtest.shrink(0.5) > 0;
    const told = new Set<string>();
    this.saves.onStorageProblem = (kind) => {
      if (told.has(kind)) return;
      told.add(kind);
      this.toast(
        kind === 'full'
          ? 'Storage is full, so your newest progress could not be saved. Your earlier saves are safe.'
          : 'Saving is switched off in this browser, so progress lasts until you close the game.',
        5000,
      );
    };
    this.ui = new Ui(uiRoot, this.input, audio);
    this.menu = new MenuScene(this.gr);
    this.flow = {
      mode: 'grandPrix',
      players: 1,
      speedClass: 'rookie',
      mirror: false,
      racers: ['calex', 'pip'],
      karts: [],
      cupId: 'sunrise',
      trackId: 'seashell-boardwalk',
      arenaId: 'gumdrop-garden',
      vs: { items: true, itemSet: 'all', aiCount: 7, laps: 3, cup: false },
      battle: { time: 150, aiCount: 5, rule: 'balloons' },
      tt: { ghost: 'both' },
    };
    this.fpsEl = h('div', { class: 'fps-meter' });
    uiRoot.appendChild(this.fpsEl);
    this.playtestBadge = h('div', { class: 'playtest-badge', role: 'status' }, h('i'), 'Playtest recording on');
    uiRoot.appendChild(this.playtestBadge);
    this.applySettings();
    this.loop = new GameLoop({
      step: (dt) => this.step(dt),
      render: (alpha, frameDt) => this.render(alpha, frameDt),
      onHidden: () => {
        if (this.session?.active && !this.paused) this.pause();
        this.audio.suspend(true);
      },
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !this.paused && !this.gr.contextLost) this.audio.suspend(false);
    });
    this.gr.onContextLost(() => this.onContextLost());
    this.gr.quality.onChange(() => this.syncGlass());
    this.gr.onContextRestored(() => this.onContextRestored());
  }

  // ---------------------------------------------------------------------------
  // WebGL context loss: pause everything, wait for the browser to give the GPU back, then "Tap to continue".
  // ---------------------------------------------------------------------------
  private ctxOverlay: HTMLDivElement | null = null;
  private ctxWasRacing = false;
  private ctxUnsub: (() => void) | null = null;

  private onContextLost(): void {
    this.saves.flush();
    this.ctxWasRacing = !!this.session && !this.paused && !this.session.completed;
    this.loop.simPaused = true;
    this.audio.suspend(true);
    this.input.touch.show(false);
    if (!this.ctxOverlay) {
      this.ctxOverlay = h('div', { class: 'ctx-lost', role: 'alertdialog', 'aria-live': 'assertive' });
      this.uiRoot.appendChild(this.ctxOverlay);
    }
    this.ctxOverlay.innerHTML = '';
    this.ctxOverlay.append(h('div', { class: 'ctx-title' }, 'Graphics are taking a break…'), h('div', { class: 'hint' }, 'Hang on — your race is paused and your progress is saved.'));
    // Some browsers never give the context back on their own: after a moment offer to reload.
    setTimeout(() => {
      if (this.gr.contextLost && this.ctxOverlay) this.showContinue(true);
    }, 4000);
  }

  private onContextRestored(): void {
    if (!this.ctxOverlay) return;
    this.showContinue(false);
  }

  private showContinue(reload: boolean): void {
    const el = this.ctxOverlay;
    if (!el) return;
    el.innerHTML = '';
    const go = (): void => this.continueAfterContext(reload && this.gr.contextLost);
    const btn = h('button', { class: 'btn yellow', 'data-nav': '1' }, 'Tap to continue') as HTMLButtonElement;
    btn.addEventListener('click', go);
    el.append(h('div', { class: 'ctx-title' }, reload ? 'Graphics need a restart' : 'Ready!'), btn);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') go();
    });
    this.ctxUnsub?.();
    this.ctxUnsub = this.input.onMenu((a) => {
      if (a === 'confirm') go();
    });
    btn.focus();
  }

  private continueAfterContext(reload: boolean): void {
    this.ctxUnsub?.();
    this.ctxUnsub = null;
    if (reload) {
      this.saves.flush();
      location.reload();
      return;
    }
    this.ctxOverlay?.remove();
    this.ctxOverlay = null;
    this.loop.resetClock();
    if (this.session && this.ctxWasRacing) {
      this.paused = true; // resume() expects a paused race
      this.resume();
    } else if (!this.paused) {
      this.loop.simPaused = !!this.session?.completed;
      this.audio.suspend(false);
    }
  }

  get save(): SaveData {
    return this.saves.data!;
  }

  start(): void {
    this.loop.start();
  }

  // ---------------------------------------------------------------------------
  // settings
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------------------------------------
  // Touch glass: real backdrop blur only on High (full render scale), where the browser supports it, without high
  // contrast, outside test mode — and only while it costs no frames. If frame times creep up with blur on, blur is
  // dropped first (before the quality governor lowers the tier) and stays off for this visit.
  // ---------------------------------------------------------------------------------------------------------
  private blurBlocked = false;
  private blurSlow = 0;
  private blurFrames = 0;
  private blurJank = 0;
  private readonly blurSupported = typeof CSS !== 'undefined' && (CSS.supports('backdrop-filter', 'blur(2px)') || CSS.supports('-webkit-backdrop-filter', 'blur(2px)'));

  syncGlass(): void {
    const q = this.gr.quality;
    const ok = q.level === 'high' && q.renderScale >= 1 && this.blurSupported && !this.blurBlocked && !this.testMode && !this.saves.settings.touch.highContrast;
    this.input.touch.setGlass(ok ? 'blur' : 'fake');
  }

  private watchGlass(frameDt: number): void {
    const touch = this.input.touch;
    if (!touch.shown || touch.glass !== 'blur' || touch.forceGlass) {
      this.blurSlow = this.blurFrames = this.blurJank = 0;
      return;
    }
    // the governor degrades at > 19.2 ms for 1.2 s; blur steps aside earlier — on a slow average, or on jank
    // (measured: on a throttled phone the average stays near 60 fps while blur doubles the slow frames)
    if (this.gr.quality.avgFrameMs > 17.6) this.blurSlow += frameDt;
    else this.blurSlow = Math.max(0, this.blurSlow - frameDt);
    this.blurFrames++;
    if (frameDt > 0.025) this.blurJank++;
    let drop = this.blurSlow > 0.6;
    if (this.blurFrames >= 180) {
      if (this.blurJank / this.blurFrames > 0.02) drop = true;
      this.blurFrames = this.blurJank = 0;
    }
    if (drop) {
      this.blurBlocked = true;
      this.blurSlow = 0;
      this.syncGlass();
    }
  }

  /** CI test mode (`?testmode=1`): lightest look so software-rendered test browsers stay quick. */
  testMode = false;

  enterTestMode(): void {
    this.testMode = true;
    const s = this.saves.settings;
    s.quality = 'low';
    s.reduceEffects = true;
    this.applySettings();
  }

  applySettings(): void {
    const s = this.saves.settings;
    this.audio.setVolumes(s.master, s.music, s.sfx);
    if (this.gr.quality.setting !== s.quality) this.gr.quality.setSetting(s.quality);
    this.gr.applyQuality();
    if (s.keyBindings) this.input.keyBindings = { solo: cloneKeys(s.keyBindings.solo), left: cloneKeys(s.keyBindings.left), right: cloneKeys(s.keyBindings.right) };
    if (s.padBindings) this.input.padBindings = clonePad(s.padBindings);
    this.input.touch.setMode(s.touchSteer);
    this.input.touch.configure(s.touch, s.hudSize);
    this.input.touch.setCalm(s.reduceEffects);
    this.syncGlass();
    this.input.rumbleOn = s.rumble;
    this.fpsEl.style.display = s.showFps ? '' : 'none';
    this.playtestBadge.style.display = s.playtest ? '' : 'none';
  }

  saveSettings(): void {
    this.saves.saveSettings();
    this.applySettings();
  }

  toast(text: string, ms = 2200): void {
    const t = h('div', { class: 'toast' }, text);
    this.uiRoot.appendChild(t);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.remove(), ms);
    setTimeout(() => t.remove(), ms + 50);
  }

  // ---------------------------------------------------------------------------
  // loop
  // ---------------------------------------------------------------------------
  private step(dt: number): void {
    if (this.session && !this.paused) {
      const t0 = performance.now();
      this.session.step(dt);
      this.perf.step += (performance.now() - t0 - this.perf.step) * 0.05;
    }
  }

  private render(alpha: number, frameDt: number): void {
    const t0 = performance.now();
    const p = this.perf;
    p.frameTimes[p.cursor] = frameDt * 1000;
    p.cursor = (p.cursor + 1) % p.frameTimes.length;
    p.frames++;
    this.input.poll(frameDt);
    if (this.gr.quality.sample(frameDt)) this.gr.applyQuality();
    this.watchGlass(frameDt);
    if (this.saves.data && !this.paused) this.saves.data.playSeconds += frameDt;
    if (this.session) {
      if (!this.paused) {
        const p = this.input.anyPause();
        if (p >= 0 && this.session.active) this.pause();
      }
      this.session.render(this.paused ? 1 : alpha, this.paused ? 0 : frameDt);
    } else {
      this.menu.update(frameDt);
      this.menu.render();
      this.audio.update(null, [], frameDt);
    }
    p.render += (performance.now() - t0 - p.render) * 0.05;
    if (this.saves.settings.showFps) {
      const st = this.gr.stats();
      this.fpsEl.textContent = `${this.gr.quality.fps} fps · ${this.gr.quality.level}${this.gr.quality.renderScale < 1 ? ` ×${this.gr.quality.renderScale}` : ''} · ${st.calls} draws · sim ${p.step.toFixed(1)}ms · cpu ${p.render.toFixed(1)}ms`;
    }
  }

  // ---------------------------------------------------------------------------
  // input sources for 1-2 local players
  // ---------------------------------------------------------------------------
  inputSources(players: number): InputSource[] {
    if (players === 1) return [this.gr.isTouch && this.input.connectedPads().length === 0 ? { kind: 'any' } : { kind: 'any' }];
    const pads = this.input.connectedPads();
    if (pads.length >= 2) return [{ kind: 'combo', scheme: 'solo', index: pads[0] }, { kind: 'gamepad', index: pads[1] }];
    if (pads.length === 1) return [{ kind: 'keyboard', scheme: 'solo' }, { kind: 'gamepad', index: pads[0] }];
    return [
      { kind: 'keyboard', scheme: 'left' },
      { kind: 'keyboard', scheme: 'right' },
    ];
  }

  describeSources(players: number): string[] {
    return this.inputSources(players).map((s) => {
      switch (s.kind) {
        case 'any':
          return this.gr.isTouch ? 'Touch / Keyboard / Gamepad' : 'Keyboard or Gamepad';
        case 'keyboard':
          return s.scheme === 'left' ? 'Keyboard: W A S D + Shift / E' : s.scheme === 'right' ? 'Keyboard: Arrows + R-Shift / Enter' : 'Keyboard';
        case 'gamepad':
          return `Gamepad ${s.index + 1}`;
        case 'combo':
          return `Gamepad ${s.index + 1} + Keyboard`;
        case 'touch':
          return 'Touch';
      }
    });
  }

  kartFor(player: number): KartConfig {
    const racer = findRacer(this.flow.racers[player]);
    if (player === 0 && this.saves.data) {
      const saved = this.save.kart;
      return { ...saved };
    }
    return this.flow.karts[player] ?? { ...racer.defaultKart, paint: player === 1 ? 'ocean' : 'cherry', decal: 'none' };
  }

  // ---------------------------------------------------------------------------
  // races
  // ---------------------------------------------------------------------------
  startSession(cfg: SessionConfig, onDone: (r: SessionResult) => void): void {
    this.endSession();
    this.ui.clear();
    this.paused = false;
    this.loop.simPaused = false;
    try {
      this.session = new RaceSession({ gr: this.gr, input: this.input, audio: this.audio, uiRoot: this.uiRoot, settings: this.saves.settings }, cfg);
    } catch (e) {
      console.error(e);
      this.session = null;
      this.toast('Oops — that course failed to load.');
      this.screens.mainMenu();
      return;
    }
    this.gr.quality.adaptive = true;
    this.sessionFrames = this.perf.frames;
    this.sessionStart = performance.now();
    this.session.onComplete = (r) => {
      // keep rendering the finished scene behind the results screen
      this.loop.simPaused = true;
      this.recordPlaytest(false);
      onDone(r);
    };
    this.loop.resetClock();
  }

  /** Playtest mode: log this session's anonymous numbers (`quit` = left before the end). */
  private recordPlaytest(quit: boolean): void {
    const s = this.session;
    if (!s || !this.saves.settings.playtest || s.cfg.trackData || s.cfg.benchmark) return;
    if (quit && s.world.raceTime < 5) return; // backed out before really racing
    const secs = Math.max(0.001, (performance.now() - this.sessionStart) / 1000);
    try {
      this.playtest.add(
        buildPlaytestRecord(
          s,
          { input: this.input, settings: this.saves.settings, fps: (this.perf.frames - this.sessionFrames) / secs, tier: this.gr.quality.level, touchDevice: this.gr.isTouch },
          quit,
        ),
      );
    } catch (e) {
      console.warn('playtest record failed', e);
    }
  }

  endSession(): void {
    if (!this.session) return;
    if (!this.session.completed) this.recordPlaytest(true);
    this.session.dispose();
    this.session = null;
    this.paused = false;
    this.loop.simPaused = false;
    this.audio.suspend(false);
    // back in the menus: cross-fade to the menu theme (a new race replaces it immediately)
    this.audio.playMusic('menu');
  }

  pause(): void {
    if (!this.session || this.paused) return;
    this.paused = true;
    this.loop.simPaused = true;
    this.audio.suspend(true);
    this.input.inRace = false;
    this.input.touch.show(false);
    this.screens.pause();
  }

  resume(): void {
    if (!this.session) return;
    this.ui.closeOverlay();
    this.paused = false;
    this.loop.simPaused = false;
    this.loop.resetClock();
    this.input.inRace = true;
    const touch = this.gr.isTouch && this.session.locals.length === 1;
    this.input.touch.show(touch);
    this.audio.suspend(false);
  }

  /** Leave whatever is running and go back to the main menu. */
  quitToMenu(): void {
    this.ui.closeOverlay(false);
    this.endSession();
    this.gp = null;
    this.saves.flush();
    this.screens.mainMenu();
  }
}
