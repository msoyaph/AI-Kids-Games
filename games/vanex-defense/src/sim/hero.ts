import { HEROES, type HeroDef, type HeroId } from '../data/heroes';
import { TUNING } from '../data/tuning';
import type { Enemy } from './enemy';
import { F_BUILD, F_WALK, type Grid } from './grid';

/** Damage source id used for kill credit and stats (towers use ids ≥ 1). */
export const HERO_SOURCE = -2;

const H = TUNING.hero;

/**
 * The Commander's field officer. Walks on walkable ground and empty build
 * plates (never through towers or terrain), never blocks creatures and is
 * ignored by the flow field.
 */
export class Hero {
  readonly def: HeroDef;
  x = 0;
  y = 0;
  px = 0;
  py = 0;
  /** Remaining path (cell indices, next first). */
  path: number[] = [];
  level = 1;
  xp = 0;
  hp: number;
  maxHp: number;
  cooldown = 0;
  specialCooldown = 0;
  /** > 0 while knocked out (seconds until respawn). */
  respawn = 0;
  /** > 0 while stunned by a jammer. */
  stunned = 0;
  /** Seconds since constructs last touched the hero (healing waits for a pause). */
  sinceContact = 99;
  angle = 0;
  facing = 1;
  /** Seconds since the last shot (renderer). */
  sinceFire = 99;
  target: Enemy | null = null;
  damageDone = 0;
  kills = 0;
  /** Home cell (respawn point next to the Citadel). */
  readonly home: number;

  constructor(id: HeroId, home: number, grid: Grid) {
    this.def = HEROES[id];
    this.maxHp = this.hp = this.def.hp;
    this.home = home;
    this.x = this.px = grid.cellX(home) + 0.5;
    this.y = this.py = grid.cellY(home) + 0.5;
  }

  get alive(): boolean {
    return this.respawn <= 0;
  }

  /** Stats at the current level and wave. */
  damageAt(wave: number): number {
    return this.def.damage * (1 + H.perLevel.damage * (this.level - 1)) * (1 + H.damagePerWave * Math.max(0, wave - 1));
  }

  get range(): number {
    return this.def.range + H.perLevel.range * (this.level - 1);
  }

  get specialMax(): number {
    return this.def.special.cooldown * (1 - H.perLevel.cooldown * (this.level - 1));
  }

  get nextLevelXp(): number {
    return H.xp[this.level] ?? Infinity;
  }

  /** Add XP; returns true if the hero levelled up. */
  gainXp(n: number): boolean {
    this.xp += n;
    if (this.level >= H.xp.length || this.xp < H.xp[this.level]!) return false;
    this.level++;
    const oldMax = this.maxHp;
    this.maxHp = Math.round(this.def.hp * (1 + H.perLevel.hp * (this.level - 1)));
    this.hp += this.maxHp - oldMax;
    return true;
  }
}

/** Can the hero stand on this cell? (walkable or build plate, no tower). */
export function heroPassable(g: Grid, i: number): boolean {
  return (g.flags[i]! & (F_WALK | F_BUILD)) !== 0 && g.tower[i]! < 0;
}

/**
 * Shortest 8-way path on hero-passable cells (no corner cutting). Returns the
 * cells after `from`, ending at `to`, or null when unreachable.
 */
export function heroPath(g: Grid, from: number, to: number, prev: Int32Array, queue: Int32Array): number[] | null {
  if (!heroPassable(g, to)) return null;
  if (from === to) return [];
  prev.fill(-2);
  let head = 0;
  let tail = 0;
  queue[tail++] = from;
  prev[from] = -1;
  while (head < tail) {
    const c = queue[head++]!;
    if (c === to) break;
    const cx = g.cellX(c);
    const cy = g.cellY(c);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (!g.inBounds(nx, ny)) continue;
        const n = g.idx(nx, ny);
        if (prev[n] !== -2 || !heroPassable(g, n)) continue;
        // no squeezing diagonally between two blocked cells
        if (dx && dy && (!heroPassable(g, g.idx(cx + dx, cy)) || !heroPassable(g, g.idx(cx, cy + dy)))) continue;
        prev[n] = c;
        queue[tail++] = n;
      }
    }
  }
  if (prev[to] === -2) return null;
  const out: number[] = [];
  for (let c = to; c !== from && c >= 0; c = prev[c]!) out.push(c);
  return out.reverse();
}
