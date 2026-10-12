// Mission / quest data model. Missions are pure data interpreted by src/sim/quests.ts.
import type { GameEvents } from '../sim/events';

/** Count bus events. `filter` keys match payload fields exactly; keys prefixed with
 *  "min:" require payload[field] >= value; "prefix:" requires a string prefix.
 *  `sum` adds payload[sum] instead of 1. */
export interface EventObjective {
  kind: 'event';
  label: string;
  event: keyof GameEvents;
  count: number;
  filter?: Record<string, string | number | boolean>;
  sum?: string;
}

/** Re-evaluated against state every tick (progress you already have counts). */
export interface StateObjective {
  kind: 'state';
  label: string;
  fn: string;
  arg?: string;
  n: number;
}

/** Hand items to a character via a talk option. `item` or `cat` (any item of a category). */
export interface DeliverObjective {
  kind: 'deliver';
  label: string;
  npc: string;
  item?: string;
  cat?: string;
  qty: number;
  /** spoken when delivered */
  thanks?: string[];
}

/** Talk to a character (optionally only after a given hour). */
export interface TalkObjective {
  kind: 'talk';
  label: string;
  npc: string;
  lines: string[];
  afterHour?: number;
  tooEarly?: string[];
}

export type Objective = EventObjective | StateObjective | DeliverObjective | TalkObjective;

export type Effect =
  | { type: 'give'; item: string; qty?: number }
  | { type: 'recipe'; id: string }
  | { type: 'money'; glints?: number; lumens?: number }
  | { type: 'flag'; flag: string; value?: number }
  | { type: 'pitchTent' }
  | { type: 'spawn'; struct: 'shopCart' | 'museumTent' }
  | { type: 'construct'; from: 'shopCart' | 'museumTent'; to: 'shop' | 'museum' }
  | { type: 'moveIn'; owners: string[] }
  | { type: 'pockets'; size: number }
  | { type: 'finale' }
  | { type: 'toast'; text: string };

export type Marker = { npc: string } | { struct: string } | { lot: string } | { region: number } | null;

export interface MissionDef {
  id: string;
  chapter: number;
  title: string;
  summary: string;
  requires: string[];
  minDay?: number;
  /** character associated with the mission (portrait, marker, intro speaker) */
  giver: string;
  /** must talk to the giver to start; otherwise auto-starts with the intro as a message */
  startTalk?: boolean;
  intro: string[];
  objectives: Objective[];
  /** objectives must be done in order */
  sequential?: boolean;
  /** if set, talk to this character after objectives to complete */
  turnIn?: string;
  outro: string[];
  onStart?: Effect[];
  onComplete?: Effect[];
  /** plots the player must place during this mission (offered as a talk option on the giver) */
  plots?: string[];
  marker?: Marker;
  hint?: string;
}

export interface ChapterDef {
  n: number;
  title: string;
  blurb: string;
}
