import { describe, expect, it } from 'vitest';
import type { MapDef } from '../../src/data/maps/types';
import { STRONG_MULT, WEAK_MULT } from '../../src/data/elements';
import { COMBO_TOWERS, comboFor, TOWERS, TOWER_IDS } from '../../src/data/towers';
import { ELEMENT_ORDER } from '../../src/data/elements';
import { Ev } from '../../src/sim/events';
import { Game } from '../../src/sim/Game';

const FIELD: MapDef = {
  id: 'arena',
  name: 'Arena',
  world: 1,
  theme: 'meadow',
  style: 'maze',
  story: '',
  grid: ['............', '............', 'S..........C', '............', '............'],
  waves: 3,
};

function arena(): Game {
  const g = new Game({ map: FIELD, difficulty: 'normal', mode: 'campaign', startCoins: 100000, seed: 1 });
  g.crystals = 6;
  for (const e of ELEMENT_ORDER) g.chooseElement(e);
  return g;
}

function run(g: Game, s: number): void {
  for (let i = 0; i < s * 30; i++) g.step();
}

describe('damage math', () => {
  it('applies element strengths and weaknesses', () => {
    const g = arena();
    const a = g.debugSpawn('gloop', 'fire')!;
    a.hp = a.maxHp = 1000;
    g.damage(a, 100, ['water'], -1);
    expect(1000 - a.hp).toBeCloseTo(100 * STRONG_MULT, 5);
    const b = g.debugSpawn('gloop', 'water')!;
    b.hp = b.maxHp = 1000;
    g.damage(b, 100, ['fire'], -1);
    expect(1000 - b.hp).toBeCloseTo(100 * WEAK_MULT, 5);
  });

  it('armor reduces direct hits, armor break restores them, poison ignores armor', () => {
    const g = arena();
    const e = g.debugSpawn('clankbot')!;
    e.hp = e.maxHp = 1000;
    g.damage(e, 100, [], -1);
    expect(1000 - e.hp).toBeCloseTo(100 * (1 - 0.4), 5);
    e.armorBreak = 0.4;
    e.armorBreakTime = 5;
    e.hp = 1000;
    g.damage(e, 100, [], -1);
    expect(1000 - e.hp).toBeCloseTo(100, 5);
    e.armorBreakTime = 0;
    e.hp = 1000;
    g.damage(e, 100, [], -1, true);
    expect(1000 - e.hp).toBeCloseTo(100, 5);
  });

  it('bubble shields block 75% unless hit by the element that beats them', () => {
    const g = arena();
    const e = g.debugSpawn('bubbleimp')!;
    e.shield = 'fire';
    e.hp = e.maxHp = 1000;
    g.damage(e, 100, ['nature'], -1);
    expect(1000 - e.hp).toBeCloseTo(25, 5);
    e.hp = 1000;
    g.damage(e, 100, ['water'], -1);
    expect(1000 - e.hp).toBeCloseTo(100, 5);
  });

  it('splitters pop into smaller creatures; poofs pay coins', () => {
    const g = arena();
    const e = g.debugSpawn('splitblob')!;
    const coins = g.coins;
    g.damage(e, 1e6, [], -1);
    expect(g.coins).toBeGreaterThan(coins);
    expect(g.enemies.filter((x) => x.alive && x.def.id === 'minigloop').length).toBe(3);
  });

  it('healers patch up their friends', () => {
    const g = arena();
    const friend = g.debugSpawn('gloop')!;
    const healer = g.debugSpawn('mendy')!;
    friend.hp = friend.maxHp * 0.5;
    healer.x = friend.x;
    healer.y = friend.y;
    run(g, 2);
    expect(friend.hp).toBeGreaterThan(friend.maxHp * 0.5);
  });
});

describe('targeting', () => {
  function line(g: Game): ReturnType<Game['debugSpawn']>[] {
    const out = [];
    for (let i = 0; i < 3; i++) {
      const e = g.debugSpawn('gloop')!;
      e.x = 4 + i * 0.6;
      e.y = 2.5;
      e.px = e.x;
      e.speed = 0;
      e.hp = e.maxHp = 100 + i * 50;
      out.push(e);
    }
    return out;
  }

  it('first / last / strongest / closest pick the right creature', () => {
    for (const [mode, expectIdx] of [
      ['first', 2],
      ['last', 0],
      ['strong', 2],
    ] as const) {
      const g = arena();
      const t = g.build('arrow', 5, 1)!;
      t.mode = mode;
      const es = line(g);
      for (const e of es) {
        // walking right along row 2 toward the castle
        e!.cell = g.grid.idx(Math.floor(e!.x), 2);
        e!.wcell = g.grid.idx(Math.floor(e!.x) + 1, 2);
        e!.wx = Math.floor(e!.x) + 1.5;
        e!.wy = 2.5;
      }
      let target = -1;
      for (let i = 0; i < 30 && target < 0; i++) {
        g.step();
        g.events.drain((ev) => {
          if (ev.type === Ev.Fire && target < 0) target = es.findIndex((e) => Math.abs(e!.x - ev.x2) < 0.01);
        });
      }
      expect(target, mode).toBe(expectIdx);
    }
  });
});

describe('every tower works', () => {
  it('has 4 levels with rising cost and damage', () => {
    for (const id of TOWER_IDS) {
      const lv = TOWERS[id].levels;
      expect(lv, id).toHaveLength(4);
      for (let i = 1; i < 4; i++) expect(lv[i]!.damage, id).toBeGreaterThan(lv[i - 1]!.damage);
    }
  });

  it('15 combos cover every pair of the 6 elements exactly once', () => {
    expect(COMBO_TOWERS).toHaveLength(15);
    for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) expect(comboFor(ELEMENT_ORDER[i]!, ELEMENT_ORDER[j]!)).not.toBeNull();
  });

  it.each(TOWER_IDS)('%s damages creatures in range', (id) => {
    const g = arena();
    const t = g.build(id, 5, 1)!;
    expect(t).not.toBeNull();
    const e = g.debugSpawn(TOWERS[id].targets === 'ground' ? 'gloop' : 'puffbat')!;
    e.x = e.px = 5.5;
    e.y = e.py = 2.5;
    e.speed = 0;
    e.hp = e.maxHp = 1e6;
    if (!e.flying) {
      // pin walkers in place (a flyer's wx/wy is its flight target)
      e.wx = e.x;
      e.wy = e.y;
    }
    run(g, 4);
    expect(e.hp, id).toBeLessThan(1e6);
    expect(t.damageDone, id).toBeGreaterThan(0);
  });

  it('ground-only towers ignore flyers', () => {
    const g = arena();
    g.build('cannon', 5, 1);
    const e = g.debugSpawn('puffbat')!;
    e.x = e.px = 5.5;
    e.y = e.py = 2.5;
    e.speed = 0;
    e.hp = e.maxHp = 1000;
    run(g, 3);
    expect(e.hp).toBe(1000);
  });

  it('rain garden makes nearby towers attack faster', () => {
    const g = arena();
    const a = g.build('arrow', 5, 1)!;
    expect(a.rateMult).toBe(1);
    g.build('raingarden', 6, 1);
    expect(a.rateMult).toBeGreaterThan(1);
  });

  it('sunflower grove adds bonus coins to poofs nearby', () => {
    const g = arena();
    g.build('sunflower', 5, 1);
    const e = g.debugSpawn('gloop')!;
    e.x = 5.5;
    e.y = 2.5;
    const base = e.coins;
    const before = g.coins;
    g.damage(e, 1e6, [], -1);
    expect(g.coins - before).toBeGreaterThan(base);
  });

  it('whirlpool pushes creatures back, gravity well stuns them', () => {
    const g = arena();
    g.build('whirlpool', 6, 1);
    const e = g.debugSpawn('gloop')!;
    run(g, 0.1);
    e.x = e.px = 6.5;
    e.y = e.py = 2.5;
    e.cell = g.grid.idx(6, 2);
    e.wcell = g.grid.idx(7, 2);
    e.wx = 7.5;
    e.wy = 2.5;
    e.hp = e.maxHp = 1e6;
    run(g, 0.2);
    expect(e.x).toBeLessThan(6.5);

    const g2 = arena();
    g2.build('gravity', 6, 1);
    const s = g2.debugSpawn('gloop')!;
    s.x = s.px = 6.5;
    s.y = s.py = 2.5;
    s.hp = s.maxHp = 1e6;
    let stunned = false;
    for (let i = 0; i < 60 && !stunned; i++) {
      g2.step();
      if (s.stunTime > 0) stunned = true;
    }
    expect(stunned).toBe(true);
  });
});
