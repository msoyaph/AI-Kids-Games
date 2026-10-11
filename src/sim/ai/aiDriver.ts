import type { AiProfile } from '../../data/types';
import { clamp, wrapAngle } from '../../core/math';
import type { Rng } from '../../core/rng';
import { Kart, RespawnState } from '../kart';
import type { TrackModel, Ribbon } from '../track/trackModel';
import { TUNING } from '../tuning';
import type { World } from '../world';
import { ItemBrain } from './itemBrain';

/** Hazard positions the AI should steer around (filled by the item system). */
export interface HazardInfo {
  x: number;
  z: number;
  radius: number;
  active: boolean;
}

/**
 * One AI racer. Follows the racing line with personal variation, drifts through long corners,
 * takes shortcuts (by skill/personality), seeks item boxes, avoids hazards and karts, and unsticks itself.
 * Uses exactly the same physics and input as players.
 */
export class AiDriver {
  /** Personal lateral offset from the racing line (metres). */
  private lane = 0;
  private laneTarget = 0;
  private laneTimer = 0;
  private avoid = 0;
  private seek = 0;
  private cornerActive = false;
  private wantDrift = false;
  private driftHold = 0;
  private targetTier = 1;
  private stuckTime = 0;
  private reverseTime = 0;
  private trickPressed = false;
  private shortcut = -1;
  private shortcutDecided = new Set<number>();
  private scIndex = 0;
  /** Seconds spent trying to get onto the chosen shortcut. */
  private scTry = 0;
  private startPressAt: number;
  /** Pace (fraction of top speed this driver aims for on straights). */
  readonly pace: number;
  /** Extra noise for low-skill drivers. */
  private wobblePhase: number;
  /** Optional hazards (items on the road). */
  hazards: HazardInfo[] = [];
  /** Item decisions (only when items are enabled). */
  brain: ItemBrain | null = null;

  constructor(
    readonly kart: Kart,
    readonly world: World,
    readonly track: TrackModel,
    readonly profile: AiProfile,
    readonly skill: number,
    private readonly rng: Rng,
  ) {
    this.pace = 0.9 + 0.1 * clamp(skill, 0, 1);
    this.targetTier = skill > 0.85 ? 3 : skill > 0.5 ? 2 : 1;
    // Good drivers hit the rocket-start window more often.
    this.startPressAt = rng.chance(0.25 + skill * 0.6) ? rng.range(0.25, 0.95) : rng.chance(0.5) ? rng.range(1.2, 1.5) : -1;
    this.wobblePhase = rng.range(0, 10);
    this.laneTarget = rng.range(-1, 1) * profile.lineNoise;
  }

  update(dt: number): void {
    const k = this.kart;
    const w = this.world;
    const inp = k.input;
    inp.lookBack = false;
    if (this.brain && w.phase === 'race') this.brain.update(dt);
    else {
      inp.item = false;
      inp.aimBack = false;
    }

    if (w.phase === 'intro' || w.phase === 'countdown') {
      inp.steer = 0;
      inp.drift = false;
      const remaining = w.countdownTime - w.phaseTime;
      inp.throttle = w.phase === 'countdown' && this.startPressAt > 0 && remaining <= this.startPressAt ? 1 : 0;
      return;
    }
    if (k.respawnState !== RespawnState.None) {
      inp.throttle = 0;
      inp.steer = 0;
      inp.drift = false;
      return;
    }

    const rb = this.track.main;
    const i = k.hint.sample;
    const speed = Math.max(0, k.speed);

    // --- lane wander
    this.laneTimer -= dt;
    if (this.laneTimer <= 0) {
      this.laneTimer = this.rng.range(1.5, 4);
      this.laneTarget = this.rng.range(-1, 1) * this.profile.lineNoise * (1.6 - this.skill);
    }
    this.lane += (this.laneTarget - this.lane) * Math.min(1, dt * 0.8);

    // --- shortcut decisions (and adopt one we got bumped onto)
    this.considerShortcuts();
    if (this.shortcut < 0 && k.ground.ribbon > 0 && k.grounded) {
      this.shortcut = k.ground.ribbon - 1;
      this.scIndex = 0;
      this.scTry = 0;
    }

    // --- target point
    const look = 7 + speed * 0.42;
    let tx: number;
    let tz: number;
    if (this.shortcut >= 0) {
      const sc = this.track.shortcuts[this.shortcut];
      this.scIndex = nearestOpen(sc, k.x, k.z, this.scIndex);
      const j = Math.min(sc.n - 1, this.scIndex + Math.round(look / sc.ds));
      tx = sc.px[j];
      tz = sc.pz[j];
      if (k.ground.ribbon === this.shortcut + 1) this.scTry = 0;
      else this.scTry += dt;
      // give up if we can't get onto it (blocked, knocked off line…)
      if (this.scIndex >= sc.n - 3 || (k.ground.ribbon === 0 && this.scIndex > sc.n * 0.6) || this.scTry > 2.5) this.shortcut = -1;
    } else {
      const j = rb.idx(i + Math.round(look / rb.ds));
      this.updateAvoidance(i, j);
      const hwj = rb.hw[j] - 1.3;
      const d = clamp(this.track.line[j] + this.lane + this.avoid + this.seek, -hwj, hwj);
      tx = rb.px[j] + rb.rx[j] * d;
      tz = rb.pz[j] + rb.rz[j] * d;
    }
    const want = Math.atan2(tx - k.x, tz - k.z);
    const err = wrapAngle(want - k.yaw);
    let wobble = (1 - this.skill) * 0.12 * Math.sin(w.time * 1.7 + this.wobblePhase);
    if (k.cloudTime > 0) wobble += 0.35 * Math.sin(w.time * 3.1 + this.wobblePhase);
    let steer = clamp(-err * (2.1 + this.skill * 0.8) + wobble, -1, 1);

    // --- speed control: slow for very tight bends we can't steer through
    let maxK = 0;
    const scan = Math.round((10 + speed * 0.9) / rb.ds);
    for (let s = 3; s < scan; s += 2) maxK = Math.max(maxK, Math.abs(this.track.lineCurv[rb.idx(i + s)]));
    const turnCap = k.params.turnRate * (this.wantDrift || k.drifting ? 1.25 : 0.95) * this.profile.cornerRisk;
    const cornerSpeed = maxK > 1e-3 ? turnCap / maxK : 999;
    const cruise = k.params.topSpeed * w.speedMul[k.index] * this.pace * (k.cloudTime > 0 ? 0.92 : 1);
    let throttle = 1;
    if (speed > cornerSpeed + 3) throttle = speed > cornerSpeed + 8 ? -0.6 : 0;
    else if (speed > cruise && k.boostTime <= 0) throttle = 0;

    // --- drifting through long corners
    this.updateDrift(i, speed, err, dt);
    if (this.wantDrift || k.drifting) {
      if (!k.drifting && k.hopTime <= 0 && k.grounded) {
        // hop now, steering into the corner
        steer = this.driftDirFor(i);
      } else if (!k.drifting && k.hopTime > 0) {
        steer = this.driftDirFor(i);
      }
    }
    inp.drift = this.wantDrift;

    // --- tricks off ramps
    if (k.launched && k.trickWindow > 0 && !k.trickQueued && !this.trickPressed && this.rng.chance(0.25 + this.skill * 0.5)) {
      inp.drift = true;
      this.trickPressed = true;
    } else if (!k.launched) {
      this.trickPressed = false;
    } else if (this.trickPressed) {
      inp.drift = false;
    }

    // --- unstick (pressed against a wall)
    if (w.raceTime > 3 && speed < 1.5 && k.grounded && this.reverseTime <= 0) {
      this.stuckTime += dt;
      if (this.stuckTime > 1.3) {
        this.reverseTime = 1.1;
        this.stuckTime = 0;
      }
    } else if (speed > 4) this.stuckTime = 0;
    if (this.reverseTime > 0) {
      this.reverseTime -= dt;
      throttle = -1;
      steer = err > 0 ? 1 : -1;
      inp.drift = false;
      this.wantDrift = false;
    }

    inp.steer = steer;
    inp.throttle = throttle;
  }

  private driftDirFor(i: number): number {
    const rb = this.track.main;
    let sum = 0;
    for (let s = 6; s < 30; s++) sum += this.track.lineCurv[rb.idx(i + Math.round(s / rb.ds))];
    return sum < 0 ? 1 : -1;
  }

  private updateDrift(i: number, speed: number, err: number, dt: number): void {
    const k = this.kart;
    const rb = this.track.main;
    const curv = this.track.lineCurv;
    // average curvature just ahead and total turn of the coming corner
    let avg = 0;
    const a0 = Math.round(6 / rb.ds);
    const a1 = Math.round(30 / rb.ds);
    for (let s = a0; s < a1; s++) avg += Math.abs(curv[rb.idx(i + s)]);
    avg /= Math.max(1, a1 - a0);
    let turn = 0;
    for (let s = a0; s < Math.round(70 / rb.ds); s++) turn += curv[rb.idx(i + s)] * rb.ds;
    let near = 0;
    const n1 = Math.round(12 / rb.ds);
    for (let s = 0; s < n1; s++) near += Math.abs(curv[rb.idx(i + s)]);
    near /= Math.max(1, n1);
    const isCorner = avg > 1 / 55 && Math.abs(turn) > 0.5;
    if (isCorner && !this.cornerActive) {
      this.cornerActive = true;
      const chance = (0.15 + this.skill * 0.85) * (this.profile.id === 'showoff' ? 1.15 : this.profile.id === 'careful' ? 0.8 : 1);
      if (speed > TUNING.driftMinSpeed + 4 && k.grounded && this.shortcut < 0 && this.rng.chance(chance)) {
        this.wantDrift = true;
        this.driftHold = 0;
      }
    } else if (!isCorner && avg < 1 / 90) {
      this.cornerActive = false;
    }
    if (this.wantDrift) {
      this.driftHold += dt;
      const cornerEnding = near < 1 / 80 && avg < 1 / 70;
      const tierReached = k.driftTier >= this.targetTier && near < 1 / 45;
      const losing = Math.abs(err) > 0.9 || speed < 9;
      const hopFailed = !k.drifting && k.hopTime <= 0 && k.grounded && this.driftHold > 0.6;
      if ((k.drifting && (cornerEnding || tierReached || losing)) || hopFailed || this.driftHold > 6) {
        this.wantDrift = false;
      }
    }
  }

  private considerShortcuts(): void {
    const k = this.kart;
    if (this.shortcut >= 0) return;
    const L = this.track.length;
    for (let r = 0; r < this.track.shortcuts.length; r++) {
      const sc = this.track.shortcuts[r];
      let ahead = sc.mainS0 - k.ground.s;
      if (ahead < 0) ahead += L;
      const lapKey = r * 100 + k.lapsDone;
      if (ahead < 45 && ahead > 4 && !this.shortcutDecided.has(lapKey)) {
        this.shortcutDecided.add(lapKey);
        const aiUse = this.track.data.shortcuts[r].aiUse ?? 0.5;
        const needsBoost = sc.offroadSurface;
        const p = clamp(this.skill * this.profile.shortcutBias * aiUse * (needsBoost && k.item !== 'turbo' && k.item !== 'turbo3' ? 0.35 : 1), 0, 0.95);
        if (this.rng.chance(p)) {
          this.shortcut = r;
          this.scIndex = 0;
          this.scTry = 0;
          this.wantDrift = false;
        }
      }
    }
  }

  private updateAvoidance(i: number, j: number): void {
    const k = this.kart;
    const rb = this.track.main;
    const myD = k.ground.d;
    let avoid = 0;
    // other karts just ahead in our lane → pass on the roomier side
    for (const o of this.world.karts) {
      if (o === k || o.respawnState !== RespawnState.None) continue;
      let ds = o.ground.s - k.ground.s;
      if (ds < -this.track.length / 2) ds += this.track.length;
      if (ds > this.track.length / 2) ds -= this.track.length;
      if (ds > 0.5 && ds < 9 && Math.abs(o.ground.d - myD) < 1.9) {
        if (this.profile.aggression > 0.6 && this.rng.chance(this.profile.aggression * 0.01)) continue; // happy to bump
        const room = rb.hw[i] - Math.abs(o.ground.d);
        const dir = o.ground.d > 0 ? -1 : 1;
        avoid = dir * Math.min(2.6, room > 2 ? 2.4 : 1.2);
      }
    }
    // hazards on the road ahead
    if (this.skill > 0.2) {
      const reach = 10 + this.skill * 20;
      for (const h of this.hazards) {
        if (!h.active) continue;
        const dx = h.x - k.x;
        const dz = h.z - k.z;
        const fwd = dx * Math.sin(k.yaw) + dz * Math.cos(k.yaw);
        if (fwd < 1 || fwd > reach) continue;
        const lat = dx * -Math.cos(k.yaw) + dz * Math.sin(k.yaw);
        if (Math.abs(lat) < h.radius + 1.6) avoid = (lat > 0 ? -1 : 1) * (h.radius + 2.2);
      }
    }
    this.avoid += (avoid - this.avoid) * 0.15;
    // item boxes when we have nothing
    let seek = 0;
    if (k.item === null && k.rouletteTime <= 0) {
      const want = this.profile.id === 'itemFocused' ? 1 : 0.6;
      let bestD = 1e9;
      for (const b of this.track.itemBoxes) {
        let ds = b.s - k.ground.s;
        if (ds < 0) ds += this.track.length;
        if (ds > 8 && ds < 45) {
          const dd = Math.abs(b.d - this.track.line[j]);
          if (dd < bestD) {
            bestD = dd;
            seek = (b.d - this.track.line[j] - this.lane) * want;
          }
        }
      }
    }
    this.seek += (seek - this.seek) * 0.08;
  }
}

function nearestOpen(rb: Ribbon, x: number, z: number, start: number): number {
  let i = clamp(start, 0, rb.n - 1);
  const m = (j: number): number => (x - rb.px[j]) ** 2 + (z - rb.pz[j]) ** 2;
  let best = m(i);
  if (start === 0) {
    for (let j = 0; j < rb.n; j += 3) {
      const v = m(j);
      if (v < best) {
        best = v;
        i = j;
      }
    }
  }
  for (let steps = 0; steps < 200; steps++) {
    const a = Math.min(rb.n - 1, i + 1);
    const b = Math.max(0, i - 1);
    const da = m(a);
    const db = m(b);
    if (da < best && da <= db) {
      best = da;
      i = a;
    } else if (db < best) {
      best = db;
      i = b;
    } else break;
  }
  return i;
}
