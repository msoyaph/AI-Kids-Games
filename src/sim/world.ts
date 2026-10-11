import type { KartConfig, SpeedClass } from '../data/types';
import { Rng } from '../core/rng';
import { EventQueue } from './events';
import type { GroundModel } from './ground';
import { Kart, RespawnState } from './kart';
import { stepKart, type StepEnv } from './physics';
import { createKart } from './factory';
import { SPEED_CLASSES, TUNING } from './tuning';

export type RacePhase = 'intro' | 'countdown' | 'race' | 'done';

export interface RacerEntry {
  racerId: string;
  kart: KartConfig;
  /** Local player index, or -1 for AI. */
  player: number;
}

export interface WorldOptions {
  ground: GroundModel;
  speedClass: SpeedClass;
  seed: number;
  racers: RacerEntry[];
  /** Seconds of intro flyover before the countdown (0 to skip). */
  introTime?: number;
  countdownTime?: number;
}

/**
 * The headless simulation of one race/battle. No rendering, no DOM.
 * Subsystems (progress, items, AI, battle) are attached in later phases via hooks.
 */
export class World {
  readonly karts: Kart[] = [];
  readonly events = new EventQueue();
  readonly rng: Rng;
  readonly ground: GroundModel;
  readonly speedClass: SpeedClass;
  phase: RacePhase;
  /** Seconds since the world was created. */
  time = 0;
  /** Seconds since GO. */
  raceTime = 0;
  phaseTime = 0;
  countdownTime: number;
  private readonly env: StepEnv;
  private lastCount = -1;
  /** Hooks for subsystems; called each step in order. */
  readonly preStep: Array<(dt: number) => void> = [];
  readonly postStep: Array<(dt: number) => void> = [];
  /** Per-kart rubber-band multipliers (1 = none). */
  readonly speedMul: Float32Array;

  constructor(opts: WorldOptions) {
    this.ground = opts.ground;
    this.speedClass = opts.speedClass;
    this.rng = new Rng(opts.seed);
    this.countdownTime = opts.countdownTime ?? 3;
    this.phase = (opts.introTime ?? 0) > 0 ? 'intro' : 'countdown';
    this.phaseTime = this.phase === 'intro' ? -(opts.introTime ?? 0) : 0;
    opts.racers.forEach((r, i) => this.karts.push(createKart(i, r.racerId, r.kart, opts.speedClass, r.player)));
    this.speedMul = new Float32Array(this.karts.length).fill(1);
    this.env = {
      gravity: TUNING.gravity * opts.ground.gravityScale,
      speedMul: 1,
      canDrive: false,
      events: this.events,
    };
  }

  get speedScale(): number {
    return SPEED_CLASSES[this.speedClass].speedScale;
  }

  /** Skip the intro flyover (player pressed a button). */
  skipIntro(): void {
    if (this.phase === 'intro') {
      this.phase = 'countdown';
      this.phaseTime = 0;
    }
  }

  step(dt: number): void {
    this.time += dt;
    this.phaseTime += dt;
    if (this.phase === 'intro' && this.phaseTime >= 0) {
      this.phase = 'countdown';
      this.phaseTime = 0;
    }
    if (this.phase === 'countdown') {
      const remaining = this.countdownTime - this.phaseTime;
      const n = Math.ceil(remaining);
      if (n !== this.lastCount && n > 0 && n <= 3) {
        this.lastCount = n;
        this.events.push({ type: 'countdown', n });
      }
      // timed-boost start: track when throttle is first pressed
      for (const k of this.karts) {
        if (k.input.throttle > 0.5) {
          if (k.startPress < 0) k.startPress = remaining;
        } else if (remaining > 0.3) {
          k.startPress = -1;
        }
      }
      if (remaining <= 0) {
        this.phase = 'race';
        this.phaseTime = 0;
        this.events.push({ type: 'go' });
        for (const k of this.karts) this.applyStart(k);
      }
    }
    if (this.phase === 'race' || this.phase === 'done') this.raceTime += dt;

    for (const h of this.preStep) h(dt);
    this.env.canDrive = this.phase === 'race' || this.phase === 'done';
    for (let i = 0; i < this.karts.length; i++) {
      const k = this.karts[i];
      this.env.speedMul = this.speedMul[i];
      stepKart(k, this.ground, this.env, dt);
    }
    this.collideKarts();
    for (const h of this.postStep) h(dt);
  }

  /** Rocket start: pressing accelerate in a short window before GO gives a boost; too early = stall wobble. */
  private applyStart(k: Kart): void {
    const t = k.startPress;
    if (t < 0) return;
    if (t <= 1.05 && t >= 0.0) {
      k.startBoost(TUNING.startBoostTime);
      k.raceStats.perfectStart = t <= 0.75;
      this.events.push({ type: 'startBoost', kart: k.index, good: true });
    } else if (t > 1.6) {
      // pressed way too early: a harmless sputter
      k.spinTime = 0.0;
      k.wobble = 0.6;
      k.speed = 0;
      this.events.push({ type: 'startBoost', kart: k.index, good: false });
    }
  }

  private collideKarts(): void {
    const ks = this.karts;
    const R = TUNING.kartRadius;
    const minD = R * 2;
    for (let i = 0; i < ks.length; i++) {
      const a = ks[i];
      if (a.respawnState !== RespawnState.None) continue;
      for (let j = i + 1; j < ks.length; j++) {
        const b = ks[j];
        if (b.respawnState !== RespawnState.None) continue;
        const dy = a.y - b.y;
        if (dy > 1.4 || dy < -1.4) continue;
        let dx = b.x - a.x;
        let dz = b.z - a.z;
        const d2 = dx * dx + dz * dz;
        if (d2 >= minD * minD) continue;
        const d = Math.sqrt(d2) || 1e-4;
        dx /= d;
        dz /= d;
        const pen = minD - d;
        const ma = a.params.mass * (a.rocketTime > 0 ? 6 : 1) * (a.shieldTime > 0 ? 1.5 : 1);
        const mb = b.params.mass * (b.rocketTime > 0 ? 6 : 1) * (b.shieldTime > 0 ? 1.5 : 1);
        const wa = mb / (ma + mb);
        const wb = ma / (ma + mb);
        a.x -= dx * pen * wa;
        a.z -= dz * pen * wa;
        b.x += dx * pen * wb;
        b.z += dz * pen * wb;
        // relative velocity along the normal
        const rv = (b.vx - a.vx) * dx + (b.vz - a.vz) * dz;
        if (rv < 0) {
          const jimp = (-(1 + TUNING.kartRestitution) * rv) / (1 / ma + 1 / mb);
          a.vx -= (jimp / ma) * dx;
          a.vz -= (jimp / ma) * dz;
          b.vx += (jimp / mb) * dx;
          b.vz += (jimp / mb) * dz;
          const strength = Math.min(1, -rv / 12);
          if (-rv > 2.5) {
            a.wobble = b.wobble = 0.25;
            this.events.push({ type: 'bump', kart: a.index, other: b.index, strength });
          }
          this.onKartContact?.(a, b, -rv);
        }
      }
    }
  }

  /** Optional hook (items use it for rocket dash / shield bumps). */
  onKartContact?: (a: Kart, b: Kart, closingSpeed: number) => void;
}
