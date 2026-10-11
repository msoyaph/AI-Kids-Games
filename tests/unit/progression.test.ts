import { describe, expect, it } from 'vitest';
import { SaveStore } from '../../src/app/save';
import { unlockedAbilities, unlockedHeroes } from '../../src/app/unlocks';
import { DIFFICULTIES } from '../../src/data/difficulty';
import { WORLD1 } from '../../src/data/maps/world1';
import { dailyFor, dailyScore, dateKey, MODIFIER_IDS, MUTATOR_IDS } from '../../src/data/modes';
import { bonusesFrom, canResearch, RESEARCH_IDS, researchNode, researchSpent } from '../../src/data/research';
import { TOWERS } from '../../src/data/towers';
import { TUNING } from '../../src/data/tuning';
import { hasKey } from '../../src/i18n';
import { Ev } from '../../src/sim/events';
import { DT, Game } from '../../src/sim/Game';

const map = WORLD1[0]!;

describe('research', () => {
  it('every node has text, valid costs and known prerequisites', () => {
    for (const id of RESEARCH_IDS) {
      const n = researchNode(id)!;
      expect(hasKey(`research.${id}`), id).toBe(true);
      expect(hasKey(`research.${id}.desc`), id).toBe(true);
      expect(n.cost.length).toBeGreaterThan(0);
      for (const req of n.requires ?? []) expect(RESEARCH_IDS).toContain(req);
    }
  });

  it('is bought with stars from every difficulty and refunds fully', () => {
    const s = new SaveStore(null);
    s.recordWin('w1m1', 'easy', 3);
    s.recordWin('w1m1', 'normal', 2);
    s.recordWin('w1m2', 'hard', 1);
    expect(s.totalStars()).toBe(6); // each difficulty counts
    const r = s.data.research;
    expect(canResearch(r, 'arsenal.calibration', s.starsFree())).toBe('requires');
    expect(canResearch(r, 'arsenal.forge', s.starsFree())).toBe('ok');
    r['arsenal.forge'] = 1;
    expect(s.starsFree()).toBe(3);
    r['arsenal.forge'] = 2;
    expect(s.starsFree()).toBe(0);
    expect(canResearch(r, 'economy.supply', s.starsFree())).toBe('stars');
    expect(researchSpent(r)).toBe(8);
    // reset = full refund
    s.data.research = {};
    expect(s.starsFree()).toBe(6);
  });

  it('turns ranks into run bonuses and unlocks', () => {
    const b = bonusesFrom({ 'arsenal.forge': 2, 'economy.supply': 3, 'citadel.walls': 1, 'command.training': 1 });
    expect(b.buildDiscount).toBeCloseTo(0.1);
    expect(b.startGold).toBe(75);
    expect(b.lives).toBeCloseTo(0.1);
    expect(b.heroLevel).toBe(1);
    const s = new SaveStore(null);
    expect(unlockedHeroes(s.data)).toEqual(['vanguard']);
    expect(unlockedAbilities(s.data)).toEqual([]);
    s.recordWin('w1m1', 'easy', 1);
    s.data.research['hero.seer'] = 1;
    s.data.research['ability.chrono'] = 1;
    expect(unlockedHeroes(s.data)).toContain('seer');
    expect(unlockedAbilities(s.data)).toEqual(['meteor', 'chrono']);
  });

  it('applies bonuses inside the match', () => {
    const base = new Game({ map, difficulty: 'normal', mode: 'campaign', seed: 1 });
    const g = new Game({ map, difficulty: 'normal', mode: 'campaign', seed: 1, bonuses: bonusesFrom({ 'arsenal.forge': 3, 'economy.supply': 2, 'citadel.walls': 3 }), hero: 'vanguard' });
    expect(g.coins).toBe(base.coins + 50);
    expect(g.maxLives).toBe(Math.round(DIFFICULTIES.normal.lives * 1.3));
    expect(g.buildCost('flame')).toBe(Math.round(TOWERS.flame.levels[0]!.cost * 0.85));
    const t = g.build('arrow', 5, 5)!;
    expect(g.coins).toBe(base.coins + 50 - g.buildCost('arrow'));
    expect(g.refundOf(t)).toBe(Math.floor(t.invested * 0.75));
  });
});

describe('difficulties, modifiers and medals', () => {
  it('Expert is the toughest', () => {
    expect(DIFFICULTIES.expert.lives).toBeLessThan(DIFFICULTIES.hard.lives);
    expect(DIFFICULTIES.expert.hp).toBeGreaterThan(DIFFICULTIES.hard.hp);
  });

  it('modifiers change the rules', () => {
    const iron = new Game({ map, difficulty: 'normal', mode: 'campaign', modifiers: ['iron'] });
    expect(iron.maxLives).toBe(1);
    const base = new Game({ map, difficulty: 'normal', mode: 'campaign' });
    const budget = new Game({ map, difficulty: 'normal', mode: 'campaign', modifiers: ['budget'] });
    expect(budget.coins).toBe(Math.round(base.coins * TUNING.modifiers.budget.startCoins));
    const nc = new Game({ map, difficulty: 'normal', mode: 'campaign', modifiers: ['nocombo'], startCoins: 5000, startCrystals: 2 });
    nc.chooseElement('fire');
    nc.chooseElement('water');
    expect(nc.canBuild('steam', 5, 5)).toEqual({ ok: false, reason: 'modifier' });
    expect(nc.canBuild('flame', 5, 5).ok).toBe(true);
    // pure element: no more cores after the first
    const pure = new Game({ map, difficulty: 'normal', mode: 'campaign', modifiers: ['pure'] });
    pure.chooseElement('fire');
    pure.sendNextWave();
    for (let i = 0; i < 30 * 400 && pure.waveNum < 6 && pure.state === 'playing'; i++) pure.step();
    expect(pure.crystals).toBe(0);
    // speed run: shorter breathers
    const fast = new Game({ map, difficulty: 'normal', mode: 'campaign', modifiers: ['speed'] });
    base.sendNextWave();
    fast.sendNextWave();
    expect(fast.nextWaveTimer).toBeCloseTo(base.nextWaveTimer * TUNING.modifiers.speed.breather, 5);
  });

  it('medals are stored once per map and modifier', () => {
    const s = new SaveStore(null);
    expect(s.addMedals('w1m1', ['iron', 'budget'])).toEqual(['iron', 'budget']);
    expect(s.addMedals('w1m1', ['iron', 'speed'])).toEqual(['speed']);
    expect(s.medalCount()).toBe(3);
    for (const m of MODIFIER_IDS) expect(hasKey(`modifier.${m}`)).toBe(true);
  });
});

describe('endless mutators and the daily challenge', () => {
  it('endless adds a mutator every 10 waves', () => {
    const g = new Game({ map, difficulty: 'easy', mode: 'endless', seed: 3 });
    let mut = 0;
    for (let w = 0; w < 21; w++) {
      g.sendNextWave();
      g.events.drain((e) => (mut += e.type === Ev.Mutator ? 1 : 0));
    }
    expect(g.mutators.length).toBe(2);
    expect(mut).toBe(2);
    for (const m of MUTATOR_IDS) expect(hasKey(`mutator.${m}`)).toBe(true);
  });

  it('mutators change spawned constructs', () => {
    const plain = new Game({ map, difficulty: 'normal', mode: 'campaign', seed: 1 });
    const mut = new Game({ map, difficulty: 'normal', mode: 'campaign', seed: 1, mutators: ['armored', 'elite', 'barrier', 'swift'] });
    plain.sendNextWave();
    mut.sendNextWave();
    const a = plain.debugSpawn('clankbot')!;
    const b = mut.debugSpawn('clankbot')!;
    expect(b.armor).toBeCloseTo(a.armor + TUNING.mutators.armored.armor, 5);
    expect(b.maxHp).toBe(Math.round(a.maxHp * (1 + TUNING.mutators.elite.hp)));
    expect(b.barrierMax).toBeGreaterThan(0);
    expect(b.speed).toBeGreaterThan(a.speed);
  });

  it('the daily is the same all day and scores runs', () => {
    const a = dailyFor('2026-10-11');
    const b = dailyFor('2026-10-11');
    const c = dailyFor('2026-10-12');
    expect(a.map.id).toBe(b.map.id);
    expect(a.modifiers).toEqual(b.modifiers);
    expect(a.mutators).toEqual(b.mutators);
    expect(a.seed).not.toBe(c.seed);
    expect(a.modifiers).not.toContain('iron');
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(dailyScore(30, 10, true)).toBe(30 * 100 + 10 * 25 + 1000);
    // a daily run plays its waves and ends
    const g = new Game({ map: a.map, difficulty: 'normal', mode: 'daily', seed: a.seed, modifiers: a.modifiers, mutators: a.mutators, waves: [] });
    expect(g.totalWaves).toBe(0);
    void DT;
  });
});
