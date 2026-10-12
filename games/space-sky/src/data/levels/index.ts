import type { LevelDef } from '../levelTypes';

/**
 * Every exploration area. Each file in this folder exports one LevelDef (any export name);
 * they are picked up automatically, so adding a level = adding a file.
 */
const modules = import.meta.glob<Record<string, LevelDef>>('./*.ts', { eager: true });

export const LEVELS: Record<string, LevelDef> = {};
for (const [path, mod] of Object.entries(modules)) {
  if (path.endsWith('/index.ts')) continue;
  for (const v of Object.values(mod)) {
    if (v && typeof v === 'object' && 'map' in v && 'id' in v) LEVELS[(v as LevelDef).id] = v as LevelDef;
  }
}

export function levelById(id: string): LevelDef | undefined {
  return LEVELS[id];
}
