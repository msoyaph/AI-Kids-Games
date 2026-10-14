/** Build mode: paths, fences and flowers, moving, storage, undo, new land and beauty. */
import { describe, expect, it } from 'vitest';
import { LAND } from '../../src/data/decor';
import { xpForLevel } from '../../src/data/tuning';
import { decodeFarm, encodeFarm } from '../../src/save/save';
import { buyAnimal } from '../../src/sim/animals';
import { buyAndPlace } from '../../src/sim/build';
import { beauty, canOpen, erase, moveObject, openLand, paintPath, pathAt, placeDecor, placeStored, putAway, stored, UndoStack } from '../../src/sim/decorate';
import { newFarm } from '../../src/sim/state';

const rich = () => { const f = newFarm(5); f.xp = xpForLevel(20); f.coins = 100000; f.objects = f.objects.filter(o => o.kind !== 'debris'); return f; };

describe('build mode', () => {
  it('paints paths on open, empty land, and clears them', () => {
    const farm = rich();
    expect(paintPath(farm, 46, 44, 2).ok).toBe(true);
    expect(pathAt(farm, 46, 44)).toBe(2);
    expect(paintPath(farm, 46, 44, 2).ok).toBe(false); // already
    expect(paintPath(farm, 41, 47, 1).ok).toBe(false); // a field is there
    expect(paintPath(farm, 25, 45, 1).ok).toBe(false); // meadow not open
    expect(erase(farm, 46, 44).ok).toBe(true);
    expect(pathAt(farm, 46, 44)).toBe(0);
  });

  it('paints fences and flower beds tile by tile; clearing puts them in storage to reuse for free', () => {
    const farm = rich();
    for (const x of [44, 45, 46]) expect(placeDecor(farm, 'fence', { x, z: 38, rot: 0 }).ok).toBe(true);
    expect(farm.objects.filter(o => o.def === 'fence')).toHaveLength(3);
    expect(erase(farm, 45, 38).ok).toBe(true);
    expect(stored(farm, 'decor:fence')).toBe(1);
    const coins = farm.coins;
    expect(placeDecor(farm, 'fence', { x: 47, z: 38, rot: 0 }).ok).toBe(true);
    expect(farm.coins).toBe(coins); // from storage
  });

  it('moves and turns buildings but not fixed ones; busy ones stay out of storage', () => {
    const farm = rich();
    const r = buyAndPlace(farm, { kind: 'building', def: 'coop' }, { x: 44, z: 38, rot: 0 });
    const coop = r.ok ? r.obj : null!;
    expect(moveObject(farm, coop.id, { x: 45, z: 38, rot: 1 }).ok).toBe(true);
    expect([coop.x, coop.z, coop.rot]).toEqual([45, 38, 1]);
    const cottage = farm.objects.find(o => o.def === 'cottage')!;
    expect(moveObject(farm, cottage.id, { x: 44, z: 41, rot: 0 }).ok).toBe(false);
    buyAnimal(farm, coop);
    expect(putAway(farm, coop.id).ok).toBe(false); // a chicken lives there
    const bin = farm.objects.find(o => o.def === 'compost')!;
    expect(putAway(farm, bin.id).ok).toBe(true);
    expect(stored(farm, 'building:compost')).toBe(1);
    expect(placeStored(farm, 'building', 'compost', { x: 46, z: 41, rot: 0 }).ok).toBe(true);
    expect(stored(farm, 'building:compost')).toBe(0);
  });

  it('undoes build actions, coins included', () => {
    const farm = rich();
    const undo = new UndoStack();
    const coins = farm.coins;
    undo.push(farm);
    placeDecor(farm, 'bench', { x: 44, z: 38, rot: 0 });
    undo.push(farm);
    paintPath(farm, 45, 38, 1);
    expect(undo.undo(farm)).toBe(true);
    expect(pathAt(farm, 45, 38)).toBe(0);
    expect(undo.undo(farm)).toBe(true);
    expect(farm.objects.some(o => o.def === 'bench')).toBe(false);
    expect(farm.coins).toBe(coins);
    expect(undo.undo(farm)).toBe(false);
  });

  it('opens new land for coins at the right level', () => {
    const farm = newFarm(6);
    farm.coins = 100000;
    expect(canOpen(farm, 'meadow')).toMatch(/level/);
    farm.xp = xpForLevel(LAND[0]!.level);
    expect(openLand(farm, 'meadow').ok).toBe(true);
    expect(farm.unlocked).toContain('meadow');
    expect(openLand(farm, 'meadow').ok).toBe(false);
    expect(paintPath(farm, 25, 45, 1).ok).toBe(true);
  });

  it('rates beauty: decorations and paths add, clutter on open land takes a little away', () => {
    const farm = newFarm(7);
    const before = beauty(farm).score;
    farm.objects = farm.objects.filter(o => o.kind !== 'debris');
    const tidy = beauty(farm).score;
    expect(tidy).toBeGreaterThanOrEqual(before);
    farm.xp = xpForLevel(20); farm.coins = 1e5;
    placeDecor(farm, 'bench', { x: 44, z: 38, rot: 0 });
    placeDecor(farm, 'lamp', { x: 45, z: 38, rot: 0 });
    for (let x = 44; x < 48; x++) paintPath(farm, x, 39, 2);
    const b = beauty(farm);
    expect(b.score).toBeGreaterThan(tidy + 8);
    expect(b.tier).toBeTruthy();
  });

  it('keeps paths, decorations and storage in the save', () => {
    const farm = rich();
    paintPath(farm, 46, 44, 3);
    placeDecor(farm, 'scarecrow', { x: 44, z: 38, rot: 2 });
    putAway(farm, farm.objects.find(o => o.def === 'compost')!.id);
    const back = decodeFarm(JSON.parse(JSON.stringify(encodeFarm(farm)))).farm;
    expect(pathAt(back, 46, 44)).toBe(3);
    expect(back.objects.find(o => o.def === 'scarecrow')?.rot).toBe(2);
    expect(stored(back, 'building:compost')).toBe(1);
  });
});

