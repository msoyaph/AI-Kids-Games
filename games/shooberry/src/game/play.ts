// One level being played: the rules (a GameState stepped at a fixed 60 Hz, at 1× or 2×), the
// commands waiting for the next step (a quick tap between frames is latched and used, never lost),
// the short-lived effects the rules' events make (poofs, sparkles, chime rings, an umbrella's fwump),
// the sounds, the music's intensity and the wave banners. It knows nothing about the DOM.
import { sfx } from '../audio/engine';
import type { Music } from '../audio/music';
import { SIM } from '../data/tuning';
import { laneZ } from '../sim/board';
import { createGame, step } from '../sim/game';
import { rng } from '../sim/rng';
import type { Command, GameEvent, GameState, LevelSpec, PlantId } from '../sim/types';
import type { DrawInput, LeafSprite, RingSprite, SparkleSprite } from '../render/view';
import type { Tile } from '../sim/board';
import { UMBRELLA_X, laneUmbrellaZ } from '../render/garden';

interface Leaf extends LeafSprite { vx: number; vy: number; vz: number; life: number }
interface Sparkle extends SparkleSprite { vy: number; life: number; full: number }
interface Ring extends RingSprite { life: number; full: number }

const LEAVES = [0x8fe05a, 0xa6ec6c, 0xffd23a, 0x5fb33a];
const DIRT = [0x8a5432, 0xa86a3c, 0x6a3d22];
const SPARKS = [0xffffff, 0xfff3a0, 0xffe0f0];
const STEP = 1 / SIM.stepHz;

export interface Banner { text: string; kind: 'wave' | 'final' | 'boss'; until: number }

export class Play {
  readonly game: GameState;
  speed: 1 | 2;
  /** Tests only: run the rules this many times faster (?testmode=1&speed=N). */
  testSpeed = 1;
  /** Tests only: a bot that plays each step (?testmode=1&bot=good|casual). */
  autopilot: ((g: GameState) => Command[]) | null = null;
  paused = false;
  readonly leaves: Leaf[] = [];
  readonly sparkles: Sparkle[] = [];
  readonly rings: Ring[] = [];
  readonly umbrellaAt = [-10, -10, -10, -10, -10];
  /** Which critters took snacks (for the "Try again!" hint). */
  readonly thieves: string[] = [];
  banner: Banner | null = null;
  /** Collected compost recently (for the counter's little bump), and taps used. */
  bump = 0;
  tapsTaken = 0;
  private queue: Command[] = [];
  private acc = 0;
  private combo = 0;
  private lastCollect = -10;
  private readonly rnd: () => number;
  onEvent: (e: GameEvent) => void = () => {};

  constructor(readonly spec: LevelSpec, seeds: PlantId[], opts: { seed: number; autoCollect: boolean; speed: 1 | 2 }, private readonly music?: Music) {
    this.game = createGame(spec, seeds, { seed: opts.seed, autoCollect: opts.autoCollect });
    this.speed = opts.speed;
    this.rnd = rng(opts.seed + 99);
  }

  /** Queues a command for the next step (taps between frames are kept, never dropped). */
  command(cmd: Command) { this.queue.push(cmd); }

  /** Advances by a real frame time (seconds). */
  tick(real: number) {
    const dt = Math.min(real, SIM.maxFrame);
    if (!this.paused && !this.game.result) {
      this.acc += dt * this.speed * this.testSpeed;
      let steps = 0;
      while (this.acc >= STEP && steps < 60 * 8 && !this.game.result) {
        const cmds = this.queue.splice(0);
        this.tapsTaken += cmds.length;
        if (this.autopilot) cmds.push(...this.autopilot(this.game));
        step(this.game, STEP, cmds);
        for (const e of this.game.events) this.handle(e);
        this.game.events.length = 0;
        this.acc -= STEP;
        steps++;
      }
      // a command sent while the rules were already finishing a frame waits for the next one
    } else this.acc = 0;
    this.updateEffects(this.paused ? 0 : dt * this.speed);
    if (this.music) {
      const busy = this.game.critters.length;
      this.music.intensity = this.banner && this.banner.until > this.game.t ? 3 : busy > 4 ? 2 : busy > 0 ? 1 : 0;
    }
  }

  private poof(x: number, z: number, y: number, n: number, colors = LEAVES, sparkles = 0) {
    for (let i = 0; i < n && this.leaves.length < 210; i++) {
      const a = this.rnd() * Math.PI * 2, sp = 0.7 + this.rnd() * 1.0;
      this.leaves.push({ x, y, z, vx: Math.cos(a) * sp, vy: 1.4 + this.rnd() * 1.2, vz: Math.sin(a) * sp * 0.4, spin: this.rnd() * 6, size: 1 + this.rnd() * 0.7, color: colors[i % colors.length]!, life: 0.9 + this.rnd() * 0.4 });
    }
    for (let i = 0; i < sparkles && this.sparkles.length < 130; i++) {
      const life = 0.6 + this.rnd() * 0.3;
      this.sparkles.push({ x: x + (this.rnd() - 0.5) * 0.6, y: y + this.rnd() * 0.5, z, vy: 0.5 + this.rnd() * 0.4, size: 1 + this.rnd() * 0.8, color: SPARKS[i % 3]!, life, full: life });
    }
  }

  private ring(x: number, z: number, size: number, life = 0.6) {
    if (this.rings.length < 20) this.rings.push({ x, z, age: 0, size, life, full: life });
  }

  private handle(e: GameEvent) {
    const g = this.game;
    switch (e.type) {
      case 'plant': this.poof(e.col + 0.5, laneZ(e.lane), 0.15, 6, DIRT, 3); sfx('plant'); break;
      case 'dig': this.poof(e.col + 0.5, laneZ(e.lane), 0.15, 8, DIRT); sfx('dig'); break;
      case 'fire':
        if (e.shot === 'chime') { this.ring(e.x, laneZ(e.lane), 0.9); sfx('chime'); }
        else if (e.shot === 'seeds') { this.poof(e.x, laneZ(e.lane), 0.4, 3, LEAVES, 2); sfx('seeds'); }
        else if (e.shot === 'samara' || e.shot === 'disc') sfx('lob');
        else if (e.shot === 'pod') sfx('pod');
        else if (e.shot === 'pinecone') sfx('pinecone');
        else sfx('flick', e.shot === 'floss' ? 1.3 : e.shot === 'dart' ? 1.15 : 1);
        break;
      case 'hit': if (e.blocked) sfx('tink'); else { this.poof(e.x, laneZ(e.lane), 0.5, 2); sfx('hit', 0.9 + this.rnd() * 0.3); } break;
      case 'shoo': this.poof(e.x, laneZ(e.lane), 0.4, 10, LEAVES, 6); sfx('shoo'); break;
      case 'wilt': this.poof(e.col + 0.5, laneZ(e.lane), 0.3, 7, [0x9a7a4a, 0x8fe05a, 0xc9a46a]); sfx('wilt'); break;
      case 'produce': this.poof(e.col + 0.7, laneZ(e.lane), 0.5, 0, LEAVES, 2); sfx('produce'); break;
      case 'pickup': sfx('pickup'); break;
      case 'collect': {
        this.combo = g.t - this.lastCollect < 1.2 ? this.combo + 1 : 0;
        this.lastCollect = g.t;
        this.poof(e.x, laneZ(e.lane), 0.5, 0, LEAVES, 3);
        sfx('collect', 2 ** (Math.min(this.combo, 7) / 12));
        this.bump = 0.35;
        break;
      }
      case 'umbrella': this.umbrellaAt[e.lane] = g.t; this.ring(UMBRELLA_X, laneUmbrellaZ(e.lane), 1.4, 0.8); this.poof(UMBRELLA_X + 0.4, laneZ(e.lane), 0.6, 6, [0xff4f5e, 0xfff6e6], 4); sfx('umbrella'); break;
      case 'snack': this.thieves.push(e.kind); sfx('snack'); break;
      case 'wave': {
        const boss = g.spec.waves[e.index]?.spawns.some(s => ['grand-snail', 'big-beetle', 'badger-baron', 'billy-goat', 'captain-gull', 'parade-float'].includes(s.critter));
        if (e.final || e.flag || boss) {
          this.banner = { text: boss ? 'Something big is coming!' : e.final ? 'Last wave! Here they come!' : 'Here comes a crowd!', kind: boss ? 'boss' : e.final ? 'final' : 'wave', until: g.t + 3 };
          sfx(e.flag || e.final ? 'bigwave' : 'wave');
        }
        break;
      }
      case 'molehill': sfx('molehill'); break;
      case 'swap': this.poof(e.col + 0.5, laneZ(e.lane), 0.3, 6, LEAVES, 2); sfx('swap'); break;
      case 'drop': this.poof(e.col + 0.5, laneZ(e.lane), 0.3, 4, LEAVES); sfx('swap'); break;
      case 'push': sfx('push'); break;
      case 'boss': sfx('boss'); break;
      case 'won': sfx('won'); break;
      case 'lost': sfx('lost'); break;
    }
    this.onEvent(e);
  }

  private updateEffects(dt: number) {
    for (let i = this.leaves.length - 1; i >= 0; i--) {
      const l = this.leaves[i]!;
      l.life -= dt; l.vy -= 4.5 * dt;
      l.x += l.vx * dt; l.y = Math.max(0.02, l.y + l.vy * dt); l.z += l.vz * dt; l.spin += dt * 5;
      if (l.life <= 0) this.leaves.splice(i, 1);
    }
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const s = this.sparkles[i]!;
      s.life -= dt; s.y += s.vy * dt; s.size = Math.max(0, (s.life / s.full) * 1.6);
      if (s.life <= 0) this.sparkles.splice(i, 1);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i]!;
      r.life -= dt; r.age = 1 - r.life / r.full;
      if (r.life <= 0) this.rings.splice(i, 1);
    }
    this.bump = Math.max(0, this.bump - dt);
  }

  frame(t: number, reduced: boolean, highlight: Tile | null, highlightOk: boolean): DrawInput {
    return { t, reduced, game: this.game, leaves: this.leaves, sparkles: this.sparkles, rings: this.rings, umbrellaAt: this.umbrellaAt, highlight, highlightOk };
  }
}
