import { localized } from '../i18n';
import { CAMPAIGN_MAPS } from './maps';
import type { MapDef, ThemeId } from './maps/types';

export interface WorldDef {
  id: number;
  /** Translated (`world.<id>.name` / `.blurb`). */
  readonly name: string;
  theme: ThemeId;
  readonly blurb: string;
  /** Total stars needed to open this world. */
  starsToUnlock: number;
  color: string;
}

const WORLD_BASE: Omit<WorldDef, 'name' | 'blurb'>[] = [
  { id: 1, theme: 'meadow', starsToUnlock: 0, color: '#4fbf55' },
  { id: 2, theme: 'desert', starsToUnlock: 6, color: '#e8a64a' },
  { id: 3, theme: 'snow', starsToUnlock: 14, color: '#6ab8ee' },
  { id: 4, theme: 'caves', starsToUnlock: 22, color: '#9b7cff' },
];

export const WORLDS: WorldDef[] = WORLD_BASE.map((w) => localized({ ...w } as WorldDef, `world.${w.id}`, ['name', 'blurb'] as const));

export function mapsOfWorld(id: number): MapDef[] {
  return CAMPAIGN_MAPS.filter((m) => m.world === id);
}

/** Every map has 3 stars on each of the 4 difficulties. */
export const TOTAL_STARS = CAMPAIGN_MAPS.length * 3 * 4;
