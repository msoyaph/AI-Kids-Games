import { describe, expect, it } from 'vitest';
import { WORLD1 } from '../../src/data/maps/world1';
import { statLines } from '../../src/data/stats';
import { SPEC_LEVEL, statsFor, TOWER_IDS, TOWERS } from '../../src/data/towers';
import { generateWave, waveIntel } from '../../src/data/waves';
import { hasKey } from '../../src/i18n';
import { Game } from '../../src/sim/Game';

const map = WORLD1[0]!;
const newGame = (): Game => {
  const g = new Game({ map, difficulty: 'normal', mode: 'campaign', seed: 7 });
  g.coins = 100_000;
  g.crystals = 6;
  for (const e of ['fire', 'water', 'nature', 'light', 'shadow', 'earth'] as const) g.chooseElement(e);
  return g;
};

describe('specializations', () => {
  it('give every element and combo tower two distinct, named paths', () => {
    const ids = new Set<string>();
    for (const id of TOWER_IDS) {
      const d = TOWERS[id];
      if (d.kind === 'basic') {
        expect(d.specs, id).toBeUndefined();
        continue;
      }
      expect(d.specs?.length, id).toBe(2);
      for (const sp of d.specs!) {
        ids.add(sp.id);
        expect(hasKey(`spec.${id}.${sp.key}.name`), sp.id).toBe(true);
        expect(hasKey(`spec.${id}.${sp.key}.desc`), sp.id).toBe(true);
        for (let i = 0; i < 2; i++) {
          const st = sp.levels[i]!;
          expect(st.cost, sp.id).toBe(d.levels[SPEC_LEVEL - 1 + i]!.cost);
          expect(st.damage, sp.id).toBeGreaterThan(0);
          expect(st.range, sp.id).toBeGreaterThan(0);
          expect(st.rate, sp.id).toBeGreaterThan(0);
        }
        // level 4 is stronger than level 3 on the same path
        expect(sp.levels[1].damage, sp.id).toBeGreaterThan(sp.levels[0].damage);
      }
      // the two paths actually differ
      const a = JSON.stringify(statLines(d, d.specs![0].levels[0]).map((l) => l.text));
      const b = JSON.stringify(statLines(d, d.specs![1].levels[0]).map((l) => l.text));
      expect(a, id).not.toBe(b);
    }
    expect(ids.size).toBe(42);
  });

  it('lock in at level 3 and drive the tower stats', () => {
    const g = newGame();
    const t = g.build('prism', 5, 5)!;
    expect(g.needsSpec(t)).toBe(false);
    g.upgrade(t);
    expect(g.needsSpec(t)).toBe(true);
    expect(g.upgrade(t, 1)).toBe(true);
    expect(t.level).toBe(3);
    expect(t.spec).toBe(1);
    expect(t.stats.chain).toBe(0);
    expect(t.stats.detect).toBe(true);
    expect(t.stats).toBe(statsFor(t.def, 3, 1));
    g.upgrade(t);
    expect(t.stats).toBe(TOWERS.prism.specs![1].levels[1]);
    expect(g.stats.specsChosen).toEqual(['prism.focus']);
  });

  it('defaults to the first path when no choice is given (bots, old callers)', () => {
    const g = newGame();
    const t = g.build('flame', 5, 5)!;
    g.upgrade(t);
    g.upgrade(t);
    expect(t.spec).toBe(0);
  });

  it('apply boss and ward multipliers', () => {
    const g = newGame();
    const hunter = g.build('wisp', 5, 5)!;
    g.upgrade(hunter);
    g.upgrade(hunter, 1); // Hunter Wisps: +40% vs bosses
    g.sendNextWave();
    const boss = g.debugSpawn('bigclank')!;
    boss.hp = boss.maxHp = 1e6;
    boss.armor = 0;
    const dealt = g.damage(boss, 100, [], hunter.id);
    expect(dealt).toBeCloseTo(140, 5);

    const breaker = g.build('shade', 7, 5)!;
    g.upgrade(breaker);
    g.upgrade(breaker, 0); // Void Breaker: wards let 2× through
    const plain = g.build('arrow', 9, 5)!;
    const s = g.debugSpawn('bubbleimp')!;
    s.hp = s.maxHp = 1e6;
    s.shield = 'fire'; // only water pierces
    const viaPlain = g.damage(s, 100, [], plain.id);
    const viaBreaker = g.damage(s, 100, [], breaker.id);
    expect(viaBreaker).toBeCloseTo(viaPlain * 2, 5);
  });
});

describe('run stats and wave intel', () => {
  it('track gold spent and lives lost per wave', () => {
    const g = new Game({ map, difficulty: 'normal', mode: 'campaign', seed: 3 });
    const before = g.coins;
    const t = g.build('arrow', 5, 5)!;
    g.upgrade(t);
    expect(g.stats.coinsSpent).toBe(before - g.coins);
    g.sendNextWave();
    for (let i = 0; i < 30 * 60 && g.waveNum < 2; i++) g.step();
    for (let i = 0; i < 30 * 30; i++) g.step();
    const leaked = g.stats.leaksByWave.reduce((a, b) => a + (b ?? 0), 0);
    expect(leaked).toBe(g.stats.leaks);
    expect(g.maxLives - g.lives).toBe(g.stats.leaks);
  });

  it('wave intel counts every spawn of the wave', () => {
    for (const n of [1, 8, 10, 27, 40]) {
      const w = generateWave(n, map);
      const rows = waveIntel(w);
      expect(rows.reduce((s, r) => s + r.count, 0)).toBe(w.groups.reduce((s, gr) => s + gr.count, 0));
      if (w.boss) expect(rows.some((r) => r.enemy === w.boss)).toBe(true);
    }
  });
});
