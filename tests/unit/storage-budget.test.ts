import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../../src/config/achievements';
import { CHARACTERS } from '../../src/config/characters';
import { ENEMIES } from '../../src/config/enemies';
import { SHOP } from '../../src/config/meta';
import { WEAPONS } from '../../src/config/weapons';
import { defaultSave, sanitizeSave } from '../../src/meta/save';

/** TheaBonk shares ~5 MB of storage with other games: everything we store stays < 100 KB. */
export const STORAGE_BUDGET_BYTES = 100 * 1024;

/** A save with every collection / record / unlock filled to its cap. */
export function maximalSave(): ReturnType<typeof defaultSave> {
  const d = defaultSave();
  d.gold = 999_999_999;
  for (const s of SHOP) d.shop[s.id] = s.maxRank;
  d.unlockedCharacters = CHARACTERS.map((c) => c.id);
  d.unlockedWeapons = WEAPONS.filter((w) => w.unlock).map((w) => w.id);
  d.achievements = ACHIEVEMENTS.map((a) => a.id);
  for (const c of CHARACTERS) d.stats.bestTimeByChar[c.id] = 1203.123456789;
  for (const e of ENEMIES) d.stats.bossKills[e.id] = 99999;
  d.stats.totalKills = 99_999_999;
  return sanitizeSave(JSON.parse(JSON.stringify(d)));
}

describe('storage budget', () => {
  it('a fully filled save stays far below the shared storage budget', () => {
    const bytes = new TextEncoder().encode(JSON.stringify(maximalSave())).length;
    expect(bytes).toBeLessThan(STORAGE_BUDGET_BYTES / 4);
  });
});
