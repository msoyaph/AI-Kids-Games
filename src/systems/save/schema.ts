import { STARTER_LOADOUT, STARTER_PARTS } from '../../data/parts';
import type { Medal } from '../../data/races';
import type { AstronautLook, Difficulty, RocketLoadout } from '../../data/types';

/** Bump this and add a migration in migrations.ts whenever the save shape changes. */
export const SAVE_VERSION = 3;

export interface MissionProgress {
  status: 'active' | 'done';
  /** Index of the current objective. */
  step: number;
  /** Count toward the current objective (e.g. samples collected). */
  count: number;
  /** Ids already counted for this objective (so the same rock isn't counted twice). */
  seen: string[];
}

export interface DailyProgress {
  id: string;
  progress: number;
  done: boolean;
}

export interface PlayStats {
  flights: number;
  landings: number;
  perfectLandings: number;
  coinsCollected: number;
  fuelCells: number;
  bumps: number;
  tows: number;
  slingshots: number;
  cometRides: number;
  boosts: number;
  samples: number;
  puzzles: number;
  scans: number;
  races: number;
  sideDone: number;
  partsEquipped: string[];
  talkedTo: string[];
  dailiesDone: number;
  jumps: number;
}

export interface SaveData {
  version: number;
  slot: number;
  createdAt: number;
  updatedAt: number;
  /** Seconds of play. */
  playTime: number;
  profile: AstronautLook;
  difficulty: Difficulty;
  coins: number;
  coinsEarned: number;
  loadout: RocketLoadout;
  /** Owned parts, outfits and decorations. */
  owned: string[];
  decorPlaced: string[];
  /** Where the rocket is parked. 'earth' means at the Academy. */
  location: string;
  missions: Record<string, MissionProgress>;
  activeMission: string | null;
  chapter: number;
  flags: Record<string, boolean>;
  codex: string[];
  badges: string[];
  stickers: string[];
  /** One-time pickups already taken ("level:index"). */
  collected: string[];
  /** Items in the cargo bay (e.g. ring ice). */
  cargo: Record<string, number>;
  visitedBodies: string[];
  visitedSystems: string[];
  stats: PlayStats;
  daily: { day: string; list: DailyProgress[] };
  races: Record<string, { best: number; medal: Medal }>;
  tipsSeen: string[];
  creditsSeen: boolean;
}

export function defaultProfile(): AstronautLook {
  return { name: 'Cadet', suit: '#f4f7ff', accent: '#4c7dff', helmet: 'round', skin: '#c68a5e', hair: '#2b1a12', hairStyle: 'short', face: 'smile', outfit: 'none' };
}

export function emptyStats(): PlayStats {
  return {
    flights: 0, landings: 0, perfectLandings: 0, coinsCollected: 0, fuelCells: 0, bumps: 0, tows: 0, slingshots: 0, cometRides: 0,
    boosts: 0, samples: 0, puzzles: 0, scans: 0, races: 0, sideDone: 0, partsEquipped: [], talkedTo: [], dailiesDone: 0, jumps: 0,
  };
}

export function createSave(slot: number, profile: AstronautLook = defaultProfile(), difficulty: Difficulty = 'easy'): SaveData {
  const now = Date.now();
  return {
    version: SAVE_VERSION,
    slot,
    createdAt: now,
    updatedAt: now,
    playTime: 0,
    profile,
    difficulty,
    coins: 0,
    coinsEarned: 0,
    loadout: { ...STARTER_LOADOUT, stickers: [] },
    owned: [...STARTER_PARTS],
    decorPlaced: [],
    location: 'earth',
    missions: {},
    activeMission: null,
    chapter: 1,
    flags: {},
    codex: [],
    badges: [],
    stickers: [],
    collected: [],
    cargo: {},
    visitedBodies: ['earth'],
    visitedSystems: ['earth'],
    stats: emptyStats(),
    daily: { day: '', list: [] },
    races: {},
    tipsSeen: [],
    creditsSeen: false,
  };
}
