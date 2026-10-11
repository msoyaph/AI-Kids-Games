import type { ElementId } from '../data/elements';
import { TOWERS, type ProjectileStyle, type TargetMode, type TowerDef, type TowerStats } from '../data/towers';
import type { Enemy } from './enemy';

export class Tower {
  id = 0;
  def: TowerDef = TOWERS.arrow;
  level = 1;
  cell = 0;
  cx = 0;
  cy = 0;
  /** Centre in tile space. */
  x = 0;
  y = 0;
  cooldown = 0;
  mode: TargetMode = 'first';
  angle = -Math.PI / 2;
  invested = 0;
  /** Aura buffs recomputed when towers change. */
  rateMult = 1;
  dmgMult = 1;
  /** Beam state. */
  beamTarget: Enemy | null = null;
  beamTargetId = 0;
  beamTime = 0;
  /** Stats (read by UI / achievements). */
  kills = 0;
  damageDone = 0;
  builtAtTick = 0;
  /** Seconds since last shot (renderer recoil animation). */
  sinceFire = 99;
  /** Seconds since built / upgraded (renderer pop animation). */
  sinceBuild = 0;

  get stats(): TowerStats {
    return this.def.levels[this.level - 1]!;
  }
}

export class Projectile {
  active = false;
  readonly slot: number;
  style: ProjectileStyle = 'arrow';
  x = 0;
  y = 0;
  px = 0;
  py = 0;
  /** Direction for sprite rotation. */
  angle = 0;
  speed = 10;
  target: Enemy | null = null;
  targetId = 0;
  tx = 0;
  ty = 0;
  damage = 0;
  stats: TowerStats = TOWERS.arrow.levels[0]!;
  elements: readonly ElementId[] = [];
  towerId = -1;
  hitsAir = true;
  crit = false;
  /** Lob (mortar) flight. */
  lob = false;
  sx = 0;
  sy = 0;
  t = 0;
  tTotal = 1;
  /** Height for lob rendering (tiles). */
  z = 0;

  constructor(slot: number) {
    this.slot = slot;
  }
}

/** Ground effect: steam cloud / lava puddle. */
export class Zone {
  active = false;
  readonly slot: number;
  x = 0;
  y = 0;
  r = 1;
  dps = 0;
  slow = 0;
  time = 0;
  maxTime = 1;
  tick = 0;
  hitsAir = false;
  elements: readonly ElementId[] = [];
  towerId = -1;
  /** 'steam' | 'lava' — decides the look. */
  look = 'steam';

  constructor(slot: number) {
    this.slot = slot;
  }
}
