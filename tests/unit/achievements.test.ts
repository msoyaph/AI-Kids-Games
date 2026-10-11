import { describe, expect, it } from 'vitest';
import { AchievementTracker } from '../../src/app/achievements';
import { SaveStore } from '../../src/app/save';
import { ACHIEVEMENTS } from '../../src/data/achievements';
import { WORLD1 } from '../../src/data/maps/world1';
import { Game } from '../../src/sim/Game';

function setup(): { save: SaveStore; tracker: AchievementTracker; game: Game } {
  const save = new SaveStore(null);
  const tracker = new AchievementTracker(save);
  const game = new Game({ map: WORLD1[0]!, difficulty: 'normal', mode: 'campaign', startCoins: 100000 });
  return { save, tracker, game };
}

describe('achievements', () => {
  it('has 20+ unique badges', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(20);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });

  it('awards a win badge and "perfect" at the end of a flawless run', () => {
    const { tracker, game } = setup();
    const names = tracker.checkEnd(game, true, 'campaign');
    expect(names).toContain('Crystal Keeper');
    expect(names).toContain('Perfect Guard');
    expect(tracker.checkEnd(game, true, 'campaign')).toHaveLength(0); // only once
  });

  it('awards live badges during play (max power, builder)', () => {
    const { tracker, game } = setup();
    const t = game.build('arrow', 3, 3)!;
    game.upgrade(t);
    game.upgrade(t);
    game.upgrade(t);
    const got: string[] = [];
    tracker.onUnlock = (d) => got.push(d.id);
    tracker.tick(1, game, 'campaign');
    expect(got).toContain('max_power');
    expect(got).not.toContain('builder');
  });

  it('"only water" requires every tower to be a water tower', () => {
    const a = setup();
    a.game.chooseElement('water');
    a.game.build('bubble', 3, 3);
    expect(a.tracker.checkEnd(a.game, true, 'campaign')).toContain('Just Add Water');
    const b = setup();
    b.game.chooseElement('water');
    b.game.build('bubble', 3, 3);
    b.game.build('arrow', 4, 3);
    expect(b.tracker.checkEnd(b.game, true, 'campaign')).not.toContain('Just Add Water');
  });

  it('losing never gives win badges', () => {
    const { tracker, game } = setup();
    expect(tracker.checkEnd(game, false, 'campaign')).not.toContain('Crystal Keeper');
  });
});
