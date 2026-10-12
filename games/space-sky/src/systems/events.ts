import type { Medal } from '../data/races';

export type HubPlace = 'board' | 'hangar' | 'codex' | 'badges' | 'lounge' | 'map' | 'shop';

/**
 * Everything the game world reports to the mission engine, badges and daily challenges.
 * Scenes emit these; systems listen. Keep them small and data-only.
 */
export type GameEvent =
  | { type: 'visit'; place: HubPlace }
  | { type: 'launch'; from: string }
  | { type: 'arrive'; system: string }
  | { type: 'near'; body: string }
  | { type: 'land'; body: string; perfect: boolean }
  | { type: 'enterArea'; area: string }
  | { type: 'collect'; item: string; area: string; count: number }
  | { type: 'scan'; target: string }
  | { type: 'talk'; npc: string; area: string }
  | { type: 'reach'; marker: string; area: string }
  | { type: 'solve'; puzzle: string; area: string }
  | { type: 'gates'; course: string }
  | { type: 'race'; course: string; time: number; medal: Medal }
  | { type: 'equip'; part: string }
  | { type: 'buy'; item: string }
  | { type: 'home' }
  | { type: 'coins'; amount: number; system: string }
  | { type: 'fuel' }
  | { type: 'bump' }
  | { type: 'tow' }
  | { type: 'slingshot'; body: string }
  | { type: 'comet' }
  | { type: 'boost' }
  | { type: 'haul'; item: string; system: string }
  | { type: 'deliver'; item: string; body: string; count: number }
  | { type: 'glimmer'; system: string }
  | { type: 'sticker'; id: string }
  | { type: 'codex'; id: string }
  | { type: 'dialogue'; id: string }
  | { type: 'daily'; id: string };

export type GameEventType = GameEvent['type'];
