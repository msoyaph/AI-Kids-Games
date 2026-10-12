import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../../src/config/characters';
import { difficultyDef, runMods } from '../../src/config/difficulty';
import { enemyIndex } from '../../src/config/enemies';
import { dailySpec, utcDate } from '../../src/meta/daily';
import { applyRunResult, checkAchievements, collectedCount, goldForRun, summarize } from '../../src/meta/progression';
import { defaultSave, sanitizeSave } from '../../src/meta/save';
import { BOSS_RESERVE, damagePlayer, spawnEnemy } from '../../src/sim/combat';
import { spawnBoss } from '../../src/sim/bosses';
import { HeroPassive, SHELL_GUARD_MULT } from '../../src/sim/heroes';
import { newRun } from '../../src/sim/run';
import { step } from '../../src/sim/sim';
import { src, SrcKind } from '../../src/sim/sources';
import { banish, canBanish, resolveLevelUp, rollChoices, upgradeCandidates } from '../../src/sim/upgrades';
import { emptyInput, type World } from '../../src/sim/world';

function quiet(w: World): World {
  w.maxEnemies = 0;
  w.weapons.length = 0;
  return w;
}

describe('difficulty and tiers', () => {
  it('resolves multipliers; tiers stack on Hard only', () => {
    expect(runMods('normal')).toMatchObject({ playerHp: 1, enemyHp: 1, damageTaken: 1, gold: 1, skips: 0 });
    const relaxedHp = difficultyDef('relaxed').mods.playerHp!;
    const hardHp = difficultyDef('hard').mods.enemyHp!;
    expect(relaxedHp).toBeGreaterThan(1);
    expect(hardHp).toBeGreaterThan(1);
    expect(runMods('relaxed')).toMatchObject({ playerHp: relaxedHp, rerolls: 1, skips: 1, banishes: 1 });
    const hard = runMods('hard');
    expect(hard.enemyHp).toBeCloseTo(hardHp);
    expect(hard.extraElites).toBe(1);
    const t5 = runMods('hard', 5);
    expect(t5.enemyHp).toBeCloseTo(hardHp * 1.25);
    expect(t5.extraElites).toBe(2);
    expect(t5.bossEnraged).toBe(true);
    expect(t5.gold).toBeGreaterThan(hard.gold);
    expect(runMods('normal', 5)).toEqual(runMods('normal'));
  });

  it('applies to a run: player HP, enemy HP and damage taken', () => {
    const relaxed = newRun({ seed: 1, characterId: 'thea', difficulty: 'relaxed' });
    const normal = newRun({ seed: 1, characterId: 'thea' });
    expect(relaxed.player.stats.maxHp).toBeCloseTo(normal.player.stats.maxHp * difficultyDef('relaxed').mods.playerHp!);
    expect(relaxed.player.hp).toBeCloseTo(relaxed.player.stats.maxHp);
    const hard = newRun({ seed: 1, characterId: 'thea', difficulty: 'hard' });
    const a = spawnEnemy(normal, enemyIndex('gloomling'), 20, 0);
    const b = spawnEnemy(hard, enemyIndex('gloomling'), 20, 0);
    expect(hard.enemies.maxHp[b]).toBeCloseTo(normal.enemies.maxHp[a] * difficultyDef('hard').mods.enemyHp!);
    const hp0 = hard.player.hp;
    damagePlayer(hard, 20, 0);
    const hn = normal.player.hp;
    damagePlayer(normal, 20, 0);
    expect(hp0 - hard.player.hp).toBeGreaterThan(hn - normal.player.hp);
  });

  it('winning on Hard unlocks tier 1; each tier won opens the next (up to 5)', () => {
    const d = defaultSave();
    const run = (tier: number, won = true): void => {
      const w = newRun({ seed: 2, characterId: 'thea', difficulty: 'hard', tier });
      w.state = won ? 'won' : 'dead';
      applyRunResult(d, summarize(w));
    };
    run(0, false);
    expect(d.unlockedTier).toBe(0);
    run(0);
    expect(d.unlockedTier).toBe(1);
    expect(d.stats.bestHardTier).toBe(0);
    for (let t = 1; t <= 5; t++) run(t);
    expect(d.unlockedTier).toBe(5);
    expect(d.stats.bestHardTier).toBe(5);
    expect(d.achievements).toEqual(expect.arrayContaining(['hardWin', 'tier1', 'tier5']));
  });

  it('difficulty scales the gold bonus', () => {
    const w = newRun({ seed: 3, characterId: 'thea', difficulty: 'hard', tier: 2 });
    w.stats.kills = 900;
    w.time = 600;
    const hard = goldForRun(summarize(w));
    const n = newRun({ seed: 3, characterId: 'thea' });
    n.stats.kills = 900;
    n.time = 600;
    expect(hard.kills + hard.time).toBeGreaterThan(goldForRun(summarize(n)).kills + goldForRun(summarize(n)).time);
  });
});

describe('level-up choices: skip and banish', () => {
  it('every run has one free skip; Relaxed and shop ranks add more', () => {
    expect(newRun({ seed: 4, characterId: 'thea' }).player.skips).toBe(1);
    expect(newRun({ seed: 4, characterId: 'thea', difficulty: 'relaxed' }).player.skips).toBe(2);
    expect(newRun({ seed: 4, characterId: 'thea', meta: { skip: 2, banish: 1 } }).player).toMatchObject({ skips: 3, banishes: 1 });
    const w = newRun({ seed: 4, characterId: 'thea' });
    w.pendingLevels = 1;
    w.state = 'levelup';
    w.choices = rollChoices(w);
    resolveLevelUp(w, null);
    expect(w.player.skips).toBe(0);
    expect(w.stats.skips).toBe(1);
  });

  it('banish swaps the card and the item never comes back this run', () => {
    const w = newRun({ seed: 5, characterId: 'thea', meta: { banish: 2 } });
    w.choices = rollChoices(w);
    const i = w.choices.findIndex(canBanish);
    const gone = w.choices[i].id;
    expect(banish(w, i)).toBe(true);
    expect(w.choices[i].id).not.toBe(gone);
    expect(new Set(w.choices.map((c) => c.id)).size).toBe(w.choices.length);
    expect(upgradeCandidates(w).some((c) => c.id === gone)).toBe(false);
    for (let k = 0; k < 40; k++) expect(rollChoices(w).some((c) => c.id === gone)).toBe(false);
    expect(w.player.banishes).toBe(1);
    expect(banish(w, 0)).toBe(true);
    expect(banish(w, 0)).toBe(false); // none left
    expect(canBanish({ kind: 'evolve', id: 'bonkRing', level: 1 })).toBe(false);
  });
});

describe('daily run', () => {
  it('is fixed for a date and varies across dates', () => {
    expect(dailySpec('2026-10-11')).toEqual(dailySpec('2026-10-11'));
    const days = Array.from({ length: 60 }, (_, k) => dailySpec(utcDate(new Date(Date.UTC(2026, 0, 1) + k * 86400000))));
    expect(new Set(days.map((d) => d.seed)).size).toBe(60);
    expect(new Set(days.map((d) => d.hero)).size).toBe(CHARACTERS.length);
    expect(new Set(days.map((d) => d.map)).size).toBe(2);
    expect(utcDate(new Date(Date.UTC(2026, 9, 11, 23, 59)))).toBe('2026-10-11');
  });

  it('records the best result per day, newest 30 days', () => {
    const d = defaultSave();
    for (let k = 0; k < 40; k++) {
      const w = newRun({ seed: k, characterId: 'pip', daily: true });
      w.time = 100 + k;
      applyRunResult(d, summarize(w, utcDate(new Date(Date.UTC(2026, 0, 1) + k * 86400000))));
    }
    const w = newRun({ seed: 1, characterId: 'pip', daily: true });
    w.time = 50; // worse than the earlier run that day
    applyRunResult(d, summarize(w, '2026-02-09'));
    expect(d.daily).toHaveLength(30);
    expect(d.daily[0].date).toBe('2026-02-09');
    expect(d.daily[0].time).toBeCloseTo(139);
    expect(d.stats.dailyRuns).toBe(41);
    expect(sanitizeSave(JSON.parse(JSON.stringify(d))).daily).toEqual(d.daily);
  });
});

describe('hero passives', () => {
  it('Nova sees four cards', () => {
    const w = newRun({ seed: 6, characterId: 'nova' });
    w.player.stats.luck = 0;
    for (let k = 0; k < 10; k++) expect(rollChoices(w).length).toBe(4);
    expect(rollChoices(newRun({ seed: 6, characterId: 'thea' })).length).toBeLessThanOrEqual(4);
  });

  it('Thea bonks Gloom when landing from a jump', () => {
    const w = quiet(newRun({ seed: 7, characterId: 'thea' }));
    w.maxEnemies = 10;
    const i = spawnEnemy(w, enemyIndex('boulderback'), w.player.x + 1.5, w.player.z);
    w.enemies.speed[i] = 0;
    const hp0 = w.enemies.hp[i];
    const input = emptyInput();
    input.jump = true;
    step(w, input);
    input.jump = false;
    for (let k = 0; k < 90; k++) step(w, input);
    expect(w.enemies.hp[w.enemies.findUid(w.enemies.uid[i])]).toBeLessThan(hp0);
  });

  it('Brindle’s Shell Guard softens hits below 30% HP', () => {
    const hit = (hero: string, hpFrac: number): number => {
      const w = newRun({ seed: 8, characterId: hero });
      w.player.stats.armor = 0;
      w.player.hp = w.player.stats.maxHp * hpFrac;
      const before = w.player.hp;
      damagePlayer(w, 20, 0);
      return before - w.player.hp;
    };
    expect(hit('brindle', 0.25)).toBeCloseTo(hit('brindle', 0.9) * SHELL_GUARD_MULT);
  });

  it('Bramble’s Thornshell hurts whatever touched him', () => {
    const w = quiet(newRun({ seed: 9, characterId: 'bramble' }));
    w.maxEnemies = 10;
    const i = spawnEnemy(w, enemyIndex('boulderback'), w.player.x + 0.6, w.player.z);
    w.enemies.speed[i] = 0;
    const uid = w.enemies.uid[i];
    const hp0 = w.enemies.hp[i];
    for (let k = 0; k < 20; k++) step(w, emptyInput());
    expect(w.stats.hitsBy[src(SrcKind.Contact, enemyIndex('boulderback'))]).toBeGreaterThan(0);
    expect(w.enemies.hp[w.enemies.findUid(uid)]).toBeLessThan(hp0);
  });

  it('Ottie bowls through Gloom while sliding fast — and they can’t hurt Ottie', () => {
    const w = quiet(newRun({ seed: 10, characterId: 'ottie' }));
    expect(w.player.passive).toBe(HeroPassive.Slipstream);
    w.maxEnemies = 40;
    const ids: number[] = [];
    for (let k = 0; k < 8; k++) {
      const i = spawnEnemy(w, enemyIndex('gloomling'), w.player.x + 3 + k * 1.6, w.player.z);
      w.enemies.speed[i] = 0;
      ids.push(w.enemies.uid[i]);
    }
    w.player.vx = 18;
    w.player.vz = 0;
    const input = emptyInput();
    input.moveX = 1;
    input.slide = true;
    const hp0 = w.player.hp;
    for (let k = 0; k < 50; k++) step(w, input);
    const hurt = ids.filter((uid) => {
      const j = w.enemies.findUid(uid);
      return j < 0 || w.enemies.hp[j] < w.enemies.maxHp[j];
    }).length;
    expect(hurt).toBeGreaterThanOrEqual(5);
    expect(w.player.hp).toBe(hp0);
  });
});

describe('unlocks and collection', () => {
  it('new heroes unlock from slide distance, Clockjaw on Normal+, and level 40', () => {
    const d = defaultSave();
    expect(d.unlockedCharacters).not.toContain('ottie');
    const w = newRun({ seed: 11, characterId: 'thea', difficulty: 'relaxed' });
    w.stats.slideDistance = 3100;
    w.stats.bossKills.clockjaw = 1; // on Relaxed: doesn't count for Bramble
    w.player.level = 41;
    applyRunResult(d, summarize(w));
    expect(d.unlockedCharacters).toEqual(expect.arrayContaining(['ottie', 'nova']));
    expect(d.unlockedCharacters).not.toContain('bramble');
    const n = newRun({ seed: 12, characterId: 'thea' });
    n.stats.bossKills.clockjaw = 1;
    applyRunResult(d, summarize(n));
    expect(d.unlockedCharacters).toContain('bramble');
  });

  it('a v1 save that beat Clockjaw unlocks Bramble on its first achievement check', () => {
    const d = sanitizeSave(JSON.parse(readFileSync('tests/fixtures/save-v1.json', 'utf8')));
    expect(d.stats.bossKillsNormalPlus.clockjaw).toBe(1);
    expect(d.collection.kills.clockjaw).toBe(1); // bosses already met count as discovered
    checkAchievements(d);
    expect(d.unlockedCharacters).toContain('bramble');
  });

  it('runs fill the collection; unknown ids survive a save round-trip', () => {
    const d = defaultSave();
    const w = newRun({ seed: 13, characterId: 'thea' });
    w.stats.killsByType[enemyIndex('gnatlet')] = 7;
    applyRunResult(d, summarize(w));
    expect(d.collection.kills.gnatlet).toBe(7);
    expect(d.collection.weapons).toContain('bonkRing');
    expect(collectedCount(d)).toBe(2);
    const raw = JSON.parse(JSON.stringify(d));
    raw.collection.kills.futureBeast = 3;
    raw.collection.weapons.push('futureWand');
    const back = sanitizeSave(raw);
    expect(back.collection.kills.futureBeast).toBe(3);
    expect(back.collection.weapons).toContain('futureWand');
    expect(collectedCount(back)).toBe(2); // unknown ids don't count
  });
});

describe('tablet tier', () => {
  it('fields about 65% of the Gloom, each tougher and richer; bosses unchanged', () => {
    const run = (tablet: boolean): World => {
      const w = newRun({ seed: 21, characterId: 'thea', god: true, tablet });
      w.weapons.length = 0;
      const input = emptyInput();
      for (let k = 0; k < 60 * 75; k++) {
        step(w, input);
        w.events.clear();
        if (w.state !== 'playing') {
          w.state = 'playing';
          w.pendingLevels = 0;
          w.pendingChests = 0;
        }
      }
      return w;
    };
    const normal = run(false);
    const tablet = run(true);
    const ratio = tablet.enemies.count / normal.enemies.count;
    expect(ratio).toBeGreaterThan(0.5);
    expect(ratio).toBeLessThan(0.8);
    const g = enemyIndex('gloomling');
    const a = spawnEnemy(normal, g, normal.player.x + 30, normal.player.z);
    const b = spawnEnemy(tablet, g, tablet.player.x + 30, tablet.player.z);
    expect(tablet.enemies.maxHp[b] / normal.enemies.maxHp[a]).toBeCloseTo(1 / 0.65, 2);
    expect(tablet.enemies.xp[b] / normal.enemies.xp[a]).toBeCloseTo(1 / 0.65, 2);
    // bosses aren't thinned, so they aren't buffed (the map's own modifier applies to both)
    expect(tablet.mods.enemyHp).toBe(normal.mods.enemyHp);
  });

  it('a packed field never blocks a boss', () => {
    const w = newRun({ seed: 22, characterId: 'thea' });
    w.maxEnemies = w.enemies.cap;
    const g = enemyIndex('gloomling');
    let n = 0;
    while (spawnEnemy(w, g, (n % 40) - 20, Math.floor(n / 40) - 20) >= 0) n++;
    expect(w.enemies.count).toBe(w.enemies.cap - BOSS_RESERVE);
    spawnBoss(w, enemyIndex('grumblecap'));
    expect(w.director.bossUid).toBeGreaterThan(0);
  });
});
