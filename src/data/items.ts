// Base items: materials, tools, shells, fruit, flowers, seeds, saplings, misc/key items.
// Fish, bugs, fossils and furniture live in their own data files and are merged by registry.ts.
import { COCONUT, FRUITS } from './fruit';
import type { ItemDef, Season } from './types';

export const MATERIALS: ItemDef[] = [
  { id: 'branch', name: 'Twiggy Branch', cat: 'material', price: 5, stack: 30, desc: 'A bendy branch. Handy for simple crafts.', icon: { s: 'branch', c: 0xa47a52 }, tags: ['nature'] },
  { id: 'timber', name: 'Timber', cat: 'material', price: 30, stack: 30, desc: 'Sturdy wood from a healthy tree.', icon: { s: 'log', c: 0xc9945f, c2: 0xf0d2a8 }, tags: ['nature'] },
  { id: 'stone', name: 'River Stone', cat: 'material', price: 25, stack: 30, desc: 'A smooth, cool stone.', icon: { s: 'stone', c: 0xb6b2c4 }, tags: ['nature'] },
  { id: 'iron', name: 'Iron Ore', cat: 'material', price: 150, stack: 30, desc: 'A heavy lump of ore with a dull shine.', icon: { s: 'ore', c: 0x8d8f9e, c2: 0xd9a46a } },
  { id: 'clay', name: 'Soft Clay', cat: 'material', price: 40, stack: 30, desc: 'Squishy clay, perfect for pots.', icon: { s: 'clay', c: 0xd99a7a } },
  { id: 'fiber', name: 'Weed Fiber', cat: 'material', price: 5, stack: 50, desc: 'Tough stringy fiber pulled from weeds.', icon: { s: 'fiber', c: 0x8fc46a } },
  { id: 'glowstone', name: 'Glow Pebble', cat: 'material', price: 450, stack: 20, desc: 'A pebble that hums with a soft inner light.', icon: { s: 'gem', c: 0xffe27a, c2: 0xfff6c9 }, tags: ['shiny'], rarity: 3 },
  { id: 'starnugget', name: 'Star Nugget', cat: 'material', price: 2500, stack: 10, desc: 'Rare and twinkly. Rocks very rarely give one.', icon: { s: 'gem', c: 0xffc94d, c2: 0xffffff }, tags: ['shiny', 'fancy'], rarity: 4 },
  { id: 'shell_spiral', name: 'Spiral Shell', cat: 'shell', price: 60, stack: 20, desc: 'A swirly shell washed up on the beach.', icon: { s: 'shell', c: 0xf7d9c4, c2: 0xe0a990 }, tags: ['sea'] },
  { id: 'shell_scallop', name: 'Scallop Fan', cat: 'shell', price: 80, stack: 20, desc: 'A ribbed shell shaped like a little fan.', icon: { s: 'shell', c: 0xffc2b3, c2: 0xf28f7c }, tags: ['sea', 'cute'] },
  { id: 'shell_coral', name: 'Coral Sprig', cat: 'shell', price: 150, stack: 20, desc: 'A branch of pink coral.', icon: { s: 'shell', c: 0xff9fb0, c2: 0xff6f8f }, tags: ['sea', 'cute'] },
  { id: 'shell_cowrie', name: 'Moon Cowrie', cat: 'shell', price: 220, stack: 20, desc: 'Glossy as the moon on a calm night.', icon: { s: 'shell', c: 0xf2efff, c2: 0xb9b0e8 }, tags: ['sea', 'fancy'], rarity: 2 },
  { id: 'shell_pearl', name: 'Pearl Whorl', cat: 'shell', price: 900, stack: 20, desc: 'A rare shell with a pearly sheen.', icon: { s: 'shell', c: 0xfffaf0, c2: 0xd8ecff }, tags: ['sea', 'fancy', 'shiny'], rarity: 4 },
];

const toolIcon = (s: ItemDef['icon']['s'], sturdy: boolean) => ({ s, c: sturdy ? 0xc4a26a : 0xa47a52, c2: sturdy ? 0x9fd3f0 : 0xd9c39a });

export const TOOLS: ItemDef[] = [
  { id: 'net_flimsy', name: 'Twig Net', cat: 'tool', price: 50, stack: 1, desc: 'A wobbly net for catching bugs. Hold to sneak, release to swing.', icon: toolIcon('net', false), tool: { kind: 'net', durability: 12, sturdy: false } },
  { id: 'net', name: 'Brassloop Net', cat: 'tool', price: 300, stack: 1, desc: 'A reliable net with a brass hoop.', icon: toolIcon('net', true), tool: { kind: 'net', durability: 40, sturdy: true } },
  { id: 'rod_flimsy', name: 'Twig Rod', cat: 'tool', price: 50, stack: 1, desc: 'A simple fishing rod. Cast near a shadow and wait for the bite.', icon: toolIcon('rod', false), tool: { kind: 'rod', durability: 12, sturdy: false } },
  { id: 'rod', name: 'Willow Rod', cat: 'tool', price: 300, stack: 1, desc: 'A springy rod that rarely snaps.', icon: toolIcon('rod', true), tool: { kind: 'rod', durability: 40, sturdy: true } },
  { id: 'shovel_flimsy', name: 'Twig Shovel', cat: 'tool', price: 50, stack: 1, desc: 'Dig up cracks in the ground, holes, flowers and saplings.', icon: toolIcon('shovel', false), tool: { kind: 'shovel', durability: 20, sturdy: false } },
  { id: 'shovel', name: 'Iron Spade', cat: 'tool', price: 300, stack: 1, desc: 'A proper spade for serious digging.', icon: toolIcon('shovel', true), tool: { kind: 'shovel', durability: 70, sturdy: true } },
  { id: 'axe_flimsy', name: 'Stone Hatchet', cat: 'tool', price: 50, stack: 1, desc: 'Chop trees for timber. Each tree gives a little wood every day.', icon: toolIcon('axe', false), tool: { kind: 'axe', durability: 40, sturdy: false } },
  { id: 'axe', name: 'Iron Axe', cat: 'tool', price: 300, stack: 1, desc: 'A sharp axe that lasts and lasts.', icon: toolIcon('axe', true), tool: { kind: 'axe', durability: 120, sturdy: true } },
  { id: 'can_flimsy', name: 'Gourd Sprinkler', cat: 'tool', price: 50, stack: 1, desc: 'Water flowers so they can cross-breed.', icon: toolIcon('can', false), tool: { kind: 'can', durability: 20, sturdy: false } },
  { id: 'can', name: 'Copper Sprinkler', cat: 'tool', price: 300, stack: 1, desc: 'Waters a whole cross of flowers at once.', icon: toolIcon('can', true), tool: { kind: 'can', durability: 80, sturdy: true } },
  { id: 'ladder', name: 'Rope Ladder', cat: 'tool', price: 0, stack: 1, desc: 'Climb up or down a cliff. Never breaks.', icon: { s: 'ladder', c: 0xc9945f, c2: 0xe6d3b0 }, tool: { kind: 'ladder', durability: 0, sturdy: true }, key: true },
];

export const FRUIT_ITEMS: ItemDef[] = [
  ...FRUITS.map((f) => ({
    id: f.id,
    name: f.name,
    cat: 'fruit' as const,
    price: f.price,
    stack: 10,
    desc: `A ripe ${f.name}. Plant it to grow a new fruit tree.`,
    icon: { s: 'fruit' as const, c: f.color },
    tags: ['food', 'sweet'],
  })),
  {
    id: COCONUT.id,
    name: COCONUT.name,
    cat: 'fruit',
    price: COCONUT.price,
    stack: 10,
    desc: 'A heavy coconut from a beach palm.',
    icon: { s: 'fruit', c: COCONUT.color, c2: 0xffffff },
    tags: ['food', 'sea'],
  },
];

export interface FlowerSpecies {
  id: string;
  name: string;
  colors: string[];
  /** seasonal species: seeds are sold and wild ones grow only in these seasons */
  seasons?: Season[];
}

export const FLOWER_SPECIES: FlowerSpecies[] = [
  { id: 'bell', name: 'Bellbloom', colors: ['red', 'yellow', 'white', 'orange', 'pink', 'purple', 'blue', 'black'] },
  { id: 'sun', name: 'Sunpetal', colors: ['red', 'yellow', 'white', 'orange', 'pink', 'purple', 'blue', 'black'] },
  { id: 'moon', name: 'Moonlily', colors: ['red', 'yellow', 'white', 'orange', 'pink', 'purple', 'blue', 'black'] },
  { id: 'star', name: 'Starwort', colors: ['red', 'yellow', 'white', 'orange', 'pink', 'purple', 'blue', 'black'] },
  { id: 'puff', name: 'Puffcap', colors: ['red', 'yellow', 'white', 'orange', 'pink', 'purple', 'blue', 'black'] },
  { id: 'lantern', name: 'Lanternflower', colors: ['red', 'yellow', 'white', 'orange', 'pink', 'purple', 'blue', 'black'] },
  // seasonal species
  { id: 'blossom', name: 'Blossomcup', colors: ['red', 'yellow', 'white', 'orange', 'pink', 'purple', 'blue', 'black'], seasons: ['spring'] },
  { id: 'frost', name: 'Frostbell', colors: ['red', 'yellow', 'white', 'orange', 'pink', 'purple', 'blue', 'black'], seasons: ['winter'] },
];

export const FLOWER_COLOR_NAMES = ['red', 'yellow', 'white', 'orange', 'pink', 'purple', 'blue', 'black'];
export const FLOWER_HEX: Record<string, number> = {
  red: 0xf27c7c,
  yellow: 0xffe066,
  white: 0xfdfbf4,
  orange: 0xffa45c,
  pink: 0xffa8c8,
  purple: 0xb48cf0,
  blue: 0x7fb2ff,
  black: 0x55476b,
};
const HYBRID_PRICE: Record<string, number> = { red: 40, yellow: 40, white: 40, orange: 80, pink: 80, purple: 160, blue: 300, black: 300 };

export function flowerItemId(species: number, color: number): string {
  return `flower_${FLOWER_SPECIES[species]!.id}_${FLOWER_COLOR_NAMES[color]}`;
}

const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);

export const FLOWER_ITEMS: ItemDef[] = FLOWER_SPECIES.flatMap((sp, si) =>
  FLOWER_COLOR_NAMES.map((color, ci) => ({
    id: `flower_${sp.id}_${color}`,
    name: `${cap(color)} ${sp.name}`,
    cat: 'flower' as const,
    price: HYBRID_PRICE[color]!,
    stack: 10,
    desc: ci < 3 ? `A ${color} ${sp.name}. Water it next to another of its kind and something new may sprout.` : `A rare ${color} ${sp.name}, grown by cross-breeding.`,
    icon: { s: 'flower' as const, c: FLOWER_HEX[color]!, c2: 0x7cc475 },
    tags: ci >= 3 ? ['nature', 'cute', 'fancy'] : ['nature', 'cute'],
    plant: { kind: 'flower' as const, v: si * 16 + ci },
    rarity: ci < 3 ? 1 : ci < 5 ? 2 : 3,
  })),
);

export const SEED_ITEMS: ItemDef[] = FLOWER_SPECIES.flatMap((sp, si) =>
  ['red', 'yellow', 'white'].map((color, ci) => ({
    id: `seed_${sp.id}_${color}`,
    name: `${sp.name} Seeds (${cap(color)})`,
    cat: 'seed' as const,
    price: 20,
    stack: 10,
    desc: `Plant to grow a ${color} ${sp.name}.`,
    icon: { s: 'seed' as const, c: FLOWER_HEX[color]!, c2: 0xd9b98a },
    plant: { kind: 'flower' as const, v: si * 16 + ci },
    ...(sp.seasons ? { seasons: sp.seasons } : {}),
  })),
);

/** Seasonal treasures: forage that only appears in its season (and teaches that season's recipes). */
export const SEASONAL_ITEMS: ItemDef[] = [
  { id: 'blossom_petals', name: 'Blossom Petals', cat: 'material', price: 40, stack: 30, desc: 'Soft pink petals from the spring trees.', icon: { s: 'flower', c: 0xffc2d4, c2: 0xf28fae }, tags: ['nature', 'cute'], seasons: ['spring'] },
  { id: 'sea_glass', name: 'Sea Glass', cat: 'material', price: 80, stack: 30, desc: 'Smooth, frosty glass polished by summer waves.', icon: { s: 'gem', c: 0x9fe0d0, c2: 0xd8f4ee }, tags: ['sea', 'shiny'], seasons: ['summer'] },
  { id: 'maple_leaves', name: 'Maple Leaves', cat: 'material', price: 30, stack: 30, desc: 'Crunchy red and orange leaves. Fun to jump in!', icon: { s: 'flower', c: 0xe8875a, c2: 0xf5c45e }, tags: ['nature', 'cozy'], seasons: ['autumn'] },
  { id: 'snow_crystal', name: 'Snow Crystal', cat: 'material', price: 60, stack: 30, desc: 'A snowflake that never melts. Cold to the touch!', icon: { s: 'gem', c: 0xe0f0ff, c2: 0x9fc8f0 }, tags: ['shiny', 'cute'], seasons: ['winter'] },
  { id: 'hearth_pumpkin', name: 'Hearth Pumpkin', cat: 'fruit', price: 150, stack: 10, desc: 'A round orange pumpkin that grows wild in autumn fields.', icon: { s: 'fruit', c: 0xf2953c, c2: 0x6aa851 }, tags: ['food', 'cozy'], seasons: ['autumn'] },
  { id: 'snowberry', name: 'Snowberry', cat: 'fruit', price: 120, stack: 10, desc: 'A tiny white berry. Shake a pine tree in winter to find some.', icon: { s: 'fruit', c: 0xf4f7fb, c2: 0x5fae86 }, tags: ['food', 'sweet'], seasons: ['winter'] },
];

export const SAPLING_ITEMS: ItemDef[] = [
  { id: 'sapling_round', name: 'Roundleaf Sapling', cat: 'sapling', price: 160, stack: 10, desc: 'Plant it and in a few days a leafy tree will grow.', icon: { s: 'sapling', c: 0x7fc77a }, tags: ['nature'], plant: { kind: 'sapling', v: 0, item: 'tree' } },
  { id: 'sapling_pine', name: 'Spirepine Sapling', cat: 'sapling', price: 160, stack: 10, desc: 'A tiny conifer that will grow tall and proud.', icon: { s: 'sapling', c: 0x5fae86 }, tags: ['nature'], plant: { kind: 'sapling', v: 0, item: 'pine' } },
];

export const MISC_ITEMS: ItemDef[] = [
  { id: 'bottle', name: 'Message Bottle', cat: 'misc', price: 0, stack: 10, desc: 'A bottle with a rolled-up recipe inside. Use it to read the recipe.', icon: { s: 'bottle', c: 0x9fd9cf, c2: 0xfff1d0 } },
  { id: 'fossil_unknown', name: 'Mystery Fossil', cat: 'fossilUnknown', price: 100, stack: 10, desc: 'Something old and stony. Professor Vesper can identify it.', icon: { s: 'mystery', c: 0xd8c3a5, c2: 0x9c8466 } },
  { id: 'pouch', name: 'Glint Pouch', cat: 'misc', price: 0, stack: 10, desc: 'A little pouch of Glints. Use it to add them to your wallet.', icon: { s: 'bag', c: 0xffd27a, c2: 0x8a6a3a } },
  { id: 'lantern_kit', name: 'Festival Lantern', cat: 'key', price: 0, stack: 20, desc: 'A paper lantern for the Lantern Crossing festival.', icon: { s: 'lantern', c: 0xffb3a7, c2: 0xffe27a }, key: true },
  { id: 'lens', name: 'Old Lighthouse Lens', cat: 'key', price: 0, stack: 1, desc: 'A heavy, cloudy lens from the old lighthouse. It needs polishing.', icon: { s: 'gem', c: 0xbfe3f2, c2: 0xffffff }, key: true },
  { id: 'lens_polished', name: 'Polished Lens', cat: 'key', price: 0, stack: 1, desc: 'Gleaming once more. Ready to be fitted in the lighthouse.', icon: { s: 'gem', c: 0xe8fbff, c2: 0xffe27a }, key: true },
  { id: 'tent_kit', name: 'Camping Tent Kit', cat: 'key', price: 0, stack: 1, desc: 'Pemberly\'s spare tent, rolled up tight.', icon: { s: 'bag', c: 0xf3c57a, c2: 0xd58c5c }, key: true },
  { id: 'letter', name: 'Sealed Letter', cat: 'key', price: 0, stack: 5, desc: 'A letter waiting to be delivered.', icon: { s: 'letter', c: 0xfff6ea, c2: 0xf27c7c }, key: true },
  { id: 'pie', name: 'Twin-Fruit Pie', cat: 'key', price: 0, stack: 1, desc: 'Fresh from Tansy\'s oven. Smells incredible.', icon: { s: 'fruit', c: 0xf2c38a, c2: 0xd9784a }, key: true },
];

// Lost items for villager "find my lost thing" requests.
export const LOST_ITEMS: ItemDef[] = [
  { id: 'lost_hat', name: 'Lost Sunhat', cat: 'key', price: 0, stack: 1, desc: 'Someone\'s favorite hat. Whose could it be?', icon: { s: 'hat', c: 0xf3d27a, c2: 0xf27c7c }, key: true },
  { id: 'lost_glasses', name: 'Lost Reading Glasses', cat: 'key', price: 0, stack: 1, desc: 'Round little glasses.', icon: { s: 'glasses', c: 0x6f6a8a, c2: 0xbfe3f2 }, key: true },
  { id: 'lost_book', name: 'Lost Notebook', cat: 'key', price: 0, stack: 1, desc: 'A well-loved notebook full of doodles.', icon: { s: 'book', c: 0x9fd3f0, c2: 0xfff6ea }, key: true },
  { id: 'lost_key', name: 'Lost Key', cat: 'key', price: 0, stack: 1, desc: 'A tiny brass key on a ribbon.', icon: { s: 'key', c: 0xffc94d, c2: 0xf27c7c }, key: true },
  { id: 'lost_letter', name: 'Lost Letter', cat: 'key', price: 0, stack: 1, desc: 'An unopened letter with a heart sticker.', icon: { s: 'letter', c: 0xfff6ea, c2: 0xff8fa8 }, key: true },
];
