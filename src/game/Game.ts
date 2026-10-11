import { DT } from '../config/balance';
import { BANNERS, BANNER } from '../config/waves';
import { Ev } from '../core/events';
import { randomSeed } from '../core/rng';
import { InputManager, type UiAction } from '../input/InputManager';
import { GameRenderer } from '../render/Renderer';
import { newRun } from '../sim/run';
import { closeChest, step } from '../sim/sim';
import { Terrain } from '../sim/terrain';
import { reroll, resolveLevelUp } from '../sim/upgrades';
import { emptyInput, type UpgradeChoice, type World } from '../sim/world';
import { h } from '../ui/dom';
import { UI } from '../ui/UI';

const MAX_STEPS_PER_FRAME = 5;

export class Game {
  readonly renderer: GameRenderer;
  readonly input: InputManager;
  readonly ui: UI;
  world: World | null = null;
  paused = false;
  private acc = 0;
  private last = 0;
  private simInput = emptyInput();
  private move = { x: 0, y: 0 };
  private look = { x: 0, y: 0 };
  private fwd = { x: 0, z: 0 };
  private lastWorldState: World['state'] = 'playing';
  private lockLostAt = -1e9;
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
    this.renderer = new GameRenderer(canvas, overlay, 'high');
    this.input = new InputManager(canvas);
    this.ui = new UI(uiRoot);
    this.renderer.setTerrain(new Terrain(1337));
    this.input.onAction = (a) => this.onAction(a);
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
    requestAnimationFrame(this.frame);
  }

  // ───────────────────────────── run lifecycle ─────────────────────────────

  startRun(characterId: string, seed = randomSeed()): void {
    const params = new URLSearchParams(location.search);
    const stress = Number(params.get('stress') || 0);
    const fixedSeed = params.get('seed');
    this.world = newRun({ seed: fixedSeed ? Number(fixedSeed) : seed, characterId, stress, unlockedWeapons: ['wispBees', 'frostFan'] });
    const w = this.world;
    this.renderer.setTerrain(w.terrain);
    this.renderer.setCharacter(w.player.character);
    this.renderer.rig.yaw = 0;
    this.renderer.rig.snap(w.player.x, w.player.y, w.player.z);
    this.renderer.resetTransient();
    this.acc = 0;
    this.paused = false;
    this.lastWorldState = 'playing';
    this.ui.close();
    this.ui.hud.show(true);
    this.ui.hud.showBanner(BANNERS[BANNER.start]);
    this.setGameplayInput(true);
  }

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
    const resume = (): void => this.resume();
    const el = h(
      'div',
      { class: 'modal panel' },
      h('div', { class: 'title' }, 'Paused'),
      h('button', { class: 'btn primary', onclick: resume, 'data-autofocus': true }, 'Resume'),
      h('button', { class: 'btn ghost', onclick: () => this.endRun() }, 'Give up'),
    );
    this.ui.show('pause', el, resume);
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.ui.close();
    this.setGameplayInput(true);
  }

  private autoPause(): void {
    if (this.world && this.world.state === 'playing' && !this.paused) this.pause();
  }

  endRun(): void {
    const w = this.world;
    if (!w) return;
    w.state = 'dead';
    this.paused = false;
    this.ui.close();
    this.onWorldState(w);
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
      if (this.paused) this.resume();
      else if (this.world && this.world.state === 'playing' && !this.ui.hasScreen) this.pause();
      return;
    }
    this.ui.handleAction(a);
  }

  /** React to sim state transitions (level-up, chest, death, victory). */
  private onWorldState(w: World): void {
    if (w.state === this.lastWorldState && w.state !== 'levelup') return;
    this.lastWorldState = w.state;
    switch (w.state) {
      case 'levelup':
        if (this.ui.screenName !== 'levelup') this.showLevelUp(w);
        break;
      case 'chest':
        this.setGameplayInput(false);
        this.ui.showChest(w.chestRewards, () => {
          closeChest(w);
          this.ui.close();
          this.lastWorldState = w.state;
          this.setGameplayInput(true);
        });
        break;
      case 'dead':
      case 'won':
        this.setGameplayInput(false);
        this.ui.hud.show(false);
        this.ui.show(
          'gameover',
          h('div', { class: 'modal panel' }, h('div', { class: 'title' }, w.state === 'won' ? 'Dawn breaks!' : 'Bonked!'), h('div', { class: 'subtitle' }, `Kills: ${w.stats.kills} · Level ${w.player.level}`), h('button', { class: 'btn primary', onclick: () => this.startRun(w.player.character.id), 'data-autofocus': true }, 'Try again')),
        );
        break;
      default:
        break;
    }
  }

  private showLevelUp(w: World): void {
    this.setGameplayInput(false);
    const pick = (c: UpgradeChoice | null): void => {
      const more = resolveLevelUp(w, c);
      if (more) this.showLevelUp(w);
      else {
        this.ui.close();
        this.lastWorldState = w.state;
        this.setGameplayInput(true);
      }
    };
    this.ui.showLevelUp(w, pick, () => {
      if (reroll(w)) this.showLevelUp(w);
    });
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
      if (!this.paused && w.state === 'playing') {
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
      }
      this.processEvents(w);
      this.renderer.fx.consume(w.events, w.player.x, w.player.y, w.player.z);
      w.events.clear();
      const running = !this.paused && w.state === 'playing';
      this.renderer.renderGame(w, running ? this.acc / DT : 1, running ? dt : 0);
      this.ui.hud.update(w, dt, w.stats.coins);
      this.onWorldState(w);
      this.simMs = this.simMs * 0.9 + simT * 0.1;
    } else {
      this.renderer.renderMenu(dt);
    }
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
      `triangles  ${info.render.triangles}`,
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
