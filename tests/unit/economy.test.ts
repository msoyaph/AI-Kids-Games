import { describe, expect, it } from 'vitest';
import { PARTS, STARTER_LOADOUT, STARTER_PARTS } from '../../src/data/parts';
import { DECOR, OUTFITS } from '../../src/data/shop';
import { buy, canBuy, equipOutfit, equipPart, equipSticker, grant, isUnlocked, shopEntry, toggleDecor } from '../../src/systems/economy';
import { createSave } from '../../src/systems/save/schema';
import { GameState } from '../../src/systems/state';

function fresh(coins = 0) {
  const s = new GameState(createSave(0));
  s.data.coins = coins;
  return s;
}

describe('economy', () => {
  it('starts with the starter rocket parts owned and equipped', () => {
    const s = fresh();
    for (const id of Object.values(STARTER_LOADOUT).filter((v) => typeof v === 'string')) expect(s.data.owned).toContain(id);
    expect(STARTER_PARTS.length).toBeGreaterThanOrEqual(8);
  });

  it('every part, outfit and decoration has valid data', () => {
    const ids = new Set<string>();
    for (const it of [...PARTS, ...OUTFITS, ...DECOR]) {
      expect(ids.has(it.id), `duplicate ${it.id}`).toBe(false);
      ids.add(it.id);
      expect(it.price).toBeGreaterThanOrEqual(0);
      expect(it.name.length).toBeGreaterThan(2);
      expect(shopEntry(it.id)).not.toBeNull();
    }
  });

  it('buying needs enough coins and an unlocked item', () => {
    const s = fresh(60);
    expect(canBuy(s.data, 'nose_bubble')).toEqual({ ok: true });
    expect(canBuy(s.data, 'body_chubby')).toEqual({ ok: false, reason: 'coins', need: 50 });
    expect(canBuy(s.data, 'nose_needle')).toMatchObject({ ok: false, reason: 'locked' });
    expect(canBuy(s.data, 'nose_cone')).toMatchObject({ ok: false, reason: 'owned' });
    expect(buy(s, 'nose_bubble').ok).toBe(true);
    expect(s.data.coins).toBe(0);
    expect(s.data.owned).toContain('nose_bubble');
    expect(buy(s, 'nose_bubble').ok).toBe(false);
    expect(s.data.coins).toBe(0);
  });

  it('chapter and mission unlocks open up the shop', () => {
    const s = fresh(1000);
    expect(isUnlocked({ kind: 'chapter', chapter: 2 }, s.data)).toBe(false);
    s.data.chapter = 2;
    expect(canBuy(s.data, 'nose_needle').ok).toBe(true);
    expect(isUnlocked({ kind: 'mission', mission: 'c1_moon_rocks' }, s.data)).toBe(false);
    s.data.missions.c1_moon_rocks = { status: 'done', step: 0, count: 0, seen: [] };
    expect(isUnlocked({ kind: 'mission', mission: 'c1_moon_rocks' }, s.data)).toBe(true);
  });

  it('equipping requires owning the part, and mission gifts are free', () => {
    const s = fresh();
    expect(equipPart(s, 'eng_twin')).toBe(false);
    expect(grant(s, 'eng_twin')).toBe(true);
    expect(grant(s, 'eng_twin')).toBe(false);
    expect(equipPart(s, 'eng_twin')).toBe(true);
    expect(s.data.loadout.engine).toBe('eng_twin');
    expect(s.data.stats.partsEquipped).toContain('eng_twin');
  });

  it('stickers from the sticker book go on the rocket, up to two', () => {
    const s = fresh();
    expect(equipSticker(s, 0, 'st_moon')).toBe(false);
    s.data.stickers.push('st_moon', 'st_rocket', 'st_ice');
    expect(equipSticker(s, 0, 'st_moon')).toBe(true);
    expect(equipSticker(s, 1, 'st_rocket')).toBe(true);
    expect(equipSticker(s, 1, 'st_ice')).toBe(true);
    expect(s.data.loadout.stickers).toEqual(['st_moon', 'st_ice']);
    equipSticker(s, 0, null);
    expect(s.data.loadout.stickers).toEqual(['st_ice']);
  });

  it('outfits and decorations', () => {
    const s = fresh(500);
    expect(equipOutfit(s, 'outfit_scarf')).toBe(false);
    expect(buy(s, 'outfit_scarf').ok).toBe(true);
    expect(equipOutfit(s, 'outfit_scarf')).toBe(true);
    expect(s.data.profile.outfit).toBe('scarf');
    expect(buy(s, 'decor_plant').ok).toBe(true);
    expect(toggleDecor(s, 'decor_plant')).toBe(true);
    expect(s.data.decorPlaced).toEqual(['decor_plant']);
    toggleDecor(s, 'decor_plant');
    expect(s.data.decorPlaced).toEqual([]);
    expect(s.data.coins).toBe(500 - 40 - 30);
  });
});
