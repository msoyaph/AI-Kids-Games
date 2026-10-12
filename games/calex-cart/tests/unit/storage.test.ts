import { beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { FakeStorage, installFakeStorage } from './fakeStorage';

// Calex Cart shares ~5 MB of browser storage with four other games and the site. Budget: ≤ 1.5 MB worst case.
const BUDGET = 1.5 * 1000 * 1000;
const SHARED_QUOTA = 5 * 1024 * 1024;

const store = new FakeStorage();
type Mods = {
  save: typeof import('../../src/save/save');
  storage: typeof import('../../src/save/storage');
  playtest: typeof import('../../src/save/playtest');
  ghost: typeof import('../../src/sim/ghost');
  tracks: typeof import('../../src/data/tracks/index');
};
let M: Mods;

/** A real ghost of a wobbly beginner driving for the full GHOST_MAX_SECONDS (the biggest ghost we ever store). */
async function worstGhost(trackId: string): Promise<{ g2: string; legacy: string; frames: number }> {
  const { TrackModel } = await import('../../src/sim/track/trackModel');
  const { World } = await import('../../src/sim/world');
  const { RaceTracker } = await import('../../src/sim/race');
  const { AiController } = await import('../../src/sim/ai/aiController');
  const { RACERS } = await import('../../src/data/racers');
  const track = new TrackModel(M.tracks.findTrack(trackId), false);
  const r = RACERS[0];
  const world = new World({ ground: track, speedClass: 'rookie', seed: 3, racers: [{ racerId: r.id, kart: { ...r.defaultKart, paint: 'cherry', decal: 'none' }, player: -1 }], countdownTime: 3 });
  world.events.enabled = false;
  new RaceTracker(world, track, 99).placeGrid([0]);
  new AiController(world, track, { noRubberBand: true, skill: { 0: 0.2 }, style: { 0: { steerNoise: 0.6 } } });
  const rec = new M.ghost.GhostRecorder();
  const k = world.karts[0];
  while (world.raceTime < M.ghost.GHOST_MAX_SECONDS + 0.5) {
    world.step(1 / 60);
    if (world.phase === 'race') rec.record(world.raceTime, k.x, k.y, k.z, k.yaw, (k.drifting ? 1 : 0) | (k.boosting ? 8 : 0));
  }
  return { g2: rec.encode(), legacy: rec.encodeLegacy(), frames: rec.length };
}

beforeAll(async () => {
  installFakeStorage(store);
  M = {
    save: await import('../../src/save/save'),
    storage: await import('../../src/save/storage'),
    playtest: await import('../../src/save/playtest'),
    ghost: await import('../../src/sim/ghost'),
    tracks: await import('../../src/data/tracks/index'),
  };
});

describe('ghost format', () => {
  it('G2 round-trips exactly and is ≥ 4× smaller than the old format', async () => {
    const { g2, legacy, frames } = await worstGhost('seashell-boardwalk');
    const a = M.ghost.GhostData.decode(g2)!;
    const b = M.ghost.GhostData.decode(legacy)!;
    expect(a.n).toBe(frames);
    expect(b.n).toBe(frames);
    for (let i = 0; i < frames; i++) {
      expect(a.x[i]).toBe(b.x[i]);
      expect(a.y[i]).toBe(b.y[i]);
      expect(a.z[i]).toBe(b.z[i]);
      expect(a.yaw[i]).toBe(b.yaw[i]);
      expect(a.flags[i]).toBe(b.flags[i]);
    }
    expect(g2.length * 4).toBeLessThan(legacy.length);
  });

  it('never stores surrogate or control characters', () => {
    const bytes = new Uint8Array(4096);
    for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 197 + 13) & 255;
    bytes.fill(255, 100, 300);
    const s = M.ghost.pack15(bytes);
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      expect(c >= 0x100 && c < 0xd800).toBe(true);
    }
    expect([...M.ghost.unpack15(s).subarray(0, bytes.length)]).toEqual([...bytes]);
  });

  it('rejects corrupted ghosts instead of crashing', () => {
    expect(M.ghost.GhostData.decode('G2Ā')).toBeNull();
    expect(M.ghost.GhostData.decode('not a ghost')).toBeNull();
    expect(M.ghost.GhostData.decode('')).toBeNull();
  });
});

describe('storage budget (worst case)', () => {
  it(`stays under 1.5 MB with a ghost for every track in all 3 slots, a full playtest log and settings`, async () => {
    store.clear();
    const { SaveManager, newSave } = M.save;
    const { TRACKS } = M.tracks;
    const { RACERS } = await import('../../src/data/racers');
    const { BODIES, WHEELS, GLIDERS, PAINTS, DECALS } = await import('../../src/data/parts');
    const { CUPS } = await import('../../src/data/cups');
    const { ARENAS } = await import('../../src/data/arenas');
    const { CHALLENGES } = await import('../../src/data/challenges');
    const sm = new SaveManager(false);
    // settings with custom bindings
    sm.settings.keyBindings = { solo: { accel: ['ArrowUp', 'KeyW', 'KeyI'], brake: ['ArrowDown', 'KeyS', 'KeyK'], left: ['ArrowLeft', 'KeyA', 'KeyJ'], right: ['ArrowRight', 'KeyD', 'KeyL'], drift: ['ShiftLeft', 'Space', 'ShiftRight'], item: ['KeyE', 'ControlLeft', 'KeyO'], lookBack: ['KeyR', 'KeyQ', 'KeyU'], pause: ['Escape', 'KeyP', 'Backspace'] } as never, left: {} as never, right: {} as never };
    sm.saveSettings();
    const ghosts = new Map<string, string>();
    for (const t of TRACKS) ghosts.set(t.id, (await worstGhost(t.id)).g2);
    for (let slot = 1; slot <= 3; slot++) {
      sm.create(slot, `Racer${slot}longname`);
      const d = sm.data!;
      const s = newSave('x');
      d.unlocks = { ...s.unlocks, racers: RACERS.map((r) => r.id), bodies: BODIES.map((b) => b.id), wheels: WHEELS.map((b) => b.id), gliders: GLIDERS.map((b) => b.id), paints: PAINTS.map((b) => b.id), decals: DECALS.map((b) => b.id), cups: CUPS.map((c) => c.id), classes: ['rookie', 'pro', 'champion', 'mirror'], arenas: ARENAS.map((a) => a.id) };
      for (const c of CUPS) for (const cls of ['rookie', 'pro', 'champion', 'mirror']) d.trophies[`${c.id}:${cls}`] = 'gold';
      for (const t of TRACKS) d.records[t.id] = { bestTime: 123.456789, bestLap: 40.123456, racer: 'duchess-waddles', kart: { body: 'zoomster', wheels: 'standard', glider: 'kite', paint: 'bubblegum', decal: 'stripes' }, hasGhost: true, beatStaff: true };
      for (const ch of CHALLENGES) d.challenges[ch.id] = { done: true, progress: 999 };
      for (const k of Object.keys(d.stats) as Array<keyof typeof d.stats>) d.stats[k] = 99999;
      d.playSeconds = 999999;
      sm.save();
      for (const t of TRACKS) expect(sm.saveGhost(t.id, ghosts.get(t.id)!)).toBe(true);
    }
    // a full playtest log
    const pt = new M.playtest.PlaytestStore();
    const rec = {
      build: '0.2.0', mode: 'grandPrix', track: 'prism-parkway', cls: 'champion', mirror: false, laps: 3, items: true, itemSet: 'all', ai: 7, quit: false, dur: 143.21, fps: 59, tier: 'medium', touchDevice: true,
      p: [{ racer: 'duchess-waddles', weight: 'heavy', body: 'zoomster', wheels: 'standard', glider: 'kite', input: 'touch' as const, assist: 'light' as const, autoAccel: true, pos: 4, of: 8, time: 143.214, projected: false, laps: [48.123, 47.456, 47.635], falls: 2, drift: 31.25, mt: [6, 4, 1] as [number, number, number], items: 7, hitsTaken: 4, hitsGiven: 3, dodges: 1, shortcuts: [2, 1], start: 'boost' as const, tricks: 5, pads: 9, walls: 6, offroad: 3.21, score: 0 }],
    };
    for (let i = 0; i < 400; i++) pt.add(rec);
    const used = M.storage.usedBytes('calexcart.');
    const ghostBytes = M.storage.usedBytes('calexcart.ghost.');
    const slotBytes = M.storage.usedBytes('calexcart.slot.');
    const playtestBytes = M.storage.usedBytes('calexcart.playtest');
    const settingsBytes = M.storage.usedBytes('calexcart.settings');
    const perGhost = [...ghosts.values()].map((g) => g.length * 2);
    const report = {
      tracks: TRACKS.length,
      ghostSeconds: M.ghost.GHOST_MAX_SECONDS,
      totalBytes: used,
      budgetBytes: BUDGET,
      ghostsBytes: ghostBytes,
      ghostCount: TRACKS.length * 3,
      largestGhostBytes: Math.max(...perGhost),
      averageGhostBytes: Math.round(perGhost.reduce((a, b) => a + b, 0) / perGhost.length),
      slotsBytes: slotBytes,
      playtestBytes,
      settingsBytes,
    };
    console.log('[storage worst case]', JSON.stringify(report));
    mkdirSync('sim-report', { recursive: true });
    writeFileSync('sim-report/storage.json', JSON.stringify(report, null, 1));
    expect(playtestBytes).toBeLessThanOrEqual(M.playtest.PLAYTEST_MAX_CHARS * 2 + 64);
    expect(used).toBeLessThanOrEqual(BUDGET);
  }, 120_000);
});

describe('full storage is handled gracefully', () => {
  it('a failed save keeps the old save intact, frees our playtest log first, warns once, and never touches other keys', () => {
    store.clear();
    // the other games and the site fill the shared area almost completely
    const others: Record<string, string> = {
      'skyblaster.save': 'x'.repeat(900_000),
      'puzzlepals.progress': 'y'.repeat(700_000),
      'site.prefs': '{"theme":"dark"}',
      'vanex.slot.1': 'z'.repeat(600_000),
    };
    for (const [k, v] of Object.entries(others)) store.setItem(k, v);
    const sm = new M.save.SaveManager(false);
    const pt = new M.playtest.PlaytestStore();
    sm.freeSpace = () => pt.shrink(0.5) > 0;
    const problems: string[] = [];
    sm.onStorageProblem = (k) => problems.push(k);
    sm.create(1, 'Kid');
    sm.data!.trophies['sunrise:rookie'] = 'gold';
    sm.save();
    const good = store.getItem('calexcart.slot.1')!;
    expect(JSON.parse(good).trophies['sunrise:rookie']).toBe('gold');
    // fill our playtest log, then squeeze the quota so only a little room is left
    const rec = JSON.parse(JSON.stringify({ build: 't', mode: 'versus', track: 'canyon-run', cls: 'pro', mirror: false, laps: 3, items: true, itemSet: 'all', ai: 7, quit: false, dur: 1, fps: 60, tier: 'low', touchDevice: false, p: [] }));
    for (let i = 0; i < 300; i++) pt.add(rec);
    const ptBefore = pt.chars;
    store.quotaBytes = store.bytes() + 2_000;
    // a save that needs more room than is free: the playtest log is shrunk first, and the save then fits
    sm.data!.name = 'Kid'.padEnd(14, '!');
    for (const t of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) sm.data!.records[`track-${t}`] = { bestTime: 1, bestLap: 1, racer: 'calex', kart: sm.data!.kart, hasGhost: false, beatStaff: false };
    sm.save();
    expect(pt.chars).toBeLessThan(ptBefore);
    expect(JSON.parse(store.getItem('calexcart.slot.1')!).records['track-h']).toBeTruthy();
    // now nothing of ours is left to free: a huge write fails, the old save survives untouched
    pt.clear();
    store.quotaBytes = store.bytes() + 100;
    const before = store.getItem('calexcart.slot.1');
    for (let i = 0; i < 200; i++) sm.data!.records[`more-${i}`] = { bestTime: i, bestLap: i, racer: 'calex', kart: sm.data!.kart, hasGhost: false, beatStaff: false };
    sm.save();
    expect(sm.lastWriteFailed).toBe(true);
    expect(store.getItem('calexcart.slot.1')).toBe(before);
    expect(problems).toContain('full');
    expect(sm.saveGhost('canyon-run', 'G2' + 'ā'.repeat(5000))).toBe(false);
    // reloading still gives the last good save
    const sm2 = new M.save.SaveManager(false);
    expect(sm2.load(1)?.trophies['sunrise:rookie']).toBe('gold');
    // other games' data is untouched, byte for byte
    for (const [k, v] of Object.entries(others)) expect(store.getItem(k)).toBe(v);
    for (const k of store.map.keys()) expect(k in others || k.startsWith('calexcart.')).toBe(true);
    expect(store.bytes()).toBeLessThanOrEqual(SHARED_QUOTA);
  });
});
