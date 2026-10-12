import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { enemyIndex } from '../../src/config/enemies';
import { MemoryStore, type KeyValueStore } from '../../src/core/storage';
import { expandPicks, PLAYTEST_KEY, PLAYTEST_MAX_BYTES, PLAYTEST_MAX_RUNS, PlaytestStore, recordRun, type PlaytestFile, type PlaytestRun } from '../../src/meta/playtest';
import { spawnBoss } from '../../src/sim/bosses';
import { damagePlayer, spawnEnemy } from '../../src/sim/combat';
import { simulateRun } from '../../src/sim/headless';
import { newRun } from '../../src/sim/run';
import { step } from '../../src/sim/sim';
import { bossSrc, sourceName, src, SrcKind } from '../../src/sim/sources';
import { resolveLevelUp, rollChoices } from '../../src/sim/upgrades';
import { emptyInput, type World } from '../../src/sim/world';
import { analyze, formatReport, knobFor, summarizeRuns } from '../../scripts/lib/analyze';

function freshWorld(): World {
  const w = newRun({ seed: 31, characterId: 'thea' });
  w.weapons.length = 0; // nothing kills the attackers
  w.maxEnemies = 0; // no wave spawns (tests place enemies by hand)
  return w;
}

describe('damage sources', () => {
  it('names every kind of source', () => {
    expect(sourceName(src(SrcKind.Contact, enemyIndex('gloomling')))).toBe('contact:gloomling');
    expect(sourceName(src(SrcKind.Shot, enemyIndex('spitcap')))).toBe('shot:spitcap');
    expect(sourceName(src(SrcKind.Explosion, enemyIndex('fusewick')))).toBe('explosion:fusewick');
    expect(sourceName(bossSrc('clockjaw.charge'))).toBe('boss:clockjaw.charge');
  });

  it('attributes contact damage to the touching enemy and records cause of death', () => {
    const w = freshWorld();
    w.maxEnemies = 10;
    const i = spawnEnemy(w, enemyIndex('gloomling'), w.player.x + 0.5, w.player.z);
    w.enemies.speed[i] = 0;
    w.player.hp = 3;
    for (let t = 0; t < 30 && w.state === 'playing'; t++) step(w, emptyInput());
    expect(w.state).toBe('dead');
    const r = recordRun(w);
    expect(r.causeOfDeath).toBe('contact:gloomling');
    expect(r.damageBySource['contact:gloomling']).toBeGreaterThan(0);
    expect(r.hitsBySource['contact:gloomling']).toBeGreaterThanOrEqual(1);
  });

  it('counts boss attack activations and activations that hit', () => {
    const w = freshWorld();
    w.maxEnemies = 10;
    spawnBoss(w, enemyIndex('grumblecap'));
    expect(w.stats.bossFights[0]).toMatchObject({ id: 'grumblecap', killedAt: -1 });
    // two hits from the same activation count once; a new activation counts again
    damagePlayer(w, 5, bossSrc('grumblecap.spores'), 7);
    w.player.iframes = 0;
    damagePlayer(w, 5, bossSrc('grumblecap.spores'), 7);
    w.player.iframes = 0;
    damagePlayer(w, 5, bossSrc('grumblecap.spores'), 8);
    w.stats.bossAttackUsed[1] = 4; // grumblecap.spores used 4 times
    const r = recordRun(w);
    expect(r.bosses[0].attacks['grumblecap.spores']).toEqual({ used: 4, hits: 2 });
    expect(r.bosses[0].damageTaken).toBeGreaterThan(0);
  });

  it('a real boss fight records used/hit attack counts', () => {
    const w = newRun({ seed: 32, characterId: 'thea', god: false });
    w.weapons.length = 0;
    spawnBoss(w, enemyIndex('clockjaw'));
    w.player.hp = 1e6;
    w.player.stats.maxHp = 1e6;
    for (let t = 0; t < 60 * 25; t++) {
      step(w, emptyInput());
      w.events.clear();
      if (w.state !== 'playing') {
        w.state = 'playing';
        w.pendingLevels = 0;
        w.pendingChests = 0;
      }
    }
    const atk = recordRun(w).bosses[0].attacks;
    expect(atk['clockjaw.charge'].used).toBeGreaterThan(0);
    expect(atk['clockjaw.shockwave'].used).toBeGreaterThan(0);
  });
});

describe('playtest records', () => {
  it('capture picks, build, movement and boss fights from a real (bot) run', () => {
    const r = simulateRun({ characterId: 'pip', seed: 12, maxSeconds: 400 }).record;
    expect(r.v).toBe(1);
    expect(r.player).toBe('bot');
    expect(r.picks.length).toBeGreaterThan(5);
    expect(expandPicks(r)[0].offered.length).toBeGreaterThanOrEqual(3);
    expect(r.weapons.length).toBeGreaterThan(0);
    expect(r.movement.jumps).toBeGreaterThan(0);
    expect(r.movement.slideTime).toBeGreaterThan(0);
    expect(Object.keys(r.damageBySource).length).toBeGreaterThan(0);
    // nothing personal: only these keys exist
    expect(Object.keys(r).sort()).toEqual(
      ['at', 'bosses', 'causeOfDeath', 'chests', 'damageBySource', 'difficulty', 'game', 'hero', 'hitsBySource', 'input', 'items', 'kills', 'level', 'map', 'movement', 'passives', 'picks', 'player', 'quality', 'result', 'seed', 'time', 'tuned', 'v', 'weapons'].sort(),
    );
  });

  it('level-up picks record what was offered and what was taken', () => {
    const w = newRun({ seed: 33, characterId: 'thea' });
    w.pendingLevels = 1;
    w.state = 'levelup';
    w.choices = rollChoices(w);
    const taken = w.choices[1];
    resolveLevelUp(w, taken);
    const p = expandPicks(recordRun(w))[0];
    expect(p.offered).toHaveLength(w.stats.picks[0].offered.length);
    expect(p.picked).toBe(`${taken.kind}:${taken.id}`);
  });
});

describe('PlaytestStore', () => {
  const sample = (): PlaytestRun => (JSON.parse(readFileSync('tests/fixtures/playtests/sample.json', 'utf8')) as PlaytestFile).runs[2];

  it('keeps at most 20 runs and stays under the size cap', () => {
    const mem = new MemoryStore();
    const s = new PlaytestStore(mem);
    for (let k = 0; k < 40; k++) s.add({ ...sample(), seed: k });
    const runs = s.load();
    expect(runs.length).toBeLessThanOrEqual(PLAYTEST_MAX_RUNS);
    expect(mem.get(PLAYTEST_KEY)!.length).toBeLessThanOrEqual(PLAYTEST_MAX_BYTES);
    expect(runs[runs.length - 1].seed).toBe(39); // newest kept
  });

  it('never throws when storage is broken', () => {
    const broken: KeyValueStore = {
      persistent: false,
      get: () => {
        throw new Error('nope');
      },
      set: () => {
        throw new Error('nope');
      },
      remove: () => undefined,
    };
    const s = new PlaytestStore(broken);
    expect(s.load()).toEqual([]);
    expect(() => s.add(sample())).toThrow(); // set throws; Game guards via SafeLocalStore
  });
});

describe('analyze-playtests', () => {
  const runs = (JSON.parse(readFileSync('tests/fixtures/playtests/sample.json', 'utf8')) as PlaytestFile).runs;

  it('summarizes runs consistently', () => {
    const s = summarizeRuns(runs);
    expect(s.runs).toBe(runs.length);
    const share = Object.values(s.damageShare).reduce((a, b) => a + b, 0);
    expect(share).toBeCloseTo(1, 5);
    expect(s.slideShare).toBeGreaterThanOrEqual(0);
  });

  it('compares fixture runs with the simulator and prints a report', () => {
    const { groups, suggestions } = analyze(runs, { seeds: 1, maxSeconds: 120 });
    expect(groups.map((g) => g.key).sort()).toEqual(['brindle/meadow/normal', 'pip/meadow/normal', 'thea/meadow/normal']);
    const text = formatReport(groups, suggestions);
    expect(text).toContain('thea/meadow/normal');
    expect(text).toContain('Suggestions (not applied');
  }, 60_000);

  it('maps sources to concrete knobs', () => {
    expect(knobFor('boss:clockjaw.charge')).toContain('bossWindupMult');
    expect(knobFor('explosion:fusewick')).toContain('fuseMult');
    expect(knobFor('contact:ramhorn')).toContain('perType.ramhorn');
  });
});
