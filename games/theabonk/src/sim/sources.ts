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
  'oldRime.contact',
  'oldRime.charge',
  'oldRime.spikes',
  'oldRime.shards',
  'oldRime.blizzard',
] as const;
export type BossAttack = (typeof BOSS_ATTACKS)[number];

/** Map hazards that can hurt the player. Append only (indices are stored in runs). */
export const MAP_HAZARDS = ['generic', 'icicle'] as const;
export const HAZARD_ICICLE = 1;

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

/** Contact source for an enemy type (bosses map to their pattern's named contact attack). */
export const CONTACT_SRC: Int32Array = Int32Array.from(ENEMIES.map((d, i) => (d.bossPattern ? bossSrc(`${d.bossPattern}.contact` as BossAttack) : src(SrcKind.Contact, i))));

/** Boss attack names start with this (frosted variants share their base's pattern). */
export function bossAttackPrefix(enemyId: string): string {
  const d = ENEMIES.find((e) => e.id === enemyId);
  return `${d?.bossPattern ?? enemyId}.`;
}

/** Seconds of chill a hit from each source inflicts (frost enemies, their shots, Old Rime). */
export const CHILL_BY_SOURCE: Float32Array = (() => {
  const out = new Float32Array(SOURCE_SLOTS);
  ENEMIES.forEach((d, i) => {
    if (!d.chill || d.behavior === 'boss') return;
    out[src(SrcKind.Contact, i)] = d.chill;
    out[src(SrcKind.Shot, i)] = d.chill;
  });
  out[bossSrc('oldRime.shards')] = 1.2;
  out[bossSrc('oldRime.spikes')] = 1.0;
  out[bossSrc('oldRime.blizzard')] = 1.0;
  return out;
})();

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
