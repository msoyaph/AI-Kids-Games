import { describe, expect, it } from 'vitest';
import { MIGRATIONS, SafeStorage, SaveManager, migrate } from '../src/sim/save';
import { SAVE_VERSION, newGameState } from '../src/sim/state';

class MemStorage implements Storage {
  private m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  clear() {
    this.m.clear();
  }
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
}

class ThrowingStorage extends MemStorage {
  override getItem(): string | null {
    throw new Error('SecurityError');
  }
  override setItem(): void {
    throw new Error('QuotaExceeded');
  }
}

describe('save system', () => {
  it('round-trips a game state through a slot', () => {
    const mgr = new SaveManager(new SafeStorage(new MemStorage()));
    const st = newGameState(99, 'Wren');
    st.player.glints = 1234;
    expect(mgr.write(1, st)).toBe(true);
    const res = mgr.read(1);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.state.player.name).toBe('Wren');
      expect(res.state.player.glints).toBe(1234);
      expect(res.state.version).toBe(SAVE_VERSION);
    }
    expect(mgr.list()[1]?.name).toBe('Wren');
    expect(mgr.list()[0]).toBeNull();
    mgr.remove(1);
    expect(mgr.list()[1]).toBeNull();
  });

  it('never throws when storage is broken (falls back to memory)', () => {
    const mgr = new SaveManager(new SafeStorage(new ThrowingStorage()));
    const st = newGameState(5, 'Kit');
    expect(() => mgr.write(0, st)).not.toThrow();
    const res = mgr.read(0);
    expect(res.ok).toBe(true);
  });

  it('works with no storage at all', () => {
    const mgr = new SaveManager(new SafeStorage(null));
    expect(mgr.storage.persistent).toBe(false);
    mgr.write(2, newGameState(1, 'X'));
    expect(mgr.read(2).ok).toBe(true);
  });

  it('migrates a v1 save to the current version', () => {
    const cur = newGameState(7, 'Old');
    // build a v1-shaped legacy save
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const legacy: any = JSON.parse(JSON.stringify(cur));
    legacy.version = 1;
    legacy.player.money = 777;
    delete legacy.player.glints;
    delete legacy.player.lumens;
    delete legacy.tips;
    delete legacy.events;
    delete legacy.challenges;
    legacy.quests = { done: ['m1_welcome'] };
    const st = migrate(legacy);
    expect(st.version).toBe(SAVE_VERSION);
    expect(st.player.glints).toBe(777);
    expect(st.player.lumens).toBe(0);
    expect(st.tips).toEqual({});
    expect(st.events.active).toBeNull();
    expect(st.quests.done).toEqual(['m1_welcome']);
    expect(st.quests.chapter).toBe(1);
    expect('money' in st.player).toBe(false);
  });

  it('has a migration for every version below current', () => {
    for (let v = 1; v < SAVE_VERSION; v++) expect(MIGRATIONS[v]).toBeTypeOf('function');
  });

  it('rejects saves from the future and garbage', () => {
    const st = newGameState(3, 'F');
    expect(() => migrate({ ...st, version: SAVE_VERSION + 5 })).toThrow();
    expect(() => migrate(null)).toThrow();
    const mgr = new SaveManager(new SafeStorage(new MemStorage()));
    mgr.storage.set('slot0', '{not json');
    expect(mgr.read(0).ok).toBe(false);
  });
});
