import { xpToNext } from '../config/balance';
import { Ev } from '../core/events';
import { xpMult } from './stats';
import type { World } from './world';

/** Add raw XP (before growth multiplier). Queues level-ups; the sim pauses for the picker. */
export function gainXp(w: World, amount: number): void {
  const p = w.player;
  p.xp += amount * xpMult(p.stats);
  while (p.xp >= p.xpNext) {
    p.xp -= p.xpNext;
    p.level++;
    p.xpNext = xpToNext(p.level);
    w.pendingLevels++;
    w.events.push(Ev.LevelUp, p.x, p.y, p.z, p.level);
  }
}

/** Total XP required to reach `level` from level 1. */
export function totalXpForLevel(level: number): number {
  let sum = 0;
  for (let l = 1; l < level; l++) sum += xpToNext(l);
  return sum;
}
