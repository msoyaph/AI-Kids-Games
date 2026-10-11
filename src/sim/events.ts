/**
 * Sim → presentation events. A fixed ring of reusable event objects: the sim
 * writes, the renderer/audio/achievements read once per frame. Zero allocation.
 */
export const enum Ev {
  Spawn = 1,
  Fire,
  Hit,
  Kill,
  Leak,
  Splash,
  Chain,
  Pulse,
  Beam,
  Heal,
  Stun,
  ShieldBlock,
  Build,
  Upgrade,
  Sell,
  WaveStart,
  WaveClear,
  Crystal,
  ElementPicked,
  Coins,
  Victory,
  Defeat,
  BossSpawn,
  Split,
  Zone,
  Crit,
  /** Telegraph: value = radius, value2 = windup s, kind = attack kind, tag = source enemy id. */
  Warn,
  /** Towers knocked offline: value = radius, value2 = duration. */
  Disable,
  /** Boss enters a new phase: value = phase number (2, 3), kind = phase key, tag = boss id. */
  BossPhase,
  /** A barrier shattered. */
  BarrierBreak,
  /** Tunneler goes under (value 1) or surfaces (value 0). */
  Burrow,
  /** Hero shot: x,y → x2,y2; kind = hero id. */
  HeroFire,
  /** Hero special used: kind = special kind, value = radius. */
  HeroSpecial,
  /** Hero knocked out (value = respawn seconds) / back (value 0). */
  HeroDown,
  HeroRespawn,
  HeroLevel,
  /** Commander ability cast: kind = ability id, value = radius, value2 = delay. */
  Ability,
  /** Meteor impact: value = radius. */
  Meteor,
  /** Endless mutator activated: kind = mutator id, value = how many are active. */
  Mutator,
  /** A construct went through a gate: x,y → x2,y2. */
  Teleport,
  /** Terrain changed: kind = 'bridge' | 'shift'. */
  Terrain,
}

export class GameEvent {
  type: Ev = Ev.Spawn;
  x = 0;
  y = 0;
  x2 = 0;
  y2 = 0;
  value = 0;
  value2 = 0;
  /** Free-form id (tower/enemy def id, element id, style). Always a pre-existing string. */
  kind = '';
  /** Secondary string (e.g. element). */
  tag = '';
  id = 0;
}

export class EventQueue {
  private ring: GameEvent[];
  private head = 0;
  private count = 0;

  constructor(readonly capacity = 4096) {
    this.ring = Array.from({ length: capacity }, () => new GameEvent());
  }

  /** Get a recycled event slot to fill in. Oldest events are overwritten on overflow. */
  push(type: Ev, x = 0, y = 0): GameEvent {
    const idx = (this.head + this.count) % this.capacity;
    if (this.count < this.capacity) this.count++;
    else this.head = (this.head + 1) % this.capacity;
    const e = this.ring[idx]!;
    e.type = type;
    e.x = x;
    e.y = y;
    e.x2 = 0;
    e.y2 = 0;
    e.value = 0;
    e.value2 = 0;
    e.kind = '';
    e.tag = '';
    e.id = 0;
    return e;
  }

  get length(): number {
    return this.count;
  }

  /** Visit and remove all pending events. */
  drain(fn: (e: GameEvent) => void): void {
    while (this.count > 0) {
      const e = this.ring[this.head]!;
      this.head = (this.head + 1) % this.capacity;
      this.count--;
      fn(e);
    }
  }

  clear(): void {
    this.head = 0;
    this.count = 0;
  }
}
