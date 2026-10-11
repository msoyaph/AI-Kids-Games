/**
 * Fish (35), crab-pot catches, junk and forage. Where/when a fish bites: water zone,
 * seasons, weather and time of day. Difficulty 1–5 shapes the reeling minigame.
 */
import { registerItem } from './items';

export type Zone = 'river' | 'lake' | 'pond' | 'ocean' | 'pier' | 'mine';
export type FishShape = 'small' | 'long' | 'round' | 'flat' | 'big' | 'eel' | 'puffer' | 'squid' | 'octo' | 'ray';

export interface FishDef {
  id: string;
  name: string;
  price: number;
  zones: Zone[];
  seasons: number[];
  weather: 'any' | 'rain' | 'sun';
  /** active hours [from, to] in minutes (to may exceed 1440) */
  time: [number, number];
  difficulty: number;
  size: [number, number];
  color: [number, number, number];
  shape: FishShape;
  desc: string;
  rare?: boolean;
}

const ALL = [0, 1, 2, 3];
const DAY: [number, number] = [6 * 60, 19 * 60];
const NIGHT: [number, number] = [18 * 60, 26 * 60];
const ANY: [number, number] = [6 * 60, 26 * 60];

const f = (id: string, name: string, price: number, zones: Zone[], seasons: number[], weather: FishDef['weather'], time: [number, number], difficulty: number, size: [number, number], color: [number, number, number], shape: FishShape, desc: string, rare = false): FishDef => ({ id, name, price, zones, seasons, weather, time, difficulty, size, color, shape, desc, rare });

export const FISH: FishDef[] = [
  // river
  f('sunfish', 'Sunfish', 30, ['river'], [0, 1], 'sun', DAY, 1, [10, 20], [0xf5b942, 0xd2803a, 0xfbe97a], 'round', 'Likes warm, sunny water.'),
  f('bream', 'Bream', 45, ['river'], ALL, 'any', NIGHT, 2, [20, 40], [0x9a8a78, 0x6a5a4a, 0xc8b8a0], 'flat', 'Comes out to eat at night.'),
  f('chub', 'Chub', 35, ['river', 'lake'], ALL, 'any', ANY, 1, [15, 35], [0x8a8aa0, 0x5f5e74, 0xb9b9ca], 'small', 'A friendly little fish found almost anywhere.'),
  f('rainbowTrout', 'Rainbow Trout', 65, ['river', 'lake'], [1], 'sun', DAY, 2, [25, 55], [0x6fb3a0, 0xd2434a, 0xf0d0d8], 'long', 'Shimmers with every color.'),
  f('perch', 'Perch', 55, ['river', 'lake', 'pond'], [3], 'any', ANY, 2, [15, 30], [0x86c25a, 0x3e7c3c, 0xf5d34a], 'small', 'Stripy and tough. Bites even in winter.'),
  f('catfish', 'Catfish', 200, ['river'], [0, 2], 'rain', ANY, 4, [30, 80], [0x6a5a4a, 0x46301f, 0xa08870], 'big', 'Has whiskers like a cat! Loves rainy days.'),
  f('salmon', 'Salmon', 75, ['river'], [2], 'any', DAY, 3, [40, 80], [0xd88a7a, 0x8a5050, 0xffc8b8], 'long', 'Swims upstream every autumn.'),
  f('pike', 'Pike', 100, ['river', 'lake'], [1, 3], 'any', ANY, 4, [40, 100], [0x5c9e48, 0x2c5a37, 0xd8e8a0], 'long', 'A long, speedy hunter.'),
  f('walleye', 'Walleye', 105, ['river', 'lake'], [2], 'rain', [12 * 60, 26 * 60], 3, [30, 70], [0xc8a050, 0x8a6a30, 0xf0e0a0], 'long', 'Its big eyes see in the dark and the rain.'),
  f('shad', 'Shad', 60, ['river'], [0, 1, 2], 'rain', [9 * 60, 26 * 60], 3, [25, 50], [0xb9b9ca, 0x6a6a80, 0xe6e7ef], 'small', 'Travels in big groups on rainy days.'),
  f('smallmouthBass', 'Smallmouth Bass', 50, ['river', 'lake'], [0, 2], 'any', ANY, 2, [20, 45], [0x8a7a40, 0x5a4a20, 0xc8b878], 'round', 'A brown bass with a small mouth.'),
  // lake / pond
  f('carp', 'Carp', 30, ['lake', 'pond'], ALL, 'any', ANY, 1, [30, 70], [0xb08a50, 0x7a5a30, 0xe0c890], 'big', 'A calm, common pond fish.'),
  f('largemouthBass', 'Largemouth Bass', 100, ['lake'], ALL, 'any', DAY, 3, [30, 65], [0x6a9a40, 0x3e6a2a, 0xc8e0a0], 'round', 'A big bass that lives in the mountain lake.'),
  f('sturgeon', 'Sturgeon', 200, ['lake'], [1, 3], 'any', DAY, 4, [60, 150], [0x6a6a80, 0x3d3c4e, 0xb9b9ca], 'long', 'An ancient fish with bony plates.'),
  f('bluegill', 'Bluegill', 40, ['lake', 'pond'], [0, 1, 2], 'any', DAY, 1, [10, 22], [0x4f7fe0, 0x2f4fa8, 0xf5b942], 'round', 'A small blue sunfish.'),
  f('lakeTrout', 'Lake Trout', 85, ['lake'], [0, 2, 3], 'any', ANY, 3, [35, 70], [0x8a9aa0, 0x4a5a60, 0xd0e0e8], 'long', 'Loves cold, deep water.'),
  f('goldfish', 'Goldfish', 80, ['pond'], ALL, 'sun', DAY, 2, [8, 18], [0xf09030, 0xd2602a, 0xffd080], 'round', 'Someone let a goldfish loose in your farm pond long ago!'),
  // ocean
  f('anchovy', 'Anchovy', 30, ['ocean', 'pier'], [0, 2], 'any', ANY, 1, [8, 15], [0x8fb6d8, 0x4f6a8c, 0xd8ecff], 'small', 'Tiny and silvery.'),
  f('sardine', 'Sardine', 40, ['ocean', 'pier'], [0, 2, 3], 'any', DAY, 1, [10, 20], [0x9ab8d8, 0x5f7a9c, 0xd8ecff], 'small', 'Wren\'s favorite snack — and Pickles\' too.'),
  f('herring', 'Herring', 30, ['ocean', 'pier'], [0, 3], 'any', ANY, 2, [15, 30], [0xa8b8c8, 0x6a7a8a, 0xe8f0f8], 'small', 'Swims in shiny schools.'),
  f('flounder', 'Flounder', 100, ['ocean'], [0, 1], 'any', DAY, 3, [20, 45], [0xb08a68, 0x7a5a40, 0xd8c0a0], 'flat', 'Flat as a pancake. Both eyes on one side!'),
  f('halibut', 'Halibut', 80, ['ocean', 'pier'], [0, 1, 3], 'any', DAY, 3, [40, 100], [0x8a7a68, 0x5a4a38, 0xd0c0a8], 'flat', 'A big flatfish from the sandy sea floor.'),
  f('redSnapper', 'Red Snapper', 70, ['ocean'], [1, 2], 'rain', ANY, 2, [30, 60], [0xd2434a, 0x96293a, 0xf0a0a0], 'round', 'Bright red and easy to spot.'),
  f('mackerel', 'Mackerel', 60, ['ocean', 'pier'], [2, 3], 'any', ANY, 2, [25, 45], [0x3f7a80, 0x1f3a48, 0xb8e0e0], 'long', 'Has wavy stripes on its back.'),
  f('pufferfish', 'Pufferfish', 200, ['ocean', 'pier'], [1], 'sun', [12 * 60, 16 * 60], 4, [10, 30], [0xf0d070, 0xb09040, 0xfff0b0], 'puffer', 'Puffs up like a balloon when surprised!'),
  f('eel', 'Eel', 85, ['ocean'], [0, 2], 'rain', NIGHT, 3, [50, 100], [0x5a6a4a, 0x2a3a2a, 0xa0b080], 'eel', 'Long and wiggly. Comes out on rainy nights.'),
  f('squid', 'Squid', 80, ['ocean', 'pier'], [3], 'any', NIGHT, 3, [30, 60], [0xf0c8d8, 0xc08aa0, 0xffffff], 'squid', 'Wiggles all its arms at once!'),
  f('seaBass', 'Sea Bass', 70, ['ocean'], ALL, 'any', ANY, 2, [30, 60], [0x7a8a9a, 0x4a5a6a, 0xc0ccd8], 'round', 'A sturdy fish from the open sea.'),
  // pier (after the pier is fixed)
  f('tuna', 'Tuna', 150, ['pier'], [1, 3], 'any', DAY, 4, [60, 160], [0x2f4fa8, 0x1b3363, 0xb8c8e8], 'big', 'A big, fast ocean fish. Wren\'s favorite!'),
  f('octopus', 'Octopus', 160, ['pier'], [1], 'any', DAY, 5, [40, 120], [0xd27060, 0x96403a, 0xf0b0a0], 'octo', 'Clever, curious and very wiggly.'),
  f('swordfish', 'Swordfish', 180, ['pier'], [1, 2], 'sun', DAY, 5, [100, 250], [0x5f7a9c, 0x2f4a6a, 0xc8d8ec], 'long', 'Has a long pointy nose like a sword.'),
  f('stingray', 'Stingray', 180, ['pier'], [2, 3], 'any', ANY, 4, [50, 150], [0x8a8a7a, 0x5a5a4a, 0xd0d0c0], 'ray', 'Glides through the water like a kite.'),
  // mine pools
  f('iceSmelt', 'Ice Smelt', 60, ['mine'], ALL, 'any', ANY, 2, [8, 18], [0xbfe0f8, 0x6f8aa8, 0xffffff], 'small', 'A see-through fish from the frosty cave pools.'),
  f('glowTetra', 'Glow Tetra', 110, ['mine'], ALL, 'any', ANY, 3, [5, 12], [0xb070e0, 0x7a40a8, 0xf0c8ff], 'small', 'Glows softly in the dark caves.'),
  // legendary
  f('crystalCarp', 'Crystal Carp', 1500, ['lake'], [3], 'any', [6 * 60, 26 * 60], 5, [60, 90], [0x9ae0f0, 0x4f9ab8, 0xffffff], 'big', 'A legendary fish that shines like ice. Wren has been looking for it for fifty years!', true),
];

export const FISH_BY_ID: Record<string, FishDef> = {};
for (const x of FISH) {
  FISH_BY_ID[x.id] = x;
  registerItem({ id: x.id, name: x.name, cat: 'fish', price: x.price, desc: x.desc, quality: true, energy: Math.round(10 + x.price / 10) });
}

export const CRAB_CATCH = {
  ocean: [['crab', 60], ['lobster', 120], ['shrimp', 50], ['clam', 40], ['mussel', 30]] as [string, number][],
  fresh: [['crayfish', 60], ['snail', 35], ['periwinkle', 20]] as [string, number][],
};
const CRAB_NAMES: Record<string, [string, string]> = {
  crab: ['Crab', 'Walks sideways and waves its claws hello.'],
  lobster: ['Lobster', 'A big, fancy shellfish.'],
  shrimp: ['Shrimp', 'Small and curly.'],
  clam: ['Clam', 'Keeps its shell shut tight.'],
  mussel: ['Mussel', 'A shiny dark-blue shell.'],
  crayfish: ['Crayfish', 'A tiny freshwater lobster.'],
  snail: ['River Snail', 'Slow and steady.'],
  periwinkle: ['Periwinkle', 'A teeny spiral snail.'],
};
for (const [id, price] of [...CRAB_CATCH.ocean, ...CRAB_CATCH.fresh]) registerItem({ id, name: CRAB_NAMES[id][0], cat: 'crab', price, desc: CRAB_NAMES[id][1], quality: false, energy: 15 });

export const JUNK = ['driftwood', 'tinCan', 'lostSock', 'oldBottle'];
registerItem({ id: 'driftwood', name: 'Driftwood', cat: 'junk', price: 5, desc: 'Smooth wood from the water. The recycler can use it.' });
registerItem({ id: 'tinCan', name: 'Tin Can', cat: 'junk', price: 2, desc: 'Someone dropped this. Recycle it!' });
registerItem({ id: 'lostSock', name: 'Lost Sock', cat: 'junk', price: 1, desc: 'Where is its partner?! The recycler turns it into cloth.' });
registerItem({ id: 'oldBottle', name: 'Old Bottle', cat: 'junk', price: 3, desc: 'An empty bottle. The recycler loves these.' });
registerItem({ id: 'bait', name: 'Bait', cat: 'bait', price: 1, desc: 'Fish bite faster with bait on your hook. Also fills crab pots.' });
registerItem({ id: 'crabPot', name: 'Crab Pot', cat: 'placeable', price: 0, desc: 'Place it in water next to land and add bait. Check it each morning!', place: 'crabpot', giftable: false });

// ── Forage ────────────────────────────────────────────────
export interface ForageDef {
  id: string;
  name: string;
  price: number;
  seasons: number[];
  where: ('field' | 'forest' | 'beach' | 'mountain')[];
  color: [number, number, number];
  kind: 'leaf' | 'flower' | 'mushroom' | 'berry' | 'nut' | 'shell' | 'root';
  desc: string;
  energy?: number;
}

export const FORAGE: ForageDef[] = [
  { id: 'wildLeek', name: 'Wild Leek', price: 40, seasons: [0], where: ['field', 'forest'], color: [0x86c25a, 0x3e7c3c, 0xf3efe6], kind: 'root', desc: 'A tasty green onion that grows wild.', energy: 15 },
  { id: 'daffodil', name: 'Daffodil', price: 30, seasons: [0], where: ['field', 'forest'], color: [0xf5d34a, 0xe4862e, 0xfbe97a], kind: 'flower', desc: 'A sunny spring flower.' },
  { id: 'dandelion', name: 'Dandelion', price: 35, seasons: [0], where: ['field', 'mountain'], color: [0xf5d34a, 0xd8b030, 0xfff5b8], kind: 'flower', desc: 'Make a wish and blow!', energy: 10 },
  { id: 'morel', name: 'Morel', price: 150, seasons: [0], where: ['forest'], color: [0xb7844f, 0x6a4630, 0xdcae72], kind: 'mushroom', desc: 'A spongy, prized spring mushroom.', energy: 20 },
  { id: 'sweetPea', name: 'Sweet Pea', price: 50, seasons: [1], where: ['field', 'forest'], color: [0xee8ab6, 0xbf5688, 0xffc6dc], kind: 'flower', desc: 'Smells like honey.' },
  { id: 'chamomile', name: 'Chamomile', price: 45, seasons: [1], where: ['field', 'mountain'], color: [0xffffff, 0xf5d34a, 0xfffaf0], kind: 'flower', desc: 'Little daisy-like flowers for calming tea.', energy: 8 },
  { id: 'wildRaspberry', name: 'Wild Raspberry', price: 30, seasons: [1], where: ['forest'], color: [0xd2434a, 0x96293a, 0xf07868], kind: 'berry', desc: 'A sweet summer berry from the bushes.', energy: 12 },
  { id: 'fiddlehead', name: 'Fiddlehead Fern', price: 70, seasons: [1], where: ['forest'], color: [0x5c9e48, 0x2c5a37, 0x86c25a], kind: 'leaf', desc: 'A curly young fern.', energy: 15 },
  { id: 'blackberry', name: 'Blackberry', price: 25, seasons: [2], where: ['forest', 'field'], color: [0x3a2853, 0x1a1520, 0x664788], kind: 'berry', desc: 'Juicy dark berries from autumn bushes.', energy: 12 },
  { id: 'chanterelle', name: 'Chanterelle', price: 120, seasons: [2], where: ['forest'], color: [0xf6b146, 0xe4862e, 0xfbe97a], kind: 'mushroom', desc: 'A golden mushroom that smells like apricots.', energy: 20 },
  { id: 'hazelnut', name: 'Hazelnut', price: 90, seasons: [2], where: ['forest', 'field'], color: [0xb7844f, 0x6a4630, 0xdcae72], kind: 'nut', desc: 'A crunchy autumn nut.', energy: 15 },
  { id: 'wildPlum', name: 'Wild Plum', price: 80, seasons: [2], where: ['field', 'mountain'], color: [0x664788, 0x3a2853, 0x9873be], kind: 'berry', desc: 'A sweet, purple wild fruit.', energy: 15 },
  { id: 'snowdrop', name: 'Snowdrop', price: 60, seasons: [3], where: ['field', 'forest'], color: [0xffffff, 0x86c25a, 0xfffaf0], kind: 'flower', desc: 'A brave little flower that blooms in snow.' },
  { id: 'pineNut', name: 'Pine Nut', price: 80, seasons: [3], where: ['forest', 'mountain'], color: [0xdcae72, 0xb7844f, 0xf4e2b4], kind: 'nut', desc: 'Found in pine cones in winter.', energy: 12 },
  { id: 'hollyBerry', name: 'Holly Berry', price: 70, seasons: [3], where: ['forest', 'field'], color: [0xd2434a, 0x2c5a37, 0xf07868], kind: 'berry', desc: 'Bright red berries on spiky leaves. For decorating — not eating!' },
  { id: 'oysterMushroom', name: 'Oyster Mushroom', price: 110, seasons: [3], where: ['forest'], color: [0xd8d0c0, 0xa89880, 0xfffaf0], kind: 'mushroom', desc: 'Grows on old logs, even in winter.', energy: 18 },
  { id: 'wildMint', name: 'Wild Mint', price: 55, seasons: [0, 1, 2], where: ['mountain'], color: [0x35b0a2, 0x1f7a78, 0x8ae0cf], kind: 'leaf', desc: 'Fresh and minty!', energy: 10 },
  { id: 'seashell', name: 'Seashell', price: 40, seasons: [0, 1, 2, 3], where: ['beach'], color: [0xf4e2b4, 0xe6c98f, 0xffffff], kind: 'shell', desc: 'Hold it to your ear and listen to the sea.' },
  { id: 'coral', name: 'Coral', price: 80, seasons: [0, 1, 2, 3], where: ['beach'], color: [0xf07868, 0xd2434a, 0xffc6dc], kind: 'shell', desc: 'A piece of pink coral washed up on shore.' },
  { id: 'seaGlass', name: 'Sea Glass', price: 70, seasons: [0, 1, 2, 3], where: ['beach'], color: [0x8ae0cf, 0x35b0a2, 0xd8fff8], kind: 'shell', desc: 'Glass made smooth and frosty by the waves.' },
  { id: 'seaweed', name: 'Seaweed', price: 20, seasons: [0, 1, 2, 3], where: ['beach'], color: [0x3e7c3c, 0x1d3a2b, 0x5c9e48], kind: 'leaf', desc: 'Slippery and salty. Good in sushi!', energy: 8 },
];

export const FORAGE_BY_ID: Record<string, ForageDef> = {};
for (const fd of FORAGE) {
  FORAGE_BY_ID[fd.id] = fd;
  registerItem({ id: fd.id, name: fd.name, cat: 'forage', price: fd.price, desc: fd.desc, quality: true, energy: fd.energy, seasons: fd.seasons });
}
