/**
 * Sim → presentation event channel. The simulation pushes compact numeric events
 * (damage numbers, deaths, sounds, ...) into preallocated typed arrays; the renderer,
 * audio engine and HUD drain them once per frame. No per-event allocation.
 */
export const Ev = {
  Damage: 1, // x y z amount crit(0/1)
  EnemyDie: 2, // x y z enemyType scale elite(0/1)
  PlayerHurt: 3, // amount
  PlayerHeal: 4, // amount
  Gem: 5, // x y z value
  Coin: 6, // x y z value
  LevelUp: 7, // level
  Sfx: 8, // x y z ; i = sfx id
  Explosion: 9, // x y z radius hostile(0/1) ; i = color
  Lightning: 10, // x1 y1 z1 x2 y2 z2
  Ring: 11, // x y z radius ; i = color  (expanding visual ring)
  Chest: 12, // x y z
  ShrineHit: 13, // x y z
  ShrineBreak: 14, // x y z ; i = shrine kind
  BossSpawn: 15, // i = enemy type
  BossDie: 16, // x y z ; i = enemy type
  Jump: 17, // x y z speed
  Land: 18, // x y z impact speed
  Slide: 19, // x y z speed
  EnemyShoot: 20, // x y z
  Banner: 21, // i = banner id
  Evolve: 22, // i = weapon index
  Pickup: 23, // x y z ; i = pickup kind
  Revive: 24, // x y z
  Buff: 25, // i = buff kind
  Achievement: 26, // i = achievement index
  Gust: 27, // dirX dirZ warnSeconds durationSeconds
} as const;

export type EvType = (typeof Ev)[keyof typeof Ev];

const FIELDS = 6;

export class EventBuffer {
  readonly cap: number;
  count = 0;
  dropped = 0;
  readonly type: Uint8Array;
  readonly f: Float32Array;
  readonly i: Int32Array;

  constructor(cap = 8192) {
    this.cap = cap;
    this.type = new Uint8Array(cap);
    this.f = new Float32Array(cap * FIELDS);
    this.i = new Int32Array(cap);
  }

  push(type: EvType, a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, i = 0): void {
    if (this.count >= this.cap) {
      this.dropped++;
      return;
    }
    const n = this.count++;
    this.type[n] = type;
    const o = n * FIELDS;
    const arr = this.f;
    arr[o] = a;
    arr[o + 1] = b;
    arr[o + 2] = c;
    arr[o + 3] = d;
    arr[o + 4] = e;
    arr[o + 5] = f;
    this.i[n] = i;
  }

  /** Field accessor: event n, field k (0..5). */
  get(n: number, k: number): number {
    return this.f[n * FIELDS + k];
  }

  clear(): void {
    this.count = 0;
  }
}
