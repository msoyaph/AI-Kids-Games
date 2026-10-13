import { describe, expect, it } from 'vitest';
import {
  active, activeFighter, afterBattle, bumpAmount, canBefriend, canUseMove, effectiveSpeed, isAllowed, moveCost, resolveTurn, startBattle,
  type Action, type Battle, type BattleOptions,
} from '../../src/core/battle/engine';
import { makeCreature, maxEnergy, xpForLevel } from '../../src/core/creature';
import { Rng } from '../../src/core/rng';
import type { Creature, PersonalityId } from '../../src/core/types';
import { TUNING } from '../../src/tuning';
import { dex } from './fixtures';

const mk = (species: string, level = 20, moves?: string[], personality: PersonalityId = 'curious'): Creature => {
  const c = makeCreature(dex, { species, level, personality }, new Rng(level * 31 + species.length));
  if (moves) c.moves = moves;
  return c;
};

function battle(player: Creature[], foe: Creature[], o: Partial<BattleOptions> = {}): Battle {
  return startBattle(dex, { kind: 'wild', player, foe, difficulty: 'normal', seed: 1, ...o });
}

const move = (id: string): Action => ({ type: 'move', move: id });
const REST: Action = { type: 'rest' };

describe('bump math', () => {
  it('scales by element: strong 1.5×, weak 0.67×, plus a same-element bonus', () => {
    const user = mk('fx-flare', 20, ['bump', 'flare-hit', 'tide-hit']);
    const vsLeaf = battle([user], [mk('fx-leaf')]);
    const vsGust = battle([mk('fx-flare', 20, ['bump', 'flare-hit', 'tide-hit'])], [mk('fx-gust')]);
    const vsTide = battle([mk('fx-flare', 20, ['bump', 'flare-hit', 'tide-hit'])], [mk('fx-tide')]);
    const m = dex.moves['flare-hit']!;
    // Same guard stats (all fixtures share base guard 60 except where noted), so the ratio shows the chart.
    const strong = bumpAmount(dex, vsLeaf, 0, m), neutral = bumpAmount(dex, vsTide, 0, m) / TUNING.elements.weak;
    expect(strong / neutral).toBeCloseTo(TUNING.elements.strong, 0);
    const plainVsGust = bumpAmount(dex, vsGust, 0, dex.moves['tide-hit']!);
    const flareVsGust = bumpAmount(dex, vsGust, 0, m);
    expect(flareVsGust / plainVsGust).toBeCloseTo(TUNING.elements.sameElement, 1);
  });

  it('a neutral same-element bump at equal levels drains roughly a fifth to a third of energy', () => {
    const b = battle([mk('fx-flare', 25)], [mk('fx-gust', 25)]);
    const share = bumpAmount(dex, b, 0, dex.moves['flare-hit']!) / maxEnergy(dex, active(b, 1));
    expect(share).toBeGreaterThan(0.15);
    expect(share).toBeLessThan(0.4);
  });

  it('power boosts raise bumps and guard drops raise them too; shields halve them', () => {
    const b = battle([mk('fx-flare')], [mk('fx-gust')]);
    const m = dex.moves['flare-hit']!;
    const plain = bumpAmount(dex, b, 0, m);
    activeFighter(b, 0).boosts.power = 1;
    expect(bumpAmount(dex, b, 0, m)).toBeGreaterThan(plain);
    activeFighter(b, 0).boosts.power = 0;
    activeFighter(b, 1).boosts.guard = -2;
    expect(bumpAmount(dex, b, 0, m)).toBeGreaterThan(plain);
    activeFighter(b, 1).boosts.guard = 0;
    activeFighter(b, 1).shield = 0.5;
    expect(bumpAmount(dex, b, 0, m)).toBeCloseTo(plain / 2, -1);
  });

  it('Soaked Agentmon take more from Volt moves', () => {
    const b = battle([mk('fx-volt')], [mk('fx-gust')]);
    const m = dex.moves['volt-hit']!;
    const dry = bumpAmount(dex, b, 0, m);
    activeFighter(b, 1).status = { id: 'soaked', turns: 3 };
    expect(bumpAmount(dex, b, 0, m) / dry).toBeCloseTo(TUNING.status.soakedVoltTaken, 1);
  });

  it('the sturdy trait softens strong-against hits', () => {
    const b = battle([mk('fx-tide')], [mk('fx-stone')]); // tide is strong vs stone; fx-stone is sturdy
    const b2 = battle([mk('fx-tide')], [mk('fx-slow')]); // same element, not sturdy, more guard
    expect(bumpAmount(dex, b, 0, dex.moves['tide-hit']!)).toBeLessThan(bumpAmount(dex, b2, 0, dex.moves['tide-hit']!) * 1.3);
  });

  it('gear charms boost moves of their element', () => {
    const c = mk('fx-flare');
    const b = battle([c], [mk('fx-gust')]);
    const plain = bumpAmount(dex, b, 0, dex.moves['flare-hit']!);
    c.gear = 'flare-charm';
    expect(bumpAmount(dex, b, 0, dex.moves['flare-hit']!)).toBeGreaterThan(plain);
  });
});

describe('energy', () => {
  it('moves cost their share of max energy; free moves cost nothing', () => {
    const b = battle([mk('fx-flare', 20, ['bump', 'big-flare'])], [mk('fx-slow', 20, ['pump'])]);
    const c = active(b, 0);
    const before = c.energy;
    resolveTurn(dex, b, move('big-flare'), move('pump'));
    expect(before - c.energy).toBe(Math.ceil(maxEnergy(dex, c) * 0.18));
    const mid = c.energy;
    const foeBefore = active(b, 1).energy;
    resolveTurn(dex, b, move('bump'), move('pump'));
    expect(c.energy).toBe(mid);
    expect(active(b, 1).energy).toBeLessThan(foeBefore);
  });

  it('never lets a move tucker out its own user, but the free move always works', () => {
    const b = battle([mk('fx-flare', 20, ['bump', 'big-flare'])], [mk('fx-slow', 20)]);
    const c = active(b, 0);
    c.energy = Math.ceil(maxEnergy(dex, c) * 0.18);
    expect(canUseMove(dex, b, 0, 'big-flare')).toBe(false);
    expect(canUseMove(dex, b, 0, 'bump')).toBe(true);
    c.energy = 1;
    expect(canUseMove(dex, b, 0, 'bump')).toBe(true);
  });

  it('Rest restores a quarter of max energy (more for cozy Agentmon) and uses the turn', () => {
    const b = battle([mk('fx-tide', 20, ['bump'])], [mk('fx-slow', 20, ['shield'])]);
    const c = active(b, 0);
    c.energy = 10;
    resolveTurn(dex, b, REST, move('shield'));
    expect(c.energy).toBe(10 + Math.round(maxEnergy(dex, c) * TUNING.energy.rest));
    const cozy = battle([mk('fx-leaf', 20, ['bump'])], [mk('fx-slow', 20, ['shield'])]);
    const leaf = active(cozy, 0);
    leaf.energy = 10;
    resolveTurn(dex, cozy, REST, move('shield'));
    expect(leaf.energy).toBe(10 + Math.round(maxEnergy(dex, leaf) * (TUNING.energy.rest + TUNING.traits.cozyRest)));
  });

  it('Chilly makes moves cost more; thrifty Agentmon pay less', () => {
    const b = battle([mk('fx-flare', 20, ['big-flare'])], [mk('fx-gust')]);
    const m = dex.moves['big-flare']!;
    const normal = moveCost(dex, b, 0, m);
    activeFighter(b, 0).status = { id: 'chilly', turns: 3 };
    expect(moveCost(dex, b, 0, m)).toBeGreaterThan(normal * 1.3);
    const t = battle([mk('fx-volt', 20, ['big-flare'])], [mk('fx-gust')]);
    expect(moveCost(dex, t, 0, m)).toBeLessThan(moveCost(dex, battle([mk('fx-gust', 20, ['big-flare'])], [mk('fx-gust')]), 0, m) + 1);
  });
});

describe('statuses', () => {
  it('Sleepy skips turns (the same number however fast the sleeper is) and wakes when bumped', () => {
    for (const fast of [false, true]) {
      const foe = fast ? mk('fx-gust', 20, ['bump']) : mk('fx-slow', 20, ['bump']);
      const b = battle([mk('fx-glow', 20, ['lullaby', 'bump', 'shield'])], [foe]);
      const ev = resolveTurn(dex, b, move('lullaby'), move('bump'));
      expect(ev.some(e => e.t === 'status' && e.status === 'sleepy' && e.on)).toBe(true);
      let skipped = ev.filter(e => e.t === 'asleep').length;
      for (let i = 0; i < 4 && activeFighter(b, 1).status; i++) skipped += resolveTurn(dex, b, REST, move('bump')).filter(e => e.t === 'asleep').length;
      expect(skipped, fast ? 'fast foe' : 'slow foe').toBe(TUNING.status.turns.sleepy);
    }
    const b = battle([mk('fx-glow', 20, ['lullaby', 'bump'])], [mk('fx-slow', 20, ['bump'])]);
    resolveTurn(dex, b, move('lullaby'), move('bump'));
    const ev = resolveTurn(dex, b, move('bump'), move('bump'));
    expect(ev.some(e => e.t === 'wake' && e.side === 1)).toBe(true);
    expect(ev.some(e => e.t === 'act' && e.side === 1)).toBe(true); // awake again, it bumps back
  });

  it('Dizzy sometimes makes a move wobble (and never hurts its user)', () => {
    let wobbles = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const b = battle([mk('fx-gust', 20, ['wobble', 'bump'])], [mk('fx-slow', 20, ['bump'])], { seed });
      resolveTurn(dex, b, move('wobble'), move('bump'));
      const foe = active(b, 1);
      const before = foe.energy;
      const ev = resolveTurn(dex, b, REST, move('bump'));
      if (ev.some(e => e.t === 'wobble')) { wobbles++; expect(foe.energy).toBe(before); }
    }
    expect(wobbles).toBeGreaterThan(4);
    expect(wobbles).toBeLessThan(26);
  });

  it('Toasty drains a little each turn; Soaked slows; statuses end on their own', () => {
    const b = battle([mk('fx-flare', 20, ['toast', 'bump'])], [mk('fx-slow', 20, ['shield'])]);
    resolveTurn(dex, b, move('toast'), move('shield'));
    expect(activeFighter(b, 1).status?.id).toBe('toasty');
    const ev = resolveTurn(dex, b, REST, move('shield'));
    expect(ev.some(e => e.t === 'toasty' && e.side === 1)).toBe(true);
    for (let i = 0; i < 4; i++) resolveTurn(dex, b, REST, move('shield'));
    expect(activeFighter(b, 1).status).toBeUndefined();

    const s = battle([mk('fx-tide', 20, ['soak'])], [mk('fx-gust')]);
    const fast = effectiveSpeed(dex, s, 1);
    resolveTurn(dex, s, move('soak'), REST);
    expect(effectiveSpeed(dex, s, 1)).toBeCloseTo(fast * TUNING.status.soakedSpeed, 5);
  });

  it('holds one status at a time, and some traits keep a status away', () => {
    const b = battle([mk('fx-flare', 20, ['toast', 'chill'])], [mk('fx-frost', 20, ['shield'])]);
    const ev = resolveTurn(dex, b, move('chill'), move('shield')); // fx-frost is warm: no Chilly
    expect(ev).toContainEqual({ t: 'fail', side: 1, reason: 'status-proof' });
    resolveTurn(dex, b, move('toast'), REST);
    const ev2 = resolveTurn(dex, b, move('toast'), REST);
    expect(ev2).toContainEqual({ t: 'fail', side: 1, reason: 'status-held' });
  });
});

describe('turns and endings', () => {
  it('shields and quick moves go first, then the faster Agentmon', () => {
    const b = battle([mk('fx-slow', 20, ['bump', 'shield'])], [mk('fx-gust', 20, ['bump'])]);
    const ev = resolveTurn(dex, b, move('shield'), move('bump'));
    const firstAct = ev.find(e => e.t === 'act');
    expect(firstAct).toMatchObject({ side: 0, move: 'shield' });
    expect(ev.some(e => e.t === 'blocked' && e.side === 0)).toBe(true);
    const ev2 = resolveTurn(dex, b, move('bump'), move('bump'));
    expect(ev2.find(e => e.t === 'act')).toMatchObject({ side: 1 }); // gust is faster
  });

  it('a shield can not be used two turns in a row', () => {
    const b = battle([mk('fx-slow', 20, ['bump', 'shield'])], [mk('fx-gust', 20, ['bump'])]);
    resolveTurn(dex, b, move('shield'), move('bump'));
    const ev = resolveTurn(dex, b, move('shield'), move('bump'));
    expect(ev).toContainEqual({ t: 'fail', side: 0, reason: 'no-effect' });
  });

  it('a tuckered-out friend naps; the player picks the next one; the foe never acts on that pick', () => {
    const weak = mk('fx-leaf', 5, ['bump']);
    const b = battle([weak, mk('fx-tide', 20)], [mk('fx-flare', 30, ['big-flare', 'flare-hit', 'bump'])]);
    let ev: ReturnType<typeof resolveTurn> = [];
    for (let i = 0; i < 5 && b.needsSwitch === null; i++) ev = resolveTurn(dex, b, move('bump'), move('big-flare'));
    expect(ev.some(e => e.t === 'tuckered' && e.side === 0)).toBe(true);
    expect(b.needsSwitch).toBe(0);
    expect(isAllowed(dex, b, 0, move('bump'))).toBe(false);
    const foeEnergy = active(b, 1).energy;
    resolveTurn(dex, b, { type: 'switch', to: 1 }, move('big-flare'));
    expect(b.needsSwitch).toBeNull();
    expect(b.sides[0].active).toBe(1);
    expect(active(b, 1).energy).toBe(foeEnergy);
    expect(weak.energy).toBe(0);
  });

  it('losing ends the spar with nothing taken; winning pays coins and experience', () => {
    const b = battle([mk('fx-leaf', 3, ['bump'])], [mk('fx-flare', 40, ['flare-hit'])], { kind: 'trainer' });
    for (let i = 0; i < 50 && !b.outcome; i++) resolveTurn(dex, b, move('bump'), move('flare-hit'));
    expect(b.outcome).toBe('lost');
    expect(b.coins).toBe(0);

    const hero = mk('fx-tide', 30), bench = mk('fx-leaf', 10);
    const w = battle([hero, bench], [mk('fx-flare', 8, ['bump'])]);
    const xp0 = hero.xp, bench0 = bench.xp;
    let ev: ReturnType<typeof resolveTurn> = [];
    for (let i = 0; i < 50 && !w.outcome; i++) ev = resolveTurn(dex, w, move('tide-hit'), move('bump'));
    expect(w.outcome).toBe('won');
    expect(ev.some(e => e.t === 'coins')).toBe(true);
    expect(hero.xp).toBeGreaterThan(xp0);
    expect(bench.xp).toBeGreaterThan(bench0); // shared experience (on by default)
  });

  it('shared experience off: only Agentmon that sparred learn from it', () => {
    const hero = mk('fx-tide', 30), bench = mk('fx-leaf', 10);
    const w = battle([hero, bench], [mk('fx-flare', 8, ['bump'])], { sharedXp: false });
    for (let i = 0; i < 50 && !w.outcome; i++) resolveTurn(dex, w, move('tide-hit'), move('bump'));
    expect(w.outcome).toBe('won');
    expect(bench.xp).toBe(xpForLevel(10));
  });

  it('walking away from a wild spar always works; it is not offered against Keepers', () => {
    const b = battle([mk('fx-tide')], [mk('fx-flare', 20, ['flare-hit'])]);
    expect(resolveTurn(dex, b, { type: 'leave' }, move('flare-hit')).at(-1)).toEqual({ t: 'end', outcome: 'left' });
    const k = battle([mk('fx-tide')], [mk('fx-flare')], { kind: 'trainer' });
    expect(isAllowed(dex, k, 0, { type: 'leave' })).toBe(false);
  });

  it('berries restore energy or clear a status, and take the turn', () => {
    const b = battle([mk('fx-tide', 20, ['bump'])], [mk('fx-flare', 20, ['toast'])]);
    const c = active(b, 0);
    c.energy = 5;
    resolveTurn(dex, b, { type: 'item', item: 'berry' }, move('toast'));
    expect(c.energy).toBeGreaterThan(5);
    expect(activeFighter(b, 0).status?.id).toBe('toasty');
    resolveTurn(dex, b, { type: 'item', item: 'mint' }, REST);
    expect(activeFighter(b, 0).status).toBeUndefined();
  });

  it('replays exactly from the same seed', () => {
    const run = () => {
      const b = battle([mk('fx-gust', 20, ['wobble', 'bump', 'gust-hit'])], [mk('fx-glow', 20, ['glow-hit', 'bump'])], { seed: 99 });
      const log = [];
      for (let i = 0; i < 6 && !b.outcome; i++) log.push(...resolveTurn(dex, b, move(i === 0 ? 'wobble' : 'gust-hit'), move('glow-hit')));
      return log;
    };
    expect(run()).toEqual(run());
  });
});

describe('befriending in battle', () => {
  it('is only offered against tired wild Agentmon', () => {
    const b = battle([mk('fx-tide')], [mk('fx-flare')]);
    expect(canBefriend(dex, b)).toBe(false);
    const foe = active(b, 1);
    foe.energy = Math.floor(maxEnergy(dex, foe) * TUNING.befriend.threshold);
    expect(canBefriend(dex, b)).toBe(true);
    const k = battle([mk('fx-tide')], [mk('fx-flare')], { kind: 'trainer' });
    active(k, 1).energy = 1;
    expect(canBefriend(dex, k)).toBe(false);
  });

  it('a full heart makes a friend at once; a miss lowers interest until it wanders off', () => {
    const b = battle([mk('fx-tide')], [mk('fx-flare', 20, ['flare-hit'])]);
    const foe = active(b, 1);
    foe.energy = 3;
    const ev = resolveTurn(dex, b, { type: 'befriend', fill: TUNING.befriend.need }, move('flare-hit'));
    expect(b.outcome).toBe('befriended');
    expect(b.befriended).toBe(foe);
    expect(ev.some(e => e.t === 'act' && e.side === 1)).toBe(false); // it didn't bump first
    afterBattle(dex, b);
    expect(foe.energy).toBe(maxEnergy(dex, foe));

    const w = battle([mk('fx-tide', 50)], [mk('fx-flare', 5, ['shield'])]);
    active(w, 1).energy = 2;
    for (let i = 0; i < TUNING.befriend.interest; i++) resolveTurn(dex, w, { type: 'befriend', fill: 1 }, move('shield'));
    expect(w.outcome).toBe('wandered');
  });

  it('guardians never wander off', () => {
    const g = battle([mk('fx-tide', 50)], [mk('fx-glow', 30, ['shield'])], { guardian: true });
    active(g, 1).energy = 2;
    for (let i = 0; i < 10; i++) resolveTurn(dex, g, { type: 'befriend', fill: 0 }, move('shield'));
    expect(g.outcome).toBeNull();
  });
});
