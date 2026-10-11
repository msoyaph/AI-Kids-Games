/** New game creation: initial state + seeded farm clutter. */
import { TILE } from '../core/math';
import { Rng, hash32 } from '../core/rng';
import { TUNING } from '../tuning';
import { emptyStats, type GameState, type PlayerLook } from './state';
import { Ter } from './terrain';
import type { Loc } from './world';

export interface NewGameOptions {
  name: string;
  farm: string;
  pet: 'dog' | 'cat';
  petName: string;
  petColor?: number;
  look?: PlayerLook;
  seed?: number;
}

export const DEFAULT_LOOK: PlayerLook = { skin: 0xf2c49b, hair: 0x6a4630, hairStyle: 'short', shirt: 0x4f7fe0, pants: 0x46301f };

function startInventory(): GameState['player']['inv'] {
  const inv: GameState['player']['inv'] = new Array(TUNING.inventoryStart).fill(null);
  ['tool.hoe', 'tool.can', 'tool.axe', 'tool.pick', 'tool.scythe'].forEach((id, i) => (inv[i] = { id, n: 1, q: 0 }));
  inv[5] = { id: 'seed.radish', n: 12, q: 0 };
  return inv;
}

export function createState(o: NewGameOptions): GameState {
  const seed = (o.seed ?? Math.floor(Math.random() * 2 ** 31)) >>> 0;
  return {
    v: 0, // set by save module
    seed,
    playSec: 0,
    player: {
      name: o.name || 'Farmer',
      farm: o.farm || 'Cliffside',
      look: o.look ?? DEFAULT_LOOK,
      loc: 'farmhouse',
      x: 3 * TILE + 8,
      y: 4 * TILE + 12,
      dir: 0,
      energy: TUNING.maxEnergyStart,
      maxEnergy: TUNING.maxEnergyStart,
      hp: TUNING.maxHp,
      maxHp: TUNING.maxHp,
      coins: TUNING.startCoins,
      inv: startInventory(),
      sel: 0,
      tools: { hoe: 0, can: 0, axe: 0, pick: 0, scythe: 0, rod: -1, bonk: -1, sling: -1 },
      xp: { farming: 0, foraging: 0, fishing: 0, mining: 0, cooking: 0 },
      perks: [],
      buffs: [],
      recipes: ['friedEgg', 'salad'],
      crafts: ['chest', 'scarecrow', 'woodFence', 'woodPath', 'torch', 'basicFertilizer'],
      earned: 0,
      water: 25,
    },
    pet: { kind: o.pet, name: o.petName || (o.pet === 'dog' ? 'Biscuit' : 'Mochi'), color: o.petColor ?? 0, love: 0, petted: false, bowl: false },
    day: 0,
    min: TUNING.dayStartMin,
    weather: 'sun',
    tomorrow: 'sun',
    flags: {},
    npcs: {},
    animals: [],
    nextAnimalId: 1,
    buildings: { built: {}, constructing: null, houseLevel: 0, houseUpgrade: null, hay: 0 },
    story: { boards: {}, bundles: [], done: [], pending: [], heartstone: 0, finale: 0, festivalsDone: [], seen: [] },
    quests: { board: null, done: 0, log: [] },
    mail: [],
    mailQueue: {},
    col: { shipped: {}, fish: {}, fishSize: {}, museum: [], cooked: {}, crafted: {}, found: {} },
    mine: { deepest: 0, elevator: 0, floor: 0, chests: [] },
    stats: emptyStats(),
    achievements: [],
    tips: [],
    bin: [],
    lastShip: null,
    suspended: false,
    overflow: [],
  };
}

/** Scatter weeds, stones, twigs, stumps, logs, boulders and trees over the farm. */
export function generateFarmClutter(farm: Loc, seed: number): void {
  const rng = new Rng(hash32(seed, 0xfa4));
  const near = (x: number, y: number, t: number) => {
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (farm.ter(x + i, y + j) === t) return true;
    return false;
  };
  for (let y = 2; y < farm.h - 2; y++) {
    for (let x = 2; x < farm.w - 2; x++) {
      if (!farm.isTillable(x, y)) continue;
      if (farm.inClearZone(x, y)) continue;
      if (farm.obj(x, y)) continue;
      if (near(x, y, Ter.PATH) || near(x, y, Ter.WATER)) continue;
      if (farm.warpAtTile(x, y)) continue;
      const r = rng.next();
      if (r < 0.006 && canBig(farm, x, y)) {
        farm.setBig(x, y, 2, 2, rng.chance(0.5) ? { k: 'log', id: 'log', hp: 10 } : { k: 'boulder', id: 'boulder', hp: 10 });
      } else if (r < 0.04) {
        const kind = rng.pick(['oak', 'oak', 'maple', 'pine']);
        farm.setObj(x, y, { k: 'tree', id: kind, g: rng.chance(0.75) ? 4 : rng.range(1, 3), hp: 10 });
      } else if (r < 0.15) {
        farm.setObj(x, y, { k: 'weed', id: 'weed', hp: 1, n: rng.int(3) });
      } else if (r < 0.2) {
        farm.setObj(x, y, { k: 'stone', id: 'stone', hp: 1, n: rng.int(3) });
      } else if (r < 0.24) {
        farm.setObj(x, y, { k: 'twig', id: 'twig', hp: 1, n: rng.int(2) });
      } else if (r < 0.255) {
        farm.setObj(x, y, { k: 'stump', id: 'stump', hp: 4 });
      }
    }
  }
}

function canBig(loc: Loc, x: number, y: number): boolean {
  for (let j = 0; j < 2; j++)
    for (let i = 0; i < 2; i++) {
      if (!loc.isTillable(x + i, y + j) || loc.obj(x + i, y + j) || loc.inClearZone(x + i, y + j)) return false;
    }
  return true;
}
