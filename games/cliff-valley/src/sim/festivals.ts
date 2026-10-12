/** Festivals: schedule overrides, shop closures, festival lines, and activity results. */
import { DIALOGUE } from '../data/dialogue';
import { FESTIVALS, festivalOn, type FestivalDef } from '../data/festivals';
import { tryItem } from '../data/items';
import { VILLAGERS, type SchedEntry } from '../data/villagers';
import { sellPrice } from './economy';
import { lineHooks } from './friendship';
import { scheduleOverrides } from './npcs';
import { calendarHooks, type Sim } from './sim';
import { shopClosedHooks } from './shops';
import { yearOf } from './state';

calendarHooks.isFestival = (day) => !!festivalOn(day);

export function festivalToday(sim: Sim): FestivalDef | null {
  return festivalOn(sim.state.day);
}

export function festivalKey(sim: Sim, f: FestivalDef): string {
  return `${f.id}.${yearOf(sim.state.day)}`;
}

/** Festival is on right now (and you haven't left it). */
export function festivalOpen(sim: Sim): FestivalDef | null {
  const f = festivalToday(sim);
  if (!f) return null;
  const st = sim.state;
  if (st.min < f.open || st.min >= f.close) return null;
  if (st.flags[`left.${festivalKey(sim, f)}`]) return null;
  return f;
}

export function activityDone(sim: Sim, f: FestivalDef): boolean {
  return sim.state.story.festivalsDone.includes(festivalKey(sim, f));
}

/** Spots around the plaza for each villager during festivals. */
const SPOTS: Record<string, [number, number]> = {
  bram: [35, 21], pippa: [29, 22], grit: [43, 23], hollis: [28, 27], goldie: [31, 30], kai: [36, 31],
  juno: [40, 30], sunny: [44, 27], ottilie: [27, 24], toby: [42, 20], lumi: [38, 24], basil: [32, 24], nana: [33, 28], wren: [44, 31],
};

scheduleOverrides.push((sim, v) => {
  const f = festivalToday(sim);
  if (!f) return null;
  const spot = SPOTS[v.id] ?? [35, 25];
  const home = v.schedule.default[0];
  const e: SchedEntry[] = [
    [6 * 60, home[1], home[2], home[3]],
    [f.open - 60, 'town', spot],
    [f.close + 30, home[1], home[2], home[3]],
  ];
  return e;
});

shopClosedHooks.push((sim, shop) => {
  const f = festivalToday(sim);
  if (!f) return null;
  if (sim.state.min >= f.open - 60 && sim.state.min < f.close + 30) return `Everyone is at the ${f.name} today! Shops reopen tomorrow.`;
  void shop;
  return null;
});

lineHooks.push((sim, v) => {
  const f = festivalToday(sim);
  if (!f || sim.p.loc !== 'town' || sim.state.min < f.open || sim.state.min >= f.close) return null;
  return DIALOGUE[v.id]?.festival[f.id] ?? null;
});

/** Record an activity result and give prizes. */
export function finishActivity(sim: Sim, f: FestivalDef, place: number): string {
  const key = festivalKey(sim, f);
  if (!sim.state.story.festivalsDone.includes(key)) sim.state.story.festivalsDone.push(key);
  sim.state.flags[`fest.${f.id}.place`] = Math.min(place, sim.state.flags[`fest.${f.id}.place`] ?? 99);
  const prizes: Record<FestivalDef['id'], [string, number][]> = {
    sprout: [['speedyGrow', 10], ['seed.strawberry', 10]],
    berry: [['seed.blueberry', 10], ['sprinkler1', 2]],
    harvest: [['deluxeFertilizer', 10], ['goldBar', 2]],
    starlight: [['starLight', 1], ['heartLantern', 1]],
  };
  const coins = place === 1 ? 800 : place === 2 ? 400 : 200;
  sim.p.coins += coins;
  const got: string[] = [`${coins} coins`];
  if (place === 1) for (const [id, n] of prizes[f.id]) {
    if (!tryItem(id)) continue;
    sim.give(id, n);
    got.push(`${n} ${tryItem(id)!.name}`);
  }
  return got.join(', ');
}

/** Harvest Show judging: your entry vs. villagers'. */
export function judgeEntry(sim: Sim, id: string, q: number): { score: number; place: number; rivals: [string, number][] } {
  const year = yearOf(sim.state.day);
  const score = Math.round(sellPrice(null, id, q) * (1 + q * 0.3));
  const rivals: [string, number][] = [
    ['Goldie (Buttercup\'s cheese)', 300 + year * 40],
    ['Pippa (tulip bouquet)', 160 + year * 30],
    ['Basil (giant mushroom)', 220 + year * 30],
    ['Nana (apple pie)', 260 + year * 35],
  ];
  const better = rivals.filter(([, s]) => s > score).length;
  return { score, place: better + 1, rivals };
}

/** Starlight Night secret friend (seeded per year). */
export function secretFriend(sim: Sim): string {
  const list = VILLAGERS.map((v) => v.id);
  return list[(sim.state.seed + yearOf(sim.state.day) * 7) % list.length];
}

export { FESTIVALS };
