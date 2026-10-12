import type { TrackData } from '../types';
import { SUNRISE_TRACKS } from './sunrise/index';
import { THUNDER_TRACKS } from './thunder/index';
import { GALAXY_TRACKS } from './galaxy/index';
import { LEGEND_TRACKS } from './legend/index';
import { FROST_TRACKS } from './frost/index';
import { TEST_LOOP } from './testLoop';
import { PRACTICE_RING } from './school/practiceRing';
import { PRACTICE_PARK } from './school/practicePark';

/** Every cup track (20), in cup order. */
export const TRACKS: TrackData[] = [...SUNRISE_TRACKS, ...THUNDER_TRACKS, ...GALAXY_TRACKS, ...LEGEND_TRACKS, ...FROST_TRACKS];

/** Driving School practice courses (not in cups). */
export const SCHOOL_TRACKS: TrackData[] = [PRACTICE_RING, PRACTICE_PARK];

/** Development-only tracks (not in cups). */
export const DEV_TRACKS: TrackData[] = [TEST_LOOP];

export function findTrack(id: string): TrackData {
  return TRACKS.find((t) => t.id === id) ?? SCHOOL_TRACKS.find((t) => t.id === id) ?? DEV_TRACKS.find((t) => t.id === id) ?? TEST_LOOP;
}
