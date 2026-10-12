/** GameState: plain JSON-friendly data for everything that must persist. */
import type { Dir } from '../core/math';
import type { ItemStack } from './types';

export type Weather = 'sun' | 'rain' | 'storm' | 'wind' | 'snow';
export type SkillId = 'farming' | 'foraging' | 'fishing' | 'mining' | 'cooking';
export const SKILLS: SkillId[] = ['farming', 'foraging', 'fishing', 'mining', 'cooking'];

export interface PlayerLook {
  skin: number;
  hair: number;
  hairStyle: string;
  shirt: number;
  pants: number;
}

export interface Buff {
  id: string;
  /** absolute minute (day*1440+min) when it ends */
  until: number;
  speed?: number;
  luck?: number;
  farming?: number;
  fishing?: number;
  mining?: number;
  foraging?: number;
  defense?: number;
}

export interface PlayerState {
  name: string;
  farm: string;
  look: PlayerLook;
  loc: string;
  x: number;
  y: number;
  dir: Dir;
  energy: number;
  maxEnergy: number;
  hp: number;
  maxHp: number;
  coins: number;
  inv: (ItemStack | null)[];
  sel: number;
  tools: Record<string, number>;
  xp: Record<SkillId, number>;
  perks: string[];
  buffs: Buff[];
  recipes: string[];
  crafts: string[];
  /** total coins earned (for achievements / farm rating) */
  earned: number;
  /** water left in the watering can */
  water: number;
}

export interface PetState {
  kind: 'dog' | 'cat';
  name: string;
  color: number;
  love: number;
  petted: boolean;
  /** water bowl filled today */
  bowl: boolean;
}

export interface NpcState {
  pts: number;
  talked: boolean;
  gifted: boolean;
  giftsWeek: number;
  met: boolean;
  /** heart events seen */
  ev: number[];
  bdayGift: boolean;
}

export interface AnimalState {
  id: number;
  kind: string;
  name: string;
  home: 'coop' | 'barn';
  age: number;
  love: number;
  fed: boolean;
  petted: boolean;
  /** product ready to collect */
  prod: string | null;
  prodQ: number;
  /** current location id + tile */
  loc: string;
  x: number;
  y: number;
  /** days since last product */
  pd: number;
  /** outdoors today */
  out: boolean;
}

export interface BuildingState {
  /** plot id → upgrade level (0 = basic). Missing = not built. */
  built: Record<string, number>;
  /** building being constructed: plot id + days remaining + target level */
  constructing: { plot: string; days: number; level: number } | null;
  houseLevel: number;
  houseUpgrade: { days: number; level: number } | null;
  hay: number;
}

export interface StoryState {
  /** board id → bundle id → array of item ids donated (by slot) */
  boards: Record<string, Record<string, (string | null)[]>>;
  /** completed bundles */
  bundles: string[];
  /** completed boards (repairs done) */
  done: string[];
  /** repair waiting to happen tomorrow morning */
  pending: string[];
  heartstone: number; // 0 none, 1 found, 2 placed
  finale: number; // 0 not yet, 1 shown
  festivalsDone: string[];
  /** misc cutscenes/events seen */
  seen: string[];
}

export interface QuestState {
  /** active help-wanted request */
  board: { npc: string; item: string; n: number; reward: number; until: number; text: string } | null;
  /** completed count */
  done: number;
  /** story quest log keys */
  log: string[];
}

export interface Mail {
  id: string;
  read?: boolean;
  /** item or recipe attached (claimed once) */
  claimed?: boolean;
}

export interface CollectionState {
  shipped: Record<string, number>;
  fish: Record<string, number>;
  /** biggest size cm per fish */
  fishSize: Record<string, number>;
  museum: string[];
  cooked: Record<string, number>;
  crafted: Record<string, number>;
  found: Record<string, number>;
}

export interface MineState {
  deepest: number;
  /** floors unlocked in the elevator (multiples of 5) */
  elevator: number;
  /** current floor if inside the mine */
  floor: number;
  /** mine chests opened (floor numbers) */
  chests: number[];
}

export interface Stats {
  steps: number;
  tilled: number;
  watered: number;
  harvested: number;
  shippedValue: number;
  fishCaught: number;
  critters: number;
  rocks: number;
  trees: number;
  gifts: number;
  cooked: number;
  crafted: number;
  forage: number;
  daysPlayed: number;
  faints: number;
  geodes: number;
  questsDone: number;
  animalProducts: number;
  petted: number;
  sleepsLate: number;
}

export interface GameState {
  v: number;
  seed: number;
  /** total play time in seconds */
  playSec: number;
  player: PlayerState;
  pet: PetState;
  /** absolute day index (0 = Spring 1, Year 1) */
  day: number;
  /** minutes since midnight (360..1560) */
  min: number;
  weather: Weather;
  tomorrow: Weather;
  flags: Record<string, number>;
  npcs: Record<string, NpcState>;
  animals: AnimalState[];
  nextAnimalId: number;
  buildings: BuildingState;
  story: StoryState;
  quests: QuestState;
  mail: Mail[];
  /** mail scheduled for future mornings: day → ids */
  mailQueue: Record<number, string[]>;
  col: CollectionState;
  mine: MineState;
  stats: Stats;
  achievements: string[];
  tips: string[];
  /** shipping bin contents (paid overnight) */
  bin: ItemStack[];
  /** yesterday's earnings summary for the morning report */
  lastShip: { items: { id: string; n: number; v: number }[]; total: number } | null;
  /** suspended mid-day save flag */
  suspended: boolean;
  /** items that didn't fit in the bag wait in the Lost & Found box at home */
  overflow: ItemStack[];
  /** purchases today per shop.item (daily limits) */
  shopToday: Record<string, number>;
}

export const seasonOf = (day: number): number => Math.floor(day / 10) % 4;
export const dayOfSeason = (day: number): number => (day % 10) + 1;
export const yearOf = (day: number): number => Math.floor(day / 40) + 1;
export const weekdayOf = (day: number): number => day % 5;
export const SEASON_NAMES = ['Spring', 'Summer', 'Autumn', 'Winter'];
export const WEEKDAY_NAMES = ['Seedday', 'Sproutday', 'Bloomday', 'Fruitday', 'Restday'];
export const WEEKDAY_SHORT = ['Sed', 'Spr', 'Blm', 'Frt', 'Rst'];

export function emptyStats(): Stats {
  return {
    steps: 0, tilled: 0, watered: 0, harvested: 0, shippedValue: 0, fishCaught: 0, critters: 0, rocks: 0, trees: 0,
    gifts: 0, cooked: 0, crafted: 0, forage: 0, daysPlayed: 0, faints: 0, geodes: 0, questsDone: 0, animalProducts: 0,
    petted: 0, sleepsLate: 0,
  };
}
