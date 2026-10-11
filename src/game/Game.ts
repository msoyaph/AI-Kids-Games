import { DT } from '../config/balance';
import { BANNERS, BANNER } from '../config/waves';
import { Ev } from '../core/events';
import { randomSeed } from '../core/rng';
import { SafeLocalStore } from '../core/storage';
import { InputManager, type UiAction } from '../input/InputManager';
import { applyRunResult, checkAchievements, metaBonuses, summarize } from '../meta/progression';
import { SaveManager } from '../meta/save';
import { GameRenderer } from '../render/Renderer';
import { characterDef } from '../config/characters';
import { newRun } from '../sim/run';
import { closeChest, step } from '../sim/sim';
import { Terrain } from '../sim/terrain';
import { reroll, resolveLevelUp } from '../sim/upgrades';
import { emptyInput, type UpgradeChoice, type World } from '../sim/world';
import { h } from '../ui/dom';
import { Menus, rewardText, type GameApi } from '../ui/menus';
import { UI } from '../ui/UI';

const MAX_STEPS_PER_FRAME = 5;
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
  private menuTerrain = new Terrain(MENU_SEED);
  private fpsEl: HTMLElement;
  // debug overlay
  private showDebug = false;
  private fpsFrames = 0;
  private fpsTime = 0;
  private fps = 0;
  private simMs = 0;
  private frameMs = 0;
  private debugT = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    overlay: HTMLCanvasElement,
    uiRoot: HTMLElement,
  ) {
    this.save = new SaveManager(new SafeLocalStore());
    this.renderer = new GameRenderer(canvas, overlay, this.save.data.settings.quality);
    this.input = new InputManager(canvas);
    this.ui = new UI(uiRoot);
    this.menus = new Menus(this);
    this.fpsEl = h('div', { class: 'fps hidden' });
    uiRoot.append(this.fpsEl);
    this.renderer.setTerrain(this.menuTerrain);
    this.input.onAction = (a) => this.onAction(a);
    this.applySettings();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    // pause when the tab / iframe loses focus
    window.addEventListener('blur', () => this.autoPause());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.autoPause();
    });
    document.addEventListener('pointerlockchange', () => {
      if (!this.input.pointerLocked && this.world && this.world.state === 'playing' && !this.paused) {
        this.lockLostAt = performance.now();
        this.pause();
      }
    });
  }

  resize(): void {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.resize(w, h);
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

  showcase(characterId: string): void {
    this.renderer.setCharacter(characterDef(characterId));
  }

  applySettings(): void {
    const s = this.save.data.settings;
    if (this.renderer.quality !== s.quality) this.renderer.setQuality(s.quality);
    this.input.sensitivity = s.sensitivity;
    this.input.invertY = s.invertY;
    this.input.setMouseMode(s.mouseMode);
    this.renderer.rig.shakeEnabled = s.screenShake;
    this.renderer.fx.numbers.enabled = s.damageNumbers;
    this.fpsEl.classList.toggle('hidden', !s.showFps);
    this.onSettings?.();
  }

  /** Audio volume hook (set in main). */
  onSettings: (() => void) | null = null;

  startRun(characterId: string, seed = randomSeed()): void {
    const params = new URLSearchParams(location.search);
    const stress = Number(params.get('stress') || 0);
    const fixedSeed = params.get('seed');
    const d = this.save.data;
    this.world = newRun({
      seed: fixedSeed ? Number(fixedSeed) : seed,
      characterId,
      stress,
      meta: metaBonuses(d),
      unlockedWeapons: d.unlockedWeapons,
    });
    const w = this.world;
    this.renderer.setTerrain(w.terrain);
    this.renderer.setCharacter(w.player.character);
    this.renderer.rig.yaw = 0;
    this.renderer.rig.pitch = 0.5;
    this.renderer.rig.snap(w.player.x, w.player.y, w.player.z);
    this.renderer.resetTransient();
    this.acc = 0;
    this.achT = 1;
    this.paused = false;
    this.lastWorldState = 'playing';
    this.ui.close();
    this.ui.hud.show(true);
    this.ui.hud.showBanner(BANNERS[BANNER.start]);
    this.setGameplayInput(true);
    this.onMode?.('run', w);
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
      // abandoning still banks what was earned
      w.state = 'dead';
      applyRunResult(this.save.data, summarize(w));
      this.save.save();
    }
    this.clearRun();
    this.menus.title();
  }

  clearRun(): void {
    this.world = null;
    this.paused = false;
    this.setGameplayInput(false);
    this.ui.hud.show(false);
    this.renderer.setTerrain(this.menuTerrain);
    this.renderer.resetTransient();
    this.renderer.playerView.hurt(0);
    this.onMode?.('menu', null);
  }

  // ───────────────────────────── run flow ─────────────────────────────

  private setGameplayInput(on: boolean): void {
    this.input.gameplay = on;
    this.input.clearTransient();
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
        this.showLevelUp(w);
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
    const summary = summarize(w);
    const outcome = applyRunResult(this.save.data, summary);
    this.save.save();
    this.onMode?.('end', w);
    this.menus.gameOver(summary, outcome, () => this.startRun(summary.characterId));
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
    this.ui.showLevelUp(w, pick, () => {
      if (reroll(w)) {
        this.sound('click');
        this.showLevelUp(w);
      } else this.sound('error');
    });
  }

  /** Achievements can pop mid-run (e.g. kill counts); rewards apply immediately. */
  private liveAchievements(w: World): void {
    const earned = checkAchievements(this.save.data, summarize(w));
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
        this.ui.hud.showBanner(BANNERS[id] ?? '', id >= 1 && id <= 3);
      } else if (t === Ev.PlayerHurt) {
        this.ui.hud.hurt();
        this.renderer.playerView.hurt();
      } else if (t === Ev.Land) {
        this.renderer.playerView.land(ev.get(n, 3));
      } else if (t === Ev.Evolve) {
        this.ui.hud.showBanner('Evolution!');
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
      const running = !this.paused && w.state === 'playing';
      if (running) {
        this.input.consumeLook(dt, this.look);
        this.renderer.rig.look(this.look.x, this.look.y);
        if (this.input.wheel !== 0) {
          this.renderer.rig.distance = Math.max(6, Math.min(20, this.renderer.rig.distance + this.input.wheel * 0.8));
          this.input.wheel = 0;
        }
        this.acc += dt;
        let steps = 0;
        const s0 = performance.now();
        while (this.acc >= DT && steps < MAX_STEPS_PER_FRAME && w.state === 'playing') {
          this.buildSimInput();
          this.simInput.jump = this.input.consumeJump();
          step(w, this.simInput);
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
      if (w.state !== 'dead' && w.state !== 'won') this.ui.hud.update(w, dt, w.stats.coins);
      this.onWorldState(w);
      this.simMs = this.simMs * 0.9 + simT * 0.1;
    } else {
      this.renderer.renderMenu(dt);
    }
    this.onFrame?.();
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
