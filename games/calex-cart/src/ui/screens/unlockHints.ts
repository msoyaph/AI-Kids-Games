import type { UnlockRef } from '../../data/types';
import { CHALLENGES } from '../../data/challenges';
import { findCup } from '../../data/cups';
import { SCHOOL_REWARD } from '../../data/school';

/** Kid-friendly "how do I unlock this?" text. */
export function unlockHint(ref: UnlockRef): string {
  if (ref.kind === 'cup') {
    if (ref.id === 'galaxy') return 'Win a trophy in the Sunrise Cup and the Thunder Cup';
    if (ref.id === 'legend') return 'Win a trophy in the Galaxy Cup';
    if (ref.id === 'frost') return 'Win a trophy in the Legend Cup';
    return `Unlock the ${findCup(ref.id).name}`;
  }
  if (ref.kind === 'class') return ref.id === 'champion' ? 'Win gold in the first four cups on Pro' : 'Win gold in the first four cups on Champion';
  if (ref.kind === SCHOOL_REWARD.kind && ref.id === SCHOOL_REWARD.id) return 'Driving School: win gold in all six lessons';
  const c = CHALLENGES.find((ch) => ch.reward.kind === ref.kind && ch.reward.id === ref.id);
  return c ? `Challenge: ${c.description}` : 'Keep racing to unlock!';
}

export function unlockName(ref: UnlockRef): string {
  return `${ref.kind === 'wheels' ? 'Wheels' : ref.kind[0].toUpperCase() + ref.kind.slice(1)}`;
}
