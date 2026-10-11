// Life after the story: play the whole story, then a full 28-day year — all four seasons, every
// festival, both contests coming back on their days, Wanda's visits, birthdays, a meteor night,
// and the basement — and check the save still loads and fits its budget at the end.
import { describe, expect, it } from 'vitest';
import { makeGame } from './helpers';
import { playFullStory } from './fullstory';
import { nextDay, setHour } from './story';
import type { Game } from '../src/sim/game';
import { BUGS, FISH, item } from '../src/data/registry';
import { give, money } from '../src/sim/inventory';
import { SEASONS, SEASON_DAYS } from '../src/sim/seasons';
import { birthdayToday, buyFromMerchant, festivalHandIn, festivalState, festivalToday, merchantHere, merchantStock, meteorNight, pondFrozen, skateRings } from '../src/sim/happenings';
import { contestOpen, startContest, updateContest } from '../src/sim/challenges';
import { canOrderUpgrade, homeData, orderUpgrade, payLoan, placeFromPockets } from '../src/sim/housing';
import { changeFloor, enterInterior, exitInterior } from '../src/sim/interior';
import { SLOT_BUDGET, SafeStorage, SaveManager, measureSave } from '../src/sim/save';
import { createGame } from '../src/sim/systems';

const YEAR = SEASONS.length * SEASON_DAYS;

/** Do today's festival the way a player would, inside its hours. */
function playFestival(g: Game): string {
  const f = festivalToday(g)!;
  setHour(g, f.hours[0] + 1);
  if (f.id === 'flowerFair') {
    for (const id of ['flower_bell_red', 'flower_moon_white', 'flower_star_yellow']) give(g, id);
    festivalHandIn(g);
  } else if (f.id === 'starNight') {
    // stars land near the plaza through the evening; pick up five
    for (let k = 0; k < 20; k++) g.update(0.5, null);
    expect(Object.values(g.state.world.objects).some((o) => o.item === 'falling_star')).toBe(true);
    give(g, 'falling_star', 5);
    festivalHandIn(g);
  } else if (f.id === 'harvestFeast') {
    give(g, 'fruit_blushpear', 3);
    give(g, FISH[0]!.id, 2);
    festivalHandIn(g);
  } else {
    g.update(0.6, null);
    expect(pondFrozen(g)).toBe(true);
    for (const r of skateRings(g)) {
      g.state.player.x = r.x;
      g.state.player.z = r.z;
      g.update(0.6, null);
    }
    setHour(g, f.hours[1] + 0.2);
    g.update(0.6, null);
    expect(pondFrozen(g)).toBe(false);
    expect(g.world.isWater(g.world.idx(Math.floor(g.state.player.x), Math.floor(g.state.player.z)))).toBe(false);
  }
  expect(festivalState(g)!.done, f.id).toBe(true);
  return f.id;
}

/** Enter a contest on its day and catch a few things before the whistle. */
function playContest(g: Game, kind: 'tournament' | 'bugoff'): number {
  setHour(g, 10);
  expect(startContest(g, kind)).toBe(true);
  const pool = kind === 'tournament' ? FISH : BUGS;
  for (const c of pool.slice(0, 6)) g.emit(kind === 'tournament' ? 'fishCaught' : 'bugCaught', { id: c.id, size: 3, rarity: 2 });
  updateContest(g, 999);
  expect(g.state.events.active).toBeNull();
  expect(contestOpen(g, kind)).toBe(false); // once a day
  return g.state.events.medals[kind] ?? 0;
}

describe('a year after the story', () => {
  it('every season, festival, contest day, Wanda, birthdays, a meteor night and the basement', { timeout: 240000 }, () => {
    const g = makeGame(2026);
    playFullStory(g);
    expect(g.state.quests.finished).toBe(true);
    if (g.state.player.location !== 'island') exitInterior(g);
    // sell off the story's leftovers so festival hand-ins fit in the pockets
    g.state.player.inv = g.state.player.inv.map((s) => (s && item(s.id).cat === 'tool' ? s : null));

    const startSeason = g.state.season.index;
    const seen = { seasons: new Set<string>(), festivals: [] as string[], medals: [] as number[], wanda: 0, meteors: 0, stardust: 0, birthdays: new Set<string>() };

    for (let d = 0; d < YEAR; d++) {
      seen.seasons.add(SEASONS[g.state.season.index]!);
      // a little ordinary play at a few times of day, so every update hook runs
      for (const h of [8, 15]) {
        setHour(g, h);
        for (let k = 0; k < 4; k++) g.update(0.5, null);
      }
      if (festivalToday(g)) seen.festivals.push(playFestival(g));
      if (contestOpen(g, 'tournament')) seen.medals.push(playContest(g, 'tournament'));
      if (contestOpen(g, 'bugoff')) seen.medals.push(playContest(g, 'bugoff'));
      setHour(g, 10);
      if (merchantHere(g)) {
        money(g, 200000);
        const stock = merchantStock(g);
        expect(stock.length).toBeGreaterThan(0);
        expect(buyFromMerchant(g, stock[0]!)).toBe(true);
        seen.wanda++;
      }
      const bday = birthdayToday(g);
      if (bday) seen.birthdays.add(bday);
      // the basement: pay off the loan, order the upgrade, build overnight
      if (g.state.home.level < 3) {
        money(g, 200000);
        payLoan(g, g.state.home.loan);
        if (canOrderUpgrade(g).ok) orderUpgrade(g);
      }
      const meteor = meteorNight(g);
      if (meteor) seen.meteors++;
      nextDay(g);
      const dust = Object.values(g.state.world.objects).filter((o) => o.item === 'stardust').length;
      if (meteor) {
        expect(dust).toBeGreaterThan(0);
        seen.stardust += dust;
      }
    }

    // a whole year: back to the season we started in, with all four on the way
    expect(seen.seasons.size).toBe(4);
    expect(g.state.season.index).toBe(startSeason);
    expect([...seen.festivals].sort()).toEqual(['flowerFair', 'harvestFeast', 'lanternSkate', 'starNight']);
    expect(g.state.stats.festivals).toBe(4);
    expect(seen.medals.length).toBe(8); // both contests, once a season
    expect(Math.max(...seen.medals)).toBeGreaterThan(0);
    expect(seen.wanda).toBeGreaterThanOrEqual(4);
    expect(seen.birthdays.size).toBeGreaterThanOrEqual(3);
    expect(seen.meteors).toBeGreaterThan(0);
    expect(seen.stardust).toBeGreaterThan(0);

    // the basement is built: go down, decorate, come back up
    expect(g.state.home.level).toBe(3);
    enterInterior(g, 'home');
    changeFloor(g, 'basement');
    expect(g.state.player.location).toBe('basement');
    give(g, 'furn_plank_table');
    expect(placeFromPockets(g, g.state.player.inv.findIndex((s) => s?.id === 'furn_plank_table'), 4, 4, 0)).toBe(true);
    expect(homeData(g, 'basement').furniture.map((f) => f.id)).toContain('furn_plank_table');
    changeFloor(g, 'home');
    exitInterior(g);

    // the story stays finished and the save still loads and fits
    expect(g.state.quests.finished).toBe(true);
    const size = measureSave(g.state);
    expect(size).toBeLessThan(SLOT_BUDGET);
    const mgr = new SaveManager(new SafeStorage(null));
    expect(mgr.writeResult(0, g.state)).toBe('memory'); // no localStorage in tests
    const r = mgr.read(0);
    if (!r.ok) throw new Error(r.error);
    const g2 = createGame(r.state);
    expect(g2.state.stats.festivals).toBe(4);
    expect(g2.state.home.level).toBe(3);
    expect(homeData(g2, 'basement').furniture).toHaveLength(1);
    nextDay(g2);
    expect(g2.state.quests.finished).toBe(true);
  });
});
