/**
 * Villagers: who they are, how they look, where they live, birthdays, gift tastes and
 * daily schedules. Dialogue lives in dialogue.ts; friendship cutscenes in cutscenes.ts.
 *
 * Schedules: entries are [time (minutes from midnight), location id, point name OR [x, y], facing?].
 * The villager walks to each spot when its time comes. Sets: default, rain, rest (Restday),
 * and optional per-season overrides (s0..s3). Later systems (festivals) override whole days.
 */
import type { HairStyle, HatStyle } from '../render/art/characters';

export type Spot = string | [number, number];
export type SchedEntry = [number, string, Spot, number?];

export interface Schedule {
  default: SchedEntry[];
  rain?: SchedEntry[];
  rest?: SchedEntry[];
  s0?: SchedEntry[];
  s1?: SchedEntry[];
  s2?: SchedEntry[];
  s3?: SchedEntry[];
}

export interface VillagerLook {
  skin: number;
  hair: number;
  hairStyle: HairStyle;
  shirt: number;
  pants: number;
  shoes?: number;
  dress?: boolean;
  apron?: number;
  overalls?: number;
  hat?: { style: HatStyle; color: number };
  glasses?: boolean;
  beard?: number;
  scarf?: number;
  kid?: boolean;
  blush?: boolean;
}

export interface VillagerDef {
  id: string;
  name: string;
  /** short description for the friends page */
  role: string;
  age: 'kid' | 'teen' | 'adult' | 'elder';
  bio: string;
  home: string;
  birthday: [number, number];
  look: VillagerLook;
  /** item ids or `cat:<category>` */
  loves: string[];
  likes: string[];
  dislikes: string[];
  shop?: string;
  /** speech pitch for read-aloud (0.6–1.6) */
  pitch: number;
  schedule: Schedule;
}

const H = (min: number) => min * 60;

export const VILLAGERS: VillagerDef[] = [
  {
    id: 'bram',
    name: 'Mayor Bram',
    role: 'Mayor of Cliff Valley',
    age: 'adult',
    bio: 'A jolly mayor who tells veggie jokes and looks after the Valley Hall.',
    home: 'houseOakes',
    birthday: [1, 4],
    look: { skin: 0xe0aa80, hair: 0x6a4630, hairStyle: 'bald', shirt: 0x3f6aa8, pants: 0x3d3c4e, beard: 0x8a6040, hat: { style: 'cap', color: 0x2f4fa8 } },
    loves: ['pumpkin', 'mapleSyrup', 'cheese', 'pumpkinPie'],
    likes: ['cat:crop', 'cat:fruit', 'cat:food'],
    dislikes: ['clay', 'cat:junk'],
    pitch: 0.8,
    schedule: {
      default: [[H(6), 'houseOakes', 'table'], [H(9), 'hall', 'mayor'], [H(12), 'town', 'hallDoor'], [H(13), 'cafe', 'seat5'], [H(15), 'hall', 'mayor'], [H(18), 'town', 'fountain'], [H(20), 'houseOakes', 'piano']],
      rest: [[H(6), 'houseOakes', 'table'], [H(10), 'town', 'fountain'], [H(13), 'cafe', 'seat5'], [H(16), 'town', 'bench2'], [H(19), 'houseOakes', 'piano']],
      rain: [[H(6), 'houseOakes', 'table'], [H(9), 'hall', 'mayor'], [H(13), 'cafe', 'seat5'], [H(16), 'hall', 'mayor'], [H(19), 'houseOakes', 'piano']],
    },
  },
  {
    id: 'pippa',
    name: 'Pippa',
    role: 'Runs the General Store',
    age: 'adult',
    bio: 'Speedy, sunny and super organized. Knows a fact about every seed.',
    home: 'store',
    birthday: [0, 4],
    look: { skin: 0xf2c49b, hair: 0xd2602a, hairStyle: 'pony', shirt: 0x5c9e48, pants: 0x46301f, apron: 0xf3efe6 },
    loves: ['tulip', 'strawberry', 'sunflower', 'strawberryShortcake'],
    likes: ['cat:flower', 'cat:fruit', 'cat:seed'],
    dislikes: ['coal', 'cat:junk'],
    shop: 'store',
    pitch: 1.25,
    schedule: {
      default: [[H(6), 'store', 'keeper'], [H(18) + 30, 'town', 'storeFront'], [H(19), 'cafe', 'seat1'], [H(21), 'store', 'keeper']],
      rest: [[H(6), 'store', 'keeper'], [H(9), 'town', 'garden'], [H(12), 'cafe', 'seat1'], [H(15), 'town', 'bench1'], [H(19), 'store', 'keeper']],
    },
  },
  {
    id: 'grit',
    name: 'Grit',
    role: 'Blacksmith',
    age: 'adult',
    bio: 'Strong, gruff and secretly soft-hearted. Loves cracking geodes.',
    home: 'smithy',
    birthday: [2, 9],
    look: { skin: 0xa86b43, hair: 0x1a1520, hairStyle: 'bun', shirt: 0x8a8898, pants: 0x46301f, apron: 0x6a4630, shoes: 0x2b1d16 },
    loves: ['ruby', 'amethyst', 'goldBar', 'diamond'],
    likes: ['cat:gem', 'cat:ore', 'cat:bar', 'cat:mineral'],
    dislikes: ['cat:flower', 'fiber'],
    shop: 'smithy',
    pitch: 0.75,
    schedule: {
      default: [[H(6), 'smithy', 'anvil'], [H(9), 'smithy', 'keeper'], [H(16) + 30, 'town', 'smithyFront'], [H(18), 'cafe', 'seat3'], [H(21), 'smithy', 'anvil']],
      rest: [[H(6), 'smithy', 'anvil'], [H(11), 'town', 'smithyFront'], [H(14), 'cafe', 'seat3'], [H(18), 'smithy', 'anvil']],
    },
  },
  {
    id: 'hollis',
    name: 'Hollis',
    role: 'Carpenter',
    age: 'elder',
    bio: 'Calm and wise. Builds barns, birdhouses and friendships. Knew your great-aunt well.',
    home: 'carpentry',
    birthday: [3, 2],
    look: { skin: 0xd59a6a, hair: 0xb9b9ca, hairStyle: 'short', shirt: 0xb04040, pants: 0x2f4fa8, beard: 0xd8d8e0, overalls: 0x3f5a8c },
    loves: ['hardwood', 'apple', 'pineTar', 'applePie'],
    likes: ['wood', 'cat:fruit', 'oakResin'],
    dislikes: ['cat:junk', 'hotpepper'],
    shop: 'carpenter',
    pitch: 0.7,
    schedule: {
      default: [[H(6), 'carpentry', 'bench'], [H(9), 'carpentry', 'keeper'], [H(17), 'town', 'carpFront'], [H(18), 'town', 'bench2'], [H(20), 'carpentry', 'bench']],
      rest: [[H(6), 'carpentry', 'bench'], [H(10), 'town', 'carpFront'], [H(13), 'cafe', 'seat6'], [H(16), 'town', 'bench2'], [H(19), 'carpentry', 'bench']],
    },
  },
  {
    id: 'goldie',
    name: 'Goldie',
    role: 'Runs the Animal Ranch',
    age: 'adult',
    bio: 'Warm, busy and great with animals. Kai\'s mom. Never without a hay strand in her hair.',
    home: 'ranch',
    birthday: [0, 9],
    look: { skin: 0xf2c49b, hair: 0xf0d070, hairStyle: 'braids', shirt: 0xd2434a, pants: 0x2f4fa8, hat: { style: 'straw', color: 0xe6c98f } },
    loves: ['cheese', 'cloth', 'bigEgg', 'goldenEgg'],
    likes: ['cat:animal', 'cat:artisan', 'hay'],
    dislikes: ['cat:fish'],
    shop: 'ranch',
    pitch: 1.05,
    schedule: {
      default: [[H(6), 'ranch', 'keeper'], [H(7), 'town', 'pasture'], [H(9), 'ranch', 'keeper'], [H(16), 'town', 'pasture'], [H(18) + 30, 'ranch', 'table']],
      rain: [[H(6), 'ranch', 'keeper'], [H(18), 'ranch', 'table']],
    },
  },
  {
    id: 'kai',
    name: 'Kai',
    role: 'Bug expert (age 9)',
    age: 'kid',
    bio: 'Loves beetles, frogs, mud and "treasures". Brave about everything except the dark.',
    home: 'ranch',
    birthday: [1, 8],
    look: { skin: 0xf2c49b, hair: 0xb7844f, hairStyle: 'spiky', shirt: 0xf5b942, pants: 0x3e7c3c, kid: true, hat: { style: 'cap', color: 0x5c9e48 } },
    loves: ['blueberry', 'cookies', 'oldToyTrain', 'frogStatue'],
    likes: ['cat:forage', 'cat:fruit', 'cat:artifact'],
    dislikes: ['spinach', 'kale', 'brussels'],
    pitch: 1.5,
    schedule: {
      default: [[H(6), 'ranch', 'kid'], [H(9), 'town', 'riverbank'], [H(12), 'town', 'fountain'], [H(15), 'town', 'pasture'], [H(18), 'ranch', 'kid']],
      rain: [[H(6), 'ranch', 'kid'], [H(10), 'museum', 'reader'], [H(14), 'cafe', 'seat2'], [H(17), 'ranch', 'kid']],
    },
  },
  {
    id: 'juno',
    name: 'Juno',
    role: 'Painter (age 14)',
    age: 'teen',
    bio: 'The mayor\'s daughter. Quiet, creative, and always sketching the valley.',
    home: 'houseOakes',
    birthday: [2, 2],
    look: { skin: 0xe0aa80, hair: 0x2b1d16, hairStyle: 'bob', shirt: 0x9873be, pants: 0x3d3c4e, scarf: 0xf5b942 },
    loves: ['sunflower', 'amethyst', 'hotCocoa', 'tulip'],
    likes: ['cat:flower', 'cat:gem', 'cat:food'],
    dislikes: ['seaweed', 'clay'],
    pitch: 1.15,
    schedule: {
      default: [[H(6), 'houseOakes', 'easel'], [H(10), 'town', 'plazaW'], [H(14), 'museum', 'reader'], [H(17), 'cafe', 'seat4'], [H(19), 'houseOakes', 'easel']],
      rain: [[H(6), 'houseOakes', 'easel'], [H(12), 'museum', 'reader'], [H(16), 'houseOakes', 'easel']],
    },
  },
  {
    id: 'sunny',
    name: 'Sunny',
    role: 'Runs The Sunny Cup Café',
    age: 'adult',
    bio: 'Sings while he cooks and never lets anyone leave hungry.',
    home: 'cafe',
    birthday: [3, 6],
    look: { skin: 0xa86b43, hair: 0x1a1520, hairStyle: 'curly', shirt: 0xf3efe6, pants: 0x3d3c4e, hat: { style: 'chef', color: 0xffffff }, apron: 0xf5b942 },
    loves: ['tomato', 'hotpepper', 'veggieCurry', 'pizza'],
    likes: ['cat:crop', 'cat:food', 'cat:ingredient'],
    dislikes: ['clay', 'coal'],
    shop: 'cafe',
    pitch: 1.0,
    schedule: { default: [[H(6), 'cafe', 'keeper']] },
  },
  {
    id: 'ottilie',
    name: 'Professor Ottilie',
    role: 'Museum curator',
    age: 'elder',
    bio: 'Curious about everything old, shiny or mysterious. Uses big words, then explains them.',
    home: 'museum',
    birthday: [0, 6],
    look: { skin: 0xf2c49b, hair: 0xe6e7ef, hairStyle: 'bun', shirt: 0x6a4f8c, pants: 0x3d3c4e, dress: true, glasses: true },
    loves: ['cat:artifact', 'dinoTooth', 'geode'],
    likes: ['cat:mineral', 'cat:gem', 'cat:geode'],
    dislikes: ['cat:junk'],
    pitch: 1.1,
    schedule: {
      default: [[H(6), 'museum', 'shelf'], [H(8), 'museum', 'keeper'], [H(13), 'town', 'museumFront'], [H(14), 'museum', 'keeper'], [H(18), 'museum', 'reader']],
    },
  },
  {
    id: 'toby',
    name: 'Toby',
    role: 'Retired train conductor',
    age: 'elder',
    bio: 'Drove the Valley Train for forty years. Full of stories and fond of tea.',
    home: 'houseToby',
    birthday: [2, 5],
    look: { skin: 0xd59a6a, hair: 0xe6e7ef, hairStyle: 'short', shirt: 0x2c5a37, pants: 0x46301f, hat: { style: 'captain', color: 0x24548f }, beard: 0xf3efe6 },
    loves: ['mapleSyrup', 'honey', 'oldTicket', 'blueberryMuffin'],
    likes: ['cat:food', 'cat:artifact', 'cat:fruit'],
    dislikes: ['hotpepper', 'cat:junk'],
    pitch: 0.75,
    schedule: {
      default: [[H(6), 'houseToby', 'fire'], [H(10), 'town', 'station'], [H(13), 'cafe', 'seat6'], [H(15), 'town', 'bench1'], [H(18), 'houseToby', 'chair']],
      rain: [[H(6), 'houseToby', 'fire'], [H(12), 'cafe', 'seat6'], [H(16), 'houseToby', 'chair']],
    },
  },
  {
    id: 'lumi',
    name: 'Lumi',
    role: 'Inventor',
    age: 'adult',
    bio: 'Bubbly gadget-builder with big ideas. Dreams of fixing the old mine lift.',
    home: 'houseLumi',
    birthday: [3, 4],
    look: { skin: 0xffe0c4, hair: 0x8fb6f5, hairStyle: 'short', shirt: 0xf5b942, pants: 0x3d3c4e, overalls: 0x35b0a2, glasses: true },
    loves: ['goldBar', 'crystalite', 'battery', 'quartz'],
    likes: ['cat:bar', 'cat:ore', 'cat:gem', 'cat:mineral'],
    dislikes: ['fiber', 'cat:flower'],
    pitch: 1.3,
    schedule: {
      default: [[H(6), 'houseLumi', 'desk'], [H(11), 'town', 'smithyFront'], [H(14), 'town', 'station'], [H(16), 'houseLumi', 'telescope'], [H(20), 'houseLumi', 'desk']],
      rain: [[H(6), 'houseLumi', 'desk'], [H(13), 'smithy', [3, 5]], [H(16), 'houseLumi', 'telescope']],
    },
  },
  {
    id: 'basil',
    name: 'Basil',
    role: 'Forest ranger',
    age: 'adult',
    bio: 'Quiet and kind. Knows every bird song and every mushroom in the woods.',
    home: 'houseBasil',
    birthday: [0, 2],
    look: { skin: 0x7a4a2e, hair: 0x2b1d16, hairStyle: 'short', shirt: 0x3e7c3c, pants: 0x6a4630, beard: 0x2b1d16, hat: { style: 'bandana', color: 0x5c9e48 } },
    loves: ['morel', 'mapleSyrup', 'acorn', 'mushroomSoup'],
    likes: ['cat:forage', 'cat:sapling', 'cat:fruit'],
    dislikes: ['coal', 'cat:junk'],
    pitch: 0.85,
    schedule: {
      default: [[H(6), 'houseBasil', 'chair'], [H(9), 'town', 'garden'], [H(13), 'town', 'riverbank'], [H(17), 'cafe', 'seat2'], [H(19), 'houseBasil', 'chair']],
      rain: [[H(6), 'houseBasil', 'chair'], [H(14), 'cafe', 'seat2'], [H(18), 'houseBasil', 'chair']],
    },
  },
  {
    id: 'nana',
    name: 'Nana Clementine',
    role: 'Baker & storyteller',
    age: 'elder',
    bio: 'Your great-aunt\'s best friend. Bakes the best pie in the valley and knows its oldest stories.',
    home: 'houseNana',
    birthday: [3, 9],
    look: { skin: 0xf2c49b, hair: 0xf8fbff, hairStyle: 'curly', shirt: 0xee8ab6, pants: 0x9873be, dress: true, apron: 0xffffff, glasses: true },
    loves: ['cranberry', 'apple', 'honey', 'hotCocoa'],
    likes: ['cat:fruit', 'cat:food', 'flour', 'sugar'],
    dislikes: ['hotpepper', 'cat:junk'],
    pitch: 1.05,
    schedule: {
      default: [[H(6), 'houseNana', 'stove'], [H(10), 'cafe', 'baker'], [H(14), 'town', 'bench2'], [H(17), 'houseNana', 'chair']],
      rain: [[H(6), 'houseNana', 'stove'], [H(10), 'cafe', 'baker'], [H(15), 'houseNana', 'chair']],
    },
  },
  {
    id: 'wren',
    name: "Cap'n Wren",
    role: 'Runs the bait & tackle shop',
    age: 'elder',
    bio: 'A jolly old sailor with a seagull named Pickles and a tall tale for every fish.',
    home: 'town',
    birthday: [1, 2],
    look: { skin: 0xd59a6a, hair: 0xe6e7ef, hairStyle: 'bald', shirt: 0x24548f, pants: 0x3d3c4e, beard: 0xe6e7ef, hat: { style: 'captain', color: 0xf3efe6 } },
    loves: ['tuna', 'sardine', 'fishStew', 'crabCakes'],
    likes: ['cat:fish', 'cat:crab'],
    dislikes: ['cat:flower', 'cat:junk'],
    shop: 'fishshop',
    pitch: 0.7,
    schedule: {
      default: [[H(6), 'town', 'riverbank'], [H(12), 'cafe', 'seat4'], [H(14), 'town', 'bridge'], [H(20), 'town', 'riverbank']],
    },
  },
];

export const VILLAGER: Record<string, VillagerDef> = {};
for (const v of VILLAGERS) VILLAGER[v.id] = v;
