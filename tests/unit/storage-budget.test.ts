import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../../src/config/achievements';
import { CHARACTERS } from '../../src/config/characters';
import { ENEMIES } from '../../src/config/enemies';
import { MAPS } from '../../src/config/maps';
import { SHOP } from '../../src/config/meta';
import { WEAPONS } from '../../src/config/weapons';
import { cloneTuning, diffTuning, TUNING_DEFAULTS, TUNING_RANGES, type Range, type TuningGroup } from '../../src/config/tuning';
import { PLAYTEST_MAX_BYTES } from '../../src/meta/playtest';
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
  d.unlockedMaps = MAPS.map((m) => m.id);
  for (const m of MAPS) {
    d.stats.winsByMap[m.id] = 99999;
    d.stats.bestTimeByMap[m.id] = 1203.123456789;
  }
  // 30 daily records, a full collection, every touch control moved
  d.daily = Array.from({ length: 30 }, (_, k) => ({ date: `2026-${String(1 + (k % 12)).padStart(2, '0')}-${String(1 + k).padStart(2, '0')}`, map: 'rimewood', hero: 'bramble', time: 1203.123456, won: true, kills: 99999, level: 99 }));
  for (const e of ENEMIES) d.collection.kills[e.id] = 99999;
  d.collection.weapons = WEAPONS.map((w) => w.id);
  d.settings.touch.layout = { stick: { ax: 0, ay: 1, dx: 0.123456, dy: 0.234567, s: 1.234 }, jump: { ax: 1, ay: 1, dx: 0.123456, dy: 0.234567, s: 1.234 }, slide: { ax: 1, ay: 1, dx: 0.323456, dy: 0.134567, s: 0.834 }, pause: { ax: 1, ay: 0, dx: 0.023456, dy: 0.034567, s: 1 } };
  return sanitizeSave(JSON.parse(JSON.stringify(d)));
}

/** Every tuning value changed (the largest possible `theabonk.tuning` entry). */
function maximalTuning(): string {
  const t = cloneTuning();
  for (const g of Object.keys(TUNING_RANGES) as TuningGroup[]) {
    const vals = t[g] as unknown as Record<string, unknown>;
    for (const [k, r] of Object.entries(TUNING_RANGES[g] as Record<string, Range>)) {
      if (g === 'enemies' && k === 'perType') for (const id of Object.keys(vals[k] as object)) (vals[k] as Record<string, number>)[id] = r[1] - 0.123456;
      else vals[k] = r[1] - r[2] * 0.37;
    }
  }
  return JSON.stringify(diffTuning(TUNING_DEFAULTS, t));
}

describe('storage budget', () => {
  it('a fully filled save stays far below the shared storage budget', () => {
    const bytes = new TextEncoder().encode(JSON.stringify(maximalSave())).length;
    console.info(`storage: default save ${JSON.stringify(defaultSave()).length} B, maximal save ${bytes} B, maximal tuning ${maximalTuning().length} B, playtest cap ${PLAYTEST_MAX_BYTES} B`);
    expect(bytes).toBeLessThan(STORAGE_BUDGET_BYTES / 4);
  });

  it('all theabonk.* keys together stay under 100 KB in the worst case', () => {
    const save = JSON.stringify(maximalSave());
    const backup = save; // theabonk.save.bak (one-time migration backup)
    const total = save.length + backup.length + maximalTuning().length + PLAYTEST_MAX_BYTES;
    expect(total).toBeLessThan(STORAGE_BUDGET_BYTES);
  });
});
