/**
 * Pet care rules (1.1). Pure. Hearts come from friendship, which only goes up; accessories are
 * earned by milestones the save already keeps; what each friend wears is a small number in the
 * save's `vars` (`wear:<uid>`), so 1.0 saves load as they are. Nothing decays, nothing is sad or
 * hungry, and there is no battle bonus: care is just for fun.
 */
import { ACCESSORIES, ACCESSORY_BY_N, CARE, heartsOf, type AccessoryDef } from '../data/accessories';
import { evalFlags } from './script';
import { storyFlags, type GameState } from './state';
import type { Creature } from './types';

/** Field Guide badges: all of the first 52 (1.0's whole guide), and every Agentmon. */
export function guideBadges(friends: ReadonlySet<number>, total: number): { first: boolean; firstCount: number; all: boolean } {
  let firstCount = 0;
  for (let n = 1; n <= 52; n++) if (friends.has(n)) firstCount++;
  let all = true;
  for (let n = 1; n <= total; n++) if (!friends.has(n)) { all = false; break; }
  return { first: firstCount >= 52, firstCount, all };
}

export function isEarned(s: GameState, a: AccessoryDef, species: Record<string, { family: string } | undefined>, total: number): boolean {
  if (a.earned === 'guide52' || a.earned === 'guide77') {
    const b = guideBadges(s.guide.friends, total);
    return a.earned === 'guide52' ? b.first : b.all;
  }
  return evalFlags(a.earned, storyFlags(s, species));
}

export function earnedAccessories(s: GameState, species: Record<string, { family: string } | undefined>, total: number): AccessoryDef[] {
  return ACCESSORIES.filter(a => isEarned(s, a, species, total));
}

/** What a friend wears (an accessory number), or 0. */
export const wearing = (s: GameState, c: Creature): number => {
  const n = s.vars[`wear:${c.uid}`] ?? 0;
  return ACCESSORY_BY_N[n] ? n : 0;
};

export function wear(s: GameState, c: Creature, n: number): void {
  if (n && ACCESSORY_BY_N[n]) s.vars[`wear:${c.uid}`] = n;
  else delete s.vars[`wear:${c.uid}`];
}

/** A little care: friendship goes up (never down), up to the top. Returns the hearts before and after. */
export function care(c: Creature, kind: keyof typeof CARE): { before: number; after: number } {
  const before = heartsOf(c.friendship);
  c.friendship = Math.min(255, c.friendship + CARE[kind]);
  return { before, after: heartsOf(c.friendship) };
}

export { heartsOf };

const ELEMENT_ACT: Record<string, string> = {
  flare: 'glows warm and cozy', tide: 'blows a happy bubble', leaf: 'wiggles its leaves', stone: 'rumbles a happy rumble',
  gust: 'twirls in a tiny breeze', frost: 'sparkles with frost', volt: 'crackles with tiny sparks', glow: 'shines softly',
};
const PERSONALITY_ACT: Record<string, string> = {
  cheerful: 'bounces up and down', brave: 'puffs up proudly', calm: 'closes its eyes and smiles', curious: 'sniffs your hand',
  shy: 'peeks at you, then smiles', playful: 'rolls over for more', sleepy: 'yawns and snuggles close', proud: 'stands tall and beams',
};

/** How a friend reacts to a little care, from its personality and its element (every one is happy). */
export function reaction(name: string, element: string, personality: string, kind: 'pet' | 'snack' | 'favorite' | 'play', n = 0, bubbles = 0): string {
  if (kind === 'favorite') return `${name} loves it, and ${ELEMENT_ACT[element] ?? 'smiles'}!`;
  if (kind === 'snack') return `${name} munches happily.`;
  if (kind === 'play') return bubbles > 0 ? `${name} had so much fun! You caught ${bubbles} bubbles together.` : `${name} had so much fun chasing bubbles!`;
  return n % 2 ? `${name} ${PERSONALITY_ACT[personality] ?? 'smiles'}!` : `${name} ${ELEMENT_ACT[element] ?? 'smiles'}!`;
}
