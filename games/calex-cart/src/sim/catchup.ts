// Catch-up measurements (Pro class, 8 racers, items on, rubber band on). Used by `npm run sim` and sim tests.
// A simulated "human" (an AI driver flagged as a player so catch-up and position-based items react to it)
// races 7 Pro AI.
import { RACERS } from '../data/racers';
import { TRACKS } from '../data/tracks/index';
import { BALANCE } from '../tuning/balance';
import { runHeadlessRace } from './headless';

export interface CatchUpOptions {
  tracks?: string[];
  seeds?: number[];
}

export interface CatchUpReport {
  races: number;
  /** Equal-skill fields: median finish-time gap 1st→4th and 1st→8th (seconds). */
  gap4: number;
  gap8: number;
  /** Skill-1.0 human vs Pro AI. */
  strongWin: number;
  strongTop3: number;
  /** Skill-0.3 human vs Pro AI. */
  weakWin: number;
  weakAvgPos: number;
  /** Pro-skill human starting last. */
  lastTop4: number;
  lastAvgPos: number;
}

const median = (a: number[]): number => {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function measureCatchUp(o: CatchUpOptions = {}): CatchUpReport {
  const tracks = o.tracks ?? TRACKS.map((t) => t.id);
  const seeds = o.seeds ?? [11, 23, 37];
  const pro = BALANCE.classes.pro.aiSkill;
  const roster = RACERS.slice(0, 8).map((r) => ({ racerId: r.id, kart: { ...r.defaultKart, paint: 'cherry', decal: 'none' } }));
  const gaps4: number[] = [];
  const gaps8: number[] = [];
  let strongWins = 0;
  let strongTop3 = 0;
  let weakWins = 0;
  let weakPos = 0;
  let lastTop4 = 0;
  let lastPos = 0;
  let n = 0;
  for (const trackId of tracks) {
    for (const seed of seeds) {
      const rot = n % 8;
      // rotate who is the human so no racer/weight class biases the numbers
      const entries = roster.map((_, i) => roster[(i + rot) % 8]);
      const midGrid = [3, 0, 1, 2, 4, 5, 6, 7].map((i) => (i + n) % 8).map((x) => x); // human (0) somewhere mid-pack
      const grid = [...new Set([...midGrid, 0, 1, 2, 3, 4, 5, 6, 7])];
      // A. equal skill (everyone exactly Pro skill), human mid-grid
      const a = runHeadlessRace({ trackId, speedClass: 'pro', entries, seed, items: true, rubberBand: true, aiSkill: pro, human: { index: 0, skill: pro }, gridOrder: grid });
      const t = [...a.finishTimes].sort((x, y) => x - y);
      gaps4.push(t[3] - t[0]);
      gaps8.push(t[7] - t[0]);
      // B. strong human
      const b = runHeadlessRace({ trackId, speedClass: 'pro', entries, seed: seed + 1, items: true, rubberBand: true, human: { index: 0, skill: 1 }, gridOrder: grid });
      if (b.ranks[0] === 1) strongWins++;
      if (b.ranks[0] <= 3) strongTop3++;
      // C. weak human
      const c = runHeadlessRace({ trackId, speedClass: 'pro', entries, seed: seed + 2, items: true, rubberBand: true, human: { index: 0, skill: 0.3 }, gridOrder: grid });
      if (c.ranks[0] === 1) weakWins++;
      weakPos += c.ranks[0];
      // D. Pro-skill human from the back of the grid
      const d = runHeadlessRace({ trackId, speedClass: 'pro', entries, seed: seed + 3, items: true, rubberBand: true, human: { index: 0, skill: pro }, gridOrder: [1, 2, 3, 4, 5, 6, 7, 0] });
      if (d.ranks[0] <= 4) lastTop4++;
      lastPos += d.ranks[0];
      n++;
    }
  }
  return {
    races: n,
    gap4: median(gaps4),
    gap8: median(gaps8),
    strongWin: strongWins / n,
    strongTop3: strongTop3 / n,
    weakWin: weakWins / n,
    weakAvgPos: weakPos / n,
    lastTop4: lastTop4 / n,
    lastAvgPos: lastPos / n,
  };
}
