// Pacing simulation: estimates real-time minutes per chapter for a "typical" player.
// Reads the actual mission data + economy tables, assigns time costs per objective,
// and simulates in-game days (15 real minutes each) including next-day waits.
//
//   npm run pacing
import { MISSIONS } from '../src/data/missions';
import type { MissionDef, Objective } from '../src/data/questTypes';
import { CHAPTERS } from '../src/data/missions';
import { FISH, BUGS, RECIPE_BY_ID } from '../src/data/registry';
import { RARITY_WEIGHT } from '../src/sim/fishing';
import { ROCK_TABLE } from '../src/sim/foraging';
import { BUILD_COSTS } from '../src/sim/build';
import { REAL_SECONDS_PER_DAY } from '../src/sim/clock';

// ---------------------------------------------------------------- player model (seconds)
const M = {
  talk: 30, // walk over + dialogue
  fish: 50, // find a shadow, cast, wait, reel
  bug: 45,
  dig: 25,
  craft: 15,
  plant: 10,
  plot: 100,
  buildPlace: 120,
  explore: 150,
  contest: 240,
  breedDays: 3,
  timberEach: 9,
  branchEach: 8,
  fiberEach: 6,
  shellEach: 20,
  fruitEach: 10,
  /** extra time per new museum specimen (finding species you don't have yet) */
  newSpecimen: 1.6,
  /** fraction of extra free play (decorating, chatting, shopping, wandering) */
  freePlay: 0.35,
  /** how much of a day a player keeps playing after finishing their tasks before sleeping */
  idleBeforeSleep: 0.45,
  /** rating effort (seconds) to go from 3 to 5 lanterns: decorating, flowers, donating, weeding */
  ratingPush: 30 * 60,
  /** share of real time spent in menus/dialogue, where the in-game clock is paused */
  pausedShare: 0.22,
  /** first-chapter familiarisation: exploring the island, reading tips, trying things */
  firstChapterExplore: 9 * 60,
};

const avg = <T>(list: T[], v: (t: T) => number, w: (t: T) => number) => {
  let s = 0, n = 0;
  for (const t of list) {
    s += v(t) * w(t);
    n += w(t);
  }
  return s / n;
};
const avgFish = avg(FISH.filter((f) => f.weather === 'any'), (f) => f.price, (f) => RARITY_WEIGHT[f.rarity]!);
const avgBug = avg(BUGS.filter((b) => b.weather === 'any'), (b) => b.price, (b) => RARITY_WEIGHT[b.rarity]!);
/** Glints per real minute when deliberately earning money */
const incomePerMin = ((avgFish / M.fish + avgBug / M.bug) / 2) * 60 * 0.9;

const rockShare = Object.fromEntries(ROCK_TABLE.map(([id, w]) => [id, w / ROCK_TABLE.reduce((a, [, x]) => a + x, 0)]));
/** seconds per rock hit incl. walking between rocks */
const ROCK_HIT = 14;
function gatherSeconds(id: string, qty: number): number {
  switch (id) {
    case 'timber':
      return qty * M.timberEach;
    case 'branch':
      return qty * M.branchEach;
    case 'fiber':
      return qty * M.fiberEach;
    case 'stone':
      return (qty * ROCK_HIT) / (rockShare.stone! + 0.3); // loose stones + buried
    case 'iron':
      return (qty * ROCK_HIT) / (rockShare.iron! + 0.05);
    case 'clay':
      return (qty * ROCK_HIT) / (rockShare.clay! + 0.05);
    case 'glowstone':
      return (qty * ROCK_HIT) / (rockShare.glowstone! * 2 + 0.03);
    case 'lens':
    case 'pie':
      return 0;
    default:
      if (id.startsWith('shell_')) return qty * M.shellEach;
      if (id.startsWith('fruit_') || id === '$nativeFruit') return qty * M.fruitEach + 20;
      if (id.startsWith('furn_') || id === 'lantern_kit') {
        const r = RECIPE_BY_ID[`r_${id}`];
        if (!r) return 60 * qty;
        const crafts = Math.ceil(qty / (r.qty ?? 1));
        return crafts * (M.craft + r.ingredients.reduce((a, i) => a + gatherSeconds(i.id, i.qty), 0));
      }
      if (id.startsWith('seed_') || id.startsWith('flower_')) return qty * 25;
      return 30 * qty;
  }
}

interface Est {
  seconds: number;
  /** days that must pass (overnight construction, move-ins, growth) */
  waitDays: number;
  glints: number;
}

let donatedSoFar = 0;
function objectiveCost(o: Objective, m: MissionDef): Est {
  const e: Est = { seconds: 0, waitDays: 0, glints: 0 };
  switch (o.kind) {
    case 'talk':
      e.seconds = M.talk;
      break;
    case 'deliver': {
      const id = o.item ?? (o.cat === 'foreignFruit' ? 'fruit_import' : o.cat === 'fossil' ? 'fossil' : 'x');
      if (o.cat === 'foreignFruit') {
        e.seconds = 60;
        e.glints = 400 * o.qty;
      } else if (o.cat === 'fossil') e.seconds = M.dig * 2 + 40;
      else e.seconds = gatherSeconds(id, o.qty);
      e.seconds += M.talk * 0.5;
      break;
    }
    case 'event':
      switch (o.event) {
        case 'fishCaught':
          e.seconds = o.count * M.fish;
          break;
        case 'bugCaught':
          e.seconds = o.count * M.bug;
          break;
        case 'crafted': {
          const r = RECIPE_BY_ID[`r_${o.filter?.item}`];
          e.seconds = M.craft + (r ? r.ingredients.reduce((a, i) => a + gatherSeconds(i.id, i.qty), 0) : 60);
          break;
        }
        case 'itemSold':
          e.seconds = (o.count / incomePerMin) * 60 * 0.6; // selling what you gathered anyway
          break;
        case 'woodChopped':
          e.seconds = o.count * M.timberEach;
          break;
        case 'donated':
          e.seconds = o.count * ((M.fish + M.bug) / 2) * M.newSpecimen;
          donatedSoFar += o.count;
          break;
        case 'slept':
          e.waitDays = 1;
          break;
        case 'planted':
          e.seconds = o.count * M.plant;
          break;
        case 'flowerBred':
          e.seconds = 4 * 60;
          e.waitDays = M.breedDays;
          break;
        case 'eventFinished':
          e.seconds = M.contest;
          break;
        case 'climbed':
          e.seconds = 40;
          break;
        case 'itemBought':
          e.seconds = 40;
          break;
        case 'location':
          e.seconds = 30;
          break;
        case 'fossilAssessed':
          e.seconds = M.dig + 30;
          break;
        default:
          e.seconds = 60;
      }
      break;
    case 'state':
      switch (o.fn) {
        case 'homeLevel':
          e.seconds = M.talk;
          e.waitDays = 1;
          break;
        case 'hasStruct':
        case 'residents':
          e.waitDays = 1;
          break;
        case 'plot':
          e.seconds = M.plot;
          break;
        case 'museum': {
          const need = Math.max(0, o.n - donatedSoFar);
          e.seconds = need * ((M.fish + M.bug) / 2) * M.newSpecimen;
          donatedSoFar = Math.max(donatedSoFar, o.n);
          break;
        }
        case 'bridges':
        case 'ramps': {
          const c = o.fn === 'bridges' ? BUILD_COSTS.bridge : BUILD_COSTS.ramp;
          e.seconds = M.buildPlace + gatherSeconds(c.item, c.qty);
          e.glints = c.glints;
          e.waitDays = 1;
          break;
        }
        case 'visited':
        case 'visitedEast':
          e.seconds = M.explore;
          break;
        case 'flag':
          e.seconds = 90;
          break;
        case 'rating':
          e.seconds = o.n >= 5 ? M.ratingPush : 6 * 60;
          break;
        case 'plazaDecor':
          e.seconds = o.n * 70;
          break;
        case 'plazaFlowers':
          e.seconds = o.n * 30;
          break;
        case 'stat':
          e.seconds = o.arg === 'loanPaid' ? (o.n / incomePerMin) * 60 : M.dig;
          break;
        default:
          e.seconds = 60;
      }
      break;
  }
  void m;
  return e;
}

// ---------------------------------------------------------------- simulation

interface ChapterRow {
  chapter: number;
  minutes: number;
  days: [number, number];
  activeMin: number;
  missions: number;
}

const DAY_MIN = REAL_SECONDS_PER_DAY / 60;
let day = 1;
let dayUsed = 0; // minutes used today
let total = 0;
const done = new Set<string>();
const rows: ChapterRow[] = [];

function spend(minutes: number): void {
  // play minutes across days; menus/dialogue pause the clock, so a day holds a little more real time
  total += minutes;
  let left = minutes * (1 - M.pausedShare);
  while (left > 0) {
    const room = DAY_MIN - dayUsed;
    const use = Math.min(room, left);
    dayUsed += use;
    left -= use;
    if (dayUsed >= DAY_MIN - 1e-6) {
      day++;
      dayUsed = 0;
    }
  }
}

function waitUntilDay(target: number): void {
  while (day < target) {
    // play on a bit (free activities), then sleep
    const idle = Math.max(0, (DAY_MIN - dayUsed) * M.idleBeforeSleep);
    total += idle;
    day++;
    dayUsed = 0;
  }
}

for (const ch of CHAPTERS) {
  const startTotal = total;
  const startDay = day;
  let active = 0;
  let count = 0;
  const pending = MISSIONS.filter((m) => m.chapter === ch.n);
  let guard = 0;
  while (pending.length && guard++ < 200) {
    const ready = pending.filter((m) => m.requires.every((r) => done.has(r)));
    if (!ready.length) break;
    // missions available now; if none fit today's day gate, sleep until they do
    const minDay = Math.min(...ready.map((m) => m.minDay ?? 0));
    if (minDay > day) waitUntilDay(minDay);
    const now = ready.filter((m) => (m.minDay ?? 0) <= day);
    let maxWait = 0;
    let seconds = 0;
    let glints = 0;
    for (const m of now) {
      for (const o of m.objectives) {
        const e = objectiveCost(o, m);
        seconds += e.seconds;
        maxWait = Math.max(maxWait, e.waitDays);
        glints += e.glints;
      }
      seconds += 20 * (m.intro.length + m.outro.length); // dialogue reading
      done.add(m.id);
      pending.splice(pending.indexOf(m), 1);
      count++;
    }
    const minutes = (seconds / 60) * (1 + M.freePlay) + glints / incomePerMin;
    active += minutes;
    spend(minutes);
    if (maxWait > 0) waitUntilDay(day + maxWait);
  }
  if (ch.n === 1) {
    const m = M.firstChapterExplore / 60;
    active += m;
    spend(m);
  }
  rows.push({ chapter: ch.n, minutes: total - startTotal, days: [startDay, day], activeMin: active, missions: count });
}

const pad = (s: string | number, n: number) => String(s).padEnd(n);
console.log('\nLight Crossing — pacing estimate');
console.log(`(day = ${DAY_MIN} min, income ≈ ${Math.round(incomePerMin)} Glints/min, avg fish ${Math.round(avgFish)} / bug ${Math.round(avgBug)})\n`);
console.log(pad('Chapter', 26) + pad('Missions', 10) + pad('Days', 10) + pad('Active', 10) + 'Total');
for (const r of rows) {
  const ch = CHAPTERS.find((c) => c.n === r.chapter)!;
  console.log(pad(`${r.chapter}. ${ch.title}`, 26) + pad(r.missions, 10) + pad(`${r.days[0]}-${r.days[1]}`, 10) + pad(`${Math.round(r.activeMin)}m`, 10) + `${Math.round(r.minutes)}m`);
}
const hours = total / 60;
console.log(`\nTotal: ${Math.round(total)} minutes (${hours.toFixed(2)} h) over ${day} in-game days`);
const ok = hours >= 5.5 && hours <= 6.5;
console.log(ok ? 'Within the 5.5–6.5 hour target.' : 'OUTSIDE the 5.5–6.5 hour target — tune data/economy or mission requirements.');
if (process.argv.includes('--check') && !ok) process.exit(1);
export { rows, total };
