/** Game client: owns sim, renderer, input and UI; runs the main loop. */
import { Container, Sprite } from 'pixi.js';
import { TILE, clamp } from '../core/math';
import { Input } from '../input/input';
import { Atlas } from '../render/atlas';
import { bakeAll, bakeCharacter } from '../render/art';
import type { Look } from '../render/art/characters';
import { createRenderer, type RenderHost } from '../render/renderer';
import { WorldView } from '../render/world-view';
import { Sim } from '../sim/sim';
import { seasonOf } from '../sim/state';

export interface GameOptions {
  bench: boolean;
  playtest: boolean;
  lowq: boolean;
  seed?: number;
}

export class Game {
  host!: RenderHost;
  atlas = new Atlas();
  playerAtlas = new Atlas();
  view!: WorldView;
  input = new Input();
  sim!: Sim;
  opts: GameOptions;
  stage = new Container();
  player = new Sprite();
  playerShadow = new Sprite();
  cam = { x: 0, y: 0 };
  private last = 0;
  private walkT = 0;
  running = false;
  fps = 60;
  private fpsAcc = 0;
  private fpsN = 0;

  constructor(opts: GameOptions) {
    this.opts = opts;
  }

  async init(parent: HTMLElement): Promise<void> {
    this.host = await createRenderer(parent, this.opts.lowq);
    bakeAll(this.atlas);
    this.atlas.bake();
    this.view = new WorldView(this.host.app.renderer, this.atlas);
    this.stage.addChild(this.view.root);
    this.host.app.stage.addChild(this.stage);
    this.player.anchor.set(0.5, 1);
    this.player.label = 'nocull';
    this.playerShadow.anchor.set(0.5, 0.5);
    this.playerShadow.alpha = 0.25;
    this.playerShadow.label = 'nocull';
    this.playerShadow.texture = this.atlas.tex('shadow');
  }

  startNew(): void {
    this.sim = Sim.newGame({ name: 'Farmer', farm: 'Cliffside', pet: 'dog', petName: 'Biscuit', seed: this.opts.seed });
    this.bakePlayer();
    this.enterLocation();
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }

  bakePlayer(): void {
    const l = this.sim.p.look;
    this.playerAtlas = new Atlas();
    bakeCharacter(this.playerAtlas, 'player', { ...l, hairStyle: l.hairStyle as Look['hairStyle'] });
    this.playerAtlas.bake();
  }

  enterLocation(): void {
    const loc = this.sim.here;
    this.view.setLoc(loc, seasonOf(this.sim.state.day));
    this.view.sorted.addChild(this.playerShadow, this.player);
    this.snapCamera();
  }

  private frame(t: number): void {
    if (!this.running) return;
    const dt = Math.min(0.05, Math.max(0, (t - this.last) / 1000));
    this.last = t;
    this.fpsAcc += dt;
    this.fpsN++;
    if (this.fpsAcc >= 0.5) {
      this.fps = this.fpsN / this.fpsAcc;
      this.fpsAcc = 0;
      this.fpsN = 0;
    }
    this.update(dt);
    this.render();
    requestAnimationFrame((tt) => this.frame(tt));
  }

  update(dt: number): void {
    const input = this.input;
    input.frame();
    input.drain();
    const before = this.sim.p.loc;
    this.sim.movePlayer(input.moveX, input.moveY, dt);
    if (this.sim.p.loc !== before) this.enterLocation();
    this.sim.update(dt);
    this.walkT = this.sim.moving ? this.walkT + dt : 0;
  }

  snapCamera(): void {
    this.cam.x = this.sim.p.x;
    this.cam.y = this.sim.p.y - 8;
    this.clampCamera();
  }

  private clampCamera(): void {
    const loc = this.sim.here;
    const z = this.host.zoom;
    const vw = this.host.width / z, vh = this.host.height / z;
    const mw = loc.w * TILE, mh = loc.h * TILE;
    this.cam.x = mw <= vw ? mw / 2 : clamp(this.cam.x, vw / 2, mw - vw / 2);
    this.cam.y = mh <= vh ? mh / 2 : clamp(this.cam.y, vh / 2, mh - vh / 2);
  }

  render(): void {
    const p = this.sim.p;
    // player sprite
    const frame = this.sim.moving ? (Math.floor(this.walkT * 8) % 4 === 1 ? 1 : Math.floor(this.walkT * 8) % 4 === 3 ? 2 : 0) : 0;
    this.player.texture = this.playerAtlas.tex(`ch.player.${p.dir}.${frame}`);
    this.player.x = Math.round(p.x);
    this.player.y = Math.round(p.y) + 1;
    this.player.zIndex = this.player.y;
    this.playerShadow.x = this.player.x;
    this.playerShadow.y = this.player.y - 1;
    this.playerShadow.zIndex = this.player.y - 2;
    // camera follow (smooth, pixel-snapped)
    const tx = p.x, ty = p.y - 8;
    this.cam.x += (tx - this.cam.x) * 0.2;
    this.cam.y += (ty - this.cam.y) * 0.2;
    this.clampCamera();
    const z = this.host.zoom;
    const camX = Math.round(this.cam.x * z) / z, camY = Math.round(this.cam.y * z) / z;
    this.view.root.scale.set(z);
    this.view.root.x = Math.round(this.host.width / 2 - camX * z);
    this.view.root.y = Math.round(this.host.height / 2 - camY * z);
    this.view.view.x = camX - this.host.width / 2 / z;
    this.view.view.y = camY - this.host.height / 2 / z;
    this.view.view.w = this.host.width / z;
    this.view.view.h = this.host.height / z;
    this.view.update();
    this.host.app.render();
  }
}
