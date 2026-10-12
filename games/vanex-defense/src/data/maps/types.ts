import { localized } from '../../i18n';
import type { ElementId } from '../elements';

export type ThemeId = 'meadow' | 'desert' | 'snow' | 'caves' | 'sky' | 'rift';

/**
 * Maps are compact ASCII grids. Legend:
 *   .  open ground — creatures walk here AND you can build (mazing)
 *   o  build spot — you can build, creatures can't walk (fixed-path maps)
 *   =  road — creatures walk, no building
 *   #  rock     T  tree / cactus / pine / crystal (by theme)     ~  water     B  bush / boulder
 *   S  creature spawn (walkable)      C  castle (walkable goal; use a 2×2 block, up to two castles)
 *   P→Q, p→q  teleporter gate pairs: walking into P comes out at Q (both walkable, not buildable)
 *   H / h  bridges over a chasm: H is down (walkable) in bridge phase 0, h in phase 1
 *   Y  sky portal (flyers spawn here)   F  sky lane flyers follow to the castle (no walking/building)
 *   U  unstable ground: walkable until the terrain shift, then crystal blocks it (never buildable)
 *   R  rubble: blocked until the terrain shift, then open ground you can build on
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
  /** Bridges flip at the start of these waves; the terrain shift happens at the start of `shiftWave`. */
  events?: { bridgeWaves?: number[]; shiftWave?: number };
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
  GATE_IN: 'P',
  GATE_OUT: 'Q',
  GATE2_IN: 'p',
  GATE2_OUT: 'q',
  BRIDGE_A: 'H',
  BRIDGE_B: 'h',
  SKY_PORTAL: 'Y',
  SKY_LANE: 'F',
  UNSTABLE: 'U',
  RUBBLE: 'R',
} as const;

/** Map data without text; campaign maps get their name and briefing from i18n (`map.<id>.name/story`). */
export type MapData = Omit<MapDef, 'name' | 'story'>;

export function withMapText(maps: MapData[]): MapDef[] {
  return maps.map((m) => localized({ ...m } as MapDef, `map.${m.id}`, ['name', 'story'] as const));
}
