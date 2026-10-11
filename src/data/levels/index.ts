import type { LevelDef } from '../levelTypes';
import { moon_base } from './moon';

/** Every exploration area. Add a level here after creating its file. */
export const LEVELS: Record<string, LevelDef> = {
  moon_base,
};

export function levelById(id: string): LevelDef | undefined {
  return LEVELS[id];
}
