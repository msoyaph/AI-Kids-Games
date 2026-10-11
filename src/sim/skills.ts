/** Skill XP and levels (perks are added in the skills/perks system). */
import { TUNING } from '../tuning';
import type { Sim } from './sim';
import type { SkillId } from './state';

export const MAX_LEVEL = 10;

export function levelForXp(xp: number): number {
  let lvl = 0;
  for (let i = 1; i < TUNING.skillXp.length; i++) if (xp >= TUNING.skillXp[i]) lvl = i;
  return Math.min(MAX_LEVEL, lvl);
}

export function level(sim: Sim, s: SkillId): number {
  return levelForXp(sim.p.xp[s] ?? 0);
}

/** Progress 0..1 to the next level. */
export function levelProgress(xp: number): number {
  const lvl = levelForXp(xp);
  if (lvl >= MAX_LEVEL) return 1;
  const a = TUNING.skillXp[lvl], b = TUNING.skillXp[lvl + 1];
  return (xp - a) / (b - a);
}

export function gainXp(sim: Sim, s: SkillId, n: number): void {
  const before = level(sim, s);
  sim.p.xp[s] = (sim.p.xp[s] ?? 0) + n;
  const after = level(sim, s);
  if (after > before) {
    sim.pendingLevelUps.push({ skill: s, level: after });
    sim.ev.emit('levelUp', { skill: s, level: after });
  }
}

export function hasPerk(sim: Sim, perk: string): boolean {
  return sim.p.perks.includes(perk);
}
