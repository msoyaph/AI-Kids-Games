import { COURSE_BY_ID, medalFor, type Medal } from '../data/races';
import { STICKERS } from '../data/stickers';
import type { GameState } from './state';

const RANK: Record<Medal, number> = { none: 0, bronze: 1, silver: 2, gold: 3 };

export interface RaceResult {
  medal: Medal;
  best: boolean;
  coins: number;
  sticker: string | null;
}

/** Record a finished race: best time, medal, coins for a better medal, gold sticker. */
export function finishRace(st: GameState, courseId: string, seconds: number): RaceResult {
  const course = COURSE_BY_ID[courseId];
  if (!course) return { medal: 'none', best: false, coins: 0, sticker: null };
  const medal = medalFor(course, seconds, st.tuning.raceTimeMult);
  const prev = st.data.races[courseId];
  const best = !prev || seconds < prev.best;
  const better = !prev || RANK[medal] > RANK[prev.medal];
  st.data.races[courseId] = { best: best ? seconds : prev!.best, medal: better ? medal : prev!.medal };
  let coins = 0;
  if (better && medal !== 'none') {
    coins = course.coins[medal as 'gold' | 'silver' | 'bronze'];
    st.addCoins(coins);
  }
  let sticker: string | null = null;
  if (medal === 'gold') {
    const s = STICKERS.find((x) => x.source.kind === 'race' && x.source.course === courseId);
    if (s && st.addUnique(st.data.stickers, s.id)) {
      sticker = s.id;
      st.post({ kind: 'sticker', id: s.id });
    }
  }
  st.bump('races');
  st.emit({ type: 'race', course: courseId, time: seconds, medal });
  st.markDirty();
  return { medal, best, coins, sticker };
}
