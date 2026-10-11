/**
 * Cliff Valley balance values — the ONE place for prices, growth, energy and XP numbers.
 * Content files reference these; tests and the pacing model read them too.
 */
export const TUNING = {
  // ── Time ───────────────────────────────────────────────
  /** Real seconds for a full day (6:00 → 2:00). */
  dayRealSeconds: 720,
  dayStartMin: 6 * 60,
  /** 2:00 am next day, in minutes from midnight of the current day */
  dayEndMin: 26 * 60,
  /** "Getting sleepy" from midnight */
  sleepyMin: 24 * 60,
  seasonDays: 10,
  seasons: 4,
  weekDays: 5,

  // ── Player ─────────────────────────────────────────────
  walkSpeed: 76, // px/s
  runSpeed: 76,
  maxEnergyStart: 200,
  maxEnergyCap: 300,
  maxHp: 100,
  /** energy restored when sleeping after midnight is a little lower (gentle) */
  lateSleepEnergyFrac: 0.85,
  inventoryStart: 24,
  inventoryUpgrades: [30, 36],
  toolbarSize: 10,
  reach: 1,

  // ── Energy costs (base, reduced by tool tier/skill) ────
  energy: {
    hoe: 2,
    water: 2,
    axe: 2,
    pickaxe: 2,
    scythe: 0,
    fish: 4,
    bonk: 0,
    tierDiscount: 0.25,
  },

  // ── Coins ──────────────────────────────────────────────
  startCoins: 500,
  /** price multiplier by quality 0..3 */
  qualityMult: [1, 1.25, 1.5, 2],

  // ── Farming ────────────────────────────────────────────
  crowChancePerCrop: 0.004,
  crowMinCrops: 16,
  giantCropChance: 0.02,
  /** chance that unwatered tilled soil un-tills overnight (only if empty) */
  untillChance: 0.1,
  rainChance: [0.22, 0.12, 0.2, 0],
  stormChance: [0.04, 0.1, 0.03, 0],
  windChance: [0.05, 0, 0.25, 0.05],
  snowChance: [0, 0, 0, 0.5],

  // ── Friendship ─────────────────────────────────────────
  heartPoints: 100,
  maxHearts: 10,
  talkPoints: 10,
  giftPoints: { love: 45, like: 25, neutral: 10, dislike: -5 },
  birthdayGiftMult: 3,

  // ── Skills ─────────────────────────────────────────────
  /** cumulative XP needed to reach level n (index n) */
  skillXp: [0, 60, 150, 280, 450, 680, 970, 1330, 1770, 2300, 2950],

  // ── Mine ───────────────────────────────────────────────
  mineFloors: 40,
  elevatorEvery: 5,
  liftFloor: 20,
  /** animals: love needed for big products (big egg / big milk) and the chance at that love */
  animalStartLove: 200,
  animalBigLove: 300,
  animalBigChance: 0.2,
  /** chance each broken rock reveals a ladder, and the sure ladder after this many rocks on a floor */
  ladderChance: 0.05,
  ladderPity: 10,
  /** mining XP: [rock, ore, gem] base + per-layer bonus */
  mineXp: { rock: [1, 1], ore: [5, 2], gem: [10, 3] } as Record<string, [number, number]>,

  // ── Saves ──────────────────────────────────────────────
  saveBudgetBytes: 300 * 1024,
} as const;

export type Tuning = typeof TUNING;

// ── Crop balance: days to mature, regrow days, seed price, sell price, farming XP, yield ──
export interface CropBalance {
  days: number;
  regrow?: number;
  seed: number;
  sell: number;
  xp: number;
  yield?: [number, number];
}

export const CROP_BALANCE: Record<string, CropBalance> = {
  // spring
  radish: { days: 4, seed: 20, sell: 40, xp: 8 },
  lettuce: { days: 4, seed: 25, sell: 50, xp: 8 },
  carrot: { days: 5, seed: 30, sell: 65, xp: 10 },
  potato: { days: 6, seed: 45, sell: 80, xp: 12, yield: [1, 2] },
  strawberry: { days: 7, regrow: 3, seed: 70, sell: 70, xp: 12 },
  peas: { days: 6, regrow: 3, seed: 40, sell: 40, xp: 10 },
  cauliflower: { days: 8, seed: 80, sell: 190, xp: 22 },
  tulip: { days: 5, seed: 20, sell: 45, xp: 8 },
  // summer
  tomato: { days: 7, regrow: 3, seed: 50, sell: 55, xp: 12 },
  corn: { days: 8, regrow: 4, seed: 75, sell: 55, xp: 12 },
  blueberry: { days: 8, regrow: 3, seed: 80, sell: 35, xp: 12, yield: [2, 3] },
  melon: { days: 9, seed: 80, sell: 260, xp: 26 },
  sunflower: { days: 6, seed: 60, sell: 80, xp: 12 },
  hotpepper: { days: 5, regrow: 2, seed: 40, sell: 40, xp: 9 },
  greenbean: { days: 7, regrow: 3, seed: 50, sell: 40, xp: 10 },
  wheat: { days: 4, seed: 10, sell: 25, xp: 5 },
  // autumn
  pumpkin: { days: 9, seed: 100, sell: 330, xp: 30 },
  cranberry: { days: 7, regrow: 3, seed: 120, sell: 75, xp: 14, yield: [2, 2] },
  grape: { days: 8, regrow: 3, seed: 60, sell: 80, xp: 12 },
  eggplant: { days: 5, regrow: 4, seed: 30, sell: 60, xp: 10 },
  yam: { days: 7, seed: 60, sell: 160, xp: 18 },
  beet: { days: 5, seed: 20, sell: 70, xp: 10 },
  broccoli: { days: 6, seed: 50, sell: 115, xp: 14 },
  // winter (cold-hardy)
  kale: { days: 5, seed: 40, sell: 100, xp: 12 },
  spinach: { days: 4, seed: 30, sell: 60, xp: 9 },
  brussels: { days: 8, regrow: 3, seed: 60, sell: 55, xp: 12 },
};

/** Fruit & tapper trees. */
export const TREE_BALANCE = {
  /** days per growth stage for wild trees (seed → grown in 4 stages) */
  wildStageDays: 3,
  fruitTreeDays: 10,
  fruitPerDayMax: 3,
  tapperDays: { oak: 4, maple: 3, pine: 3 } as Record<string, number>,
  chopHp: 10,
  stumpHp: 4,
  wood: [8, 12] as [number, number],
};

/** Sell prices for basic items (crops/fish/etc. have their own tables). */
export const PRICES: Record<string, number> = {
  wood: 2, stone: 2, fiber: 1, sap: 2, hardwood: 15, coal: 15, clay: 20, mixedSeeds: 0,
  acorn: 5, mapleSeed: 5, pineCone: 5,
  oakResin: 120, mapleSyrup: 150, pineTar: 100,
  cherry: 70, peach: 120, orange: 100, apple: 90, pear: 95,
  basicFertilizer: 2, deluxeFertilizer: 10, speedyGrow: 20,
};

export const SAPLING_PRICES: Record<string, number> = { cherry: 900, peach: 1400, orange: 1200, apple: 1000, pear: 1100 };

/** Tool behaviour by tier (0 basic, 1 copper, 2 iron, 3 gold). */
export const TOOL_TIERS = {
  /** watering can capacity */
  canCapacity: [25, 45, 70, 100],
  /** axe/pick damage per hit */
  damage: [2, 3, 4, 6],
  /** upgrade cost [coins, bar id, bars] */
  upgrade: [
    [0, '', 0],
    [2000, 'copperBar', 5],
    [5000, 'ironBar', 5],
    [10000, 'goldBar', 5],
  ] as [number, string, number][],
  upgradeDays: 2,
};

/** Quality roll: chance of gold star = base + per level + fertilizer bonus. */
export const QUALITY = {
  goldBase: 0.02,
  goldPerLevel: 0.025,
  fertGold: [0, 0.12, 0.25, 0],
  sparkleFert: [0, 0, 0.08, 0],
  silverMult: 2.2,
  /** speedy grow reduces days by this fraction */
  speedyGrow: 0.25,
};
