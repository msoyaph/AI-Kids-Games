import { DT } from '../config/balance';
import { randomSeed } from '../core/rng';
import { InputManager } from '../input/InputManager';
import { GameRenderer } from '../render/Renderer';
import { step } from '../sim/sim';
import { Terrain } from '../sim/terrain';
import { createWorld, emptyInput, type World } from '../sim/world';

const MAX_STEPS_PER_FRAME = 5;

export class Game {
  readonly renderer: GameRenderer;
  readonly input: InputManager;
  world: World | null = null;
  private acc = 0;
  private last = 0;
  private simInput = emptyInput();
  private move = { x: 0, y: 0 };
  private look = { x: 0, y: 0 };
  private fwd = { x: 0, z: 0 };
  paused = false;

  constructor(private canvas: HTMLCanvasElement, overlay: HTMLCanvasElement) {
    this.renderer = new GameRenderer(canvas, overlay, 'high');
    this.input = new InputManager(canvas);
    this.renderer.setTerrain(new Terrain(1337));
    this.resize();
    window.addEventListener('resize', () => this.resize());
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

  startRun(characterId: string, seed = randomSeed()): void {
    this.world = createWorld({ seed, characterId });
    this.renderer.setTerrain(this.world.terrain);
    this.renderer.setCharacter(this.world.player.character);
    this.renderer.rig.yaw = 0;
    this.renderer.rig.snap(this.world.player.x, this.world.player.y, this.world.player.z);
    this.acc = 0;
    this.renderer.resetTransient();
    this.input.gameplay = true;
    this.input.clearTransient();
  }

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
    // right = (-fwd.z, fwd.x) rotated: for yaw 0 fwd=(0,-1) → right=(1,0)
    const rx = -this.fwd.z;
    const rz = this.fwd.x;
    i.moveX = rx * this.move.x + this.fwd.x * this.move.y;
    i.moveZ = rz * this.move.x + this.fwd.z * this.move.y;
    i.slide = this.input.slideHeld();
  }

  private frame = (now: number, schedule = true): void => {
    if (schedule) requestAnimationFrame(this.frame);
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (!(dt > 0)) dt = 0;
    dt = Math.min(dt, 0.25);
    this.input.poll(dt);

    const w = this.world;
    if (w && !this.paused) {
      this.input.consumeLook(dt, this.look);
      this.renderer.rig.look(this.look.x, this.look.y);
      this.acc += dt;
      let steps = 0;
      while (this.acc >= DT && steps < MAX_STEPS_PER_FRAME) {
        this.buildSimInput();
        this.simInput.jump = this.input.consumeJump();
        step(w, this.simInput);
        this.acc -= DT;
        steps++;
      }
      if (steps >= MAX_STEPS_PER_FRAME) this.acc = 0;
      this.renderer.fx.consume(w.events, w.player.x, w.player.y, w.player.z);
      w.events.clear();
      this.renderer.renderGame(w, this.acc / DT, dt);
    } else if (w) {
      this.renderer.renderGame(w, 1, 0);
    } else {
      this.renderer.renderMenu(dt);
    }
  };
}
