/** Pet care (1.1): hearts only go up, accessories are earned from milestones, dressing is saved per friend. */
import { describe, expect, it } from 'vitest';
import { care, earnedAccessories, guideBadges, heartsOf, reaction, wear, wearing } from '../../src/core/care';
import { makeCreature } from '../../src/core/creature';
import { Rng } from '../../src/core/rng';
import { newGameState } from '../../src/core/state';
import { ACCESSORIES, CARE } from '../../src/data/accessories';
import { DEX } from '../../src/data/index';
import { SPECIES, SPECIES_LIST } from '../../src/data/species';

const fresh = () => newGameState({ slot: 1, name: 0, look: { skin: 0, hair: 0, hairColor: 0, outfit: 0 }, difficulty: 'normal', seed: 1, start: { map: 'home', x: 4, y: 4 }, now: 0 });

describe('pet care', () => {
  it('only ever adds friendship: hearts climb from 0 to 5 and stay', () => {
    const c = makeCreature(DEX, { species: 'spinnet', level: 5 }, new Rng(1));
    expect(heartsOf(c.friendship)).toBe(0);
    let last = 0;
    for (let i = 0; i < 200; i++) {
      const r = care(c, (['pet', 'snack', 'favorite', 'play'] as const)[i % 4]!);
      expect(r.after).toBeGreaterThanOrEqual(r.before);
      expect(c.friendship).toBeGreaterThanOrEqual(last);
      last = c.friendship;
    }
    expect(c.friendship).toBe(255);
    expect(heartsOf(c.friendship)).toBe(5);
    expect(Math.min(...Object.values(CARE))).toBeGreaterThan(0);
  });

  it('earns accessories from milestones the save already keeps (a 1.0 adventure gets them at once)', () => {
    const s = fresh();
    expect(earnedAccessories(s, SPECIES, SPECIES_LIST.length)).toEqual([]);
    for (const f of ['beacon-lighthouse', 'beacon-canopy', 'sq-relay-done']) s.flags.add(f);
    expect(earnedAccessories(s, SPECIES, SPECIES_LIST.length).map(a => a.id)).toEqual(['sailor-hat', 'flower-crown', 'leaf-cape']);
    // the Silver Guide: all of the first 52 (the whole 1.0 guide), then the Golden Guide for every one
    for (let n = 1; n <= 52; n++) s.guide.friends.add(n);
    expect(guideBadges(s.guide.friends, SPECIES_LIST.length)).toMatchObject({ first: true, all: false });
    expect(earnedAccessories(s, SPECIES, SPECIES_LIST.length).map(a => a.id)).toContain('silver-star');
    for (const sp of SPECIES_LIST) s.guide.friends.add(sp.num);
    expect(earnedAccessories(s, SPECIES, SPECIES_LIST.length).map(a => a.id)).toContain('rainbow-scarf');
  });

  it('remembers what each friend wears, and takes it off again', () => {
    const s = fresh();
    const c = makeCreature(DEX, { species: 'druzling', level: 5 }, new Rng(2));
    expect(wearing(s, c)).toBe(0);
    wear(s, c, ACCESSORIES[3]!.n);
    expect(wearing(s, c)).toBe(ACCESSORIES[3]!.n);
    wear(s, c, 0);
    expect(wearing(s, c)).toBe(0);
    expect(Object.keys(s.vars)).toEqual([]);
    wear(s, c, 999);
    expect(wearing(s, c)).toBe(0);
  });

  it('has twelve accessories with stable numbers, and a happy reaction for everyone', () => {
    expect(ACCESSORIES).toHaveLength(12);
    expect(new Set(ACCESSORIES.map(a => a.n)).size).toBe(12);
    for (const sp of SPECIES_LIST) for (const kind of ['pet', 'snack', 'favorite', 'play'] as const) {
      const line = reaction(sp.name, sp.element, 'shy', kind, 1, 3);
      expect(line.split(/\s+/).length, line).toBeLessThanOrEqual(18);
      expect(line).toContain(sp.name);
    }
  });
});
