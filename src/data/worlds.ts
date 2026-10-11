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
  { id: 1, name: 'Sunny Meadow', theme: 'meadow', blurb: 'Flowers, bees and bouncy slimes.', starsToUnlock: 0, color: '#4fbf55' },
  { id: 2, name: 'Dune Desert', theme: 'desert', blurb: 'Hot sand, cactus and fiery creatures.', starsToUnlock: 6, color: '#e8a64a' },
  { id: 3, name: 'Frosty Peaks', theme: 'snow', blurb: 'Snowy hills and slippery ice.', starsToUnlock: 14, color: '#6ab8ee' },
  { id: 4, name: 'Crystal Caves', theme: 'caves', blurb: 'Glowing gems deep underground.', starsToUnlock: 22, color: '#9b7cff' },
];

export function mapsOfWorld(id: number): MapDef[] {
  return CAMPAIGN_MAPS.filter((m) => m.world === id);
}

export const TOTAL_STARS = CAMPAIGN_MAPS.length * 3;
