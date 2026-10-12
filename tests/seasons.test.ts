// Seasons: the calendar, pausing, migration, seasonal creatures / forage / recipes / seeds,
// and the whole story played start to finish in every season.
import { describe, expect, it } from 'vitest';
import { faceTile, makeGame } from './helpers';
import { nextDay } from './story';
import { playFullStory } from './fullstory';
import { SEASONS, SEASON_DAYS, dailySeason, learnSeasonRecipes, seasonOf, setSeason, setSeasonsPaused } from '../src/sim/seasons';
import { availableFish } from '../src/sim/fishing';
import { availableBugs } from '../src/sim/bugs';
import { dailyStock } from '../src/sim/economy';
import { ratingBreakdown } from '../src/sim/rating';
import { migrate } from '../src/sim/save';
import { act } from './helpers';
import { BUGS, FISH, RECIPES, item } from '../src/data/registry';
import type { BugHabitat, FishWhere, Season } from '../src/data/types';
import type { WeatherT } from '../src/sim/state';
import type { Game } from '../src/sim/game';

const WATERS: FishWhere[] = ['river', 'pond', 'sea', 'mouth'];
const HABITATS: BugHabitat[] = ['flowers', 'air', 'trees', 'ground', 'rocks', 'beach', 'water', 'fruit'];
const WEATHERS: WeatherT[] = ['sunny', 'cloudy', 'rain', 'rainbow'];

function lock(g: Game, season: Season): void {
  setSeason(g, season);
  setSeasonsPaused(g, true);
}

describe('the calendar', () => {
  it('starts in spring and turns every 7 days, all the way round the year', () => {
    const g = makeGame(301);
    expect(seasonOf(g)).toBe('spring');
    expect(g.state.season.day).toBe(1);
    const changes: string[] = [];
    g.bus.on('seasonChanged', (e) => changes.push(e.season));
    for (let d = 0; d < SEASON_DAYS; d++) nextDay(g);
    expect(seasonOf(g)).toBe('summer');
    expect(g.state.season.day).toBe(1);
    for (let d = 0; d < SEASON_DAYS * 3; d++) nextDay(g);
    expect(seasonOf(g)).toBe('spring');
    expect(changes).toEqual(['summer', 'autumn', 'winter', 'spring']);
    // the hook is idempotent within a day
    const before = { ...g.state.season };
    dailySeason(g);
    expect(g.state.season).toEqual(before);
  });

  it('can be paused per island', () => {
    const g = makeGame(302);
    nextDay(g);
    setSeasonsPaused(g, true);
    for (let d = 0; d < 20; d++) nextDay(g);
    expect(seasonOf(g)).toBe('spring');
    expect(g.state.season.day).toBe(2);
    setSeasonsPaused(g, false);
    for (let d = 0; d < 6; d++) nextDay(g);
    expect(seasonOf(g)).toBe('summer');
  });

  it('older islands start in the season their calendar is in', () => {
    const g = makeGame(303);
    const v2 = JSON.parse(JSON.stringify(g.state));
    delete v2.season;
    v2.version = 2;
    v2.clock.day = 20;
    const st = migrate(v2);
    expect(st.season).toEqual({ index: 2, day: 6, paused: false, lastDay: 20 });
  });
});

describe('seasonal creatures', () => {
  it('every season has plenty of all-year fish and bugs at every hour and in every weather', () => {
    const g = makeGame(310);
    for (const s of SEASONS) {
      lock(g, s);
      for (const w of WEATHERS)
        for (let h = 0; h < 24; h++) {
          g.state.weather.today = w;
          g.state.clock.minute = h * 60 + 30;
          for (const where of WATERS) {
            const list = availableFish(g, where).filter((f) => f.rarity <= 2 && !f.seasons);
            expect(list.length, `${s} ${where} ${h}h ${w}`).toBeGreaterThanOrEqual(2);
          }
          const bugs = HABITATS.flatMap((hb) => availableBugs(g, hb)).filter((b) => b.rarity <= 2 && !b.seasons);
          expect(bugs.length, `${s} bugs ${h}h ${w}`).toBeGreaterThanOrEqual(2);
        }
    }
  });

  it('seasonal fish and bugs only show up in their season', () => {
    const seasonalFish = FISH.filter((f) => f.seasons);
    const seasonalBugs = BUGS.filter((b) => b.seasons);
    expect(seasonalFish).toHaveLength(8);
    expect(seasonalBugs).toHaveLength(8);
    const g = makeGame(311);
    g.state.weather.today = 'sunny';
    for (const s of SEASONS) {
      lock(g, s);
      const seenF = new Set<string>(), seenB = new Set<string>();
      for (let h = 0; h < 24; h++) {
        g.state.clock.minute = h * 60 + 30;
        for (const where of WATERS) for (const f of availableFish(g, where)) seenF.add(f.id);
        for (const hb of HABITATS) for (const b of availableBugs(g, hb)) seenB.add(b.id);
      }
      for (const f of seasonalFish) expect(seenF.has(f.id), `${f.id} in ${s}`).toBe(f.seasons!.includes(s));
      for (const b of seasonalBugs) expect(seenB.has(b.id), `${b.id} in ${s}`).toBe(b.seasons!.includes(s));
    }
  });

  it('the museum score is measured against the all-year collection, so new creatures never lower it', () => {
    const g = makeGame(312);
    const core = FISH.filter((f) => !f.seasons).length + BUGS.filter((b) => !b.seasons).length;
    g.state.museum.donated = [...FISH, ...BUGS].filter((c) => !c.seasons).map((c) => c.id).slice(0, core / 2);
    const half = ratingBreakdown(g).museum;
    g.state.museum.donated.push(...FISH.filter((f) => f.seasons).map((f) => f.id));
    expect(ratingBreakdown(g).museum).toBeGreaterThanOrEqual(half);
  });
});

describe('seasonal forage, flowers, seeds and recipes', () => {
  const groundItems = (g: Game) => Object.values(g.state.world.objects).filter((o) => o.k === 'item').map((o) => o.item!);

  it('each season leaves its own treasures on the ground', () => {
    const want: Record<Season, string[]> = { spring: ['blossom_petals'], summer: ['sea_glass'], autumn: ['maple_leaves', 'hearth_pumpkin'], winter: ['snow_crystal'] };
    const all = Object.values(want).flat();
    for (const s of SEASONS) {
      const g = makeGame(320);
      lock(g, s);
      nextDay(g);
      const items = groundItems(g);
      for (const id of all) expect(items.includes(id), `${id} in ${s}`).toBe(want[s].includes(id));
    }
  });

  it('wild seasonal flowers bloom in spring and winter, and fade afterwards', () => {
    const g = makeGame(321);
    const wild = () => Object.values(g.state.world.objects).filter((o) => o.k === 'flower' && o.tag === 'wild');
    nextDay(g);
    expect(wild().length).toBeGreaterThan(0);
    expect(wild().every((o) => Math.floor(o.v! / 16) === 6)).toBe(true);
    lock(g, 'summer');
    nextDay(g);
    expect(wild()).toHaveLength(0);
    lock(g, 'winter');
    nextDay(g);
    expect(wild().every((o) => Math.floor(o.v! / 16) === 7)).toBe(true);
  });

  it('picking up a season\'s treasure teaches that season\'s recipes', () => {
    const g = makeGame(322);
    expect(learnSeasonRecipes(g, 'branch')).toBe(0);
    const spring = RECIPES.filter((r) => r.season === 'spring').map((r) => r.id);
    expect(spring.length).toBeGreaterThanOrEqual(3);
    expect(learnSeasonRecipes(g, 'blossom_petals')).toBe(spring.length);
    for (const r of spring) expect(g.state.recipes).toContain(r);
    expect(learnSeasonRecipes(g, 'blossom_petals')).toBe(0);
    expect(RECIPES.filter((r) => r.unlock === 'season')).toHaveLength(11);
  });

  it('seasonal seeds are only sold in season', () => {
    const g = makeGame(323);
    for (const s of SEASONS) {
      lock(g, s);
      const seeds = dailyStock(g, 'shop').map((e) => item(e.id)).filter((d) => d.cat === 'seed');
      for (const d of seeds) if (d.seasons) expect(d.seasons).toContain(s);
      expect(seeds.some((d) => d.seasons)).toBe(s === 'spring' || s === 'winter');
    }
  });

  it('shaking a pine tree in winter can drop snowberries', () => {
    const g = makeGame(324);
    lock(g, 'winter');
    const N = g.world.size;
    let berries = 0;
    for (let i = 0; i < N * N && berries === 0; i++) {
      if (g.world.obj(i)?.k !== 'pine' || !faceTile(g, i)) continue;
      g.state.player.equipped = -1;
      act(g);
      berries = Object.values(g.state.world.objects).filter((o) => o.k === 'item' && o.item === 'snowberry').length;
    }
    expect(berries).toBeGreaterThan(0);
  });
});

describe('the story in every season', () => {
  for (const s of SEASONS)
    it(`can be finished with the island stuck in ${s}`, { timeout: 120000 }, () => {
      const g = makeGame(2026);
      lock(g, s);
      playFullStory(g);
      expect(g.state.quests.finished).toBe(true);
      expect(seasonOf(g)).toBe(s);
    });
});
