/** Element matchups: how strongly a move of one element bumps an Agentmon of another. */
import { ELEMENT_INFO } from '../data/elements';
import { TUNING } from '../tuning';
import type { Element, MoveElement } from './types';

export type Matchup = 'strong' | 'weak' | 'neutral';

export function matchup(move: MoveElement, target: Element): Matchup {
  if (move === 'plain') return 'neutral';
  if (ELEMENT_INFO[move].strong.includes(target)) return 'strong';
  if (ELEMENT_INFO[target].strong.includes(move)) return 'weak';
  return 'neutral';
}

export function effectiveness(move: MoveElement, target: Element): number {
  const m = matchup(move, target);
  return m === 'strong' ? TUNING.elements.strong : m === 'weak' ? TUNING.elements.weak : 1;
}

/** The elements that are strong against `target` (its two weaknesses). */
export const weaknessesOf = (target: Element): Element[] =>
  (Object.keys(ELEMENT_INFO) as Element[]).filter(e => ELEMENT_INFO[e].strong.includes(target));
