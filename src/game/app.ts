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
  battle: { time: number; aiCount: number };
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

  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly uiRoot: HTMLElement,
    readonly audio: GameAudio,
  ) {
    this.gr = new GameRenderer(canvas);
    this.input = new InputManager(uiRoot);
    this.saves = new SaveManager(this.gr.isTouch);
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
      battle: { time: 150, aiCount: 5 },
      tt: { ghost: 'both' },
    };
    this.fpsEl = h('div', { class: 'fps-meter' });
    uiRoot.appendChild(this.fpsEl);
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
      if (!document.hidden && !this.paused) this.audio.suspend(false);
    });
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
  applySettings(): void {
    const s = this.saves.settings;
    this.audio.setVolumes(s.master, s.music, s.sfx);
    if (this.gr.quality.setting !== s.quality) this.gr.quality.setSetting(s.quality);
    this.gr.applyQuality();
    if (s.keyBindings) this.input.keyBindings = { solo: cloneKeys(s.keyBindings.solo), left: cloneKeys(s.keyBindings.left), right: cloneKeys(s.keyBindings.right) };
    if (s.padBindings) this.input.padBindings = clonePad(s.padBindings);
    this.input.touch.setMode(s.touchSteer);
    this.fpsEl.style.display = s.showFps ? '' : 'none';
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
    this.session.onComplete = (r) => {
      // keep rendering the finished scene behind the results screen
      this.loop.simPaused = true;
      onDone(r);
    };
    this.loop.resetClock();
  }

  endSession(): void {
    if (!this.session) return;
    this.session.dispose();
    this.session = null;
    this.paused = false;
    this.loop.simPaused = false;
    this.audio.stopMusic(0.4);
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
