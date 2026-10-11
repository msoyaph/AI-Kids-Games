/**
 * Valley Hall restoration boards. Each board has bundles; a bundle offers several options
 * and needs any `need` of them — so there's always more than one way to finish.
 * Completing a whole board repairs part of the valley the next morning.
 */
export interface BundleOption {
  /** exact item ids accepted (any of them) */
  items?: string[];
  /** or any item of this category */
  cat?: string;
  /** or any item whose id starts with one of these */
  prefix?: string[];
  n: number;
  /** minimum quality */
  q?: number;
  label: string;
}

export interface BundleDef {
  id: string;
  name: string;
  need: number;
  options: BundleOption[];
  reward: { item?: string; n?: number; coins?: number; craft?: string; recipe?: string };
}

export interface BoardDef {
  id: 'crops' | 'forage' | 'fish' | 'animal' | 'minerals' | 'crafted';
  name: string;
  repair: string;
  repairText: string;
  color: number;
  bundles: BundleDef[];
}

const one = (id: string, n = 1, label?: string, q?: number): BundleOption => ({ items: [id], n, q, label: label ?? '' });
const anyOf = (items: string[], label: string, n = 1): BundleOption => ({ items, n, label });

export const BOARDS: BoardDef[] = [
  {
    id: 'forage',
    name: 'Forage Board',
    repair: 'Old Bridge',
    repairText: 'The old bridge on the mountain is fixed! You can now cross to the Old Quarry.',
    color: 0x5c9e48,
    bundles: [
      { id: 'springFinds', name: 'Spring Finds', need: 3, options: [one('wildLeek'), one('daffodil'), one('dandelion'), one('morel'), one('wildMint')], reward: { item: 'seed.strawberry', n: 5 } },
      { id: 'woodland', name: 'Woodland Bundle', need: 3, options: [one('wood', 30), one('sap', 10), one('fiber', 20), anyOf(['acorn', 'mapleSeed', 'pineCone'], 'Tree Seed')], reward: { item: 'tapper', n: 1 } },
      { id: 'wildTreats', name: 'Wild Treats', need: 3, options: [one('sweetPea'), one('chamomile'), one('wildRaspberry'), one('fiddlehead'), one('blackberry'), one('chanterelle'), one('hazelnut'), one('wildPlum'), one('snowdrop'), one('pineNut'), one('hollyBerry'), one('oysterMushroom')], reward: { item: 'deluxeFertilizer', n: 10 } },
      { id: 'beachcomber', name: 'Beachcomber', need: 3, options: [one('seashell'), one('coral'), one('seaGlass'), one('seaweed')], reward: { item: 'crabPot', n: 2 } },
    ],
  },
  {
    id: 'crops',
    name: 'Crops Board',
    repair: 'Greenhouse',
    repairText: 'The greenhouse on your farm is fixed! Plants grow inside all year long.',
    color: 0xe4862e,
    bundles: [
      { id: 'springCrops', name: 'Spring Crops', need: 3, options: ['radish', 'lettuce', 'carrot', 'potato', 'cauliflower', 'strawberry', 'peas', 'tulip'].map((i) => one(i)), reward: { item: 'speedyGrow', n: 10 } },
      { id: 'summerCrops', name: 'Summer Crops', need: 3, options: ['tomato', 'corn', 'blueberry', 'melon', 'sunflower', 'hotpepper', 'greenbean', 'wheat'].map((i) => one(i)), reward: { item: 'sprinkler1', n: 3 } },
      { id: 'autumnCrops', name: 'Autumn Crops', need: 3, options: ['pumpkin', 'cranberry', 'grape', 'eggplant', 'yam', 'beet', 'broccoli', 'corn'].map((i) => one(i)), reward: { item: 'sapling.apple', n: 1 } },
      { id: 'quality', name: 'Shiny Crops', need: 2, options: [{ cat: 'crop', n: 2, q: 2, label: 'Gold-star crops' }, { cat: 'fruit', n: 2, q: 2, label: 'Gold-star fruit' }, { cat: 'crop', n: 5, q: 1, label: 'Silver-star crops' }], reward: { item: 'sprinkler2', n: 2 } },
    ],
  },
  {
    id: 'fish',
    name: 'Fish Board',
    repair: 'Beach Pier',
    repairText: 'The beach pier is fixed! Big ocean fish bite at the end of the pier.',
    color: 0x4f7fe0,
    bundles: [
      { id: 'river', name: 'River Fish', need: 3, options: ['sunfish', 'bream', 'chub', 'rainbowTrout', 'perch', 'catfish', 'salmon', 'pike', 'walleye', 'shad', 'smallmouthBass'].map((i) => one(i)), reward: { item: 'bait', n: 30 } },
      { id: 'ocean', name: 'Ocean Fish', need: 3, options: ['anchovy', 'sardine', 'herring', 'flounder', 'halibut', 'redSnapper', 'mackerel', 'pufferfish', 'eel', 'squid', 'seaBass'].map((i) => one(i)), reward: { item: 'crabPot', n: 3 } },
      { id: 'lake', name: 'Lake & Pond', need: 2, options: ['carp', 'largemouthBass', 'bluegill', 'lakeTrout', 'sturgeon', 'goldfish', 'chub'].map((i) => one(i)), reward: { recipe: 'fishStew' } },
      { id: 'crabPot', name: 'Crab Pot Catch', need: 3, options: ['crab', 'lobster', 'shrimp', 'clam', 'mussel', 'crayfish', 'snail', 'periwinkle'].map((i) => one(i)), reward: { coins: 1500 } },
    ],
  },
  {
    id: 'animal',
    name: 'Animal Board',
    repair: 'Valley Train',
    repairText: 'The Valley Train runs again! Visitors arrive, and a traveling cart stops by the station.',
    color: 0xee8ab6,
    bundles: [
      { id: 'coop', name: 'Coop Goods', need: 2, options: [one('egg', 3), one('bigEgg'), one('duckEgg'), one('duckFeather'), one('rabbitFur')], reward: { item: 'hay', n: 20 } },
      { id: 'barn', name: 'Barn Goods', need: 2, options: [one('milk', 3), one('bigMilk'), one('goatMilk'), one('wool')], reward: { item: 'cheesePress', n: 1 } },
      { id: 'dairy', name: 'Dairy & Wool', need: 2, options: [one('cheese'), one('goatCheese'), one('cloth'), one('honey')], reward: { item: 'loom', n: 1 } },
      { id: 'farmFresh', name: 'Farm Fresh', need: 2, options: [anyOf(['egg', 'bigEgg', 'duckEgg'], 'Any egg', 5), anyOf(['milk', 'bigMilk', 'goatMilk'], 'Any milk', 3), one('hay', 10)], reward: { coins: 2000 } },
    ],
  },
  {
    id: 'minerals',
    name: 'Minerals Board',
    repair: 'Mine Lift',
    repairText: 'The Mine Lift works again! The elevator can now reach the deep caves below floor 20.',
    color: 0x9873be,
    bundles: [
      { id: 'ores', name: 'Ores & Bars', need: 3, options: [one('copperOre', 10), one('ironOre', 10), one('coal', 10), one('copperBar', 2), one('ironBar', 1)], reward: { item: 'furnace', n: 1 } },
      { id: 'gems', name: 'Glittering Gems', need: 3, options: ['quartz', 'amethyst', 'topaz', 'jade', 'aquamarine', 'ruby', 'emerald'].map((i) => one(i)), reward: { item: 'popBomb', n: 5 } },
      { id: 'geodeFinds', name: 'Geode Finds', need: 3, options: ['calcite', 'pyrite', 'mica', 'jasper', 'malachite', 'fluorite', 'moonstone', 'agate', 'obsidian'].map((i) => one(i)), reward: { item: 'ironBar', n: 3 } },
      { id: 'treasure', name: 'Buried Treasure', need: 2, options: ['oldCoin', 'potShard', 'fossilShell', 'arrowhead', 'oldKey', 'ammonite', 'leafFossil', 'teacup'].map((i) => one(i)), reward: { coins: 1500 } },
    ],
  },
  {
    id: 'crafted',
    name: 'Crafted Goods Board',
    repair: 'Valley Hall',
    repairText: 'The Valley Hall is fully restored! New clock, new paint, and Juno\'s mural on the wall.',
    color: 0xf5b942,
    bundles: [
      { id: 'preserves', name: 'Jars of Joy', need: 2, options: [{ prefix: ['jam.'], n: 1, label: 'Any jam' }, { prefix: ['pickles.'], n: 1, label: 'Any pickles' }, { prefix: ['juice.'], n: 1, label: 'Any juice' }], reward: { item: 'preservesJar', n: 2 } },
      { id: 'kitchen', name: 'Kitchen Treats', need: 3, options: [{ cat: 'food', n: 1, label: 'A cooked dish' }, { cat: 'food', n: 1, label: 'Another dish' }, { cat: 'food', n: 1, label: 'One more dish' }], reward: { craft: 'starLight' } },
      { id: 'handmade', name: 'Handmade', need: 2, options: [one('chest'), one('scarecrow'), one('sprinkler1'), one('torch', 5), one('woodFence', 10)], reward: { item: 'sprinkler2', n: 2 } },
      { id: 'fine', name: 'Fine Goods', need: 2, options: [one('cloth'), one('oil'), one('mapleSyrup'), one('oakResin'), one('pineTar'), one('honey')], reward: { craft: 'foundersStatue' } },
    ],
  },
];

export const BOARD: Record<string, BoardDef> = {};
for (const b of BOARDS) BOARD[b.id] = b;

/** The year-one goal: every board + the Heartstone in the crystal lamp. */
export const FINALE_DAY = 39; // Winter 10, Year 1
