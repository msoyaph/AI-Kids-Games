import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { defaults, load, MAX_BYTES, migrate, PROFILE_KEY, sanitize, save, serialize } from '../../src/save/profile';
import { fromRun, loadRun, RULES_VERSION, saveRun, toRun } from '../../src/save/run';
import { read, resetForTests, writeFailed } from '../../src/save/storage';
import { newGame, place, type Game } from '../../src/sim/game';
import { fitsAt } from '../../src/sim/board';

const fixture = (name: string) => JSON.parse(readFileSync(`tests/fixtures/saves/${name}`, 'utf8'));

/** A Storage with a byte budget, like a real browser's (full = setItem throws). */
class FakeStorage {
  map = new Map<string, string>(); limit = Infinity; get length() { return this.map.size; }
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { const used = [...this.map].reduce((a, [kk, vv]) => a + (kk === k ? 0 : kk.length + vv.length), 0); if (used + k.length + v.length > this.limit) throw new DOMException('full', 'QuotaExceededError'); this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  clear() { throw new Error('the game must never clear storage'); }
}
let store: FakeStorage;
beforeEach(() => { store = new FakeStorage(); (globalThis as { localStorage?: unknown }).localStorage = store; resetForTests(); });

const firstFit = (g: Game, k: number) => { const p = g.tray[k]!.piece; for (let i = 0; i < p.count; i++) if (fitsAt(g.lo, g.hi, p, i)) return i; return -1; };

describe('the profile save', () => {
  it('loads the frozen v1 fixture exactly (it must keep loading forever)', () => {
    const raw = fixture('profile-v1-full.json');
    const { profile, readOnly } = migrate(raw);
    expect(readOnly).toBe(false);
    expect(profile).toEqual(raw);
  });
  it('upgrades a pre-release save and repairs bad fields', () => {
    const { profile } = migrate(fixture('profile-v0-prerelease.json'));
    expect(profile.v).toBe(1);
    expect(profile.best).toEqual({ easy: 120, normal: 0, relax: 0 });
    expect(profile.adv).toBe('31' + '0'.repeat(58));
    expect(profile.themes).toEqual(['classic', 'space']);
    expect(profile.settings.theme).toBe('space');
    expect(profile.helpers).toMatchObject({ undo: 2, shuffle: 1, single: 2 });
  });
  it('turns garbage into defaults, and clamps numbers and helpers', () => {
    expect(sanitize(null)).toEqual(defaults());
    expect(sanitize('nope')).toEqual(defaults());
    const p = sanitize({ helpers: { undo: 99, shuffle: -3, single: 'x' }, best: { easy: -5, normal: 1e20 }, settings: { volume: 7, text: 9, theme: 'night' } });
    expect(p.helpers).toMatchObject({ undo: 5, shuffle: 0, single: 2 });
    expect(p.best.easy).toBe(0); expect(p.best.normal).toBe(1e9);
    expect(p.settings).toMatchObject({ volume: 0.8, text: 0, theme: 'classic' }); // night isn't unlocked
  });
  it('reads a save from a newer version but never overwrites it', () => {
    store.setItem(`tuckpop.${PROFILE_KEY}`, JSON.stringify({ ...fixture('profile-v1-full.json'), v: 2, future: true }));
    const { profile, readOnly } = load();
    expect(readOnly).toBe(true);
    expect(profile.best.normal).toBe(5480);
    expect(save(profile, readOnly)).toBe(false);
    expect(JSON.parse(store.getItem('tuckpop.save')!).future).toBe(true);
  });
  it('stays small: a maximal profile is under 4 KB; writes over 50 KB are refused; Daily history trims first', () => {
    const p = sanitize(fixture('profile-v1-full.json'));
    p.daily = Array.from({ length: 30 }, (_, i) => [20261101 + i, 999999] as [number, number]);
    expect(serialize(p)!.length).toBeLessThan(4000);
    // a long Daily history is trimmed to the last 14 days first…
    const long = { ...p, daily: Array.from({ length: 2000 }, (_, i) => [20270101 + i, 1] as [number, number]) };
    expect(JSON.parse(serialize(long)!).daily).toHaveLength(14);
    // …and anything still over 50 KB is refused rather than written
    expect(serialize({ ...p, adv: '3'.repeat(60_000) })).toBeNull();
    expect(MAX_BYTES).toBe(50_000);
  });
  it('keeps playing from memory when storage is full, and says so', () => {
    store.limit = 50;
    const p = defaults(); p.best.easy = 77;
    expect(save(p)).toBe(false);
    expect(writeFailed()).toBe(true);
    expect(JSON.parse(read('save')!).best.easy).toBe(77); // this visit still sees it
  });
  it('only ever touches keys with the game prefix', () => {
    store.setItem('aikg:favorites', '["x"]'); store.setItem('othergame.save', '1');
    save(defaults());
    const g = newGame({ mode: 'classic', seed: 3 }); place(g, 0, firstFit(g, 0)); saveRun(g);
    expect([...store.map.keys()].sort()).toEqual(['aikg:favorites', 'othergame.save', 'tuckpop.run', 'tuckpop.save']);
    expect(store.getItem('aikg:favorites')).toBe('["x"]');
  });
});

describe('the saved game (resume after a reload)', () => {
  it('round-trips exactly, Undo included', () => {
    const g = newGame({ mode: 'classic', difficulty: 'normal', seed: 99 });
    for (let k = 0; k < 2; k++) place(g, k, firstFit(g, k));
    const back = fromRun(JSON.parse(JSON.stringify(toRun(g))))!;
    expect(back).not.toBeNull();
    for (const key of ['lo', 'hi', 'score', 'moves', 'streak', 'dry', 'trayNo', 'seed', 'difficulty'] as const) expect(back[key], key).toEqual(g[key]);
    expect(Array.from(back.colors)).toEqual(Array.from(g.colors));
    expect(back.tray.map(t => t?.piece.id ?? null)).toEqual(g.tray.map(t => t?.piece.id ?? null));
    expect(back.undo!.score).toBe(g.undo!.score);
    // and play continues identically: the next deal is the same
    place(g, 2, firstFit(g, 2)); place(back, 2, firstFit(back, 2));
    expect(back.tray.map(t => t?.piece.id)).toEqual(g.tray.map(t => t?.piece.id));
  });
  it('drops runs from other rules, broken runs, and runs whose colors disagree with the board', () => {
    const g = newGame({ mode: 'relax', seed: 5 }); place(g, 0, firstFit(g, 0));
    const run = toRun(g);
    expect(fromRun({ ...run, rules: RULES_VERSION + 1 })).toBeNull();
    expect(fromRun({ ...run, tray: [['nope', 1], null, null] })).toBeNull();
    expect(fromRun({ ...run, colors: '0'.repeat(64) })).toBeNull();
    expect(fromRun({ ...run, mode: 'adventure' })).toBeNull();
    expect(fromRun(null)).toBeNull();
    expect(fromRun(run)).not.toBeNull();
  });
  it('keeps Classic, Relax and the Daily separately, and forgets a game once it ends', () => {
    const c = newGame({ mode: 'classic', seed: 1 }), r = newGame({ mode: 'relax', seed: 2 });
    place(c, 0, firstFit(c, 0)); place(r, 0, firstFit(r, 0));
    saveRun(c); saveRun(r);
    expect(loadRun('classic')!.seed).toBe(1); expect(loadRun('relax')!.seed).toBe(2);
    c.over = true; saveRun(c);
    expect(loadRun('classic')).toBeNull(); expect(loadRun('relax')).not.toBeNull();
  });
});
