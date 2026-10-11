import type { ChallengeData } from '../data/types';
import type { SaveData } from '../save/save';

/** Progress display for cumulative challenges (filled in Phase 10). */
export function challengeProgress(c: ChallengeData, save: SaveData): { value: number; target: number } | null {
  void c;
  void save;
  return null;
}

/** Evaluate challenges after a race (or with null after trophy/record updates). Returns newly completed ones. */
export function evaluateChallenges(save: SaveData, result: import('./session').SessionResult | null): ChallengeData[] {
  void save;
  void result;
  return [];
}
