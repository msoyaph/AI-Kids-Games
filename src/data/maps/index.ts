import { TUTORIAL_MAP } from './tutorial';
import type { MapDef } from './types';
import { WORLD1 } from './world1';

export const CAMPAIGN_MAPS: MapDef[] = [...WORLD1];
export const ALL_MAPS: MapDef[] = [TUTORIAL_MAP, ...CAMPAIGN_MAPS];

export function mapById(id: string): MapDef | undefined {
  return ALL_MAPS.find((m) => m.id === id);
}

export { TUTORIAL_MAP };
