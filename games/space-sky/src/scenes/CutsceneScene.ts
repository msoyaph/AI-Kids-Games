import { Group, Vector3 } from 'three';
import { comfortOn } from '../app/comfort';
import { Scene3D } from '../app/Scene3D';
import { S } from '../app/services';
import { sfx } from '../audio/sfx';
import { dialogue } from '../data/dialogue';
import { Particles3 } from '../r3/fx/particles';
import { dueCues, fromHere, makeSample, samplePath, type CamKey } from '../systems/timeline';
import { showDialogue } from '../ui/dialogue';
import { h } from '../ui/dom';
import { celebrate } from '../ui/fx';
import { button } from '../ui/widgets';
import { academyStage } from './academyStage';
import { FinaleStaging, StarpathStaging, WormholeStaging, ZibboStaging, type StageCtx, type Staging } from './cutscenes';

export interface CutsceneParams {
  id: string;
}

type Backdrop = 'academy' | 'space' | 'wormhole' | 'zephyra';

interface CutsceneDef {
  backdrop: Backdrop;
  cast: string[];
  lines: string;
  /** Where to go afterwards. */
  next: () => void;
}

const FIREWORK_COLORS = ['#ff5d73', '#ffe066', '#8cff66', '#4dd4ff', '#ff7ad9', '#9b6bff'];

/** Done callbacks so the presenter can wait for a cutscene to finish. */
export const cutsceneWaiters: Array<() => void> = [];

function finishWaiters(): void {
  while (cutsceneWaiters.length) cutsceneWaiters.shift()!();
}

const CUTSCENES: Record<string, CutsceneDef> = {
  zibbo: {
    backdrop: 'academy',
    cast: ['stella', 'player', 'zibbo', 'pip'],
    lines: 'cs_zibbo',
    next: () => void S.game.go('hub'),
  },
  starpath: {
    backdrop: 'space',
    cast: ['zibbo', 'player'],
    lines: 'cs_starpath',
    next: () => void S.game.go('hub'),
  },
  wormhole: {
    backdrop: 'wormhole',
    cast: [],
    lines: 'cs_wormhole',
    next: () => {
      S.state.data.location = 'zephyra';
      void S.game.go('flight', { from: 'zephyra', to: 'zephyra' });
    },
  },
  finale: {
    backdrop: 'zephyra',
    cast: ['ollo', 'zibbo', 'player', 'pibble', 'wobb'],
    lines: 'cs_finale',
    next: () => {
      S.state.data.location = 'earth';
      void S.game.go('credits');
    },
  },
};

/**
 * Short story scenes in 3D, staged like little films: an establishing camera move, then a shot for
 * every dialogue line (the speaker gets the camera and acts it out), timed moments (the beacon
 * relighting, the jump into the wormhole), fireworks, and a closing move. Skip any time.
 * Camera moves are smooth timeline paths (systems/timeline.ts); nothing rolls or shakes.
 */
export class CutsceneScene extends Scene3D {
  private def: CutsceneDef;
  private staging: Staging;
  private set = new Group();
  private fx: Particles3;
  private path: CamKey[];
  private pathStart = 0;
  private readonly cam = makeSample();
  private readonly look = new Vector3();
  private readonly fired: string[] = [];
  private prevT = 0;
  private lastTime = 0;
  private phase: 'intro' | 'talk' | 'outro' | 'done' = 'intro';
  private outroEnd = Infinity;
  private done = false;
  private fireworkT = 0.4;
  private flashEl: HTMLElement;

  constructor(private readonly p: CutsceneParams) {
    const def = CUTSCENES[p.id] ?? CUTSCENES.zibbo;
    const shared = def.backdrop === 'academy' ? academyStage() : null;
    super('cutscene', shared?.world);
    this.def = def;
    this.music = p.id === 'finale' ? 'finale' : p.id === 'wormhole' ? 'wormhole' : 'hub';
    const skip = button('Skip', 'next', () => this.finish(), { size: 'small', color: 'white', id: 'btn-skip' });
    this.flashEl = h('div', { class: 'cs-flash' });
    this.ui.append(this.flashEl, h('div', { class: 'cutscene-skip' }, skip));
    this.fx = new Particles3(Math.min(700, S.game.r3.profile.particles), 'spark');
    this.fx.gravity = 1.6;
    this.fx.drag = 1.1;
    this.local.add(this.set, this.fx.points);
    if (!shared) this.world.add(this.local);
    const ctx: StageCtx = { world: this.world, set: this.set, camera: this.camera, fx: this.fx, flash: () => this.flash() };
    this.staging =
      def.backdrop === 'academy' ? new ZibboStaging(ctx, def.cast)
      : def.backdrop === 'space' ? new StarpathStaging(ctx)
      : def.backdrop === 'wormhole' ? new WormholeStaging(ctx)
      : new FinaleStaging(ctx, def.cast);
    this.path = this.staging.intro;
    this.camera.near = 0.2;
    this.camera.far = 3000;
  }

  override async enter(): Promise<void> {
    this.place(0);
    if (this.p.id === 'wormhole') sfx('whoosh');
  }

  /** Lines play over the staging; each line cuts to its shot. */
  private async play(): Promise<void> {
    this.phase = 'talk';
    await showDialogue(dialogue(this.def.lines), {
      onLine: (i, line) => {
        const t = this.time;
        this.staging.line(i, line);
        this.go(this.staging.shot(i, line, t), t);
      },
    });
    if (this.done) return;
    const t = this.time;
    this.go(this.staging.outro(t), t);
    this.phase = 'outro';
    this.outroEnd = t + this.staging.outroLen;
    if (this.p.id === 'finale') celebrate(120);
  }

  /** Start a camera move from wherever the camera is now. */
  private go(keys: CamKey[], t: number): void {
    samplePath(this.path, t - this.pathStart, this.cam);
    this.path = fromHere(this.cam, keys);
    this.pathStart = t;
  }

  private flash(): void {
    this.flashEl.classList.remove('on');
    void this.flashEl.offsetWidth;
    this.flashEl.classList.add('on');
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    this.phase = 'done';
    this.def.next();
    finishWaiters();
  }

  override exit(): void {
    this.staging.restore?.();
  }

  override back(): boolean {
    this.finish();
    return true;
  }

  override resize(w: number, hh: number): void {
    super.resize(w, hh);
    this.fx.setScreen(window.innerHeight * S.game.r3.pixelRatio);
  }

  private place(t: number): void {
    samplePath(this.path, t - this.pathStart, this.cam);
    this.camera.position.set(this.cam.pos[0], this.cam.pos[1], this.cam.pos[2]);
    this.camera.lookAt(this.look.set(this.cam.look[0], this.cam.look[1], this.cam.look[2]));
    if (Math.abs(this.camera.fov - this.cam.fov) > 0.01) {
      this.camera.fov = this.cam.fov;
      this.camera.updateProjectionMatrix();
    }
  }

  /** Everything runs here (dialogue freezes `update`, the film keeps going). */
  override render(): void {
    const t = this.time;
    const dt = Math.min(0.1, Math.max(0, t - this.lastTime)) || 1 / 60;
    this.lastTime = t;
    if (this.phase === 'intro' && t >= this.staging.dialogueAt) void this.play();
    for (const id of dueCues(this.staging.cues, this.prevT, t, this.fired)) this.staging.cue(id);
    this.prevT = t;
    this.place(t);
    this.staging.update(dt, t);
    this.staging.stage?.update(dt, t);
    this.fireworks(dt);
    this.fx.update(dt);
    if (this.phase === 'outro' && t >= this.outroEnd) this.finish();
  }

  private fireworks(dt: number): void {
    const c = this.staging.fireworks;
    if (!c) return;
    this.fireworkT -= dt;
    if (this.fireworkT > 0) return;
    this.fireworkT = 0.5 + Math.random() * 0.6;
    const x = c.x + (Math.random() - 0.5) * 20;
    const y = c.y + Math.random() * 5;
    const z = c.z - Math.random() * 6;
    const col = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
    this.fx.burst(x, y, z, comfortOn() ? 24 : 40, 6, 1.3, 0.35, col);
    this.fx.burst(x, y, z, 14, 3.5, 1, 0.22, '#ffffff');
    sfx('firework', { volume: 0.5 });
  }
}
