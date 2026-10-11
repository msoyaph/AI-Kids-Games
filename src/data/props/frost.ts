import type { ModelPart } from '../types';
import { SHIVER_LAKE_PROPS } from './frost/shiverLake';
import { CRYSTAL_CAVERN_PROPS } from './frost/crystalCavern';
import { LANTERN_VILLAGE_PROPS } from './frost/lanternVillage';
import { AVALANCHE_PEAK_PROPS } from './frost/avalanchePeak';

/** Frost Cup scenery: one file per track so the tracks can be built independently. */
export const FROST_PROPS: Record<string, ModelPart[]> = {
  ...SHIVER_LAKE_PROPS,
  ...CRYSTAL_CAVERN_PROPS,
  ...LANTERN_VILLAGE_PROPS,
  ...AVALANCHE_PEAK_PROPS,
};
