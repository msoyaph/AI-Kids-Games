import type { ElementId } from '../elements';

export type ThemeId = 'meadow' | 'desert' | 'snow' | 'caves';

/**
 * Maps are compact ASCII grids. Legend:
 *   .  open ground — creatures walk here AND you can build (mazing)
 *   o  build spot — you can build, creatures can't walk (fixed-path maps)
 *   =  road — creatures walk, no building
 *   #  rock     T  tree / cactus / pine / crystal (by theme)     ~  water     B  bush / boulder
 *   S  creature spawn (walkable)      C  castle (walkable goal; use a 2×2 block)
 */
export interface MapDef {
  id: string;
  name: string;
  /** 0 = tutorial, 1..4 = campaign worlds. */
  world: number;
  theme: ThemeId;
  /** 'maze' = open field you shape with towers, 'path' = fixed road. */
  style: 'maze' | 'path';
  grid: string[];
  /** Pip's short intro shown on the briefing screen. */
  story: string;
  /** Elements that creatures in this map like to use (more variants of these). */
  favoredElements?: ElementId[];
  startCoins?: number;
  /** Number of waves (default 40). */
  waves?: number;
}

export const LEGEND = {
  OPEN: '.',
  BUILD: 'o',
  ROAD: '=',
  ROCK: '#',
  TREE: 'T',
  WATER: '~',
  BUSH: 'B',
  SPAWN: 'S',
  CASTLE: 'C',
} as const;
