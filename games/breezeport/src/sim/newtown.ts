/**
 * A new town: sleepy old Breezeport as the junior mayor finds it. The coast road runs along the
 * bay, with a promenade by the beach; a short Main Street and Harbor Lane, City Hall, three old
 * cottages, a few trees, a bench and the old harbour pier. Everything else is open land to build on
 * (Old Harbor) or misty land the story opens later.
 *
 * Pure: no DOM, no Date, no Math.random.
 */
import { TUNING } from '../data/tuning';
import { W } from './map';
import { layRoad, paint } from './roads';
import { addThing, emptyTown, FINISH, type Town } from './state';

/** Main Street's column and Harbor Lane's row, for the story and the tests. */
export const MAIN_ST = 40;
export const HARBOR_LANE = 11;
export const COAST_ROAD = 6;

export function newTown(seed: number, mode: Town['mode'] = 'story'): Town {
  const t = emptyTown(seed);
  t.mode = mode;
  t.coins = mode === 'creative' ? 0 : TUNING.start.coins;
  // the coast road runs the whole shore, in and out of town
  layRoad(t, 0, COAST_ROAD, W - 1, COAST_ROAD);
  paint(t, 26, COAST_ROAD - 1, 53, COAST_ROAD - 1, FINISH.paving);
  layRoad(t, MAIN_ST, COAST_ROAD + 1, MAIN_ST, 16);
  layRoad(t, 33, HARBOR_LANE, 47, HARBOR_LANE);
  // City Hall faces Harbor Lane; the old cottages face Main Street
  addThing(t, { def: 'cityhall', x: 41, z: 8, rot: 0 });
  addThing(t, { def: 'cottage', x: 38, z: 7, rot: 3, look: 3 });
  addThing(t, { def: 'bungalow', x: 38, z: 12, rot: 3, look: 1 });
  addThing(t, { def: 'cottage', x: 41, z: 12, rot: 1, look: 5 });
  for (const [x, z] of [[37, 9], [36, 7], [45, 8], [44, 12], [34, 13], [46, 13], [37, 15]] as const) addThing(t, { def: 'tree', x, z, rot: 0, look: (x + z) % 3 });
  addThing(t, { def: 'bench', x: 35, z: COAST_ROAD - 1, rot: 2 });
  addThing(t, { def: 'bench', x: 43, z: COAST_ROAD - 1, rot: 2 });
  addThing(t, { def: 'pier', x: 47, z: 0, rot: 0 });
  if (mode === 'creative') t.unlocked = ['harbor', 'maple', 'greenway', 'boardwalk', 'hilltop', 'meadows'];
  t.cam = { x: MAIN_ST + 1, z: 10.5, yawStep: 0, zoom: 0 };
  t.t = 480 * 0.12;
  return t;
}
