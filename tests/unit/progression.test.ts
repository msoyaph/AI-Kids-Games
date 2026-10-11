import { describe, expect, it } from 'vitest';
import { CHALLENGES } from '../../src/data/challenges';
import { RACERS } from '../../src/data/racers';
import { BODIES, DECALS, GLIDERS, PAINTS, WHEELS } from '../../src/data/parts';
import { ARENAS } from '../../src/data/arenas';
import { CUPS } from '../../src/data/cups';
import { newSave, migrate, MIGRATIONS, SAVE_VERSION } from '../../src/save/save';
import { awardTrophy, checkProgressUnlocks, hasUnlock, updateRecord } from '../../src/game/progression';
import { evaluateChallenges } from '../../src/game/challenges';
import { GP_POINTS, pointsFor, sortStandings, medalFor, battleOrder } from '../../src/sim/rules';
import type { SessionResult } from '../../src/game/session';
import { makeRaceStats } from '../../src/sim/kart';
import type { UnlockRef } from '../../src/data/types';

function result(over: Partial<{ rank: number; mode: SessionResult['config']['mode']; trackId: string; items: boolean; stats: Partial<ReturnType<typeof makeRaceStats>>; arenaId: string; speedClass: 'rookie' | 'pro' | 'champion'; mirror: boolean }> = {}): SessionResult {
  const stats = { ...makeRaceStats(), ...(over.stats ?? {}) };
  return {
    config: { mode: over.mode ?? 'versus', trackId: over.trackId ?? 'canyon-run', arenaId: over.arenaId, speedClass: over.speedClass ?? 'pro', mirror: over.mirror ?? false, items: over.items ?? true, itemSet: 'all', laps: 3, players: [], ai: [], seed: 1 },
    results: [{ index: 0, racerId: 'calex', name: 'Calex', player: 0, rank: over.rank ?? 1, finishTime: 100, bestLap: 30, lapTimes: [30, 35, 35], projected: false, score: 0, stats }],
  };
}

describe('points and standings', () => {
  it('awards 15-12-10-8-6-4-2-1', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map(pointsFor)).toEqual([...GP_POINTS, 0]);
  });
  it('breaks ties by wins then last race', () => {
    const s = sortStandings([
      { id: 0, points: 30, finishes: [2, 2, 3] },
      { id: 1, points: 30, finishes: [1, 4, 6] },
      { id: 2, points: 40, finishes: [1, 1, 8] },
    ]);
    expect(s.map((x) => x.id)).toEqual([2, 1, 0]);
  });
  it('medals for the podium only', () => {
    expect([1, 2, 3, 4].map(medalFor)).toEqual(['gold', 'silver', 'bronze', null]);
  });
  it('battle ranks by score then balloons', () => {
    const o = battleOrder([
      { index: 0, score: 3, balloons: 1, popped: 2 },
      { index: 1, score: 5, balloons: 0, popped: 4 },
      { index: 2, score: 3, balloons: 3, popped: 1 },
    ]);
    expect(o.map((x) => x.index)).toEqual([1, 2, 0]);
  });
});

describe('unlocks', () => {
  const lockedRefs = (): UnlockRef[] => [
    ...RACERS.filter((r) => !r.unlocked).map((r) => ({ kind: 'racer', id: r.id }) as UnlockRef),
    ...BODIES.filter((r) => !r.unlocked).map((r) => ({ kind: 'body', id: r.id }) as UnlockRef),
    ...WHEELS.filter((r) => !r.unlocked).map((r) => ({ kind: 'wheels', id: r.id }) as UnlockRef),
    ...GLIDERS.filter((r) => !r.unlocked).map((r) => ({ kind: 'glider', id: r.id }) as UnlockRef),
    ...PAINTS.filter((r) => !r.unlocked).map((r) => ({ kind: 'paint', id: r.id }) as UnlockRef),
    ...DECALS.filter((r) => !r.unlocked).map((r) => ({ kind: 'decal', id: r.id }) as UnlockRef),
    ...ARENAS.filter((r) => !r.unlocked).map((r) => ({ kind: 'arena', id: r.id }) as UnlockRef),
  ];

  it('has 12 racers with 6 unlocked at the start, across all weight classes', () => {
    expect(RACERS.length).toBe(12);
    const start = RACERS.filter((r) => r.unlocked);
    expect(start.length).toBe(6);
    expect(new Set(start.map((r) => r.weight)).size).toBe(3);
  });

  it('has at least 30 challenges with unique ids', () => {
    expect(CHALLENGES.length).toBeGreaterThanOrEqual(30);
    expect(new Set(CHALLENGES.map((c) => c.id)).size).toBe(CHALLENGES.length);
  });

  it('every locked item is a challenge reward (so every unlock is achievable)', () => {
    for (const ref of lockedRefs()) {
      const c = CHALLENGES.find((ch) => ch.reward.kind === ref.kind && ch.reward.id === ref.id);
      expect(c, `${ref.kind}:${ref.id}`).toBeDefined();
    }
  });

  it('challenge rewards point at real, initially locked content', () => {
    const save = newSave('t');
    for (const c of CHALLENGES) expect(hasUnlock(save, c.reward), c.id).toBe(false);
  });

  it('cups and classes unlock through trophies', () => {
    const save = newSave('t');
    expect(save.unlocks.cups).toEqual(CUPS.filter((c) => c.unlocked).map((c) => c.id));
    awardTrophy(save, 'sunrise', 'rookie', false, 'bronze');
    awardTrophy(save, 'thunder', 'rookie', false, 'silver');
    checkProgressUnlocks(save);
    expect(save.unlocks.cups).toContain('galaxy');
    awardTrophy(save, 'galaxy', 'pro', false, 'gold');
    checkProgressUnlocks(save);
    expect(save.unlocks.cups).toContain('legend');
    for (const c of CUPS) awardTrophy(save, c.id, 'pro', false, 'gold');
    checkProgressUnlocks(save);
    expect(save.unlocks.classes).toContain('champion');
    expect(save.unlocks.classes).not.toContain('mirror');
    for (const c of CUPS) awardTrophy(save, c.id, 'champion', false, 'gold');
    checkProgressUnlocks(save);
    expect(save.unlocks.classes).toContain('mirror');
  });

  it('trophies only improve', () => {
    const save = newSave('t');
    expect(awardTrophy(save, 'sunrise', 'pro', false, 'silver')).toBe(true);
    expect(awardTrophy(save, 'sunrise', 'pro', false, 'bronze')).toBe(false);
    expect(save.trophies['sunrise:pro']).toBe('silver');
    expect(awardTrophy(save, 'sunrise', 'pro', false, 'gold')).toBe(true);
  });

  it('challenges complete from race results and unlock rewards', () => {
    const save = newSave('t');
    const done = evaluateChallenges(save, result({ rank: 1, trackId: 'seashell-boardwalk', stats: { longestDrift: 11, perfectStart: true } }));
    const ids = done.map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(['first-finish', 'drift-rookie', 'drift-master', 'rocket-start', 'beach-win', 'no-items', 'pro-podium']));
    expect(save.unlocks.bodies).toContain('rocket');
    expect(save.newUnlocks.length).toBeGreaterThan(5);
  });

  it('cumulative challenges add up across races', () => {
    const save = newSave('t');
    for (let i = 0; i < 4; i++) evaluateChallenges(save, result({ stats: { tricks: 7 } }));
    expect(save.challenges['trickster'].done).toBe(true);
    expect(save.challenges['trick-star'].done).toBe(false);
    expect(save.challenges['trick-star'].progress).toBe(28);
  });

  it('battle challenges', () => {
    const save = newSave('t');
    evaluateChallenges(save, result({ mode: 'battle', arenaId: 'crater-bowl', rank: 1, stats: { balloonsPopped: 6 } }));
    expect(save.unlocks.arenas).toContain('coral-ring');
    expect(save.challenges['balloon-popper'].progress).toBe(6);
  });

  it('records keep the best time and lap separately', () => {
    const save = newSave('t');
    const kart = save.kart;
    expect(updateRecord(save, 'x', 100, 33, 'calex', kart)).toEqual({ best: true, lap: true });
    expect(updateRecord(save, 'x', 101, 32, 'calex', kart)).toEqual({ best: false, lap: true });
    expect(save.records.x.bestTime).toBe(100);
    expect(save.records.x.bestLap).toBe(32);
  });
});

describe('save migration', () => {
  it('upgrades a v1 save to the current version', () => {
    const v1 = { v: 1, name: 'Old Racer', trophies: ['sunrise:rookie:gold', 'thunder:pro:silver', 'bad'], unlocks: { racers: ['calex', 'fennel'] }, stats: { races: 7 } };
    const s = migrate(v1);
    expect(s.v).toBe(SAVE_VERSION);
    expect(s.trophies).toEqual({ 'sunrise:rookie': 'gold', 'thunder:pro': 'silver' });
    expect(s.unlocks.racers).toContain('fennel');
    expect(s.unlocks.racers).toContain('pip');
    expect(s.stats.races).toBe(7);
    expect(s.stats.wins).toBe(0);
    expect(s.challenges).toEqual({});
    expect(s.name).toBe('Old Racer');
  });

  it('is idempotent on current saves and fills missing fields', () => {
    const fresh = newSave('Now');
    const again = migrate(JSON.parse(JSON.stringify(fresh)));
    expect(again).toEqual(fresh);
    const partial = migrate({ v: SAVE_VERSION, name: 'P' });
    expect(partial.unlocks.racers.length).toBe(6);
  });

  it('has a migration for every older version', () => {
    for (let v = 1; v < SAVE_VERSION; v++) expect(MIGRATIONS[v]).toBeTypeOf('function');
  });
});
