import { ENEMIES } from '../config/enemies';

/**
 * Damage sources: compact integer codes (kind << 8 | id) so the hot path stays
 * allocation-free. Names are only built when a run is summarized.
 */
export const SrcKind = {
  None: 0,
  /** Touching an enemy (id = enemy type index). */
  Contact: 1,
  /** An enemy projectile (id = enemy type index of the shooter). */
  Shot: 2,
  /** An exploding enemy (id = enemy type index). */
  Explosion: 3,
  /** A map hazard (id = MAP_HAZARDS index). */
  Hazard: 4,
  /** A named boss attack (id = BOSS_ATTACKS index). */
  Boss: 5,
} as const;

export const SOURCE_SLOTS = 6 << 8;

/** Every named boss attack. Order is stable (playtest exports refer to names, not indices). */
export const BOSS_ATTACKS = [
  'grumblecap.contact',
  'grumblecap.spores',
  'grumblecap.stomp',
  'clockjaw.contact',
  'clockjaw.charge',
  'clockjaw.shockwave',
  'regent.contact',
  'regent.barrage',
  'regent.slam',
  'regent.rings',
  'regent.volley',
] as const;
export type BossAttack = (typeof BOSS_ATTACKS)[number];

/** Map hazards that can hurt the player (extended by map definitions). */
export const MAP_HAZARDS: string[] = ['generic'];

const ATTACK_INDEX = new Map<string, number>(BOSS_ATTACKS.map((a, i) => [a, i]));

export function bossAttackIndex(name: BossAttack): number {
  return ATTACK_INDEX.get(name) ?? 0;
}

export function src(kind: number, id: number): number {
  return (kind << 8) | (id & 255);
}

export function bossSrc(name: BossAttack): number {
  return src(SrcKind.Boss, bossAttackIndex(name));
}

/** Contact source for an enemy type (bosses map to their named contact attack). */
export const CONTACT_SRC: Int32Array = Int32Array.from(
  ENEMIES.map((d, i) => {
    if (d.bossPattern === 'grumblecap') return bossSrc('grumblecap.contact');
    if (d.bossPattern === 'clockjaw') return bossSrc('clockjaw.contact');
    if (d.bossPattern === 'regent') return bossSrc('regent.contact');
    return src(SrcKind.Contact, i);
  }),
);

export function sourceName(code: number): string {
  const kind = code >> 8;
  const id = code & 255;
  switch (kind) {
    case SrcKind.Contact:
      return `contact:${ENEMIES[id]?.id ?? id}`;
    case SrcKind.Shot:
      return `shot:${ENEMIES[id]?.id ?? id}`;
    case SrcKind.Explosion:
      return `explosion:${ENEMIES[id]?.id ?? id}`;
    case SrcKind.Hazard:
      return `hazard:${MAP_HAZARDS[id] ?? id}`;
    case SrcKind.Boss:
      return `boss:${BOSS_ATTACKS[id] ?? id}`;
    default:
      return 'unknown';
  }
}
