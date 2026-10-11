// Seasonal festivals, contest days, the traveling merchant, meteor showers and villager birthdays.
// Everything here is optional and starts only after Chapter 2, so the story is never slowed down.
import type { Season } from './types';

export type FestivalId = 'flowerFair' | 'starNight' | 'harvestFeast' | 'lanternSkate';

export interface FestivalDef {
  id: FestivalId;
  season: Season;
  name: string;
  host: string;
  /** day of the season (1..7) */
  day: number;
  /** festival hours [from, to) */
  hours: [number, number];
  /** plaza decoration colors */
  colors: [number, number, number];
  /** what to do, in a few easy words */
  goal: string;
  /** how many things the activity needs */
  need: number;
  intro: string[];
  thanks: string[];
  /** exclusive rewards */
  reward: { items: string[]; lumens: number };
}

export const FESTIVAL_DAY = 5;

export const FESTIVALS: FestivalDef[] = [
  {
    id: 'flowerFair',
    season: 'spring',
    name: 'Spring Flower Fair',
    host: 'rusk',
    day: FESTIVAL_DAY,
    hours: [9, 20],
    colors: [0xffa8c8, 0xffe066, 0x9be38a],
    goal: 'Bring Rusk 3 flowers, each a different color.',
    need: 3,
    intro: ['[happy]Hrmph! Welcome to the Flower Fair, {player}.', '[neutral]Bring me three flowers. Each one a different color. Then we will have the best fair ever.'],
    thanks: ['[happy]Three colors! Now that is a fair. ...Thank you, {player}.', '[love]Here. I made this for you. Wear it to the next fair.'],
    reward: { items: ['cloth_party_hat', 'cloth_flower_crown'], lumens: 300 },
  },
  {
    id: 'starNight',
    season: 'summer',
    name: 'Summer Star Night',
    host: 'marlowe',
    day: FESTIVAL_DAY,
    hours: [19, 24],
    colors: [0x4f5a9a, 0xffe27a, 0xb9a6e0],
    goal: 'Catch 5 falling stars near the plaza and bring them to Marlowe.',
    need: 5,
    intro: ['[sleepy]Mmm, hello, {player}. Tonight is Star Night.', '[happy]Little stars fall near the plaza. Pick up five and bring them to me. We will make a wish.'],
    thanks: ['[happy]Five stars. Close your eyes and make a wish...', '[love]This is for you. It sparkles like tonight.'],
    reward: { items: ['cloth_starlight_dress'], lumens: 300 },
  },
  {
    id: 'harvestFeast',
    season: 'autumn',
    name: 'Autumn Harvest Feast',
    host: 'tansy',
    day: FESTIVAL_DAY,
    hours: [10, 21],
    colors: [0xf2a65c, 0xd9734e, 0xf5c45e],
    goal: 'Help Tansy fill the feast pot: bring 3 fruit and 2 fish.',
    need: 5,
    intro: ['[happy]It is the Harvest Feast, {player}! Smell that?', '[happy]Help me fill the big pot! I need 3 fruit and 2 fish. Yum, {catch}!'],
    thanks: ['[love]The pot is full! Everyone gets a big bowl!', '[happy]And this is for you. Stay cozy, {player}!'],
    reward: { items: ['cloth_star_sweater'], lumens: 300 },
  },
  {
    id: 'lanternSkate',
    season: 'winter',
    name: 'Winter Lantern Skate',
    host: 'juno',
    day: FESTIVAL_DAY,
    hours: [12, 22],
    colors: [0xffd27a, 0x9fc8f0, 0xffffff],
    goal: 'Skate on the frozen pond and go through all 5 lantern rings.',
    need: 5,
    intro: ['[happy]The pond is frozen, {player}! It is the Lantern Skate!', '[happy]Skate through all five lantern rings on the ice. Go go!'],
    thanks: ['[surprised]You got all five! What a skater!', '[happy]Here is the Lantern Crown. You earned it!'],
    reward: { items: ['cloth_lantern_crown'], lumens: 300 },
  },
];

export const FESTIVAL_BY_ID: Record<FestivalId, FestivalDef> = Object.fromEntries(FESTIVALS.map((f) => [f.id, f])) as Record<FestivalId, FestivalDef>;

/** Contest days, each season (after their story missions). */
export const CONTEST_DAYS = { tournament: 3, bugoff: 6 } as const;

/** Villager birthdays: [season index, day of season]. The player is never asked for theirs. */
// (never on contest days 3/6 or festival day 5, so hosts are free)
export const BIRTHDAYS: Record<string, [number, number]> = {
  tansy: [0, 2],
  kip: [0, 7],
  rusk: [1, 2],
  juno: [1, 7],
  mochi: [2, 4],
  bellamy: [2, 7],
  percival: [3, 4],
  marlowe: [3, 7],
};

/** Wanda the traveling merchant visits every 6 days (from day 9) once Chapter 2 is done. */
export const MERCHANT = { name: 'Wanda', every: 6, offset: 3, hours: [8, 19] as [number, number], markup: 1.5 };
