/**
 * Phase 14: save format 2 (compact), the format-1 fixtures, the backup copy, and the storage budget.
 * The website shares one origin (about 5 MB) between every game, so the farm promises a hard cap.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { GAME } from '../../src/config';
import { rle, unrle } from '../../src/save/compact';
import { BACKUP_KEY, decodeFarm, encodeFarm, loadFarm, saveFarm, SAVE_KEY, SAVE_VERSION } from '../../src/save/save';
import { resetForTests } from '../../src/save/storage';
import { levelOf } from '../../src/sim/world';
import { maxFarm } from '../support/maxFarm';

/** The most one copy of a save may take (bytes of text; the backup is one more copy). */
export const SAVE_BUDGET = 140 * 1024;

function fakeStorage(start: Record<string, string> = {}) {
  const data = new Map(Object.entries(start));
  return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, removeItem: (k: string) => { data.delete(k); } };
}
function useStorage(s: unknown) {
  Object.defineProperty(globalThis, 'localStorage', { value: s, configurable: true, writable: true });
  resetForTests();
}
afterEach(() => { useStorage(undefined); });

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8'));
const key = (k: string) => GAME.storagePrefix + k;

describe('the storage budget', () => {
  it(`keeps the biggest possible farm under ${SAVE_BUDGET / 1024} KB a copy`, () => {
    const text = JSON.stringify(encodeFarm(maxFarm(), 1760000000000));
    expect(text.length).toBeLessThan(SAVE_BUDGET);
  });

  it('writes the biggest farm small and reads it back the same', () => {
    const farm = maxFarm();
    const back = decodeFarm(JSON.parse(JSON.stringify(encodeFarm(farm)))).farm;
    expect(back.objects).toHaveLength(farm.objects.length);
    const f0 = farm.objects.find(o => o.kind === 'field')!, b0 = back.objects.find(o => o.id === f0.id)!;
    expect(b0).toMatchObject({ kind: 'field', x: f0.x, z: f0.z });
    if (f0.kind === 'field' && b0.kind === 'field') {
      expect([b0.crop, b0.variety, b0.nit, b0.hum, b0.watered, b0.boost, b0.humus, b0.last]).toEqual([f0.crop, f0.variety, f0.nit, f0.hum, f0.watered, f0.boost, f0.humus, f0.last]);
      expect(Math.abs(b0.readyAt - f0.readyAt)).toBeLessThan(0.2);
    }
    expect(back.paths).toBe(farm.paths);
    expect(back.inv).toEqual(farm.inv);
    expect(back.ribbons).toEqual(farm.ribbons);
    expect(back.contracts.map(c => c.business)).toEqual(farm.contracts.map(c => c.business));
    expect(back.stand.slots).toEqual(farm.stand.slots);
    expect(back.helpers.map(h => h.done)).toEqual(farm.helpers.map(h => h.done));
    expect(back.ledger).toHaveLength(8);
  });

  it('run-length codes the paths', () => {
    const p = '0'.repeat(100) + '11' + '4'.repeat(30) + '0'.repeat(3004);
    expect(rle(p)).toBe('a100b2e30a3004');
    expect(unrle(rle(p))).toBe(p);
  });
});

describe('saves from format 1', () => {
  it('load a recent format-1 save as it was', () => {
    const raw = fixture('save-v1.json');
    expect(raw.v).toBe(1);
    const r = decodeFarm(raw);
    expect(r.status).toBe('ok');
    expect(r.farm.v).toBe(SAVE_VERSION);
    expect(r.farm.helpers.map(h => h.name)).toEqual(['Fen']);
    expect(r.farm.objects.filter(o => o.kind === 'field' && o.crop === 'wheat').length).toBeGreaterThan(0);
    expect(r.savedAt).toBe(1760000000000);
    // and it saves in the new format
    expect(encodeFarm(r.farm).v).toBe(2);
  });

  it('load a phase-6 save, filling in everything added since', () => {
    const r = decodeFarm(fixture('save-v1-phase6.json'));
    expect(r.farm.helpers).toEqual([]);
    expect(r.farm.contracts).toEqual([]);
    expect(r.farm.stand.slots).toEqual([]);
    const f = r.farm.objects.find(o => o.kind === 'field')!;
    expect(f.kind === 'field' && [f.nit, f.hum]).toEqual([1, 1]);
    // the levels it had already earn their Lab ideas, and no level-up pops up again
    expect(r.farm.flags.levelSeen).toBe(levelOf(r.farm));
    expect(r.farm.ideas).toBe(Math.max(0, levelOf(r.farm) - 2));
  });

  it('a save from a newer game is left alone', () => {
    expect(decodeFarm({ v: SAVE_VERSION + 1, seed: 3 }).status).toBe('future');
  });
});

describe('the backup copy', () => {
  it('follows a save only when asked, and only after the save worked', () => {
    const s = fakeStorage();
    useStorage(s);
    const farm = maxFarm(3);
    expect(saveFarm(farm, 1)).toBe(true);
    expect(s.data.has(key(BACKUP_KEY))).toBe(false);
    expect(saveFarm(farm, 2, true)).toBe(true);
    expect(s.data.get(key(BACKUP_KEY))).toBe(s.data.get(key(SAVE_KEY)));
    // a refused write leaves both copies as they were
    const before = s.data.get(key(BACKUP_KEY));
    s.setItem = () => { throw Object.assign(new Error('full'), { name: 'QuotaExceededError' }); };
    farm.coins += 1;
    expect(saveFarm(farm, 3, true)).toBe(false);
    expect(s.data.get(key(BACKUP_KEY))).toBe(before);
  });

  it('takes over when the main save can’t be read (which is kept aside), or is missing', () => {
    const good = JSON.stringify(encodeFarm(maxFarm(4), 5));
    const s = fakeStorage({ [key(SAVE_KEY)]: '{not json', [key(BACKUP_KEY)]: good });
    useStorage(s);
    const r = loadFarm();
    expect(r && r.status !== 'broken' && r.fromBackup).toBe(true);
    expect(s.data.get(key('save.broken'))).toBe('{not json');
    const s2 = fakeStorage({ [key(BACKUP_KEY)]: good });
    useStorage(s2);
    const r2 = loadFarm();
    expect(r2 && r2.status !== 'broken' && r2.fromBackup).toBe(true);
  });

  it('only ever uses the game’s own keys', () => {
    const s = fakeStorage();
    useStorage(s);
    saveFarm(maxFarm(5), 1, true);
    for (const k of s.data.keys()) expect(k.startsWith(GAME.storagePrefix)).toBe(true);
  });
});
