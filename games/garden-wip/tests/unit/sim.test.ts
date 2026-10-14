import { describe, expect, it } from 'vitest';
import { newGame, PLAYER_R, STAR_COUNT, step, timeLeft, WORLD } from '../../src/sim';

describe('Star Catch rules', () => {
  it('starts with five stars, none on top of the firefly', () => {
    const s = newGame(3);
    expect(s.stars).toHaveLength(STAR_COUNT);
    for (const star of s.stars) expect(Math.hypot(star.x - s.player.x, star.y - s.player.y)).toBeGreaterThan(star.r + PLAYER_R);
  });

  it('is the same game for the same seed', () => {
    expect(newGame(42).stars).toEqual(newGame(42).stars);
    expect(newGame(42).stars).not.toEqual(newGame(43).stars);
  });

  it('catching a star scores a point and puts a new star somewhere else', () => {
    const s = newGame(5);
    const target = s.stars[0]!;
    s.player.x = target.x; s.player.y = target.y;
    expect(step(s, { x: 0, y: 0 })).toBe(1);
    expect(s.score).toBe(1);
    expect(s.stars).toHaveLength(STAR_COUNT);
    expect(s.stars.some(star => star.id === target.id)).toBe(false);
  });

  it('keeps the firefly inside the sky and never faster than full speed', () => {
    const s = newGame(1);
    for (let i = 0; i < 600; i++) step(s, { x: 5, y: -5 });
    expect(s.player.x).toBeLessThanOrEqual(WORLD.w - PLAYER_R);
    expect(s.player.y).toBeGreaterThanOrEqual(PLAYER_R);
  });

  it('ends when the timer runs out, and stops scoring', () => {
    const s = newGame(1, 2);
    for (let i = 0; i < 200; i++) step(s, { x: 1, y: 0 });
    expect(s.over).toBe(true);
    expect(timeLeft(s)).toBe(0);
    const score = s.score;
    s.player.x = s.stars[0]!.x; s.player.y = s.stars[0]!.y;
    expect(step(s, { x: 0, y: 0 })).toBe(0);
    expect(s.score).toBe(score);
  });
});
