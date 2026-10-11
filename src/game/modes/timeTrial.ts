import type { KartConfig } from '../../data/types';
import { GhostData } from '../../sim/ghost';
import { expertStyle, runTimeTrial, staffSetup } from '../../sim/timeTrialRun';

export interface StaffGhost {
  data: GhostData;
  time: number;
  racerId: string;
  kart: KartConfig;
}

const cache = new Map<string, StaffGhost>();

/**
 * The "staff ghost" for a track: a deterministic run by an expert AI driver (three turbo cans, perfect start,
 * pink drifts, every shortcut) at a per-track calibrated pace (BALANCE.staff), computed headlessly in a few
 * milliseconds. Its time is the target for the "beat the staff" challenges.
 */
export function staffGhost(trackId: string): StaffGhost {
  const hit = cache.get(trackId);
  if (hit) return hit;
  const { pace, seed } = staffSetup(trackId);
  const r = runTimeTrial({ trackId, skill: 1, seed, style: expertStyle(pace), record: true });
  const out: StaffGhost = { data: GhostData.decode(r.ghost!)!, time: r.time, racerId: r.racerId, kart: r.kart };
  cache.set(trackId, out);
  return out;
}
