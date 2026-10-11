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
import type { Coin } from '../coinRush';

/**
 * Arena AI: hunts item pods when empty-handed, otherwise chases a rival; steers around walls/obstacles
 * using a fan of ground probes. Uses the shared ItemBrain to fire items.
 */
class BattleDriver {
  private target = -1;
  private boxTarget = -1;
  /** Coin Rush: index of the coin we're heading for. */
  private coinTarget = -1;
  coins: Coin[] | null = null;
  private retarget = 0;
  private reverse = 0;
  private stuck = 0;
  /** Coins we gave up on (unreachable for now) → race time until we try them again. */
  private readonly ignore = new Map<number, number>();
  private lastCoin = -1;
  private coinSince = 0;
  private readonly ignoreBox = new Map<number, number>();
  private lastBox = -1;
  private boxSince = 0;
  /** Real progress check: where we were at the last sample (speed alone stays high while grinding a wall). */
  private sampleT = 0;
  private sx = 0;
  private sz = 0;
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
    // a coin we can't get to within 6 s (or while stuck) is dropped for a while
    if (this.coinTarget !== this.lastCoin) {
      this.lastCoin = this.coinTarget;
      this.coinSince = 0;
    } else if (this.coinTarget >= 0) {
      this.coinSince += dt;
      if (this.coinSince > 6) this.giveUpCoin(8);
    }
    if (this.boxTarget !== this.lastBox) {
      this.lastBox = this.boxTarget;
      this.boxSince = 0;
    } else if (this.boxTarget >= 0) {
      this.boxSince += dt;
      if (this.boxSince > 6) {
        this.ignoreBox.set(this.boxTarget, w.raceTime + 8);
        this.boxTarget = -1;
        this.lastBox = -1;
        this.retarget = 0;
      }
    }
    // (the window restarts after every reverse, or backing out would itself look like being stuck)
    this.sampleT = this.reverse > 0 ? 0 : this.sampleT + dt;
    if (this.reverse > 0) {
      this.sx = k.x;
      this.sz = k.z;
    }
    if (this.sampleT >= 2) {
      const moved = Math.hypot(k.x - this.sx, k.z - this.sz);
      if (moved < 3 && w.raceTime > 4) {
        this.reverse = 0.9;
        if (this.coinTarget >= 0) this.giveUpCoin(5);
      }
      this.sampleT = 0;
      this.sx = k.x;
      this.sz = k.z;
    }
    let tx = k.x + Math.sin(k.yaw) * 10;
    let tz = k.z + Math.cos(k.yaw) * 10;
    const pickup = (this.coinTarget >= 0 && !!this.coins) || this.boxTarget >= 0;
    if (this.coinTarget >= 0 && this.coins) {
      const c = this.coins[this.coinTarget];
      if (!c.active) this.retarget = 0;
      tx = c.x;
      tz = c.z;
    } else if (this.boxTarget >= 0) {
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
    // close to a coin/pod but pointing past it: ease off (or brake) instead of circling it forever
    if (pickup) {
      const dist = Math.hypot(tx - k.x, tz - k.z);
      if (dist < 12 && Math.abs(err) > 0.7) throttle = Math.abs(err) > 1.3 && k.speed > 7 ? -0.4 : 0.3;
    }
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

  private giveUpCoin(seconds: number): void {
    this.ignore.set(this.coinTarget, this.world.raceTime + seconds);
    this.coinTarget = -1;
    this.lastCoin = -1;
    this.retarget = 0;
  }

  private pickTarget(): void {
    const k = this.kart;
    this.boxTarget = -1;
    this.target = -1;
    this.coinTarget = -1;
    if (this.coins) {
      // Coin Rush: go for the best nearby coin; with an item in hand, aggressive racers chase a coin-rich rival
      if (k.item && this.profile.aggression > 0.4) {
        let rich: Kart | null = null;
        for (const o of this.world.karts) {
          if (o === k || o.respawnState !== RespawnState.None || o.score < 2) continue;
          const d = Math.hypot(o.x - k.x, o.z - k.z);
          if (d < 32 && (!rich || o.score > rich.score)) rich = o;
        }
        if (rich && this.rng.chance(this.profile.aggression)) {
          this.target = rich.index;
          return;
        }
      }
      let best = Infinity;
      const now = this.world.raceTime;
      this.coins.forEach((c, i) => {
        if (!c.active || (c.owner === k.index && c.ownerTime > 0) || (this.ignore.get(i) ?? -1) > now) return;
        const d = Math.hypot(c.x - k.x, c.z - k.z) + this.rng.range(0, 6) * (1 - this.skill);
        if (d < best) {
          best = d;
          this.coinTarget = i;
        }
      });
      if (this.coinTarget >= 0) {
        // coins are the point of Coin Rush: only detour to an item pod when one is much closer than any coin
        let pod = Infinity;
        if (!k.item && k.rouletteTime <= 0) for (const b of this.items.boxes) if (b.respawn <= 0) pod = Math.min(pod, Math.hypot(b.x - k.x, b.z - k.z));
        if (!(pod < 20 && pod < best * 0.5)) return;
      }
      this.coinTarget = -1;
    }
    if (!k.item && k.rouletteTime <= 0) {
      let bd = Infinity;
      const now = this.world.raceTime;
      this.items.boxes.forEach((b, i) => {
        if (b.respawn > 0 || (this.ignoreBox.get(i) ?? -1) > now) return;
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
      if (o === k || (o.balloons <= 0 && !this.coins) || o.respawnState !== RespawnState.None) continue;
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

  constructor(world: World, arena: ArenaModel, items: ItemSystem, coins: Coin[] | null = null) {
    const rng = new Rng(world.rng.nextU32());
    const skill = SPEED_CLASSES[world.speedClass].aiSkill;
    for (const k of world.karts) {
      if (k.isPlayer) continue;
      const profile = AI_PROFILES[findRacer(k.racerId).personality];
      const d = new BattleDriver(k, world, arena, items, profile, clamp(skill + rng.range(-0.08, 0.08), 0.1, 1), new Rng(rng.nextU32()));
      d.coins = coins;
      this.drivers.push(d);
    }
    world.preStep.push((dt) => {
      for (const d of this.drivers) d.update(dt);
    });
  }
}
