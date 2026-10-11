import type { UnlockRef } from '../../data/types';
import { CHALLENGES } from '../../data/challenges';
import { findCup } from '../../data/cups';

/** Kid-friendly "how do I unlock this?" text. */
export function unlockHint(ref: UnlockRef): string {
  if (ref.kind === 'cup') {
    if (ref.id === 'galaxy') return 'Win a trophy in the Sunrise Cup and the Thunder Cup';
    if (ref.id === 'legend') return 'Win a trophy in the Galaxy Cup';
    return `Unlock the ${findCup(ref.id).name}`;
  }
  if (ref.kind === 'class') return ref.id === 'champion' ? 'Win gold in every cup on Pro' : 'Win gold in every cup on Champion';
  const c = CHALLENGES.find((ch) => ch.reward.kind === ref.kind && ch.reward.id === ref.id);
  return c ? `Challenge: ${c.description}` : 'Keep racing to unlock!';
}

export function unlockName(ref: UnlockRef): string {
  return `${ref.kind === 'wheels' ? 'Wheels' : ref.kind[0].toUpperCase() + ref.kind.slice(1)}`;
}
