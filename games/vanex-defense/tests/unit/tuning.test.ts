import { describe, expect, it } from 'vitest';
import { DIFFICULTIES } from '../../src/data/difficulty';
import { ENEMIES, ENEMY_IDS } from '../../src/data/enemies';
import { MAX_LEVEL, TOWER_IDS, TOWERS } from '../../src/data/towers';
import { TUNING } from '../../src/data/tuning';

describe('TUNING', () => {
  it('is the source of tower and enemy numbers', () => {
    for (const id of TOWER_IDS) expect(TOWERS[id].levels).toBe(TUNING.towers[id]);
    for (const id of ENEMY_IDS) expect(ENEMIES[id].hp).toBe(TUNING.enemies[id].hp);
    expect(DIFFICULTIES.normal.lives).toBe(TUNING.difficulties.normal.lives);
  });

  it('gives every tower sane, growing levels', () => {
    for (const id of TOWER_IDS) {
      const lv = TOWERS[id].levels;
      expect(lv.length, id).toBe(MAX_LEVEL);
      for (let i = 0; i < lv.length; i++) {
        const s = lv[i]!;
        expect(s.cost, id).toBeGreaterThan(0);
        expect(s.range, id).toBeGreaterThan(0);
        expect(s.rate, id).toBeGreaterThan(0);
        if (i > 0) {
          expect(s.cost, id).toBeGreaterThanOrEqual(lv[i - 1]!.cost);
          expect(s.damage, id).toBeGreaterThan(lv[i - 1]!.damage);
          expect(s.range, id).toBeGreaterThanOrEqual(lv[i - 1]!.range);
        }
      }
    }
  });

  it('keeps enemy stats in range', () => {
    for (const id of ENEMY_IDS) {
      const e = TUNING.enemies[id];
      expect(e.hp, id).toBeGreaterThan(0);
      expect(e.speed, id).toBeGreaterThan(0);
      expect(e.armor, id).toBeGreaterThanOrEqual(0);
      expect(e.armor, id).toBeLessThanOrEqual(0.8);
      expect(e.lives, id).toBeGreaterThanOrEqual(1);
      if (e.split) expect(ENEMY_IDS).toContain(e.split.into);
    }
  });

  it('orders difficulties from gentle to tough', () => {
    const d = TUNING.difficulties;
    expect(d.easy.lives).toBeGreaterThan(d.normal.lives);
    expect(d.normal.lives).toBeGreaterThan(d.hard.lives);
    expect(d.easy.hp).toBeLessThan(d.normal.hp);
    expect(d.normal.hp).toBeLessThan(d.hard.hp);
  });
});
