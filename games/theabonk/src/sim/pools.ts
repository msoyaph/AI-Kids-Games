import { WEAPON_SLOTS } from '../config/balance';

/**
 * Structure-of-arrays entity pools. Entities live densely in [0, count); dead entities are
 * flagged during a tick and compacted (swap-with-last) at the end of the tick, so indices
 * are only stable within a tick. Cross-entity references use `uid`.
 */
abstract class SoAPool {
  readonly cap: number;
  count = 0;
  readonly alive: Uint8Array;
  protected f32: Float32Array[] = [];
  protected i32: Int32Array[] = [];
  protected u8: Uint8Array[] = [];

  constructor(cap: number) {
    this.cap = cap;
    this.alive = this.u8a();
  }

  protected f(): Float32Array {
    const a = new Float32Array(this.cap);
    this.f32.push(a);
    return a;
  }
  protected i(): Int32Array {
    const a = new Int32Array(this.cap);
    this.i32.push(a);
    return a;
  }
  protected u8a(): Uint8Array {
    const a = new Uint8Array(this.cap);
    this.u8.push(a);
    return a;
  }

  /** Copy every per-entity field from `from` to `to`. Subclasses extend for strided data. */
  protected copy(from: number, to: number): void {
    for (const a of this.f32) a[to] = a[from];
    for (const a of this.i32) a[to] = a[from];
    for (const a of this.u8) a[to] = a[from];
  }

  /** Allocate a slot; returns -1 when full. */
  protected allocSlot(): number {
    if (this.count >= this.cap) return -1;
    const i = this.count++;
    this.alive[i] = 1;
    return i;
  }

  /** Remove dead entries, preserving density. Returns number removed. */
  compact(): number {
    let removed = 0;
    let i = 0;
    while (i < this.count) {
      if (this.alive[i]) {
        i++;
        continue;
      }
      const last = this.count - 1;
      if (i !== last) this.copy(last, i);
      this.alive[last] = 0;
      this.count--;
      removed++;
    }
    return removed;
  }

  clear(): void {
    this.alive.fill(0);
    this.count = 0;
  }
}

export class EnemyPool extends SoAPool {
  readonly x = this.f();
  readonly y = this.f();
  readonly z = this.f();
  readonly px = this.f();
  readonly py = this.f();
  readonly pz = this.f();
  /** Knockback velocity (decays). */
  readonly kx = this.f();
  readonly kz = this.f();
  /** Facing yaw. */
  readonly yaw = this.f();
  readonly hp = this.f();
  readonly maxHp = this.f();
  readonly speed = this.f();
  readonly damage = this.f();
  readonly radius = this.f();
  readonly scale = this.f();
  /** Hit flash timer (render). */
  readonly flash = this.f();
  /** Slow: remaining seconds and strength. */
  readonly slowT = this.f();
  readonly slowAmt = this.f();
  /** Behaviour state timers / scratch. */
  readonly stT = this.f();
  readonly stA = this.f();
  readonly stB = this.f();
  readonly stC = this.f();
  /** Age since spawn (spawn-in animation). */
  readonly age = this.f();
  readonly xp = this.f();
  readonly type = this.u8a();
  readonly state = this.u8a();
  readonly elite = this.u8a();
  readonly uid = this.i();
  /** Per weapon-slot immunity end time (persistent damage sources). */
  readonly immune: Float32Array;
  private nextUid = 1;

  constructor(cap: number) {
    super(cap);
    this.immune = new Float32Array(cap * WEAPON_SLOTS);
  }

  protected override copy(from: number, to: number): void {
    super.copy(from, to);
    const a = this.immune;
    const fo = from * WEAPON_SLOTS;
    const to6 = to * WEAPON_SLOTS;
    for (let k = 0; k < WEAPON_SLOTS; k++) a[to6 + k] = a[fo + k];
  }

  alloc(): number {
    const i = this.allocSlot();
    if (i < 0) return -1;
    this.uid[i] = this.nextUid++;
    this.kx[i] = 0;
    this.kz[i] = 0;
    this.flash[i] = 0;
    this.slowT[i] = 0;
    this.slowAmt[i] = 0;
    this.stT[i] = 0;
    this.stA[i] = 0;
    this.stB[i] = 0;
    this.stC[i] = 0;
    this.state[i] = 0;
    this.elite[i] = 0;
    this.age[i] = 0;
    this.scale[i] = 1;
    const o = i * WEAPON_SLOTS;
    for (let k = 0; k < WEAPON_SLOTS; k++) this.immune[o + k] = 0;
    return i;
  }

  /** Linear search for an alive index by uid (use sparingly; prefer caching index + uid check). */
  findUid(uid: number, hint = -1): number {
    if (hint >= 0 && hint < this.count && this.uid[hint] === uid && this.alive[hint]) return hint;
    for (let i = 0; i < this.count; i++) if (this.uid[i] === uid && this.alive[i]) return i;
    return -1;
  }

  override clear(): void {
    super.clear();
    this.nextUid = 1;
  }
}

export const Motion = {
  Linear: 0,
  Orbit: 1,
  Boomerang: 2,
  Homing: 3,
  Arc: 4,
} as const;

export const HIT_LIST = 8;

export class ProjectilePool extends SoAPool {
  readonly x = this.f();
  readonly y = this.f();
  readonly z = this.f();
  readonly px = this.f();
  readonly py = this.f();
  readonly pz = this.f();
  readonly vx = this.f();
  readonly vy = this.f();
  readonly vz = this.f();
  readonly life = this.f();
  readonly maxLife = this.f();
  readonly damage = this.f();
  readonly radius = this.f();
  readonly speed = this.f();
  readonly knockback = this.f();
  readonly hitInterval = this.f();
  readonly slow = this.f();
  readonly explode = this.f();
  readonly crit = this.f();
  /** Motion params: orbit angle/radius/angular speed, boomerang state, homing turn etc. */
  readonly a0 = this.f();
  readonly a1 = this.f();
  readonly a2 = this.f();
  readonly a3 = this.f();
  readonly pierce = this.i();
  readonly target = this.i();
  readonly targetHint = this.i();
  readonly slot = this.u8a();
  readonly visual = this.u8a();
  readonly motion = this.u8a();
  /** 1 = uses per-slot enemy immunity (orbit/boomerang); 0 = uses per-projectile hit list. */
  readonly useImmunity = this.u8a();
  readonly hitCount = this.u8a();
  readonly hits: Int32Array;

  constructor(cap: number) {
    super(cap);
    this.hits = new Int32Array(cap * HIT_LIST);
  }

  protected override copy(from: number, to: number): void {
    super.copy(from, to);
    const h = this.hits;
    const fo = from * HIT_LIST;
    const t = to * HIT_LIST;
    for (let k = 0; k < HIT_LIST; k++) h[t + k] = h[fo + k];
  }

  alloc(): number {
    const i = this.allocSlot();
    if (i < 0) return -1;
    this.hitCount[i] = 0;
    this.target[i] = 0;
    this.targetHint[i] = -1;
    this.a0[i] = 0;
    this.a1[i] = 0;
    this.a2[i] = 0;
    this.a3[i] = 0;
    this.vy[i] = 0;
    this.slow[i] = 0;
    this.explode[i] = 0;
    this.crit[i] = 0;
    this.useImmunity[i] = 0;
    this.motion[i] = Motion.Linear;
    return i;
  }

  hasHit(i: number, uid: number): boolean {
    const o = i * HIT_LIST;
    const n = Math.min(this.hitCount[i], HIT_LIST);
    for (let k = 0; k < n; k++) if (this.hits[o + k] === uid) return true;
    return false;
  }

  addHit(i: number, uid: number): void {
    const c = this.hitCount[i];
    this.hits[i * HIT_LIST + (c % HIT_LIST)] = uid;
    this.hitCount[i] = c + 1 > 255 ? HIT_LIST : c + 1;
  }
}

export class EnemyProjectilePool extends SoAPool {
  readonly x = this.f();
  readonly y = this.f();
  readonly z = this.f();
  readonly px = this.f();
  readonly py = this.f();
  readonly pz = this.f();
  readonly vx = this.f();
  readonly vy = this.f();
  readonly vz = this.f();
  readonly life = this.f();
  readonly damage = this.f();
  readonly radius = this.f();
  readonly visual = this.u8a();

  alloc(): number {
    const i = this.allocSlot();
    if (i < 0) return -1;
    this.vy[i] = 0;
    return i;
  }
}

export class GemPool extends SoAPool {
  readonly x = this.f();
  readonly y = this.f();
  readonly z = this.f();
  readonly px = this.f();
  readonly py = this.f();
  readonly pz = this.f();
  readonly vy = this.f();
  readonly value = this.f();
  /** Seconds since attraction began (accelerates pull). */
  readonly pull = this.f();
  readonly tier = this.u8a();
  readonly magnet = this.u8a();
  readonly grounded = this.u8a();

  alloc(): number {
    const i = this.allocSlot();
    if (i < 0) return -1;
    this.magnet[i] = 0;
    this.pull[i] = 0;
    this.vy[i] = 0;
    this.grounded[i] = 0;
    return i;
  }
}

export const PickupKind = {
  Coin: 0,
  Heart: 1,
  Magnet: 2,
  Chest: 3,
} as const;
export type PickupKindT = (typeof PickupKind)[keyof typeof PickupKind];

export class PickupPool extends SoAPool {
  readonly x = this.f();
  readonly y = this.f();
  readonly z = this.f();
  readonly px = this.f();
  readonly py = this.f();
  readonly pz = this.f();
  readonly vy = this.f();
  readonly value = this.f();
  readonly age = this.f();
  readonly pull = this.f();
  readonly kind = this.u8a();
  readonly magnet = this.u8a();

  alloc(): number {
    const i = this.allocSlot();
    if (i < 0) return -1;
    this.vy[i] = 0;
    this.age[i] = 0;
    this.pull[i] = 0;
    this.magnet[i] = 0;
    return i;
  }
}

export const HazardKind = {
  /** Player fire patch: ticks damage on enemies. */
  Fire: 0,
  /** Player burst: delayed one-shot AoE (telegraph then boom). */
  Burst: 1,
  /** Enemy expanding shockwave ring — jump over it! */
  EnemyRing: 2,
  /** Enemy delayed AoE (telegraphed circle). */
  EnemySlam: 3,
  /** Enemy lingering spore puddle. */
  EnemyPuddle: 4,
} as const;

export class HazardPool extends SoAPool {
  readonly x = this.f();
  readonly y = this.f();
  readonly z = this.f();
  readonly radius = this.f();
  /** Ring: current radius; Burst/Slam: fuse remaining. */
  readonly a0 = this.f();
  /** Ring: expansion speed / thickness etc. */
  readonly a1 = this.f();
  readonly damage = this.f();
  readonly tick = this.f();
  readonly tickT = this.f();
  readonly life = this.f();
  readonly maxLife = this.f();
  readonly knockback = this.f();
  readonly slow = this.f();
  readonly kind = this.u8a();
  readonly slot = this.u8a();
  readonly color = this.i();

  alloc(): number {
    const i = this.allocSlot();
    if (i < 0) return -1;
    this.a0[i] = 0;
    this.a1[i] = 0;
    this.tickT[i] = 0;
    this.knockback[i] = 0;
    this.slow[i] = 0;
    this.color[i] = 0xffffff;
    return i;
  }
}
