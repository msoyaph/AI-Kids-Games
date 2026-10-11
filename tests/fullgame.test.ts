import { describe, expect, it } from 'vitest';
import { makeGame } from './helpers';
import { playFullStory } from './fullstory';

describe('full game playthrough', () => {
  it('reaches the festival ending from a new game', { timeout: 120000 }, () => {
    const g = makeGame(2026);
    playFullStory(g);
    expect(g.state.quests.finished).toBe(true);
  });
});
