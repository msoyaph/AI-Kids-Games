// Driving School lesson rules (headless — the same code runs in the game and in tests/calibration).
// Lessons place gates, rings, balloon targets and goo puddles on the two practice courses, keep score and
// decide when the lesson is over. Kart 0 is the learner.
import type { LessonData, LessonMedal } from '../data/school';
import { medalFor } from '../data/school';
import type { World } from './world';
import type { TrackModel } from './track/trackModel';
import type { RaceTracker } from './race';
import type { ItemSystem } from './items/itemSystem';
import { ItemState } from './items/itemSystem';
import { RespawnState } from './kart';

export interface Gate {
  x: number;
  y: number;
  z: number;
  /** Road heading at the gate (for drawing). */
  yaw: number;
  s: number;
  d: number;
  width: number;
  /** 0 = waiting, 1 = passed, 2 = missed. */
  state: 0 | 1 | 2;
}

export interface Ring {
  x: number;
  y: number;
  z: number;
  yaw: number;
  radius: number;
  got: boolean;
}

export interface Target {
  x: number;
  y: number;
  z: number;
  popped: boolean;
}

/** Ring heights above the lip of the glider ramp, measured from a real glide (fractions of the gap). */
const RING_PATH: Array<[number, number]> = [
  [0.14, 3.8],
  [0.32, 4.9],
  [0.5, 4.6],
  [0.68, 3.2],
  [0.86, 1.4],
];

export class LessonSim {
  readonly gates: Gate[] = [];
  readonly rings: Ring[] = [];
  readonly targets: Target[] = [];
  readonly goo: Array<{ x: number; z: number }> = [];
  done = false;
  score = 0;
  /** Rocket lesson: points per attempt (3 perfect, 2 boost, 0 otherwise). */
  readonly starts: number[] = [];
  private attemptTimer = 0;
  private lastS = -1;
  private gooHits = 0;
  private elapsed = 0;

  constructor(
    readonly lesson: LessonData,
    readonly world: World,
    readonly track: TrackModel,
    readonly race: RaceTracker,
    readonly items: ItemSystem | null,
  ) {
    const rb = track.main;
    const L = track.length;
    const k = world.karts[0];
    if (lesson.id === 'steering') {
      // ten gates spread around the lap, drawn on (and either side of) the racing line
      for (let g = 0; g < 10; g++) {
        const s = 40 + ((L - 70) * g) / 9;
        const i = rb.indexAtS(s);
        const d = Math.max(-rb.hw[i] + 3.5, Math.min(rb.hw[i] - 3.5, track.line[i] * 0.7 + (g % 2 ? 1.6 : -1.6)));
        this.gates.push({ x: rb.px[i] + rb.rx[i] * d, y: rb.py[i], z: rb.pz[i] + rb.rz[i] * d, yaw: Math.atan2(rb.tx[i], rb.tz[i]), s, d, width: 7, state: 0 });
      }
    } else if (lesson.id === 'gliders') {
      const m = track.data.marks ?? {};
      const s0 = rb.sAtU(m.lip ?? 0);
      const s1 = rb.sAtU(m.gapEnd ?? 0);
      const y0 = rb.py[rb.indexAtS(s0)];
      for (const [f, h] of RING_PATH) {
        const i = rb.indexAtS(s0 + (s1 - s0) * f);
        // halfway between the road centre and the racing line, where gliders naturally fly
        const d = track.line[i] * 0.5;
        this.rings.push({ x: rb.px[i] + rb.rx[i] * d, y: y0 + h, z: rb.pz[i] + rb.rz[i] * d, yaw: Math.atan2(rb.tx[i], rb.tz[i]), radius: 3.4, got: false });
      }
    } else if (lesson.id === 'items') {
      // balloon targets on straights, goo puddles on other straights (all on the racing line)
      const spots: number[] = [];
      for (let s = 50; s < L - 25; s += 5) {
        const i = rb.indexAtS(s);
        let straight = true;
        for (let q = -6; q <= 20; q += 4) if (Math.abs(track.lineCurv[rb.idx(i + Math.round(q / rb.ds))]) > 1 / 70) straight = false;
        if (straight && (!spots.length || s - spots[spots.length - 1] > 24)) spots.push(s);
      }
      spots.forEach((s, n) => {
        const i = rb.indexAtS(s);
        const d = track.line[i];
        const x = rb.px[i] + rb.rx[i] * d;
        const z = rb.pz[i] + rb.rz[i] * d;
        if (n % 3 === 2 && this.goo.length < 3) {
          this.goo.push({ x, z });
          items?.placeHazard('gooPuddle', x, rb.py[i] + 0.05, z);
        } else if (this.targets.length < 6) this.targets.push({ x, y: rb.py[i], z, popped: false });
      });
      const prev = items?.onHit;
      if (items)
        items.onHit = (victim, attacker, item, effect) => {
          prev?.(victim, attacker, item, effect);
          if (victim.index === 0 && effect === 'goo') this.gooHits++;
        };
    } else if (lesson.id === 'shortcuts') {
      if (items) items.give(k, 'turbo3');
    }
    world.postStep.push((dt) => this.update(dt));
  }

  private update(dt: number): void {
    const w = this.world;
    const k = w.karts[0];
    if (this.done) return;
    if (w.phase === 'race') this.elapsed += dt;
    const lesson = this.lesson;
    switch (lesson.id) {
      case 'steering': {
        const s = k.ground.s;
        if (this.lastS >= 0 && k.respawnState === RespawnState.None && k.ground.ribbon === 0) {
          for (const g of this.gates) {
            if (g.state !== 0) continue;
            const crossed = this.lastS < g.s && s >= g.s && s - this.lastS < 20;
            if (!crossed) continue;
            g.state = Math.abs(k.ground.d - g.d) <= g.width / 2 ? 1 : 2;
            w.events.push({ type: 'lesson', kind: g.state === 1 ? 'gate' : 'miss', x: g.x, y: g.y + 3, z: g.z });
          }
        }
        this.lastS = s;
        if (k.finished) {
          for (const g of this.gates) if (g.state === 0) g.state = 2;
          this.finish(k.finishTime + 2 * this.missed);
        }
        break;
      }
      case 'drifting':
        this.score = k.raceStats.miniTurbos[0] + 2 * k.raceStats.miniTurbos[1] + 3 * k.raceStats.miniTurbos[2];
        if (this.elapsed >= lesson.timeLimit) this.finish(this.score);
        break;
      case 'rocket': {
        if (w.phase !== 'race') break;
        this.attemptTimer += dt;
        if (this.attemptTimer < 1.4) break;
        const r = k.raceStats.startResult;
        this.starts.push(r === 2 ? 3 : r === 1 ? 2 : 0);
        this.score = this.starts.reduce((a, b) => a + b, 0);
        if (this.starts.length >= 3) {
          this.finish(this.score);
          break;
        }
        // back to the grid for another go
        this.attemptTimer = 0;
        this.race.placeGrid([0]);
        k.speed = k.vx = k.vz = k.vy = 0;
        k.boostTime = 0;
        k.startPress = -1;
        k.raceStats.startResult = 0;
        k.input.throttle = 0;
        w.phase = 'countdown';
        w.phaseTime = 0;
        w.raceTime = 0;
        break;
      }
      case 'items': {
        // keep the learner stocked with Bumper Balls
        if (this.items && !k.item && k.rouletteTime <= 0 && !k.trailing) this.items.give(k, 'bumperBall');
        if (this.items) {
          for (const e of this.items.entities) {
            if (!e.active || e.type !== 'bumperBall' || e.state === ItemState.Trailing) continue;
            for (const t of this.targets) {
              if (t.popped) continue;
              if ((e.x - t.x) ** 2 + (e.z - t.z) ** 2 < 2.0 * 2.0) {
                t.popped = true;
                e.active = false;
                w.events.push({ type: 'lesson', kind: 'target', x: t.x, y: t.y + 1.6, z: t.z });
                break;
              }
            }
          }
        }
        const popped = this.targets.filter((t) => t.popped).length;
        this.score = popped + Math.max(0, this.goo.length - this.gooHits);
        if (k.finished || this.elapsed >= lesson.timeLimit) this.finish(this.score);
        break;
      }
      case 'shortcuts':
        if (k.finished) this.finish(k.finishTime);
        else if (this.elapsed >= lesson.timeLimit) this.finish(lesson.timeLimit);
        break;
      case 'gliders': {
        for (const r of this.rings) {
          if (r.got) continue;
          if ((k.x - r.x) ** 2 + (k.y + 0.6 - r.y) ** 2 + (k.z - r.z) ** 2 < r.radius * r.radius) {
            r.got = true;
            w.events.push({ type: 'lesson', kind: 'ring', x: r.x, y: r.y, z: r.z });
          }
        }
        this.score = this.rings.filter((r) => r.got).length;
        if (k.finished || this.elapsed >= lesson.timeLimit) this.finish(this.score);
        break;
      }
    }
  }

  get missed(): number {
    return this.gates.filter((g) => g.state === 2).length;
  }

  private finish(score: number): void {
    this.score = score;
    this.done = true;
  }

  get medal(): LessonMedal | null {
    if (!this.done) return null;
    const m = medalFor(this.lesson, this.score);
    // Shortcut lesson: gold and silver need the shortcut
    if (this.lesson.id === 'shortcuts' && this.world.karts[0].raceStats.shortcuts === 0) return m ? 'bronze' : null;
    return m;
  }

  /** One-line objective/progress for the HUD. */
  get status(): string {
    const k = this.world.karts[0];
    switch (this.lesson.id) {
      case 'steering':
        return `Gates ${this.gates.filter((g) => g.state === 1).length}/${this.gates.length}${this.missed ? ` · missed ${this.missed} (+${this.missed * 2}s)` : ''}`;
      case 'drifting':
        return `Spark points ${this.score} · ${Math.max(0, Math.ceil(this.lesson.timeLimit - this.elapsed))}s left`;
      case 'rocket':
        return `Start ${Math.min(3, this.starts.length + 1)}/3 · points ${this.starts.reduce((a, b) => a + b, 0)}`;
      case 'items':
        return `Targets ${this.targets.filter((t) => t.popped).length}/${this.targets.length} · goo dodged ${Math.max(0, this.goo.length - this.gooHits)}`;
      case 'shortcuts':
        return k.raceStats.shortcuts > 0 ? 'Shortcut ✓ — race to the line!' : k.item ? 'Use your Turbo Can on the grass shortcut!' : 'Take the grass shortcut before the last corner!';
      case 'gliders':
        return `Rings ${this.score}/${this.rings.length}`;
    }
  }
}
