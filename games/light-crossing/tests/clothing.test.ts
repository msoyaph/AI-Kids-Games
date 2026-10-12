// Clothing: data, dye variants, wearing, outfits, the dye station, villager gifts, shop stock, saves.
import { describe, expect, it } from 'vitest';
import { makeGame } from './helpers';
import { CLOTHING, CLOTH_SLOTS, DYE_COLORS, VILLAGER_STYLE } from '../src/data/clothing';
import { STARTER_RECIPES } from '../src/data/recipes';
import { SHOP_ROOM } from '../src/data/interiors';
import { VILLAGERS } from '../src/data/villagers';
import { item } from '../src/data/registry';
import { give, countItem } from '../src/sim/inventory';
import { clothingThanks, dye, dyesInPockets, outfitHash, saveOutfit, takeOff, takeOut, wear, wearOutfit, wornVisuals } from '../src/sim/wardrobe';
import { useSlot, useVerb } from '../src/sim/use';
import { dailyStock } from '../src/sim/economy';
import { pitchTent } from '../src/sim/housing';
import { SEASONS, setSeason } from '../src/sim/seasons';
import { decodeSave, encodeSave } from '../src/sim/save';
import { nextDay } from './story';

describe('clothing data', () => {
  it('has original pieces in every slot, each with a source', () => {
    expect(CLOTHING.length).toBeGreaterThanOrEqual(45);
    const names = new Set(CLOTHING.map((c) => c.name));
    expect(names.size).toBe(CLOTHING.length);
    for (const s of CLOTH_SLOTS) expect(CLOTHING.filter((c) => c.slot === s).length, s).toBeGreaterThanOrEqual(4);
    for (const src of ['craft', 'shop', 'gift', 'event']) expect(CLOTHING.some((c) => c.source === src), src).toBe(true);
    for (const c of CLOTHING) expect(item(c.id).cat).toBe('clothing');
    for (const ids of Object.values(VILLAGER_STYLE)) for (const id of ids) expect(item(id).cat).toBe('clothing');
    expect(Object.keys(VILLAGER_STYLE).sort()).toEqual(VILLAGERS.map((v) => v.id).sort());
  });

  it('dyed copies resolve through item(), and bad ones do not', () => {
    const d = item('cloth_sunny_tee#6');
    expect(d.name).toBe('Blue Sunny Tee');
    expect(d.icon.c).toBe(DYE_COLORS[6]);
    expect(d.cat).toBe('clothing');
    expect(item('cloth_sunny_tee#12').name).toBe('cloth_sunny_tee#12');
    expect(item('timber#2').name).toBe('timber#2');
  });

  it('starter clothes, the dye station and the mirror come with the tent', () => {
    for (const r of ['r_cloth_sunny_tee', 'r_cloth_denim_shorts', 'r_furn_dye_station', 'r_furn_standing_mirror']) expect(STARTER_RECIPES).toContain(r);
    const g = makeGame(501);
    pitchTent(g);
    expect(g.state.recipes).toContain('r_furn_dye_station');
  });
});

describe('wearing clothes', () => {
  it('Wear from your pockets puts it on and moves it into the closet', () => {
    const g = makeGame(510);
    give(g, 'cloth_sunny_tee');
    const slot = g.state.player.inv.findIndex((s) => s?.id === 'cloth_sunny_tee');
    expect(useVerb(g, slot)).toBe('Wear');
    expect(useSlot(g, slot)).toBe(true);
    expect(countItem(g, 'cloth_sunny_tee')).toBe(0);
    expect(g.state.wardrobe.owned).toEqual(['cloth_sunny_tee']);
    expect(g.state.wardrobe.worn.top).toBe('cloth_sunny_tee');
    expect(wornVisuals(g.state).top?.shape).toBe('tee');
  });

  it('a dress replaces the top and bottom, and the other way round', () => {
    const g = makeGame(511);
    for (const id of ['cloth_sunny_tee', 'cloth_denim_shorts', 'cloth_daisy_sundress', 'cloth_sun_cap']) give(g, id);
    wear(g, 'cloth_sunny_tee');
    wear(g, 'cloth_denim_shorts');
    wear(g, 'cloth_sun_cap');
    wear(g, 'cloth_daisy_sundress');
    expect(g.state.wardrobe.worn).toEqual({ dress: 'cloth_daisy_sundress', hat: 'cloth_sun_cap' });
    wear(g, 'cloth_sunny_tee');
    expect(g.state.wardrobe.worn).toEqual({ top: 'cloth_sunny_tee', hat: 'cloth_sun_cap' });
    expect(takeOff(g, 'hat')).toBe(true);
    expect(g.state.wardrobe.worn.hat).toBeUndefined();
  });

  it('saves three outfits, skipping pieces you no longer have', () => {
    const g = makeGame(512);
    for (const id of ['cloth_sunny_tee', 'cloth_denim_shorts', 'cloth_sun_cap', 'cloth_cozy_hoodie']) give(g, id);
    wear(g, 'cloth_sunny_tee');
    wear(g, 'cloth_denim_shorts');
    wear(g, 'cloth_sun_cap');
    saveOutfit(g, 0);
    wear(g, 'cloth_cozy_hoodie');
    takeOff(g, 'hat');
    saveOutfit(g, 2);
    expect(wearOutfit(g, 0)).toBe(0);
    expect(g.state.wardrobe.worn).toEqual({ top: 'cloth_sunny_tee', bottom: 'cloth_denim_shorts', hat: 'cloth_sun_cap' });
    expect(takeOut(g, 'cloth_sun_cap')).toBe(true);
    expect(countItem(g, 'cloth_sun_cap')).toBe(1);
    expect(wearOutfit(g, 0)).toBe(1);
    expect(g.state.wardrobe.worn.hat).toBeUndefined();
    expect(wearOutfit(g, 1)).toBe(-1);
    expect(g.state.wardrobe.outfits).toHaveLength(3);
  });

  it('the outfit key changes when clothes change (villagers notice)', () => {
    const g = makeGame(513);
    expect(outfitHash(g)).toBe('');
    give(g, 'cloth_big_bow');
    wear(g, 'cloth_big_bow');
    const a = outfitHash(g);
    expect(a).not.toBe('');
    takeOff(g, 'hat');
    expect(outfitHash(g)).toBe('');
  });
});

describe('the dye station', () => {
  it('uses one flower of a color to dye a piece, everywhere it is worn or saved', () => {
    const g = makeGame(520);
    give(g, 'cloth_sunny_tee');
    wear(g, 'cloth_sunny_tee');
    saveOutfit(g, 1);
    expect(dye(g, 'cloth_sunny_tee', 6)).toBeNull(); // no blue flower yet
    give(g, 'flower_moon_blue', 2);
    expect(dyesInPockets(g)).toEqual([6]);
    const blue = dye(g, 'cloth_sunny_tee', 6)!;
    expect(blue).toBe('cloth_sunny_tee#6');
    expect(countItem(g, 'flower_moon_blue')).toBe(1);
    expect(g.state.wardrobe.owned).toEqual([blue]);
    expect(g.state.wardrobe.worn.top).toBe(blue);
    expect(g.state.wardrobe.outfits[1]!.top).toBe(blue);
    expect(wornVisuals(g.state).top!.color).toBe(DYE_COLORS[6]);
    // dye again: the id stays based on the original piece
    give(g, 'flower_sun_red');
    expect(dye(g, blue, 0)).toBe('cloth_sunny_tee#0');
  });
});

describe('getting clothes', () => {
  it('villagers sometimes give clothes in their own style, at most every 3 days', () => {
    const g = makeGame(530);
    g.state.villagers.tansy = { movedIn: true, homeId: 1, friendship: 50, talkedDay: 0, giftDay: 0, giftsToday: 0, rewardsGiven: 0, metDay: 1 };
    const first = clothingThanks(g, 'tansy');
    expect(VILLAGER_STYLE.tansy).toContain(first);
    expect(clothingThanks(g, 'tansy')).toBeNull();
    for (let d = 0; d < 3; d++) nextDay(g);
    const second = clothingThanks(g, 'tansy');
    expect(second).not.toBe(first);
    expect(VILLAGER_STYLE.tansy).toContain(second);
    for (let d = 0; d < 3; d++) nextDay(g);
    expect(clothingThanks(g, 'tansy')).toBeNull(); // you already have everything they'd give
  });

  it('the shop sells clothes every day, and the shelves always have room for the whole stock', () => {
    const g = makeGame(531);
    for (const s of SEASONS) {
      setSeason(g, s);
      for (let d = 0; d < 7; d++) {
        nextDay(g);
        const stock = dailyStock(g, 'shop');
        expect(stock.filter((e) => item(e.id).cat === 'clothing')).toHaveLength(2);
        expect(stock.length).toBeLessThanOrEqual(SHOP_ROOM.shelves.length);
      }
    }
  });
});

describe('clothes in saves', () => {
  it('the closet, dyed pieces and outfits survive saving', () => {
    const g = makeGame(540);
    for (const id of ['cloth_sunny_tee', 'cloth_twirl_skirt', 'cloth_star_shades']) give(g, id);
    wear(g, 'cloth_sunny_tee');
    wear(g, 'cloth_twirl_skirt');
    wear(g, 'cloth_star_shades');
    give(g, 'flower_bell_pink');
    dye(g, 'cloth_twirl_skirt', 4);
    saveOutfit(g, 0);
    const back = decodeSave(encodeSave(g.state));
    expect(back.wardrobe).toEqual(g.state.wardrobe);
  });
});
