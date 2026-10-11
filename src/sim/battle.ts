import type { World } from './world';
import type { ItemSystem, HitEffect } from './items/itemSystem';
import type { ArenaModel } from './arena';
import { Kart, RespawnState } from './kart';
import { battleOrder } from './rules';
import type { ArenaRules } from './coinRush';

export const BATTLE_BALLOONS = 3;

/**
 * Balloon battle: every kart starts with 3 balloons. Landing an item hit pops one and scores a point.
 * Kid-friendly: nobody is eliminated — a kart that loses its last balloon gets a fresh set after a short pause.
 * The match is timed; most points wins.
 */
export class BattleRules implements ArenaRules {
  timeLeft: number;
  readonly popped: Int32Array;
  private readonly refill: Float32Array;
  private spawnCursor = 0;

  constructor(
    readonly world: World,
    readonly arena: ArenaModel,
    items: ItemSystem,
    readonly timeLimit = 150,
  ) {
    this.timeLeft = timeLimit;
    this.popped = new Int32Array(world.karts.length);
    this.refill = new Float32Array(world.karts.length);
    for (const k of world.karts) {
      k.balloons = BATTLE_BALLOONS;
      k.score = 0;
    }
    const prev = items.onHit;
    items.onHit = (victim, attacker, item, effect) => {
      prev?.(victim, attacker, item, effect);
      this.onHit(victim, attacker, effect);
    };
    world.postStep.push((dt) => this.update(dt));
  }

  /** Place karts on the arena's spawn ring. */
  placeStart(): void {
    const n = this.world.karts.length;
    const spots = this.arena.spawnPoints;
    this.world.karts.forEach((k, i) => {
      const p = spots[Math.round((i * spots.length) / n) % spots.length];
      k.place(p.x, p.y, p.z, p.yaw);
      this.arena.query(p.x, p.y + 1, p.z, k.hint, k.ground);
    });
  }

  private onHit(victim: Kart, attacker: number, effect: HitEffect): void {
    if (effect === 'goo' || effect === 'cloud') return;
    if (victim.balloons <= 0 || this.world.phase !== 'race') return;
    victim.balloons--;
    this.popped[victim.index]++;
    if (attacker >= 0 && attacker !== victim.index) {
      const a = this.world.karts[attacker];
      a.score++;
      a.raceStats.balloonsPopped++;
    }
    this.world.events.push({ type: 'balloonPop', kart: victim.index, by: attacker, left: victim.balloons });
    if (victim.balloons <= 0) this.refill[victim.index] = 2.6;
  }

  private update(dt: number): void {
    const w = this.world;
    if (w.phase !== 'race') return;
    this.timeLeft -= dt;
    for (const k of w.karts) {
      if (this.refill[k.index] > 0) {
        this.refill[k.index] -= dt;
        if (this.refill[k.index] <= 0) {
          // pop back in somewhere safe with fresh balloons
          const spots = this.arena.spawnPoints;
          const p = spots[this.spawnCursor++ % spots.length];
          k.place(p.x, p.y + 0.5, p.z, p.yaw);
          k.balloons = BATTLE_BALLOONS;
          k.invulnTime = 2;
          k.respawnState = RespawnState.None;
          w.events.push({ type: 'respawn', kart: k.index });
        }
      }
    }
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      w.phase = 'done';
      const order = this.standings();
      order.forEach((k, i) => {
        k.finished = true;
        k.rank = i + 1;
        k.finishTime = this.timeLimit;
      });
    }
  }

  standings(): Kart[] {
    const rows = this.world.karts.map((k) => ({ score: k.score, balloons: k.balloons, popped: this.popped[k.index], index: k.index, kart: k }));
    return battleOrder(rows).map((r) => r.kart);
  }

  /** Live ranks for the HUD/AI. */
  updateRanks(): void {
    this.standings().forEach((k, i) => (k.rank = i + 1));
  }
}
