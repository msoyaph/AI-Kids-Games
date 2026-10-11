import type { TrackData } from '../types';
import { SUNRISE_TRACKS } from './sunrise/index';
import { THUNDER_TRACKS } from './thunder/index';
import { GALAXY_TRACKS } from './galaxy/index';
import { LEGEND_TRACKS } from './legend/index';
import { TEST_LOOP } from './testLoop';

/** Every cup track (16 when complete), in cup order. */
export const TRACKS: TrackData[] = [...SUNRISE_TRACKS, ...THUNDER_TRACKS, ...GALAXY_TRACKS, ...LEGEND_TRACKS];

/** Development-only tracks (not in cups). */
export const DEV_TRACKS: TrackData[] = [TEST_LOOP];

export function findTrack(id: string): TrackData {
  return TRACKS.find((t) => t.id === id) ?? DEV_TRACKS.find((t) => t.id === id) ?? TEST_LOOP;
}
