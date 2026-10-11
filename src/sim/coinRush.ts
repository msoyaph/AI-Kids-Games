import type { World } from './world';
import type { ItemSystem, HitEffect } from './items/itemSystem';
import type { ArenaModel } from './arena';
import { Kart, RespawnState } from './kart';
import { makeGroundHit, RAMP_NONE } from './ground';

/** Shared shape of the arena modes' rules (balloon battle, coin rush) as seen by the session, HUD and AI. */
export interface ArenaRules {
  timeLeft: number;
  readonly timeLimit: number;
  placeStart(): void;
  updateRanks(): void;
  standings(): Kart[];
}

export const COIN_RUSH_TIME = 120;
const MAX_COINS = 48;
/** Coins kept on the field (dropped coins come on top). */
const FIELD_COINS = 16;
/** Coins a kart drops when an item hits it. */
export const COINS_DROPPED = 3;

export interface Coin {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** Seconds until it can be picked up at all (just spawned / still flying). */
  settle: number;
  /** The kart that dropped it can't grab it back for a moment. */
  owner: number;
  ownerTime: number;
  /** Spins/bounces for the renderer. */
  dropped: boolean;
}

/**
 * Coin Rush: grab coins scattered around the arena; when an item hits you, you drop up to 3 coins for anyone to
 * grab. Most coins when the timer runs out wins. Nobody is eliminated. Deterministic (world RNG only).
 */
export class CoinRushRules implements ArenaRules {
  timeLeft: number;
  readonly coins: Coin[] = [];
  private spawnTimer = 0;
  private readonly spots: Array<{ x: number; y: number; z: number }> = [];
  private readonly hit = makeGroundHit();
  private readonly hint = { ribbon: 0, sample: 0 };

  constructor(
    readonly world: World,
    readonly arena: ArenaModel,
    items: ItemSystem,
    readonly timeLimit = COIN_RUSH_TIME,
  ) {
    this.timeLeft = timeLimit;
    for (let i = 0; i < MAX_COINS; i++) this.coins.push({ active: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, settle: 0, owner: -1, ownerTime: 0, dropped: false });
    for (const k of world.karts) {
      k.score = 0;
      k.balloons = 0;
    }
    this.findSpots(arena);
    const prev = items.onHit;
    items.onHit = (victim, attacker, item, effect) => {
      prev?.(victim, attacker, item, effect);
      this.onHit(victim, effect);
    };
    world.postStep.push((dt) => this.update(dt));
    for (let i = 0; i < FIELD_COINS; i++) this.spawnField();
  }

  /**
   * Coin spots a kart can actually reach: a 1.5 m grid of ground a kart fits on (queried at kart height, so
   * obstacles and walls count), flood-filled from the start spots over gentle steps (ramps up to platforms are
   * fine). Coins only go on flat, non-ramp ground with 3 m of room all round.
   */
  private findSpots(arena: ArenaModel): void {
    const S = arena.data.size;
    const step = 1.5;
    const n = Math.floor((2 * S) / step);
    const N = n + 1;
    const height = new Float32Array(N * N).fill(NaN);
    const ramp = new Uint8Array(N * N);
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const x = -S + i * step;
        const z = -S + j * step;
        const top = arena.query(x, 30, z, this.hint, this.hit);
        const h = top.height;
        const onRamp = top.ramp !== RAMP_NONE;
        if (!arena.query(x, h + 0.5, z, this.hint, this.hit).wallHit) {
          height[i * N + j] = h;
          ramp[i * N + j] = onRamp ? 1 : 0;
        }
      }
    }
    // flood fill from the start spots
    const reached = new Uint8Array(N * N);
    const queue: number[] = [];
    for (const p of arena.spawnPoints) {
      const c = Math.round((p.x + S) / step) * N + Math.round((p.z + S) / step);
      if (c >= 0 && c < N * N && !Number.isNaN(height[c]) && !reached[c]) {
        reached[c] = 1;
        queue.push(c);
      }
    }
    while (queue.length) {
      const c = queue.pop()!;
      const i = Math.floor(c / N);
      const j = c % N;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = i + di;
        const b = j + dj;
        if (a < 0 || b < 0 || a >= N || b >= N) continue;
        const o = a * N + b;
        if (reached[o] || Number.isNaN(height[o]) || Math.abs(height[o] - height[c]) > 0.7) continue;
        reached[o] = 1;
        queue.push(o);
      }
    }
    for (let i = 2; i < N - 2; i++) {
      for (let j = 2; j < N - 2; j++) {
        const c = i * N + j;
        if (!reached[c] || ramp[c]) continue;
        let flat = true;
        for (let a = -2; a <= 2 && flat; a++) {
          for (let b = -2; b <= 2; b++) {
            const o = (i + a) * N + (j + b);
            if (!reached[o] || ramp[o] || Math.abs(height[o] - height[c]) > 0.1) {
              flat = false;
              break;
            }
          }
        }
        if (flat) this.spots.push({ x: -S + i * step, y: height[c], z: -S + j * step });
      }
    }
  }

  placeStart(): void {
    const n = this.world.karts.length;
    const spots = this.arena.spawnPoints;
    this.world.karts.forEach((k, i) => {
      const p = spots[Math.round((i * spots.length) / n) % spots.length];
      k.place(p.x, p.y, p.z, p.yaw);
      this.arena.query(p.x, p.y + 1, p.z, k.hint, k.ground);
    });
  }

  get fieldCount(): number {
    let c = 0;
    for (const coin of this.coins) if (coin.active && !coin.dropped) c++;
    return c;
  }

  private take(): Coin | null {
    for (const c of this.coins) if (!c.active) return c;
    return null;
  }

  private spawnField(): void {
    if (!this.spots.length) return;
    const c = this.take();
    if (!c) return;
    const p = this.spots[this.world.rng.int(0, this.spots.length - 1)];
    // don't drop a coin right on top of a kart
    for (const k of this.world.karts) if ((k.x - p.x) ** 2 + (k.z - p.z) ** 2 < 16) return;
    Object.assign(c, { active: true, x: p.x, y: p.y + 0.9, z: p.z, vx: 0, vy: 0, vz: 0, settle: 0.4, owner: -1, ownerTime: 0, dropped: false });
  }

  private onHit(victim: Kart, effect: HitEffect): void {
    if (effect === 'goo' || effect === 'cloud' || this.world.phase !== 'race') return;
    const n = Math.min(COINS_DROPPED, victim.score);
    if (n <= 0) return;
    victim.score -= n;
    const rng = this.world.rng;
    for (let i = 0; i < n; i++) {
      const c = this.take();
      if (!c) break;
      const a = rng.range(0, Math.PI * 2);
      const sp = rng.range(4, 7);
      Object.assign(c, { active: true, x: victim.x, y: victim.y + 1.2, z: victim.z, vx: Math.sin(a) * sp, vy: rng.range(6, 9), vz: Math.cos(a) * sp, settle: 0.5, owner: victim.index, ownerTime: 1.2, dropped: true });
    }
    this.world.events.push({ type: 'coinDrop', kart: victim.index, count: n });
  }

  private update(dt: number): void {
    const w = this.world;
    if (w.phase !== 'race') return;
    this.timeLeft -= dt;
    // keep the field topped up
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 0.8;
      if (this.fieldCount < FIELD_COINS) this.spawnField();
    }
    for (const c of this.coins) {
      if (!c.active) continue;
      if (c.settle > 0) c.settle -= dt;
      if (c.ownerTime > 0) c.ownerTime -= dt;
      if (c.dropped && (c.vy !== 0 || c.vx !== 0 || c.vz !== 0)) {
        // a dropped coin flies, bounces off the ground and settles
        c.vy -= 22 * dt;
        let nx = c.x + c.vx * dt;
        let nz = c.z + c.vz * dt;
        const g = this.arena.query(nx, c.y + 2, nz, this.hint, this.hit);
        if (g.wallHit || !g.hit) {
          nx = c.x;
          nz = c.z;
          c.vx *= -0.4;
          c.vz *= -0.4;
        }
        c.x = nx;
        c.z = nz;
        c.y += c.vy * dt;
        const floor = (g.hit ? g.height : c.y) + 0.9;
        if (c.y <= floor && c.vy < 0) {
          c.y = floor;
          c.vy = Math.abs(c.vy) > 3 ? -c.vy * 0.35 : 0;
          c.vx *= 0.6;
          c.vz *= 0.6;
          if (c.vy === 0) {
            c.vx = 0;
            c.vz = 0;
          }
        }
      }
      if (c.settle > 0) continue;
      for (const k of w.karts) {
        if (k.respawnState !== RespawnState.None) continue;
        if (c.owner === k.index && c.ownerTime > 0) continue;
        const dx = k.x - c.x;
        const dz = k.z - c.z;
        if (dx * dx + dz * dz < 2.0 * 2.0 && Math.abs(k.y + 0.8 - c.y) < 2.2) {
          c.active = false;
          k.score++;
          k.raceStats.coins++;
          w.events.push({ type: 'coinPickup', kart: k.index, x: c.x, y: c.y, z: c.z });
          break;
        }
      }
    }
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      w.phase = 'done';
      this.standings().forEach((k, i) => {
        k.finished = true;
        k.rank = i + 1;
        k.finishTime = this.timeLimit;
      });
    }
  }

  /** Most coins first; ties go to the kart that was hit less. */
  standings(): Kart[] {
    return [...this.world.karts].sort((a, b) => b.score - a.score || a.raceStats.timesHit - b.raceStats.timesHit || a.index - b.index);
  }

  updateRanks(): void {
    this.standings().forEach((k, i) => (k.rank = i + 1));
  }
}
