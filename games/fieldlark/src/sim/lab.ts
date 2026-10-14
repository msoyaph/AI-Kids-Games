/** The Farm Lab: trying ideas with Lab ideas (src/data/lab.ts). */
import { LAB, LAB_BY_ID, LAB_SETS } from '../data/lab';
import type { Farm } from './state';
import { bump } from './world';

export const labOpen = (farm: Farm) => farm.story.chapter >= 5;
export const hasIdea = (farm: Farm, id: string) => !!farm.flags[`lab:${id}`];

/** Why an idea can't be tried now (null: it can). Each branch goes in order. */
export function cantLearn(farm: Farm, id: string): string | null {
  const idea = LAB_BY_ID[id];
  if (!idea) return 'Unknown idea.';
  if (!labOpen(farm)) return 'The Farm Lab opens in chapter 6.';
  if (hasIdea(farm, id)) return 'Already tried!';
  const branch = LAB.filter(l => l.branch === idea.branch);
  const before = branch[branch.indexOf(idea) - 1];
  if (before && !hasIdea(farm, before.id)) return `Try ${before.name} first.`;
  if (farm.ideas < idea.cost) return `It needs ${idea.cost} Lab idea${idea.cost === 1 ? '' : 's'}.`;
  return null;
}

export function learn(farm: Farm, id: string): { ok: true } | { ok: false; why: string } {
  const why = cantLearn(farm, id);
  if (why) return { ok: false, why };
  farm.ideas -= LAB_BY_ID[id]!.cost;
  farm.flags[`lab:${id}`] = 1;
  const set = LAB_SETS[id];
  if (set) farm.flags[`set:${set}`] = 1;
  bump(farm, 'lab');
  return { ok: true };
}

/** Lab ideas for farm levels: one for each level from 3 on. */
export const ideasForLevels = (from: number, to: number) => Math.max(0, to - Math.max(from, 2));
