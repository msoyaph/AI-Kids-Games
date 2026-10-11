import type { ModelPart } from '../types';
import { COMMON_PROPS } from './common';
import { SUNRISE_PROPS } from './sunrise';
import { THUNDER_PROPS } from './thunder';
import { GALAXY_PROPS } from './galaxy';
import { LEGEND_PROPS } from './legend';
import { FROST_PROPS } from './frost';

/**
 * All scenery/hazard recipes by name (origin at the base, +Y up). Drawn with InstancedMesh,
 * one draw call per prop type per track.
 */
export const PROPS: Record<string, ModelPart[]> = {
  ...COMMON_PROPS,
  ...SUNRISE_PROPS,
  ...THUNDER_PROPS,
  ...GALAXY_PROPS,
  ...LEGEND_PROPS,
  ...FROST_PROPS,
};
