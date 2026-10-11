// Life after the story: festivals, contest days (and resuming them after a reload), Wanda,
// meteor showers, birthdays, the glow streak, the full museum and the basement.
import { describe, expect, it } from 'vitest';
import { makeGame } from './helpers';
import { nextDay, setHour } from './story';
import type { Game } from '../src/sim/game';
import { buyFromMerchant, festivalHandIn, festivalNow, festivalState, festivalToday, merchantHere, merchantStock, meteorNight, pondFrozen, skateRings, birthdayToday, museumComplete } from '../src/sim/happenings';
import { setSeason, setSeasonsPaused } from '../src/sim/seasons';
import { give, countItem } from '../src/sim/inventory';
import { contestOpen, startContest, updateContest } from '../src/sim/challenges';
import { agents, activityOf, syncAgents } from '../src/sim/agents';
import { giveGift } from '../src/sim/villagers';
import { canOrderUpgrade, homeData, homeFixtures, orderUpgrade, placeFromPockets, payLoan } from '../src/sim/housing';
import { changeFloor, enterInterior, interiorRT } from '../src/sim/interior';
import { donateSome } from './story';
import { homeDecorPoints, islandStars } from '../src/sim/rating';
import { SafeStorage, SaveManager } from '../src/sim/save';
import { createGame } from '../src/sim/systems';
import { BUGS, FISH, FOSSILS } from '../src/data/registry';
import { BIRTHDAYS } from '../src/data/festivals';
import { VILLAGERS } from '../src/data/villagers';
import { Ground } from '../src/world/types';
import { money } from '../src/sim/inventory';
import { pitchTent } from '../src/sim/housing';

/** A game past Chapter 2, on a chosen season day. */
function laterGame(seed: number, season: 'spring' | 'summer' | 'autumn' | 'winter', day: number): Game {
  const g = makeGame(seed);
  g.state.quests.chapter = 3;
  setSeason(g, season, day);
  setSeasonsPaused(g, true);
  return g;
}

function saveLoad(g: Game): Game {
  const mgr = new SaveManager(new SafeStorage(null));
  mgr.write(0, g.state);
  const r = mgr.read(0);
  if (!r.ok) throw new Error(r.error);
  return createGame(r.state);
}

describe('festivals', () => {
  it('only happen after Chapter 2, never during the finale', () => {
    const g = makeGame(601);
    setSeason(g, 'spring', 5);
    expect(festivalToday(g)).toBeNull();
    g.state.quests.chapter = 3;
    expect(festivalToday(g)?.id).toBe('flowerFair');
    g.state.quests.active.m5_finale = { startedDay: 1, counts: [0] };
    expect(festivalToday(g)).toBeNull();
  });

  it('Flower Fair: three different flower colors', () => {
    const g = laterGame(602, 'spring', 5);
    setHour(g, 8);
    expect(festivalNow(g)).toBeNull();
    setHour(g, 11);
    expect(festivalNow(g)?.name).toBe('Spring Flower Fair');
    give(g, 'flower_bell_red', 2);
    give(g, 'flower_sun_red', 1);
    expect(festivalHandIn(g)).toBe(1); // only one red counts
    give(g, 'flower_moon_white', 1);
    give(g, 'flower_star_yellow', 1);
    const lumens = g.state.player.lumens;
    expect(festivalHandIn(g)).toBe(2);
    expect(festivalState(g)!.done).toBe(true);
    expect(countItem(g, 'cloth_party_hat')).toBe(1);
    expect(g.state.player.lumens).toBe(lumens + 300);
    expect(festivalHandIn(g)).toBe(0);
  });

  it('Star Night: falling stars land near the plaza in the evening', () => {
    const g = laterGame(603, 'summer', 5);
    setHour(g, 20);
    for (let k = 0; k < 40; k++) g.update(0.5, null);
    const stars = Object.values(g.state.world.objects).filter((o) => o.item === 'falling_star');
    expect(stars.length).toBeGreaterThan(0);
    give(g, 'falling_star', 5);
    festivalHandIn(g);
    expect(festivalState(g)!.done).toBe(true);
    expect(countItem(g, 'cloth_starlight_dress')).toBe(1);
  });

  it('Harvest Feast: 3 fruit and 2 fish', () => {
    const g = laterGame(604, 'autumn', 5);
    setHour(g, 12);
    give(g, 'fruit_blushpear', 5);
    expect(festivalHandIn(g)).toBe(3);
    give(g, FISH[0]!.id, 2);
    festivalHandIn(g);
    expect(festivalState(g)!.done).toBe(true);
    expect(countItem(g, 'fruit_blushpear')).toBe(2);
  });

  it('Lantern Skate: the pond freezes, you skate through 5 rings, and it melts safely afterwards', () => {
    const g = laterGame(605, 'winter', 5);
    setHour(g, 13);
    g.update(0.6, null);
    expect(pondFrozen(g)).toBe(true);
    const pondTile = [...Array(g.world.size * g.world.size).keys()].find((i) => g.world.ground(i) === Ground.Pond)!;
    expect(g.world.isWater(pondTile)).toBe(false);
    const rings = skateRings(g);
    expect(rings).toHaveLength(5);
    for (const r of rings) {
      g.state.player.x = r.x;
      g.state.player.z = r.z;
      g.update(0.6, null);
    }
    expect(festivalState(g)!.done).toBe(true);
    expect(countItem(g, 'cloth_lantern_crown')).toBe(1);
    // standing on the ice when the festival ends: you're moved back onto land
    setHour(g, 22.2);
    g.update(0.6, null);
    expect(pondFrozen(g)).toBe(false);
    expect(g.world.isWater(g.world.idx(Math.floor(g.state.player.x), Math.floor(g.state.player.z)))).toBe(false);
  });

  it('everyone gathers in the plaza, and the host waits by the Great Lantern', () => {
    const g = laterGame(606, 'autumn', 5);
    g.state.villagers.tansy = { movedIn: true, homeId: 0, friendship: 0, talkedDay: 0, giftDay: 0, giftsToday: 0, rewardsGiven: 0, metDay: 1 };
    expect(activityOf('rusk', 12, g)).toBe('plaza');
    expect(activityOf('rusk', 23, g)).toBe('home');
  });
});

describe('contests', () => {
  it('come back on their own day each season after the story mission', () => {
    const g = laterGame(610, 'spring', 2);
    g.state.quests.done.push('m4_tourney', 'm4_bugoff');
    expect(contestOpen(g, 'tournament')).toBe(false);
    setSeason(g, 'spring', 3);
    expect(contestOpen(g, 'tournament')).toBe(true);
    expect(contestOpen(g, 'bugoff')).toBe(false);
    setSeason(g, 'spring', 6);
    expect(contestOpen(g, 'bugoff')).toBe(true);
  });

  it('a contest in progress survives saving and loading', () => {
    const g = laterGame(611, 'spring', 3);
    g.state.quests.done.push('m4_tourney');
    expect(startContest(g, 'tournament')).toBe(true);
    updateContest(g, 40);
    g.state.events.active!.score = 150;
    const g2 = saveLoad(g);
    const a = g2.state.events.active!;
    expect(a.kind).toBe('tournament');
    expect(a.score).toBe(150);
    expect(a.timeLeft).toBeCloseTo(140, 3);
    updateContest(g2, 200);
    expect(g2.state.events.active).toBeNull();
    expect(g2.state.events.medals.tournament).toBe(1);
  });
});

describe('Wanda, meteors and birthdays', () => {
  it('Wanda visits every 6 days with rare stock', () => {
    const g = laterGame(620, 'spring', 1);
    const days: number[] = [];
    for (let d = 1; d <= 30; d++) {
      g.state.clock.day = d;
      setHour(g, 10);
      if (merchantHere(g)) days.push(d);
    }
    expect(days).toEqual([9, 15, 21, 27]);
    g.state.clock.day = 9;
    const stock = merchantStock(g);
    expect(stock).toHaveLength(4);
    syncAgents(g);
    expect(agents(g).get('wanda')?.visible).toBe(true);
    money(g, 100000);
    const rare = stock.find((e) => e.limited)!;
    expect(buyFromMerchant(g, rare)).toBe(true);
    expect(buyFromMerchant(g, rare)).toBe(false);
  });

  it('a meteor night leaves stardust on the beach, which teaches a recipe', () => {
    const g = laterGame(621, 'summer', 1);
    let day = 2;
    while (!meteorNight(g, day - 1) && day < 200) day++;
    expect(day).toBeLessThan(200);
    g.state.clock.day = day - 1;
    nextDay(g);
    const dust = Object.values(g.state.world.objects).filter((o) => o.item === 'stardust');
    expect(dust.length).toBeGreaterThan(0);
    give(g, 'stardust', 1, 'pickup');
    expect(g.state.recipes).toContain('r_furn_stardust_lamp');
  });

  it("birthdays: they stay home for their party and gifts count double", () => {
    const g = makeGame(622);
    const [si, d] = BIRTHDAYS.tansy!;
    for (const v of VILLAGERS) g.state.villagers[v.id] = { movedIn: true, homeId: 0, friendship: 0, talkedDay: 0, giftDay: 0, giftsToday: 0, rewardsGiven: 0, metDay: 1 };
    setSeason(g, ['spring', 'summer', 'autumn', 'winter'][si] as 'spring', d);
    expect(birthdayToday(g)).toBe('tansy');
    expect(activityOf('tansy', 12, g)).toBe('home');
    give(g, 'fruit_blushpear');
    giveGift(g, 'tansy', g.state.player.inv.findIndex((s) => s?.id === 'fruit_blushpear'));
    const birthdayGain = g.state.villagers.tansy!.friendship;
    setSeason(g, ['spring', 'summer', 'autumn', 'winter'][si] as 'spring', d === 7 ? 6 : d + 1);
    nextDay(g);
    const before = g.state.villagers.tansy!.friendship;
    give(g, 'fruit_blushpear');
    giveGift(g, 'tansy', g.state.player.inv.findIndex((s) => s?.id === 'fruit_blushpear'));
    expect(birthdayGain).toBe(2 * (g.state.villagers.tansy!.friendship - before));
  });
});

describe('long-term goals', () => {
  it('a full museum earns the Golden Lantern Statue', () => {
    const g = makeGame(630);
    expect(museumComplete(g)).toBe(false);
    donateSome(g, [...FISH, ...BUGS, ...FOSSILS].map((c) => c.id));
    expect(museumComplete(g)).toBe(true);
    expect(countItem(g, 'furn_golden_lantern_statue') + g.state.home.storage.filter((s) => s.id === 'furn_golden_lantern_statue').length).toBe(1);
    expect(g.state.flags.museumComplete).toBe(1);
  });

  it('keeping five lanterns pays off as a glow streak', () => {
    const g = makeGame(631);
    for (const v of VILLAGERS) g.state.villagers[v.id] = { movedIn: true, homeId: 0, friendship: 100, talkedDay: 0, giftDay: 0, giftsToday: 0, rewardsGiven: 0, metDay: 1 };
    g.state.museum.donated = [...FISH, ...BUGS, ...FOSSILS].filter((c) => !('seasons' in c && c.seasons)).map((c) => c.id);
    for (let k = 0; k < 10; k++) g.state.world.objects[100 + k] = { k: 'deco', item: 'furn_beacon_statue', r: 0, q: 1 };
    expect(islandStars(g)).toBe(5);
    const lumens = g.state.player.lumens;
    for (let d = 0; d < 3; d++) nextDay(g);
    expect(g.state.flags.glowStreak).toBeGreaterThanOrEqual(3);
    expect(g.state.player.lumens).toBeGreaterThanOrEqual(lumens + 500);
  });

  it('after the story, the home can grow a basement to decorate — and it survives saving', () => {
    const g = makeGame(632);
    pitchTent(g);
    g.state.home.level = 2;
    expect(canOrderUpgrade(g).ok).toBe(false);
    g.state.quests.finished = true;
    expect(canOrderUpgrade(g).ok).toBe(true);
    // a piece of furniture where the stairs will go is moved to storage
    give(g, 'furn_seaside_crate');
    placeFromPockets(g, g.state.player.inv.findIndex((s) => s?.id === 'furn_seaside_crate'), 9, 7, 0);
    expect(orderUpgrade(g)).toBe(true);
    nextDay(g);
    expect(g.state.home.level).toBe(3);
    expect(homeFixtures(g, 'home').some((f) => f.id === 'stairsDown')).toBe(true);
    expect(g.state.home.furniture).toHaveLength(0);
    expect(g.state.home.storage.some((s) => s.id === 'furn_seaside_crate')).toBe(true);
    money(g, 100000);
    payLoan(g, 100000);
    // downstairs
    enterInterior(g, 'home');
    changeFloor(g, 'basement');
    expect(g.state.player.location).toBe('basement');
    give(g, 'furn_plank_table');
    expect(placeFromPockets(g, g.state.player.inv.findIndex((s) => s?.id === 'furn_plank_table'), 4, 4, 0)).toBe(true);
    expect(homeData(g, 'basement').furniture.map((f) => f.id)).toEqual(['furn_plank_table']);
    expect(g.state.home.furniture).toHaveLength(0);
    expect(homeDecorPoints(g)).toBeGreaterThan(0);
    const g2 = saveLoad(g);
    expect(g2.state.player.location).toBe('basement');
    expect(interiorRT(g2)!.room.kind).toBe('basement');
    changeFloor(g2, 'home');
    expect(g2.state.player.location).toBe('home');
    expect(interiorRT(g2)!.ret).toEqual(interiorRT(g)!.ret);
  });
});
