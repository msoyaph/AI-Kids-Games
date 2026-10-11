import { AI_PROFILES } from '../../data/aiProfiles';
import { findRacer } from '../../data/racers';
import type { Personality } from '../../data/types';
import { clamp, wrapAngle } from '../../core/math';
import { Rng } from '../../core/rng';
import type { World } from '../world';
import type { TrackModel } from '../track/trackModel';
import { EDGE_DROP, F_GAP } from '../track/trackModel';
import { AiDriver, type DriverStyle, type HazardInfo } from './aiDriver';
import { SPEED_CLASSES } from '../tuning';
import { BALANCE } from '../../tuning/balance';
import type { Kart } from '../kart';
import { ItemBrain } from './itemBrain';
import type { ItemSystem } from '../items/itemSystem';

export interface AiOptions {
  /** Per-kart skill bonus (rivals), indexed by kart index. */
  skillBonus?: Record<number, number>;
  /** Disable rubber-banding (time trial, balance sims). */
  noRubberBand?: boolean;
  /** Override personality per kart index. */
  personality?: Record<number, Personality>;
  /** Scripted expert overrides per kart index (staff ghost, strong bot). */
  style?: Record<number, DriverStyle>;
  /** Force an exact skill per kart index (no random spread). */
  skill?: Record<number, number>;
}

/**
 * Drives all AI karts, applies mild rubber-banding relative to the best human, and provides
 * steering assist for players who enabled it.
 */
export class AiController {
  readonly drivers: AiDriver[] = [];
  private readonly byKart: Array<AiDriver | null>;
  /** Hazard slots for AI avoidance when no item system exists (track hazards fill these). */
  readonly hazards: HazardInfo[] = Array.from({ length: 24 }, () => ({ x: 0, z: 0, radius: 1, active: false }));

  constructor(
    readonly world: World,
    readonly track: TrackModel,
    readonly opts: AiOptions = {},
  ) {
    const cls = SPEED_CLASSES[world.speedClass];
    const rng = new Rng(world.rng.nextU32());
    this.byKart = world.karts.map((k) => {
      if (k.isPlayer) return null;
      const personality = opts.personality?.[k.index] ?? findRacer(k.racerId).personality;
      let skill = clamp(cls.aiSkill + (opts.skillBonus?.[k.index] ?? 0) + rng.range(-BALANCE.ai.skillSpread, BALANCE.ai.skillSpread), 0.05, 1);
      if (opts.skill?.[k.index] !== undefined) skill = opts.skill[k.index];
      const d = new AiDriver(k, world, track, AI_PROFILES[personality], skill, new Rng(rng.nextU32()), opts.style?.[k.index]);
      d.hazards = this.hazards;
      this.drivers.push(d);
      return d;
    });
    world.preStep.push((dt) => this.update(dt));
  }

  /** Enable item use for all AI drivers and share the item system's hazard list. */
  attachItems(items: ItemSystem): void {
    const rng = new Rng(items.rng.nextU32());
    for (const d of this.drivers) {
      d.brain = new ItemBrain(d.kart, this.world, this.track, d.profile, d.skill, new Rng(rng.nextU32()));
      d.brain.turboPlan = !!d.style.turboPlan;
      d.hazards = items.hazards;
    }
  }

  /** Let the AI drive a player's kart (victory lap after finishing, autopilot, simulated humans in balance tests). */
  takeOver(k: Kart, skill = BALANCE.ai.takeOverSkill, personality: Personality = 'careful', style?: DriverStyle, items?: ItemSystem): AiDriver {
    const had = this.byKart[k.index];
    if (had) return had;
    const d = new AiDriver(k, this.world, this.track, AI_PROFILES[personality], skill, new Rng(1000 + k.index), style);
    d.hazards = this.drivers[0]?.hazards ?? this.hazards;
    if (items) {
      d.brain = new ItemBrain(k, this.world, this.track, d.profile, skill, new Rng(2000 + k.index));
      d.brain.turboPlan = !!style?.turboPlan;
    }
    this.byKart[k.index] = d;
    this.drivers.push(d);
    return d;
  }

  driverFor(k: Kart): AiDriver | null {
    return this.byKart[k.index];
  }

  private update(dt: number): void {
    for (const d of this.drivers) d.update(dt);
    this.rubberBand();
    for (const k of this.world.karts) if (k.isPlayer && k.assistLevel !== 'off') this.assist(k);
  }

  private rubberBand(): void {
    const w = this.world;
    if (this.opts.noRubberBand) return;
    let best = -Infinity;
    for (const k of w.karts) if (k.isPlayer && !k.finished) best = Math.max(best, k.progress);
    if (best === -Infinity) {
      for (let i = 0; i < w.karts.length; i++) w.speedMul[i] = 1;
      return;
    }
    const cls = BALANCE.classes[w.speedClass];
    const cu = BALANCE.catchUp;
    // ramp in after the start so the opening isn't affected
    const ramp = clamp(w.raceTime / cu.rampSeconds, 0, 1);
    for (const k of w.karts) {
      if (k.isPlayer) continue;
      const gap = best - k.progress; // >0: AI is behind the best human
      let mul = 1;
      if (gap > 0) mul = 1 + cls.rubberBack * clamp((gap - cu.behindStart) / cu.behindRange, 0, 1);
      else mul = 1 - cls.rubberFront * clamp((-gap - cu.aheadStart) / cu.aheadRange, 0, 1);
      w.speedMul[k.index] = 1 + (mul - 1) * ramp;
    }
  }

  /** Smart steering: nudges toward the racing line and strongly away from drops and walls. */
  private assist(k: Kart): void {
    if (!k.controllable || !k.grounded) return;
    const g = k.ground;
    if (g.ribbon !== 0) return;
    const rb = this.track.main;
    const i = k.hint.sample;
    const look = 8 + Math.max(0, k.speed) * 0.4;
    const j = rb.idx(i + Math.round(look / rb.ds));
    const A = BALANCE.assist.levels[k.assistLevel];
    const tx = rb.px[j] + rb.rx[j] * this.track.line[j] * A.lineFollow;
    const tz = rb.pz[j] + rb.rz[j] * this.track.line[j] * A.lineFollow;
    const err = wrapAngle(Math.atan2(tx - k.x, tz - k.z) - k.yaw);
    const assistSteer = clamp(-err * 2.2, -1, 1);
    const hw = g.halfWidth;
    const ad = Math.abs(g.d);
    const drop = (g.d < 0 ? rb.edgeL[i] : rb.edgeR[i]) === EDGE_DROP;
    const lateralVel = k.vx * rb.rx[i] + k.vz * rb.rz[i];
    const towardEdge = lateralVel * Math.sign(g.d) > 0.5;
    let blend = A.lineBlend;
    if (ad > hw - (drop ? A.dropMargin : A.wallMargin) && towardEdge) blend = drop ? A.dropBlend : A.wallBlend;
    if (k.drifting) blend *= A.driftMul;
    k.input.steer = clamp(k.input.steer * (1 - blend) + assistSteer * blend, -1, 1);
    // Full assist: a soft invisible rail along drop edges (never over gaps, on shortcuts or in the air).
    if (A.edgeGuard > 0 && drop && !(rb.flags[i] & F_GAP) && !(rb.flags[rb.idx(i + 4)] & F_GAP)) {
      const room = hw - ad; // metres left before the edge
      const side = Math.sign(g.d) || 1;
      const out = lateralVel * side; // speed toward the edge
      if (room < A.edgeGuard && out > 0) {
        const keep = clamp(room / A.edgeGuard, 0, 1) * 0.5; // closer to the edge → cancel more of the slide
        const cut = out * (1 - keep) + (room < 0.3 ? 1.5 : 0);
        k.vx -= rb.rx[i] * side * cut;
        k.vz -= rb.rz[i] * side * cut;
      }
    }
  }
}
