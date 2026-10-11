import type { GlyphId } from '../gfx/art/glyphs';
import type { FlightExtras } from '../systems/flightWorld';
import type { HubPlace } from '../systems/events';
import type { Medal } from './races';
import type { SystemId } from './bodies';

/**
 * Missions are pure data: a list of objectives (each matched against game events),
 * plus a briefing, a "well done" dialogue and rewards. See systems/missions.ts.
 */
export type ObjectiveKind =
  | 'visit' // open a hub place (hangar, lounge...)
  | 'arrive' // fly into a planet system
  | 'near' // fly close to a body
  | 'land' // land on a body
  | 'home' // land back at the Academy
  | 'enterArea' // walk into an exploration area
  | 'collect' // pick up mission items in an area
  | 'scan' // scan a body or mission objects in space
  | 'talk' // talk to a character
  | 'reach' // reach a marker in an area
  | 'solve' // solve a puzzle
  | 'gates' // fly through a ring course
  | 'race' // finish a race (optionally with a medal)
  | 'equip' // equip a rocket part
  | 'coins' // collect star-coins (optionally in one system)
  | 'fuel' // grab fuel cells
  | 'boost' // use boost
  | 'haul' // scoop up items in space
  | 'deliver' // land somewhere carrying hauled items
  | 'glimmer' // gather lost glimmers
  | 'slingshot'; // do gravity slingshots

/** Where the player should go for an objective (drives arrows, the star map and the Go! button). */
export interface Where {
  place?: HubPlace;
  system?: SystemId;
  body?: string;
  area?: string;
}

export interface ObjectiveDef {
  kind: ObjectiveKind;
  /** Short instruction for the HUD, e.g. "Find 3 Moon rocks". */
  text: string;
  icon?: string;
  count?: number;
  place?: HubPlace;
  system?: string;
  body?: string;
  area?: string;
  item?: string;
  /** Scan target id, or a prefix ending in ':' to match any of a group (e.g. "sat:"). */
  target?: string;
  npc?: string;
  marker?: string;
  puzzle?: string;
  course?: string;
  medal?: Medal;
  part?: string;
  where?: Where;
  /** Extra hint (crew lounge, Easy-mode reminders). */
  hint?: string;
  /** Things to place in space while this objective is active. */
  flight?: FlightExtras;
  /** Dialogue ids shown when this objective starts / is completed. */
  onStart?: string;
  onDone?: string;
}

export interface Rewards {
  coins: number;
  parts?: string[];
  items?: string[];
  stickers?: string[];
  flags?: string[];
  /** Move the story to this chapter. */
  chapter?: number;
  codex?: string[];
  cutscene?: string;
}

export interface MissionDef {
  id: string;
  chapter: number;
  kind: 'main' | 'side';
  title: string;
  /** One sentence for the mission board. */
  summary: string;
  giver: string;
  glyph: GlyphId;
  requires: string[];
  requiresFlags?: string[];
  briefing: string;
  done: string;
  objectives: ObjectiveDef[];
  rewards: Rewards;
}
