/**
 * Machines that turn goods into artisan products over time, plus decor and handy
 * crafted items. Machine rules return the output and minutes needed for an input.
 */
import { ORES } from './minerals';
import { ARTISAN } from './recipes';
import { registerItem, tryItem } from './items';
import type { ItemStack } from '../sim/types';

export interface MachineRule {
  out: ItemStack;
  minutes: number;
  /** extra input items consumed (e.g. coal for the furnace) */
  extra?: [string, number][];
  /** how many of the input are used */
  use?: number;
}

export interface MachineDef {
  id: string;
  name: string;
  desc: string;
  /** null = no input (bee house) */
  rule: ((input: ItemStack) => MachineRule | null) | null;
  /** auto-produce for input-less machines */
  auto?: { out: string; minutes: number; seasons: number[] };
  outdoorOnly?: boolean;
  color: number;
}

const jamOf = (id: string) => ARTISAN.find((a) => a.from === id && a.kind !== 'juice');
const juiceOf = (id: string) => ARTISAN.find((a) => a.from === id && a.kind === 'juice');

export const MACHINES: MachineDef[] = [
  {
    id: 'preservesJar',
    name: 'Preserves Jar',
    desc: 'Turns fruit into jam and veggies into pickles.',
    color: 0xd2434a,
    rule: (s) => {
      const a = jamOf(s.id);
      return a ? { out: { id: a.id, n: 1, q: 0 }, minutes: 1500 } : null;
    },
  },
  {
    id: 'juicer',
    name: 'Juicer',
    desc: 'Squeezes fruits and veggies into tasty juice.',
    color: 0xf5b942,
    rule: (s) => {
      const a = juiceOf(s.id);
      return a ? { out: { id: a.id, n: 1, q: 0 }, minutes: 900 } : null;
    },
  },
  {
    id: 'cheesePress',
    name: 'Cheese Press',
    desc: 'Turns milk into cheese.',
    color: 0xf3efe6,
    rule: (s) =>
      s.id === 'milk' ? { out: { id: 'cheese', n: 1, q: s.q }, minutes: 200 }
      : s.id === 'bigMilk' ? { out: { id: 'cheese', n: 1, q: 2 }, minutes: 200 }
      : s.id === 'goatMilk' ? { out: { id: 'goatCheese', n: 1, q: s.q }, minutes: 200 }
      : null,
  },
  {
    id: 'loom',
    name: 'Loom',
    desc: 'Weaves wool and fur into cloth.',
    color: 0xb7844f,
    rule: (s) =>
      s.id === 'wool' ? { out: { id: 'cloth', n: 1, q: 0 }, minutes: 240 }
      : s.id === 'rabbitFur' ? { out: { id: 'cloth', n: 2, q: 0 }, minutes: 300 }
      : s.id === 'lostSock' ? { out: { id: 'cloth', n: 1, q: 0 }, minutes: 120, use: 5 }
      : null,
  },
  {
    id: 'furnace',
    name: 'Furnace',
    desc: 'Smelts 5 ore and 1 coal into a metal bar.',
    color: 0x8a8aa0,
    rule: (s) => {
      const o = ORES.find((x) => x.id === s.id);
      if (!o) return null;
      const minutes = [30, 120, 300, 480][ORES.indexOf(o)];
      return { out: { id: o.bar, n: 1, q: 0 }, minutes, use: 5, extra: [['coal', 1]] };
    },
  },
  {
    id: 'beeHouse',
    name: 'Bee House',
    desc: 'Busy bees make honey every few days (spring to autumn). Place it outside!',
    color: 0xf5d34a,
    rule: null,
    auto: { out: 'honey', minutes: 3200, seasons: [0, 1, 2] },
    outdoorOnly: true,
  },
  {
    id: 'oilPress',
    name: 'Oil Press',
    desc: 'Presses sunflowers or corn into cooking oil.',
    color: 0xe4862e,
    rule: (s) => (s.id === 'sunflower' ? { out: { id: 'oil', n: 1, q: 0 }, minutes: 600 } : s.id === 'corn' ? { out: { id: 'oil', n: 1, q: 0 }, minutes: 900 } : null),
  },
  {
    id: 'recycler',
    name: 'Recycler',
    desc: 'Turns junk into something useful.',
    color: 0x35b0a2,
    rule: (s) =>
      s.id === 'driftwood' ? { out: { id: 'wood', n: 3, q: 0 }, minutes: 60 }
      : s.id === 'tinCan' ? { out: { id: 'ironOre', n: 1, q: 0 }, minutes: 60 }
      : s.id === 'oldBottle' ? { out: { id: 'quartz', n: 1, q: 0 }, minutes: 60 }
      : s.id === 'lostSock' ? { out: { id: 'fiber', n: 3, q: 0 }, minutes: 60 }
      : null,
  },
  {
    id: 'seedMaker',
    name: 'Seed Maker',
    desc: 'Turns a crop into a few of its seeds.',
    color: 0x5c9e48,
    rule: (s) => (tryItem(`seed.${s.id}`) ? { out: { id: `seed.${s.id}`, n: 2, q: 0 }, minutes: 30 } : null),
  },
];

export const MACHINE: Record<string, MachineDef> = {};
for (const m of MACHINES) {
  MACHINE[m.id] = m;
  registerItem({ id: m.id, name: m.name, cat: 'machine', price: 0, desc: m.desc, place: m.id === 'beeHouse' ? 'beehouse' : 'machine', giftable: false });
}

// ── Decor & handy crafted items ─────────────────────────────
export const DECOR: [string, string, string, boolean][] = [
  ['bench', 'Bench', 'A spot to sit and watch your farm grow.', false],
  ['woodSign', 'Wood Sign', 'A cute wooden sign.', false],
  ['flowerPot', 'Flower Pot', 'A pot of happy flowers.', false],
  ['birdhouse', 'Birdhouse', 'Tweet tweet! Birds love it.', true],
  ['gardenGnome', 'Garden Gnome', 'He guards your garden with a smile.', false],
  ['lantern', 'Lantern', 'A warm light for cozy evenings.', false],
  ['lampPost', 'Lamp Post', 'Lights up the path at night.', true],
  ['windChime', 'Wind Chime', 'Tinkles softly in the breeze.', true],
  ['pumpkinLantern', 'Pumpkin Lantern', 'A glowing carved pumpkin with a friendly face.', false],
  ['snowGlobe', 'Snow Globe', 'Shake it and watch the snow fall.', false],
  ['fishTank', 'Fish Tank', 'Bubbles and little plants.', false],
  ['bookshelf', 'Bookshelf', 'Full of stories.', true],
  ['table', 'Table', 'A sturdy wooden table.', false],
  ['chair', 'Chair', 'Have a seat!', false],
  ['planterBox', 'Planter Box', 'Pretty plants in a box.', false],
  ['barrelDeco', 'Barrel', 'A sturdy old barrel.', false],
  ['stoneStatue', 'Stone Statue', 'A statue of a happy frog.', true],
  ['crystalLamp', 'Crystal Lamp', 'Glows with soft crystal light.', true],
  ['glowTorch', 'Glow Torch', 'A torch powered by a Spark Cell.', false],
  ['heartLantern', 'Heart Lantern', 'A lantern with a glowing ruby heart.', false],
  ['rug', 'Cozy Rug', 'A soft woven rug.', false],
  ['teaSet', 'Tea Set', 'For tea parties with friends.', false],
  ['cuttingBoard', 'Cutting Board', 'A chef\'s best friend.', false],
  ['jamShelf', 'Jam Shelf', 'A shelf of colorful jam jars.', true],
  ['flowerArch', 'Flower Arch', 'A beautiful arch covered in flowers.', true],
  ['starLight', 'Star Light', 'A twinkly star lamp from the Valley Hall.', false],
  ['foundersStatue', 'Founders\' Statue', 'A small statue of the valley founders — and Great-Aunt Rosemary!', true],
];
for (const [id, name, desc] of DECOR) registerItem({ id, name, cat: 'placeable', price: 0, desc, place: 'deco', giftable: false });

registerItem({ id: 'deluxeScarecrow', name: 'Deluxe Scarecrow', cat: 'placeable', price: 0, desc: 'A fancy scarecrow that protects crops within 12 tiles.', place: 'scarecrow', giftable: false });
registerItem({ id: 'tapper', name: 'Tapper', cat: 'placeable', price: 0, desc: 'Place on a grown oak, maple or pine tree to collect resin, syrup or tar.', giftable: false });
registerItem({ id: 'homeWhistle', name: 'Home Whistle', cat: 'special', price: 0, desc: 'Blow it to zip straight back to your farm!', giftable: false });
registerItem({ id: 'ropeLadder', name: 'Rope Ladder', cat: 'special', price: 0, desc: 'Use it in the mine to climb down one floor right away.', giftable: false });
registerItem({ id: 'popBomb', name: 'Pop Bomb', cat: 'special', price: 0, desc: 'Use it in the mine: POP! It breaks all the rocks around you (critters just bounce away).', giftable: false });
registerItem({ id: 'rainCharm', name: 'Rain Charm', cat: 'special', price: 0, desc: 'Use it to make tomorrow rainy. Your crops will thank you!', giftable: false });
