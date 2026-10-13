/** Every map in Sunreach, by id. */
import type { MapDef } from '../../core/world/map';
import { academy, academyGarden, brightmoor, home, neighbor, restBrightmoor, shopBrightmoor } from './brightmoor';
import { meadowPath } from './meadow';

const LIST: MapDef[] = [brightmoor, home, neighbor, academy, academyGarden, restBrightmoor, shopBrightmoor, meadowPath];

export const MAPS: Record<string, MapDef> = Object.fromEntries(LIST.map(m => [m.id, m]));

/** Where a new adventure starts (in Gran's house). */
export const START = { map: 'home', x: 3, y: 4, dir: 2 as const };
