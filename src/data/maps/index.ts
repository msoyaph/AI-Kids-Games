import { TUTORIAL_MAP } from './tutorial';
import type { MapDef } from './types';
import { WORLD1 } from './world1';
import { WORLD2 } from './world2';
import { WORLD3 } from './world3';
import { WORLD4 } from './world4';

export const CAMPAIGN_MAPS: MapDef[] = [...WORLD1, ...WORLD2, ...WORLD3, ...WORLD4];
export const ALL_MAPS: MapDef[] = [TUTORIAL_MAP, ...CAMPAIGN_MAPS];

export function mapById(id: string): MapDef | undefined {
  return ALL_MAPS.find((m) => m.id === id);
}

/** The campaign map after this one (or null at the end). */
export function nextMap(id: string): MapDef | null {
  const i = CAMPAIGN_MAPS.findIndex((m) => m.id === id);
  return i >= 0 && i + 1 < CAMPAIGN_MAPS.length ? CAMPAIGN_MAPS[i + 1]! : null;
}

export { TUTORIAL_MAP };
