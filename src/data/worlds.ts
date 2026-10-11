import { CAMPAIGN_MAPS } from './maps';
import type { MapDef, ThemeId } from './maps/types';

export interface WorldDef {
  id: number;
  name: string;
  theme: ThemeId;
  blurb: string;
  /** Total stars needed to open this world. */
  starsToUnlock: number;
  color: string;
}

export const WORLDS: WorldDef[] = [
  { id: 1, name: 'Verdant Reach', theme: 'meadow', blurb: 'Highland forests where the first rifts opened.', starsToUnlock: 0, color: '#4fbf55' },
  { id: 2, name: 'Ember Wastes', theme: 'desert', blurb: 'Scorched canyons where the rift engines run hot.', starsToUnlock: 6, color: '#e8a64a' },
  { id: 3, name: 'Frostspire Peaks', theme: 'snow', blurb: 'Frozen relay stations high above the clouds.', starsToUnlock: 14, color: '#6ab8ee' },
  { id: 4, name: 'Hollow Deep', theme: 'caves', blurb: 'The crystal mines where the Shardbound are forged.', starsToUnlock: 22, color: '#9b7cff' },
];

export function mapsOfWorld(id: number): MapDef[] {
  return CAMPAIGN_MAPS.filter((m) => m.world === id);
}

export const TOTAL_STARS = CAMPAIGN_MAPS.length * 3;
