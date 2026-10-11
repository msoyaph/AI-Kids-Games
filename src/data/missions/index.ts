import type { MissionDef } from '../missionTypes';
import { CHAPTER1 } from './chapter1';
import { CHAPTER2 } from './chapter2';
import { CHAPTER3 } from './chapter3';
import { CHAPTER4 } from './chapter4';
import { CHAPTER5 } from './chapter5';

/** Every mission, in story order. */
export const MISSIONS: MissionDef[] = [...CHAPTER1, ...CHAPTER2, ...CHAPTER3, ...CHAPTER4, ...CHAPTER5];

export const MISSION_BY_ID: Record<string, MissionDef> = Object.fromEntries(MISSIONS.map((m) => [m.id, m]));

export const CHAPTER_NAMES: Record<number, string> = {
  1: 'Cadet Training',
  2: 'The Inner Planets',
  3: 'The Asteroid Belt and Jupiter',
  4: 'The Outer Planets',
  5: 'Beyond the Stars',
};
