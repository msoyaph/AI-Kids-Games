import { applyA11y, watchSystemMotion } from './a11y';
import { AudioEngine } from '../audio/Audio';
import type { Atlas } from '../render/atlas/bake';
import { FpsGovernor, QUALITY_PROFILES, renderResolution, type QualityProfile, type QualityTier } from '../render/quality';
import type { Stage } from '../render/Stage';
import { clear } from '../ui/dom';
import { AchievementTracker } from './achievements';
import type { SaveStore } from './save';

export interface Screen {
  readonly el: HTMLElement;
  /** Screens that draw with Pixi keep the canvas visible and the ticker running. */
  readonly usesCanvas?: boolean;
  enter?(): void;
  exit?(): void;
  frame?(dtMs: number): void;
  resize?(w: number, h: number): void;
  /** Return true if handled (Escape / back). */
  back?(): boolean;
}

/**
 * Owns long-lived services (Pixi stage, atlas, save, audio, quality) and
 * routes between screens. Menus are DOM-only so the GPU idles.
 */
export class App {
  current: Screen | null = null;
  readonly audio = new AudioEngine();
  readonly achievements: AchievementTracker;
  readonly governor: FpsGovernor;
  quality: QualityProfile;
  private lastFrame = 0;

  constructor(
    readonly stage: Stage,
    readonly atlas: Atlas,
    readonly save: SaveStore,
    readonly ui: HTMLElement,
    readonly deviceTier: QualityTier,
    readonly bakeScale: number,
  ) {
    this.achievements = new AchievementTracker(save);
    const setting = save.data.settings.quality;
    const tier = setting === 'auto' ? deviceTier : setting;
    this.quality = QUALITY_PROFILES[tier];
    this.governor = new FpsGovernor(tier);
    this.audio.setVolumes(save.data.settings.music, save.data.settings.sfx);
    applyA11y(save.data.settings);
    watchSystemMotion(() => applyA11y(save.data.settings));
    stage.app.ticker.add(() => this.frame());
    stage.onResize((w, h) => this.current?.resize?.(w, h));
    this.applyResolution();

    // Unlock audio on the first gesture (iOS needs this).
    // iOS only counts touchend/click as a user activation for audio.
    const unlock = (): void => this.audio.unlock();
    for (const ev of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) addEventListener(ev, unlock, { passive: true, capture: true });

    addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.current?.back?.()) e.preventDefault();
    });
    // pending (debounced) saves must not be lost when the page closes or navigates
    addEventListener('pagehide', () => this.save.flush());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stage.app.ticker.stop();
        this.audio.suspend();
        this.save.flush(); // the tab may never come back
      } else {
        if (this.current?.usesCanvas) this.startTicker();
        this.audio.resume();
      }
    });
  }

  show(screen: Screen): void {
    this.current?.exit?.();
    this.current?.el.remove();
    clear(this.ui);
    this.current = screen;
    this.ui.appendChild(screen.el);
    const canvasHost = this.stage.app.canvas.parentElement;
    if (canvasHost) canvasHost.style.visibility = screen.usesCanvas ? 'visible' : 'hidden';
    screen.enter?.();
    if (screen.usesCanvas) this.startTicker();
    else this.stage.app.ticker.stop();
    screen.resize?.(this.stage.width, this.stage.height);
  }

  startTicker(): void {
    if (document.hidden) return;
    this.lastFrame = performance.now();
    if (!this.stage.app.ticker.started) this.stage.app.ticker.start();
  }

  /**
   * Runs on every rAF. Caps work at ~60 FPS on 90/120/144 Hz screens (saves
   * battery) while tolerating normal 60 Hz timing jitter, and measures real
   * elapsed time so skipped frames never slow the game down.
   */
  /** Test hook (flash audit): runs right after each render, while the frame is still readable. */
  afterRender: ((canvas: HTMLCanvasElement) => void) | null = null;

  private frame(): void {
    const now = performance.now();
    const dtMs = now - this.lastFrame;
    if (dtMs < 1000 / 60 - 6) return;
    this.lastFrame = now;
    const clamped = Math.min(dtMs, 250);
    this.current?.frame?.(clamped);
    this.stage.app.renderer.render(this.stage.app.stage);
    this.afterRender?.(this.stage.app.canvas);
    if (this.save.data.settings.quality === 'auto' && this.current?.usesCanvas) {
      const change = this.governor.sample(clamped, clamped / 1000);
      if (change) this.applyQuality(this.governor.tier);
    }
  }

  /** Called when the quality setting or the governor changes tier. */
  applyQuality(tier: QualityTier): void {
    this.quality = QUALITY_PROFILES[tier];
    this.applyResolution();
    (this.current as { onQualityChange?: (q: QualityProfile) => void } | null)?.onQualityChange?.(this.quality);
  }

  setQualitySetting(): void {
    const setting = this.save.data.settings.quality;
    const tier = setting === 'auto' ? this.deviceTier : setting;
    this.governor.reset(tier);
    this.applyQuality(tier);
  }

  private applyResolution(): void {
    const scale = this.save.data.settings.quality === 'auto' ? this.governor.resScale : 1;
    this.stage.setResolution(renderResolution(this.quality, scale));
  }
}
