import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STARTER_PARTS } from '../../src/data/parts';
import { migrate, normalize } from '../../src/systems/save/migrations';
import { createSave, SAVE_VERSION } from '../../src/systems/save/schema';

const V1 = {
  version: 1,
  slot: 2,
  name: 'Nova',
  look: { suit: '#ff5d73', helmet: 'ears', skin: '#c68a5e' },
  coins: 125,
  parts: ['nose_cone', 'body_classic', 'eng_single', 'fins_basic', 'tank_mini', 'cargo_hatch', 'lights_none', 'paint_classic', 'nose_bubble'],
  rocket: { nose: 'nose_bubble', body: 'body_classic', engine: 'eng_single', fins: 'fins_basic', tank: 'tank_mini', cargo: 'cargo_hatch', lights: 'lights_none', paint: 'paint_classic' },
  missions: { c1_welcome: { status: 'done', step: 3, count: 0, seen: [] }, c1_first_flight: { status: 'active', step: 1, count: 4, seen: [] } },
  activeMission: 'c1_first_flight',
  chapter: 1,
  flags: { introSeen: true },
  codex: ['earth', 'moon'],
  badges: ['first_flight'],
  stickers: [],
  stats: { flights: 3, landings: 1 },
  playTime: 600,
};

describe('save migrations', () => {
  it('a brand new save is already current and survives normalize unchanged', () => {
    const s = createSave(1);
    expect(s.version).toBe(SAVE_VERSION);
    const n = normalize(JSON.parse(JSON.stringify(s)));
    expect(n).toEqual(s);
  });

  it('upgrades a version 1 save all the way to the current version', () => {
    const s = migrate(V1)!;
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.profile.name).toBe('Nova');
    expect(s.profile.helmet).toBe('ears');
    expect(s.owned).toContain('nose_bubble');
    expect(s.loadout.nose).toBe('nose_bubble');
    expect(s.loadout.stickers).toEqual([]);
    expect(s.coins).toBe(125);
    expect(s.missions.c1_first_flight.count).toBe(4);
    expect(s.activeMission).toBe('c1_first_flight');
    expect(s.daily).toEqual({ day: '', list: [] });
    expect(s.cargo).toEqual({});
    expect(s.difficulty).toBe('easy');
    expect(s.stats.flights).toBe(3);
    expect(s.stats.perfectLandings).toBe(0);
    expect(s.playTime).toBe(600);
  });

  it('upgrades a version 2 save', () => {
    const v2 = { ...migrate(V1)!, version: 2 } as Record<string, unknown>;
    delete v2.cargo;
    delete v2.collected;
    delete v2.tipsSeen;
    v2.difficulty = 'normal';
    const s = migrate(v2)!;
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.cargo).toEqual({});
    expect(s.collected).toEqual([]);
    expect(s.difficulty).toBe('normal');
  });

  it('repairs broken data instead of crashing', () => {
    const bad = {
      version: SAVE_VERSION,
      coins: -50,
      chapter: 99,
      owned: 'oops',
      codex: [1, 2, 3],
      missions: { x: null, y: { status: 'weird', step: 'two' }, z: { status: 'done', step: 2, count: 0, seen: [] } },
      activeMission: 'nope',
      loadout: { nose: 'nose_cone', stickers: 'bad' },
      stats: { flights: 'many' },
    };
    const s = migrate(bad)!;
    expect(s.coins).toBe(0);
    expect(s.chapter).toBe(5);
    for (const id of STARTER_PARTS) expect(s.owned).toContain(id);
    expect(s.codex).toEqual([]);
    expect(Object.keys(s.missions).sort()).toEqual(['y', 'z']);
    expect(s.missions.y).toEqual({ status: 'active', step: 0, count: 0, seen: [] });
    expect(s.activeMission).toBeNull();
    expect(s.loadout.stickers).toEqual([]);
    expect(s.loadout.engine).toBe('eng_single');
  });

  it('rejects junk and keeps saves from newer versions readable', () => {
    expect(migrate(null)).toBeNull();
    expect(migrate('hello')).toBeNull();
    const future = migrate({ ...createSave(0), version: 99, coins: 7 })!;
    expect(future.coins).toBe(7);
  });
});

describe('storage', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('works with a normal localStorage', async () => {
    const store = new Map<string, string>();
    vi.stubGlobal('window', { localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) } });
    const sm = await import('../../src/systems/save/saveManager');
    const s = createSave(1);
    s.coins = 42;
    expect(sm.writeSlot(s)).toBe(true);
    expect(sm.loadSlot(1)!.coins).toBe(42);
    expect(sm.listSlots().map((x) => x.empty)).toEqual([true, false, true]);
    sm.deleteSlot(1);
    expect(sm.loadSlot(1)).toBeNull();
    vi.unstubAllGlobals();
  });

  it('falls back to memory when localStorage is blocked (private mode, sandboxed iframe)', async () => {
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new Error('SecurityError');
      },
    });
    const sm = await import('../../src/systems/save/saveManager');
    const s = createSave(0);
    s.coins = 9;
    expect(sm.writeSlot(s)).toBe(false);
    expect(sm.loadSlot(0)!.coins).toBe(9);
    vi.unstubAllGlobals();
  });

  it('a corrupted slot reads as empty instead of crashing', async () => {
    const store = new Map<string, string>([['spacesky.slot.0', '{not json']]);
    vi.stubGlobal('window', { localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) } });
    const sm = await import('../../src/systems/save/saveManager');
    expect(sm.loadSlot(0)).toBeNull();
    vi.unstubAllGlobals();
  });
});
