import { localized } from '../../i18n';
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
  /** Translated for campaign maps; plain text for Workshop maps. */
  readonly name: string;
  /** 0 = tutorial, 1..4 = campaign worlds. */
  world: number;
  theme: ThemeId;
  /** 'maze' = open field you shape with towers, 'path' = fixed road. */
  style: 'maze' | 'path';
  grid: string[];
  /** PIP's briefing shown before the match (translated for campaign maps). */
  readonly story: string;
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

/** Map data without text; campaign maps get their name and briefing from i18n (`map.<id>.name/story`). */
export type MapData = Omit<MapDef, 'name' | 'story'>;

export function withMapText(maps: MapData[]): MapDef[] {
  return maps.map((m) => localized({ ...m } as MapDef, `map.${m.id}`, ['name', 'story'] as const));
}
