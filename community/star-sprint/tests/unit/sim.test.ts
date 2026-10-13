import { describe, expect, it } from 'vitest';
import { newGame, PLAYER_R, skySpeed, SLEEPY_TIME, step, timeLeft, WORLD, type Thing } from '../../src/sim';

const put = (kind: Thing['kind'], x: number, y: number): Thing => ({ id: 999, kind, x, y, r: kind === 'cloud' ? 58 : 28, spin: 0 });

describe('Star Sprint rules', () => {
  it('starts with stars on their way, and is the same game for the same seed', () => {
    const s = newGame(3);
    expect(s.things.length).toBeGreaterThan(0);
    expect(s.things.every(thing => thing.kind === 'star' && thing.x > s.player.x + 300)).toBe(true);
    expect(newGame(42).things).toEqual(newGame(42).things);
    expect(newGame(42).things).not.toEqual(newGame(43).things);
  });

  it('catching a star scores a point and grows the streak', () => {
    const s = newGame(5);
    s.things = [put('star', s.player.x, s.player.y)];
    expect(step(s, { x: 0, y: 0 })).toEqual(['star']);
    expect(s.score).toBe(1);
    expect(s.streak).toBe(1);
    expect(s.things.some(thing => thing.id === 999)).toBe(false);
  });

  it('a sleepy cloud never takes points away: it only slows the comet and ends the streak', () => {
    const s = newGame(5);
    s.score = 4; s.streak = 3; s.bestStreak = 3;
    s.things = [put('cloud', s.player.x, s.player.y)];
    expect(step(s, { x: 0, y: 0 })).toEqual(['cloud']);
    expect(s.score).toBe(4);
    expect(s.streak).toBe(0);
    expect(s.bestStreak).toBe(3);
    expect(s.sleepy).toBe(SLEEPY_TIME);
    const awake = newGame(5), drowsy = newGame(5);
    awake.things = []; drowsy.things = []; drowsy.sleepy = SLEEPY_TIME;
    step(awake, { x: 0, y: 1 }); step(drowsy, { x: 0, y: 1 });
    expect(drowsy.player.y - WORLD.h / 2).toBeLessThan(awake.player.y - WORLD.h / 2);
  });

  it('a missed star ends the streak', () => {
    const s = newGame(5);
    s.streak = 2;
    s.things = [put('star', -119, 100)];
    step(s, { x: 0, y: 0 });
    expect(s.streak).toBe(0);
  });

  it('keeps the comet in the sky, and only up and down', () => {
    const s = newGame(1);
    for (let i = 0; i < 600; i++) step(s, { x: 5, y: -5 });
    expect(s.player.x).toBe(newGame(1).player.x);
    expect(s.player.y).toBeGreaterThanOrEqual(PLAYER_R);
    for (let i = 0; i < 600; i++) step(s, { x: 0, y: 5 });
    expect(s.player.y).toBeLessThanOrEqual(WORLD.h - PLAYER_R);
  });

  it('speeds up as the round goes on, and keeps sending things to catch', () => {
    const s = newGame(9, 20);
    const start = skySpeed(s);
    let seen = 0;
    for (let i = 0; i < 60 * 19; i++) { const before = s.nextId; step(s, { x: 0, y: 0 }); seen += s.nextId - before; }
    expect(skySpeed(s)).toBeGreaterThan(start);
    expect(seen).toBeGreaterThan(20);
  });

  it('ends when the timer runs out, and stops scoring', () => {
    const s = newGame(1, 2);
    for (let i = 0; i < 200; i++) step(s, { x: 0, y: 0 });
    expect(s.over).toBe(true);
    expect(timeLeft(s)).toBe(0);
    s.things = [put('star', s.player.x, s.player.y)];
    expect(step(s, { x: 0, y: 0 })).toEqual([]);
  });
});
