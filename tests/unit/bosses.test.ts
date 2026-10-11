import { describe, expect, it } from 'vitest';
import { RUN_LENGTH } from '../../src/config/balance';
import { enemyIndex } from '../../src/config/enemies';
import { WAVE_EVENTS } from '../../src/config/waves';
import { spawnBoss } from '../../src/sim/bosses';
import { hitEnemy } from '../../src/sim/combat';
import { newRun } from '../../src/sim/run';
import { step } from '../../src/sim/sim';
import { emptyInput, type World } from '../../src/sim/world';

function run(w: World, seconds: number): void {
  const input = emptyInput();
  for (let t = 0; t < seconds * 60; t++) {
    step(w, input);
    w.events.clear();
    if (w.state === 'levelup' || w.state === 'chest') {
      w.state = 'playing';
      w.pendingLevels = 0;
      w.pendingChests = 0;
    }
    if (w.state !== 'playing') break;
  }
}

describe('bosses', () => {
  it('bosses are scheduled at 5, 10 and 15 minutes', () => {
    const bosses = WAVE_EVENTS.filter((e) => e.kind === 'boss').map((e) => e.time);
    expect(bosses).toEqual([300, 600, 900]);
  });

  for (const id of ['grumblecap', 'clockjaw', 'gloamRegent']) {
    it(`${id} attacks (projectiles / hazards / summons) without errors`, () => {
      const w = newRun({ seed: 21, characterId: 'thea', god: true });
      w.weapons.length = 0; // keep the boss alive
      spawnBoss(w, enemyIndex(id));
      expect(w.director.bossUid).toBeGreaterThan(0);
      let shots = 0;
      let hazards = 0;
      const input = emptyInput();
      for (let t = 0; t < 60 * 25; t++) {
        step(w, input);
        w.events.clear();
        shots = Math.max(shots, w.enemyShots.count);
        hazards = Math.max(hazards, w.hazards.count);
      }
      expect(shots + hazards).toBeGreaterThan(0);
      expect(w.enemies.findUid(w.director.bossUid)).toBeGreaterThanOrEqual(0);
    });
  }

  it('killing a boss records it and drops a chest', () => {
    const w = newRun({ seed: 22, characterId: 'thea', god: true });
    spawnBoss(w, enemyIndex('grumblecap'));
    const i = w.enemies.findUid(w.director.bossUid);
    hitEnemy(w, i, 1e9, 0, 0, 1, 0, 0);
    expect(w.stats.bossKills.grumblecap).toBe(1);
    expect(w.director.bossUid).toBe(0);
    let chests = 0;
    for (let k = 0; k < w.pickups.count; k++) if (w.pickups.kind[k] === 3) chests++;
    expect(chests).toBe(1);
  });

  it('defeating the Gloam Regent wins the run', () => {
    const w = newRun({ seed: 23, characterId: 'thea', god: true });
    spawnBoss(w, enemyIndex('gloamRegent'));
    const i = w.enemies.findUid(w.director.bossUid);
    hitEnemy(w, i, 1e9, 0, 0, 1, 0, 0);
    expect(w.director.finalBossDefeated).toBe(true);
    run(w, 5);
    expect(w.state).toBe('won');
  });
});

describe('run length', () => {
  it('surviving until 20:00 wins the run', () => {
    const w = newRun({ seed: 24, characterId: 'thea', god: true });
    w.time = RUN_LENGTH - 1;
    w.director.eventIndex = WAVE_EVENTS.length; // skip scripted events
    run(w, 6);
    expect(w.director.dawn).toBe(true);
    expect(w.state).toBe('won');
  });
});
