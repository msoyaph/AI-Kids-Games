import { describe, expect, it } from 'vitest';
import type { MapDef } from '../../src/data/maps/types';
import { Ev } from '../../src/sim/events';
import { Game } from '../../src/sim/Game';

const LINE: MapDef = {
  id: 'line',
  name: 'Line',
  world: 1,
  theme: 'meadow',
  style: 'maze',
  story: '',
  grid: ['TTTTTTTTTT', 'S.......CC', 'S.......CC', 'TTTTTTTTTT'],
  waves: 2,
};

function run(game: Game, seconds: number): void {
  for (let i = 0; i < seconds * 30; i++) game.step();
}

describe('enemy movement & lives', () => {
  it('walks a creature to the castle and costs a life', () => {
    const game = new Game({ map: LINE, difficulty: 'normal', mode: 'campaign' });
    const lives = game.lives;
    const e = game.debugSpawn('gloop')!;
    expect(e.flying).toBe(false);
    let leaked = false;
    for (let i = 0; i < 30 * 20 && !leaked; i++) {
      game.step();
      game.events.drain((ev) => {
        if (ev.type === Ev.Leak) leaked = true;
      });
    }
    expect(leaked).toBe(true);
    expect(game.lives).toBe(lives - 1);
    expect(game.enemies.length).toBe(0);
  });

  it('moves at the right speed (≈ speed tiles/sec)', () => {
    const game = new Game({ map: LINE, difficulty: 'normal', mode: 'campaign' });
    const e = game.debugSpawn('clankbot')!;
    const x0 = e.x;
    run(game, 2);
    expect(e.x - x0).toBeGreaterThan(e.speed * 2 * 0.9);
    expect(e.x - x0).toBeLessThan(e.speed * 2 * 1.05);
  });

  it('flyers ignore the maze and fly straight', () => {
    const game = new Game({ map: LINE, difficulty: 'normal', mode: 'campaign', startCoins: 1000 });
    const e = game.debugSpawn('puffbat')!;
    expect(e.flying).toBe(true);
    const y0 = e.y;
    run(game, 1);
    expect(Math.abs(e.y - y0)).toBeLessThan(0.5);
    expect(e.x).toBeGreaterThan(1.5);
  });

  it('losing all lives ends the run', () => {
    const game = new Game({ map: LINE, difficulty: 'hard', mode: 'campaign' });
    for (let i = 0; i < game.maxLives; i++) game.debugSpawn('zoomkin');
    run(game, 20);
    expect(game.state).toBe('lost');
  });

  it('creatures keep moving after the maze changes (no soft-lock)', () => {
    const open: MapDef = { ...LINE, grid: ['..........', 'S.......CC', 'S.......CC', '..........'] };
    const game = new Game({ map: open, difficulty: 'normal', mode: 'campaign', startCoins: 5000 });
    for (let i = 0; i < 5; i++) game.debugSpawn('gloop', null, i);
    run(game, 1.2);
    // drop towers right in front of them
    game.build('arrow', 3, 1);
    game.build('arrow', 3, 2);
    game.build('arrow', 4, 0);
    run(game, 30);
    expect(game.enemies.length).toBe(0);
  });
});

describe('waves', () => {
  it('runs a full short game to victory with no creatures', () => {
    const game = new Game({ map: { ...LINE, waves: 1 }, difficulty: 'easy', mode: 'campaign', waves: [{ n: 1, groups: [], hp: 1, coins: 1, boss: null }] });
    game.sendNextWave();
    run(game, 1);
    expect(game.state).toBe('won');
  });

  it('auto-starts the next wave after the countdown', () => {
    const game = new Game({ map: LINE, difficulty: 'normal', mode: 'campaign', startCoins: 0 });
    expect(game.nextWaveTimer).toBe(-1);
    game.sendNextWave();
    expect(game.waveNum).toBe(1);
    expect(game.nextWaveTimer).toBeGreaterThan(0);
    run(game, game.nextWaveTimer + 1);
    expect(game.waveNum).toBe(2);
  });

  it('pays a clear bonus and interest when a wave is cleared', () => {
    const game = new Game({
      map: LINE,
      difficulty: 'normal',
      mode: 'campaign',
      startCoins: 200,
      waves: [
        { n: 1, groups: [{ enemy: 'gloop', count: 1, gap: 1, delay: 0 }], hp: 0.01, coins: 1, boss: null },
        { n: 2, groups: [], hp: 1, coins: 1, boss: null },
      ],
    });
    game.sendNextWave();
    // poke the creature to death
    run(game, 0.2);
    const e = game.enemies[0]!;
    game.damage(e, 9999, [], -1);
    const before = game.coins;
    run(game, 0.1);
    expect(game.coins).toBeGreaterThan(before);
    expect(game.stats.interestEarned).toBe(Math.min(12, Math.floor(before * 0.04)));
  });

  it('sending a wave early grants bonus coins', () => {
    const game = new Game({ map: LINE, difficulty: 'normal', mode: 'campaign', startCoins: 0 });
    game.sendNextWave();
    run(game, 1);
    const bonus = game.sendNextWave();
    expect(bonus).toBeGreaterThan(0);
    expect(game.waveNum).toBe(2);
    expect(game.stats.wavesSentEarly).toBe(1);
  });
});
