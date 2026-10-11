import type { AiProfile } from '../../data/types';
import { clamp, wrapAngle } from '../../core/math';
import { Rng } from '../../core/rng';
import { makeGroundHit, type GroundHit } from '../ground';
import { Kart, RespawnState } from '../kart';
import type { ArenaModel } from '../arena';
import type { World } from '../world';
import type { ItemSystem } from '../items/itemSystem';
import { ItemBrain } from './itemBrain';
import { AI_PROFILES } from '../../data/aiProfiles';
import { findRacer } from '../../data/racers';
import { SPEED_CLASSES } from '../tuning';

/**
 * Arena AI: hunts item pods when empty-handed, otherwise chases a rival; steers around walls/obstacles
 * using a fan of ground probes. Uses the shared ItemBrain to fire items.
 */
class BattleDriver {
  private target = -1;
  private boxTarget = -1;
  private retarget = 0;
  private reverse = 0;
  private stuck = 0;
  private readonly probe: GroundHit = makeGroundHit();
  private readonly hint = { ribbon: 0, sample: 0 };
  readonly brain: ItemBrain;

  constructor(
    readonly kart: Kart,
    readonly world: World,
    readonly arena: ArenaModel,
    readonly items: ItemSystem,
    readonly profile: AiProfile,
    readonly skill: number,
    private readonly rng: Rng,
  ) {
    this.brain = new ItemBrain(kart, world, null, profile, skill, new Rng(rng.nextU32()));
  }

  private blocked(yaw: number, dist: number): boolean {
    const k = this.kart;
    const x = k.x + Math.sin(yaw) * dist;
    const z = k.z + Math.cos(yaw) * dist;
    const g = this.arena.query(x, k.y + 0.5, z, this.hint, this.probe);
    return g.wallHit || g.height > k.y + 1.0;
  }

  update(dt: number): void {
    const k = this.kart;
    const w = this.world;
    const inp = k.input;
    if (w.phase !== 'race') {
      inp.throttle = 0;
      inp.steer = 0;
      inp.item = false;
      return;
    }
    if (k.respawnState !== RespawnState.None) return;
    this.brain.update(dt);
    this.retarget -= dt;
    if (this.retarget <= 0) {
      this.retarget = this.rng.range(1, 2.2);
      this.pickTarget();
    }
    let tx = k.x + Math.sin(k.yaw) * 10;
    let tz = k.z + Math.cos(k.yaw) * 10;
    if (this.boxTarget >= 0) {
      const b = this.items.boxes[this.boxTarget];
      if (b.respawn > 0) this.retarget = 0;
      tx = b.x;
      tz = b.z;
    } else if (this.target >= 0) {
      const t = w.karts[this.target];
      // lead the target a little
      tx = t.x + t.vx * 0.4;
      tz = t.z + t.vz * 0.4;
    }
    let want = Math.atan2(tx - k.x, tz - k.z);
    // obstacle avoidance: pick the clear heading closest to the desired one
    const look = 5 + Math.max(0, k.speed) * 0.35;
    if (this.blocked(want, look) || this.blocked(k.yaw, look * 0.7)) {
      let best = want;
      let bestCost = Infinity;
      for (const off of [0.4, -0.4, 0.8, -0.8, 1.2, -1.2, 1.7, -1.7]) {
        const h = want + off;
        if (!this.blocked(h, look) && !this.blocked(h, look * 0.5)) {
          const cost = Math.abs(off) + Math.abs(wrapAngle(h - k.yaw)) * 0.5;
          if (cost < bestCost) {
            bestCost = cost;
            best = h;
          }
        }
      }
      want = best;
    }
    const err = wrapAngle(want - k.yaw);
    let steer = clamp(-err * (2 + this.skill), -1, 1);
    let throttle = Math.abs(err) > 1.6 ? 0.4 : 1;
    // unstick
    if (k.speed < 1.2 && w.raceTime > 2 && this.reverse <= 0) {
      this.stuck += dt;
      if (this.stuck > 1.0) {
        this.reverse = 0.9;
        this.stuck = 0;
      }
    } else if (k.speed > 3) this.stuck = 0;
    if (this.reverse > 0) {
      this.reverse -= dt;
      throttle = -1;
      steer = err > 0 ? 1 : -1;
    }
    inp.steer = steer;
    inp.throttle = throttle;
    inp.drift = false;
  }

  private pickTarget(): void {
    const k = this.kart;
    this.boxTarget = -1;
    this.target = -1;
    if (!k.item && k.rouletteTime <= 0) {
      let bd = Infinity;
      this.items.boxes.forEach((b, i) => {
        if (b.respawn > 0) return;
        const d = (b.x - k.x) ** 2 + (b.z - k.z) ** 2;
        if (d < bd) {
          bd = d;
          this.boxTarget = i;
        }
      });
      if (this.boxTarget >= 0) return;
    }
    let best = -1;
    let bestScore = -Infinity;
    for (const o of this.world.karts) {
      if (o === k || o.balloons <= 0 || o.respawnState !== RespawnState.None) continue;
      const d = Math.hypot(o.x - k.x, o.z - k.z);
      // prefer close rivals, and (a little) the leader
      const score = -d + o.score * 4 * this.profile.aggression + this.rng.range(0, 10);
      if (score > bestScore) {
        bestScore = score;
        best = o.index;
      }
    }
    this.target = best;
  }
}

export class BattleAi {
  readonly drivers: BattleDriver[] = [];

  constructor(world: World, arena: ArenaModel, items: ItemSystem) {
    const rng = new Rng(world.rng.nextU32());
    const skill = SPEED_CLASSES[world.speedClass].aiSkill;
    for (const k of world.karts) {
      if (k.isPlayer) continue;
      const profile = AI_PROFILES[findRacer(k.racerId).personality];
      this.drivers.push(new BattleDriver(k, world, arena, items, profile, clamp(skill + rng.range(-0.08, 0.08), 0.1, 1), new Rng(rng.nextU32())));
    }
    world.preStep.push((dt) => {
      for (const d of this.drivers) d.update(dt);
    });
  }
}
