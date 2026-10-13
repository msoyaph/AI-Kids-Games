/**
 * Adventure: 60 levels in 4 worlds (Meadow, Ocean, Candy, Space), 15 each. Every level has one
 * goal (clear lines, collect the fruit/pearls/gems/stars sitting on blocks, break stones, or reach
 * a score) and a move limit. Stars: 1 for the goal, 2 and 3 for reaching it in fewer moves (the
 * par numbers come from a solver that proves 3 stars are possible: npm run levels). Trays are
 * built to fit, from the level's own seed, so a retry always starts the same way. Worlds open
 * with stars; levels open one after another. Timers never affect stars (worlds 3 and 4 offer an
 * optional clock badge).
 */
import type { ThemeId } from '../data/themes';
import { newGame, type Game, type Goal } from './game';

export interface Level {
  id: string; world: number; n: number;
  goal: Goal; moves: number;
  /** Moves for 3 stars and for 2 stars. */
  par3: number; par2: number;
  layout: string[];
  weights: [number, number, number];
  seed: number;
  tip?: string;
  /** Seconds for the optional clock badge (worlds 3 and 4 only). */
  clock?: number;
}

export interface World { id: string; name: string; theme: ThemeId; item: 'fruit' | 'pearl' | 'gem' | 'comet'; itemName: [string, string]; needs: number }
export const WORLDS: readonly World[] = [
  { id: 'meadow', name: 'Meadow', theme: 'classic', item: 'fruit', itemName: ['cherry', 'cherries'], needs: 0 },
  { id: 'ocean', name: 'Ocean', theme: 'ocean', item: 'pearl', itemName: ['pearl', 'pearls'], needs: 20 },
  { id: 'candy', name: 'Candy', theme: 'candy', item: 'gem', itemName: ['gem', 'gems'], needs: 55 },
  { id: 'space', name: 'Space', theme: 'space', item: 'comet', itemName: ['comet', 'comets'], needs: 95 },
];
export const LEVELS_PER_WORLD = 15;

export function levelGame(level: Level): Game {
  return newGame({ mode: 'adventure', seed: level.seed, layout: level.layout, goal: level.goal, movesLimit: level.moves, weights: level.weights });
}

/** Stars for a finished game of this level (0 when the goal wasn't reached). */
export function starsFor(level: Level, g: Pick<Game, 'end' | 'moves'>): number {
  if (g.end !== 'goal') return 0;
  return g.moves <= level.par3 ? 3 : g.moves <= level.par2 ? 2 : 1;
}

/** Stars from the profile's string ('0'–'3' per level). */
export const starsOf = (adv: string, index: number) => Number(adv[index] ?? '0') || 0;
export const totalStars = (adv: string) => [...adv].reduce((a, c) => a + (Number(c) || 0), 0);

/** A world opens with enough stars (from all worlds). */
export const worldOpen = (adv: string, world: number) => totalStars(adv) >= WORLDS[world]!.needs;
/** A level opens when its world is open and the level before it (in that world) has a star. */
export function levelOpen(adv: string, index: number): boolean {
  const world = Math.floor(index / LEVELS_PER_WORLD), n = index % LEVELS_PER_WORLD;
  return worldOpen(adv, world) && (n === 0 || starsOf(adv, index - 1) > 0);
}
/** A world is finished when every level in it has a star. */
export const worldDone = (adv: string, world: number) => [...adv.slice(world * LEVELS_PER_WORLD, (world + 1) * LEVELS_PER_WORLD)].every(c => c !== '0');

/** "Collect 6 pearls", "Break 3 stones", "Clear 10 lines", "Score 500 points". */
export function goalText(level: Level): string {
  const { kind, target } = level.goal, w = WORLDS[level.world]!;
  switch (kind) {
    case 'lines': return `Clear ${target} ${target === 1 ? 'line' : 'lines'}`;
    case 'items': return `Collect ${target} ${target === 1 ? w.itemName[0] : w.itemName[1]}`;
    case 'stones': return `Break ${target} ${target === 1 ? 'stone' : 'stones'}`;
    case 'score': return `Score ${target} points`;
  }
}
