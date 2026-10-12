/**
 * Difficulties (Relaxed / Normal / Hard) and Hard's five tiers. Each resolves into one set of
 * multipliers applied when the run is created (`w.mods`) and read where they matter — never
 * folded into the tuning copy, so tuning exports stay clean.
 */

export type DifficultyId = 'relaxed' | 'normal' | 'hard';

export interface RunMods {
  /** Player max HP. */
  playerHp: number;
  /** Damage the player takes (every source). */
  damageTaken: number;
  enemyHp: number;
  enemySpeed: number;
  spawnRate: number;
  maxAlive: number;
  /** Extra elites per elite event. */
  extraElites: number;
  /** Level-up heal and heart drop chance. */
  heal: number;
  hearts: number;
  /** Bosses fight as if already enraged / in their last phase. */
  bossEnraged: boolean;
  /** Gold banked at the end of the run. */
  gold: number;
  /** Extra rerolls / skips / banishes for the run. */
  rerolls: number;
  skips: number;
  banishes: number;
  /** Crowd size (spawn rate, alive caps, event counts) — the tablet tier fields fewer Gloom. */
  crowd: number;
  /** HP, XP and coin value per regular Gloom (scaled up when the crowd is smaller). */
  crowdHp: number;
  enemyXp: number;
  coinValue: number;
}

/** Tablet tier: about 65% of the Gloom, each one tougher and richer to match. */
export const TABLET_CROWD = 0.65;

export interface DifficultyDef {
  id: DifficultyId;
  name: string;
  description: string;
  mods: Partial<RunMods>;
}

export const NORMAL_MODS: Readonly<RunMods> = {
  playerHp: 1,
  damageTaken: 1,
  enemyHp: 1,
  enemySpeed: 1,
  spawnRate: 1,
  maxAlive: 1,
  extraElites: 0,
  heal: 1,
  hearts: 1,
  bossEnraged: false,
  gold: 1,
  rerolls: 0,
  skips: 0,
  banishes: 0,
  crowd: 1,
  crowdHp: 1,
  enemyXp: 1,
  coinValue: 1,
};

export const DIFFICULTIES: DifficultyDef[] = [
  {
    id: 'relaxed',
    name: 'Relaxed',
    description: 'More health, slower and gentler Gloom, more hearts, and an extra reroll, skip and banish. Less gold.',
    mods: { playerHp: 1.18, damageTaken: 0.92, enemySpeed: 0.93, hearts: 1.3, heal: 1.15, gold: 0.75, rerolls: 1, skips: 1, banishes: 1 },
  },
  {
    id: 'normal',
    name: 'Normal',
    description: 'The night as it was meant to be.',
    mods: {},
  },
  {
    id: 'hard',
    name: 'Hard',
    description: 'Tougher Gloom that come faster, more elites and less healing. More gold.',
    mods: { enemyHp: 1.28, damageTaken: 1.18, spawnRate: 1.22, maxAlive: 1.12, extraElites: 1, heal: 0.6, hearts: 0.6, gold: 1.5 },
  },
];

/** Hard's tiers (unlocked by winning on Hard): each adds to all the ones before it. */
export const TIERS: Array<{ name: string; description: string; mods: Partial<RunMods> }> = [
  { name: 'Tier 1', description: 'Faster Gloom.', mods: { enemySpeed: 1.08 } },
  { name: 'Tier 2', description: 'Twice the elites.', mods: { extraElites: 1 } },
  { name: 'Tier 3', description: 'Even less healing.', mods: { heal: 0.6, hearts: 0.6 } },
  { name: 'Tier 4', description: 'Tougher Gloom.', mods: { enemyHp: 1.25 } },
  { name: 'Tier 5', description: 'Bosses arrive enraged.', mods: { bossEnraged: true } },
];

export const MAX_TIER = TIERS.length;

/** Gold bonus per tier on top of Hard's. */
const TIER_GOLD = 0.15;

export function difficultyDef(id: string): DifficultyDef {
  return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[1];
}

export function isDifficultyId(v: unknown): v is DifficultyId {
  return v === 'relaxed' || v === 'normal' || v === 'hard';
}

/** Multipliers multiply, counts add, flags OR. */
function combine(into: RunMods, m: Partial<RunMods>): void {
  for (const [k, v] of Object.entries(m) as Array<[keyof RunMods, number | boolean]>) {
    if (typeof v === 'boolean') (into[k] as boolean) = (into[k] as boolean) || v;
    else if (k === 'extraElites' || k === 'rerolls' || k === 'skips' || k === 'banishes') (into[k] as number) += v;
    else (into[k] as number) *= v;
  }
}

/** The run's modifiers for a difficulty (tier only applies on Hard); `tablet` thins the crowd. */
export function runMods(difficulty: DifficultyId, tier = 0, tablet = false, mapMods?: Partial<RunMods>): RunMods {
  const out: RunMods = { ...NORMAL_MODS };
  if (tablet) {
    // same total challenge with fewer bodies on screen: HP, XP and coins carry the difference
    out.crowd = TABLET_CROWD;
    out.crowdHp = 1 / TABLET_CROWD;
    out.enemyXp = 1 / TABLET_CROWD;
    out.coinValue = 1 / TABLET_CROWD;
  }
  combine(out, difficultyDef(difficulty).mods);
  if (mapMods) combine(out, mapMods);
  if (difficulty === 'hard') {
    const t = Math.max(0, Math.min(MAX_TIER, Math.floor(tier)));
    for (let k = 0; k < t; k++) combine(out, TIERS[k].mods);
    out.gold *= 1 + TIER_GOLD * t;
  }
  return out;
}

/** "Hard · Tier 3", "Relaxed", … */
export function difficultyLabel(difficulty: DifficultyId, tier = 0): string {
  const d = difficultyDef(difficulty);
  return difficulty === 'hard' && tier > 0 ? `${d.name} · Tier ${tier}` : d.name;
}
