import type { AiProfile } from '../../data/types';
import { clamp, wrapAngle } from '../../core/math';
import type { Rng } from '../../core/rng';
import { Kart, RespawnState } from '../kart';
import { F_ICE, type TrackModel, type Ribbon } from '../track/trackModel';
import { TUNING } from '../tuning';
import { BALANCE } from '../../tuning/balance';
import type { World } from '../world';
import { ItemBrain } from './itemBrain';

/** Hazard positions the AI should steer around (filled by the item system). */
export interface HazardInfo {
  x: number;
  z: number;
  radius: number;
  active: boolean;
}

/** Optional overrides that turn a normal AI into a scripted expert (staff ghost, "strong bot" in balance tests). */
export interface DriverStyle {
  /** Always press in the perfect rocket-start window. */
  rocketStart?: boolean;
  /** Spark tier to aim for when drifting (overrides the skill-based tier). */
  targetTier?: number;
  /** Shortcut probability override (1 = always take every shortcut). */
  shortcutChance?: number;
  /** Multiplies the straight-line pace (staff ghost calibration). */
  paceMul?: number;
  /** Ration turbo items: one per lap, used on an off-road shortcut when the track has one. */
  turboPlan?: boolean;
  /** Test-only: extra wandering steering noise (a simulated beginner). */
  steerNoise?: number;
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
  private lastBend = -2;
  private wantDrift = false;
  private driftHold = 0;
  private targetTier = 1;
  private stuckTime = 0;
  private reverseTime = 0;
  private trickPressed = false;
  private iceAhead = false;
  /** False when the corner needs a yaw rate the current drift can't hold (→ release it). */
  private driftRateOk = true;
  private driftBadTime = 0;
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
    readonly style: DriverStyle = {},
  ) {
    const B = BALANCE.ai;
    this.pace = (B.paceBase + B.pacePerSkill * clamp(skill, 0, 1)) * (style.paceMul ?? 1);
    this.targetTier = style.targetTier ?? (skill > B.tier3Skill ? 3 : skill > B.tier2Skill ? 2 : 1);
    // Good drivers hit the rocket-start window more often.
    this.startPressAt = rng.chance(B.rocketStartBase + skill * B.rocketStartPerSkill) ? rng.range(0.25, 0.95) : rng.chance(0.5) ? rng.range(1.2, 1.5) : -1;
    if (style.rocketStart) this.startPressAt = 0.5;
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
    if (this.shortcut < 0 && k.ground.ribbon > 0 && k.grounded && k.ground.ribbonT > 0.2 && k.ground.ribbonT < 0.8) {
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
      const offDist = Math.hypot(k.x - sc.px[this.scIndex], k.z - sc.pz[this.scIndex]);
      if (k.ground.ribbon === this.shortcut + 1 || offDist < sc.hw[this.scIndex] + 2.5) this.scTry = 0;
      else this.scTry += dt;
      // give up if we can't get onto it (blocked, knocked off line…)
      if (this.scIndex >= sc.n - 3 || (k.ground.ribbon === 0 && this.scIndex > sc.n * 0.6) || this.scTry > 2.5) this.shortcut = -1;
    } else {
      const j = rb.idx(i + Math.round(look / rb.ds));
      this.updateAvoidance(i, j);
      const hwj = rb.hw[j] - (this.wantDrift || k.drifting ? 2.4 : 1.3); // leave room to slide when drifting
      const d = clamp(this.track.line[j] + this.lane + this.avoid + this.seek, -hwj, hwj);
      tx = rb.px[j] + rb.rx[j] * d;
      tz = rb.pz[j] + rb.rz[j] * d;
    }
    const want = Math.atan2(tx - k.x, tz - k.z);
    // While drifting the nose points into the corner but the kart slides along its velocity: aim with that.
    const head = k.drifting && speed > 4 ? Math.atan2(k.vx, k.vz) : k.yaw;
    const err = wrapAngle(want - head);
    let wobble = (1 - this.skill) * BALANCE.ai.wobble * Math.sin(w.time * 1.7 + this.wobblePhase);
    if (k.cloudTime > 0) wobble += 0.35 * Math.sin(w.time * 3.1 + this.wobblePhase);
    if (this.style.steerNoise) wobble += this.style.steerNoise * (Math.sin(w.time * 0.9 + this.wobblePhase) + 0.6 * Math.sin(w.time * 2.3 + 1.7 * this.wobblePhase));
    let steer = clamp(-err * (BALANCE.ai.steerGainBase + this.skill * BALANCE.ai.steerGainPerSkill) + wobble, -1, 1);
    // Drifting: the stick sets the yaw rate (0.3× outward … 1.3× inward of the turn rate), so steer for the yaw
    // rate pure pursuit asks for instead of the heading error (neutral stick would over-rotate into the inside).
    if (!k.drifting) this.driftBadTime = 0;
    this.driftRateOk = true;
    if (k.drifting && k.grounded && speed > 4) {
      const L = Math.max(5, Math.hypot(tx - k.x, tz - k.z));
      const omega = (speed * 2 * Math.sin(err)) / L; // + = turn left (yaw increases)
      const kickIn = k.driftTime < TUNING.driftKickTime ? 1 + TUNING.driftKickIn * (k.ice ? 1.25 : 1) : 1;
      const tr = k.params.turnRate * Math.min(1, speed / 10) * kickIn;
      const span = TUNING.driftRateMax - TUNING.driftRateMin;
      const t = ((-omega * k.driftDir) / tr - TUNING.driftRateMin) / span; // drift yaw rate = −dir·tr·(min + span·t)
      // the corner needs a rate the drift can't hold for a while → let go (brief dips at turn-in are fine)
      if (t < -0.35 || t > 1.2) this.driftBadTime += dt;
      else this.driftBadTime = Math.max(0, this.driftBadTime - dt * 0.5);
      this.driftRateOk = this.driftBadTime < 0.3;
      steer = clamp(k.driftDir * (2 * clamp(t, 0, 1) - 1) + wobble, -1, 1);
    }

    // --- speed control: slow for very tight bends we can't steer through
    let maxK = 0;
    const scan = Math.round((10 + speed * 0.9) / rb.ds);
    for (let s = 3; s < scan; s += 2) maxK = Math.max(maxK, Math.abs(this.track.lineCurv[rb.idx(i + s)]));
    // ice ahead: slippery, so brake earlier for bends
    let iceAhead = k.ice;
    if (!iceAhead) for (let s = 2; s < scan; s += 4) if (rb.flags[rb.idx(i + s)] & F_ICE) iceAhead = true;
    this.iceAhead = iceAhead;
    const turnCap = k.params.turnRate * (this.wantDrift || k.drifting ? 1.25 : 0.95) * this.profile.cornerRisk * (iceAhead ? BALANCE.ai.iceCornerMul : 1);
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
    if (k.launched && k.trickWindow > 0 && !k.trickQueued && !this.trickPressed && this.rng.chance(BALANCE.ai.trickBase + this.skill * BALANCE.ai.trickPerSkill)) {
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
    // Find the next bend (|κ| > 1/80) within 70 m: where it starts, how much it turns and over what length.
    // A drift can only hold yaw rates inside TUNING.driftRateMin…Max × turn rate, so only drift bends whose
    // radius fits at this speed, and hop so the landing coincides with turn-in.
    const c1 = Math.round(70 / rb.ds);
    // skip the bend we are already in (so linked bends — S-bends, switchbacks — each get their own decision)
    let s0 = 0;
    const cNow = curv[i];
    if (Math.abs(cNow) > 1 / 80) while (s0 < c1 && Math.abs(curv[rb.idx(i + s0)]) > 1 / 120 && Math.sign(curv[rb.idx(i + s0)]) === Math.sign(cNow)) s0++;
    let startDist = -1;
    let kTurn = 0;
    let kLen = 0;
    for (let s = s0; s < c1; s++) {
      const c = curv[rb.idx(i + s)];
      if (startDist < 0) {
        if (Math.abs(c) > 1 / 80) startDist = s * rb.ds;
        else continue;
      }
      if (Math.abs(c) < 1 / 120 || (kTurn !== 0 && Math.sign(c) !== Math.sign(kTurn))) break;
      kTurn += c * rb.ds;
      kLen += rb.ds;
    }
    // one decision per bend: bends are identified by where they start
    const bendKey = startDist >= 0 ? Math.round(((k.ground.s + startDist) % this.track.length) / 6) : -1;
    const need = kLen > 0 ? speed * (Math.abs(kTurn) / kLen) : 0; // yaw rate the bend needs (rad/s)
    const tr = k.params.turnRate;
    const driftable = need > tr * TUNING.driftRateMin * BALANCE.ai.driftMinRateMul && need < tr * TUNING.driftRateMax * BALANCE.ai.driftMaxRateMul;
    const turnIn = startDist >= 0 && startDist < speed * BALANCE.ai.driftHopLead + 2;
    const isCorner = turnIn && Math.abs(kTurn) > BALANCE.ai.cornerTurn && driftable;
    if (isCorner && bendKey !== this.lastBend) {
      this.lastBend = bendKey;
      const chance = (BALANCE.ai.driftChanceBase + this.skill * BALANCE.ai.driftChancePerSkill) * (this.profile.id === 'showoff' ? 1.15 : this.profile.id === 'careful' ? 0.8 : 1) * (this.iceAhead ? 1.2 : 1);
      if (speed > TUNING.driftMinSpeed + 4 && k.grounded && this.shortcut < 0 && this.rng.chance(chance)) {
        this.wantDrift = true;
        this.driftHold = 0;
      }
    }
    if (this.wantDrift) {
      this.driftHold += dt;
      // remaining turn (rad) in the drift's direction over the next 25 m (right turns have negative curvature)
      let left = 0;
      const r1 = Math.round(25 / rb.ds);
      for (let s = 0; s < r1; s++) left += curv[rb.idx(i + s)] * rb.ds;
      left *= -k.driftDir;
      const settled = k.drifting && k.driftTime > 0.45;
      const cornerEnding = settled && left < 0.1;
      const tierReached = settled && k.driftTier >= this.targetTier && left < 0.3;
      // bail out before sliding off the road (wide of the line, near the edge, or onto off-road)
      const g = k.ground;
      const latV = k.vx * rb.rx[i] + k.vz * rb.rz[i];
      const wide = k.drifting && g.ribbon === 0 && Math.abs(g.d) > g.halfWidth - BALANCE.ai.driftEdgeMargin && latV * Math.sign(g.d) > 1.5;
      const losing = Math.abs(err) > 0.9 || speed < 9 || wide || (k.drifting && (k.offroad || !this.driftRateOk));
      const hopFailed = !k.drifting && k.hopTime <= 0 && k.grounded && this.driftHold > 0.6;
      if ((k.drifting && (cornerEnding || tierReached || losing)) || hopFailed || this.driftHold > 6) {
        (this as unknown as { dbg: string }).dbg = `end=${cornerEnding} tier=${tierReached} err=${err.toFixed(2)} spd=${speed.toFixed(1)} wide=${wide} off=${k.offroad} rate=${this.driftRateOk} hop=${hopFailed} left=${left.toFixed(2)}`;
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
        const p =
          this.style.shortcutChance ??
          clamp(this.skill * this.profile.shortcutBias * aiUse * (needsBoost && k.item !== 'turbo' && k.item !== 'turbo3' ? BALANCE.ai.shortcutNoBoostMul : 1), 0, BALANCE.ai.shortcutMaxChance);
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
