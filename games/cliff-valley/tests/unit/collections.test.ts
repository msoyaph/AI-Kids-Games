import { describe, expect, it } from 'vitest';
import { Sim } from '../../src/sim';
import { ACHIEVEMENTS } from '../../src/data/achievements';
import { MUSEUM_LIST, checkAchievements, donateToMuseum, farmRating } from '../../src/sim/collections';
import { tryItem } from '../../src/data/items';

const mk = () => Sim.newGame({ name: 'Pip', farm: 'Daisy', pet: 'dog', petName: 'Rex', seed: 61 });

describe('collections', () => {
  it('has 40+ achievements with unique ids and real icons', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(40);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });

  it('achievements unlock from state', () => {
    const sim = mk();
    sim.state.stats.harvested = 1;
    const got = checkAchievements(sim);
    expect(got).toContain('firstHarvest');
    expect(checkAchievements(sim)).not.toContain('firstHarvest');
  });

  it('museum takes each item once and rewards milestones', () => {
    const sim = mk();
    expect(MUSEUM_LIST.length).toBeGreaterThan(30);
    for (const id of MUSEUM_LIST) expect(tryItem(id)).toBeDefined();
    for (let i = 0; i < 5; i++) sim.p.inv[10 + i] = { id: MUSEUM_LIST[i], n: 2, q: 0 };
    for (let i = 0; i < 4; i++) expect(donateToMuseum(sim, MUSEUM_LIST[i]).ok).toBe(true);
    expect(donateToMuseum(sim, MUSEUM_LIST[0]).ok).toBe(false);
    const r = donateToMuseum(sim, MUSEUM_LIST[4]);
    expect(r.reward).toBeTruthy();
  });

  it('farm rating grows from 1 star', () => {
    const sim = mk();
    expect(farmRating(sim).stars).toBe(1);
  });
});
