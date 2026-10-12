import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/data/enemies';
import { WORLD1 } from '../../src/data/maps/world1';
import { BOSS_BY_DECADE, buildWaves, generateWave, hpScale, wavePreview, waveSpawnDuration } from '../../src/data/waves';
import { Game } from '../../src/sim/Game';

const MAP = WORLD1[0]!;

describe('wave generator', () => {
  const waves = buildWaves(MAP);

  it('makes 40 waves per map', () => {
    expect(waves).toHaveLength(40);
    waves.forEach((w, i) => expect(w.n).toBe(i + 1));
  });

  it('puts a boss on every 10th wave, in order', () => {
    for (let d = 0; d < 4; d++) {
      const w = waves[d * 10 + 9]!;
      expect(w.boss).toBe(BOSS_BY_DECADE[d]);
      expect(w.groups.some((g) => g.enemy === BOSS_BY_DECADE[d])).toBe(true);
    }
    expect(waves.filter((w) => w.boss).length).toBe(4);
  });

  it('is deterministic per map and wave', () => {
    expect(generateWave(17, MAP)).toEqual(generateWave(17, MAP));
    expect(generateWave(17, MAP)).not.toEqual(generateWave(17, { id: 'other', favoredElements: [] }));
  });

  it('uses the whole roster: fast, armored, flying, healers, splitters, shields', () => {
    const seen = new Set(waves.flatMap((w) => w.groups.map((g) => g.enemy)));
    for (const id of ['gloop', 'zoomkin', 'clankbot', 'puffbat', 'mendy', 'splitblob', 'bubbleimp']) expect(seen.has(id as never), id).toBe(true);
    const shielded = waves.flatMap((w) => w.groups).filter((g) => g.enemy === 'bubbleimp');
    expect(shielded.every((g) => g.shields && g.shields.length > 0)).toBe(true);
  });

  it('gets steadily tougher', () => {
    for (let w = 2; w <= 60; w++) expect(hpScale(w)).toBeGreaterThan(hpScale(w - 1));
    const total = (n: number): number => waves[n - 1]!.groups.reduce((s, g) => s + g.count * ENEMIES[g.enemy].hp, 0) * waves[n - 1]!.hp;
    expect(total(39)).toBeGreaterThan(total(1) * 10);
  });

  it('preview lists what is coming', () => {
    const p = wavePreview(waves[9]!);
    expect(p.some((x) => x.enemy === 'kinggloop')).toBe(true);
    expect(waveSpawnDuration(waves[0]!)).toBeGreaterThan(0);
  });

  it('endless mode keeps generating waves forever', () => {
    const g = new Game({ map: MAP, difficulty: 'normal', mode: 'endless' });
    expect(g.totalWaves).toBe(Infinity);
    expect(g.getWave(75)).not.toBeNull();
    expect(g.getWave(75)!.n).toBe(75);
    expect(g.getWave(70)!.boss).not.toBeNull();
  });
});

describe('bosses', () => {
  it('King Gloop splits into gloops; Grumble King changes element', () => {
    const g = new Game({ map: MAP, difficulty: 'normal', mode: 'campaign' });
    const k = g.debugSpawn('kinggloop')!;
    g.damage(k, 1e9, [], -1);
    expect(g.enemies.filter((e) => e.alive && e.def.id === 'gloop').length).toBe(5);

    const gk = g.debugSpawn('grumbleking')!;
    gk.hp = gk.maxHp = 1e9;
    const first = gk.element;
    const seen = new Set([first]);
    for (let i = 0; i < 30 * 30; i++) {
      g.step();
      seen.add(gk.element);
    }
    expect(seen.size).toBeGreaterThan(2);
  });

  it('bosses cost several lives and resist stuns', () => {
    expect(ENEMIES.grumbleking.lives).toBeGreaterThan(1);
    expect(ENEMIES.bigclank.ccResist).toBeLessThan(1);
  });
});
