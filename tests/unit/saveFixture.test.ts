import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FakeStorage, installFakeStorage } from './fakeStorage';

// A real save exported from the shipped build (main @ 5ea2ca9: save v2, settings v1, two Time Trial ghosts).
const fixture = JSON.parse(readFileSync('tests/fixtures/save-v2.json', 'utf8')) as { keys: Record<string, string> };

let store: FakeStorage;
type SaveMod = typeof import('../../src/save/save');
let mod: SaveMod;
let ghostMod: typeof import('../../src/sim/ghost');

beforeAll(async () => {
  store = new FakeStorage();
  for (const [k, v] of Object.entries(fixture.keys)) store.setItem(k, v);
  store.setItem('othergame.save', 'do-not-touch');
  installFakeStorage(store);
  mod = await import('../../src/save/save');
  ghostMod = await import('../../src/sim/ghost');
});

describe('real v2 save fixture', () => {
  it('loads slot 1 with every unlock, trophy, record and stat intact', () => {
    const before = JSON.parse(fixture.keys['calexcart.slot.1']);
    const sm = new mod.SaveManager(false);
    const d = sm.load(1)!;
    expect(d).toBeTruthy();
    expect(d.name).toBe(before.name);
    expect(d.racer).toBe(before.racer);
    expect(d.trophies).toEqual(before.trophies);
    expect(d.records).toEqual(before.records);
    expect(d.challenges).toEqual(before.challenges);
    expect(d.newUnlocks).toEqual(before.newUnlocks);
    for (const [k, v] of Object.entries(before.stats)) expect((d.stats as unknown as Record<string, unknown>)[k]).toEqual(v);
    for (const [k, list] of Object.entries(before.unlocks as Record<string, string[]>)) {
      for (const id of list) expect((d.unlocks as unknown as Record<string, string[]>)[k]).toContain(id);
    }
    expect(d.playSeconds).toBe(before.playSeconds);
  });

  it('keeps slot 2 and the last-used slot', () => {
    const sm = new mod.SaveManager(false);
    expect(sm.readSlot(2)?.name).toBe('Sis');
    expect(sm.lastSlot()).toBe(1);
  });

  it('migrates settings v1 → current without losing choices', () => {
    const before = JSON.parse(fixture.keys['calexcart.settings']);
    const sm = new mod.SaveManager(false);
    const s = sm.settings;
    expect(s.v).toBe(mod.SETTINGS_VERSION);
    expect(s.assist).toBe(before.steeringAssist ? 'light' : 'auto');
    for (const k of ['master', 'music', 'sfx', 'quality', 'showFps', 'autoAccel', 'touchSteer', 'cameraDistance', 'splitMode', 'screenShake']) {
      expect((s as unknown as Record<string, unknown>)[k]).toEqual(before[k]);
    }
  });

  it('old ghosts are re-encoded to the compact format and still play back identically', () => {
    const sm = new mod.SaveManager(false);
    sm.load(1);
    for (const track of ['seashell-boardwalk', 'frostpeak-pass']) {
      const enc = sm.loadGhost(track);
      expect(enc).toBeTruthy();
      expect(ghostMod.GhostData.isLegacy(enc!)).toBe(false);
      expect(enc!.length).toBeLessThan(fixture.keys[`calexcart.ghost.1.${track}`].length / 3);
      const g = ghostMod.GhostData.decode(enc!);
      const old = ghostMod.GhostData.decode(fixture.keys[`calexcart.ghost.1.${track}`])!;
      expect(g).toBeTruthy();
      expect(g!.n).toBe(old.n);
      for (let i = 0; i < old.n; i++) {
        expect(g!.x[i]).toBeCloseTo(old.x[i], 4);
        expect(g!.z[i]).toBeCloseTo(old.z[i], 4);
        expect(g!.yaw[i]).toBeCloseTo(old.yaw[i], 4);
        expect(g!.flags[i]).toBe(old.flags[i]);
      }
      const rec = JSON.parse(fixture.keys['calexcart.slot.1']).records[track];
      expect(Math.abs(g!.duration - rec.bestTime)).toBeLessThan(0.5);
    }
  });

  it('never touches other games’ keys', () => {
    const sm = new mod.SaveManager(false);
    sm.load(1);
    sm.save();
    sm.saveSettings();
    sm.deleteSlot(2);
    expect(store.getItem('othergame.save')).toBe('do-not-touch');
    for (const k of store.map.keys()) expect(k === 'othergame.save' || k.startsWith('calexcart.')).toBe(true);
  });
});
