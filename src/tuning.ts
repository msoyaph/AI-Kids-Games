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

  // ── Saves ──────────────────────────────────────────────
  saveBudgetBytes: 300 * 1024,
} as const;

export type Tuning = typeof TUNING;
