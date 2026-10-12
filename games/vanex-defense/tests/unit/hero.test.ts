import { describe, expect, it } from 'vitest';
import { ABILITIES } from '../../src/data/heroes';
import { WORLD1 } from '../../src/data/maps/world1';
import { TUNING } from '../../src/data/tuning';
import { Ev } from '../../src/sim/events';
import { DT, Game } from '../../src/sim/Game';
import { heroPassable } from '../../src/sim/hero';
import { F_ROCK, F_TREE } from '../../src/sim/grid';

const maze = WORLD1[0]!; // open field
const pathMap = WORLD1[1]!; // fixed road with build plates
const run = (g: Game, s: number): void => {
  for (let i = 0; i < s / DT; i++) g.step();
};
const newGame = (map = maze, hero: 'vanguard' | 'warden' | 'seer' | 'engineer' = 'vanguard'): Game => {
  const g = new Game({ map, difficulty: 'normal', mode: 'campaign', seed: 5, hero, abilities: ['meteor', 'chrono', 'funds'] });
  g.coins = 50_000;
  return g;
};

describe('commander hero', () => {
  it('starts next to the Citadel on a cell it can stand on', () => {
    const g = newGame();
    const h = g.hero!;
    expect(heroPassable(g.grid, g.grid.cellAt(h.x, h.y))).toBe(true);
    expect(Math.hypot(h.x - g.grid.castleX, h.y - g.grid.castleY)).toBeLessThan(2.5);
  });

  it('walks around towers and terrain, never through them', () => {
    const g = newGame(pathMap);
    const target = (() => {
      for (let i = 0; i < g.grid.cols * g.grid.rows; i++) if (heroPassable(g.grid, i) && g.grid.cellX(i) < 4) return i;
      return -1;
    })();
    expect(g.moveHero(g.grid.cellX(target), g.grid.cellY(target))).toBe(true);
    for (const c of g.hero!.path) expect(heroPassable(g.grid, c)).toBe(true);
    run(g, 30);
    expect(g.grid.cellAt(g.hero!.x, g.hero!.y)).toBe(target);
  });

  it('refuses unreachable or blocked cells', () => {
    const g = newGame(pathMap);
    let rock = -1;
    for (let i = 0; i < g.grid.flags.length; i++) if (g.grid.flags[i]! & (F_ROCK | F_TREE)) rock = i;
    expect(g.moveHero(g.grid.cellX(rock), g.grid.cellY(rock))).toBe(false);
    const t = g.build('arrow', 5, 1) ?? g.towers[0];
    if (t) expect(g.moveHero(t.cx, t.cy)).toBe(false);
  });

  it('never blocks the maze or changes the creature path', () => {
    const g = newGame();
    const before = Array.from(g.flow.dist);
    const h = g.hero!;
    // park the hero in the middle of the open field
    expect(g.moveHero(8, 5)).toBe(true);
    run(g, 6);
    expect(Array.from(g.flow.dist)).toEqual(before);
    // and you can still build on the plate it stands on; the hero steps aside
    const cx = Math.floor(h.x);
    const cy = Math.floor(h.y);
    expect(g.canBuild('arrow', cx, cy).ok).toBe(true);
    g.build('arrow', cx, cy);
    run(g, 2);
    expect(heroPassable(g.grid, g.grid.cellAt(h.x, h.y))).toBe(true);
  });

  it('fights, earns XP and levels up', () => {
    const g = newGame();
    g.sendNextWave();
    const h = g.hero!;
    h.gainXp(TUNING.hero.xp[1]!);
    expect(h.level).toBe(2);
    expect(h.maxHp).toBeGreaterThan(h.def.hp);
    const e = g.debugSpawn('gloop')!;
    e.x = e.px = h.x + 1;
    e.y = e.py = h.y;
    e.speed = 0;
    run(g, 3);
    expect(h.damageDone).toBeGreaterThan(0);
  });

  it('is knocked out by contact and respawns at the Citadel', () => {
    const g = newGame();
    g.sendNextWave();
    const h = g.hero!;
    h.hp = 1;
    const e = g.debugSpawn('clankbot')!;
    e.x = e.px = h.x;
    e.y = e.py = h.y;
    e.hp = e.maxHp = 1e6;
    e.speed = 0;
    let down = 0;
    for (let i = 0; i < 60 && !down; i++) {
      g.step();
      g.events.drain((ev) => (down += ev.type === Ev.HeroDown ? 1 : 0));
    }
    expect(h.alive).toBe(false);
    e.alive = false;
    run(g, h.def.respawn + 1);
    expect(h.alive).toBe(true);
    expect(h.hp).toBe(h.maxHp);
  });

  it('specials: rally speeds towers, quake stuns, mark exposes, repair restores', () => {
    const g = newGame();
    g.sendNextWave();
    const h = g.hero!;
    const t = g.build('arrow', Math.floor(h.x) - 1, Math.floor(h.y) - 1)!;
    expect(g.useHeroSpecial()).toBe(true);
    expect(t.buffRate).toBeGreaterThan(1);
    expect(g.useHeroSpecial()).toBe(false); // cooling down

    const w = newGame(maze, 'warden');
    w.sendNextWave();
    const e = w.debugSpawn('gloop')!;
    e.x = w.hero!.x + 0.5;
    e.y = w.hero!.y;
    w.step();
    expect(w.useHeroSpecial()).toBe(true);
    expect(e.stunTime).toBeGreaterThan(1);

    const s = newGame(maze, 'seer');
    s.sendNextWave();
    const m = s.debugSpawn('clankbot')!;
    m.x = s.hero!.x + 1;
    m.y = s.hero!.y;
    s.step();
    expect(s.useHeroSpecial()).toBe(true);
    expect(m.markTime).toBeGreaterThan(0);

    const en = newGame(maze, 'engineer');
    const tw = en.build('arrow', Math.floor(en.hero!.x) - 1, Math.floor(en.hero!.y) - 1)!;
    tw.disabled = 5;
    expect(en.useHeroSpecial()).toBe(true);
    expect(tw.disabled).toBe(0);
    expect(tw.buffDmg).toBeGreaterThan(1);
  });
});

describe('commander abilities', () => {
  it('have cooldowns and only work when unlocked', () => {
    const g = new Game({ map: maze, difficulty: 'normal', mode: 'campaign', seed: 1, abilities: ['funds'] });
    const gold = g.coins;
    expect(g.castAbility('meteor', 5, 5)).toBe(false);
    expect(g.castAbility('funds')).toBe(true);
    expect(g.coins).toBeGreaterThan(gold);
    expect(g.castAbility('funds')).toBe(false);
    run(g, ABILITIES.funds.cooldown + DT * 2);
    expect(g.castAbility('funds')).toBe(true);
  });

  it('meteor lands after its delay; chrono slows everything inside', () => {
    const g = newGame();
    g.sendNextWave();
    const e = g.debugSpawn('gloop')!;
    e.hp = e.maxHp = 1e6;
    e.speed = 0;
    expect(g.castAbility('meteor', e.x, e.y)).toBe(true);
    g.step();
    expect(e.hp).toBe(1e6);
    run(g, (ABILITIES.meteor.delay ?? 1) + 0.1);
    expect(e.hp).toBeLessThan(1e6);
    expect(g.castAbility('chrono', e.x, e.y)).toBe(true);
    run(g, 0.5);
    expect(e.slowAmt).toBeCloseTo(ABILITIES.chrono.slow!, 5);
    expect(g.stats.abilitiesUsed).toBe(2);
  });
});
