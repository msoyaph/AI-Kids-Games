import type { ChallengeData, ChallengeGoal } from '../data/types';
import { CHALLENGES } from '../data/challenges';
import type { SaveData } from '../save/save';
import type { SessionResult } from './session';
import { unlock } from './progression';

const MEDAL_RANK = { bronze: 1, silver: 2, gold: 3 } as const;

/** Target for count-based goals (used for progress bars). */
function target(g: ChallengeGoal): number | null {
  switch (g.type) {
    case 'miniTurbos':
    case 'tricks':
    case 'hitWithItem':
    case 'dodge':
    case 'shortcut':
    case 'perfectStart':
    case 'boostPads':
    case 'trophies':
    case 'staffGhosts':
    case 'timeTrials':
    case 'battleWins':
    case 'battlePops':
    case 'totalRaces':
      return g.count;
    case 'driftSeconds':
      return g.seconds;
    default:
      return null;
  }
}

/** Values that come straight from the save (not accumulated per challenge). */
function saveValue(g: ChallengeGoal, save: SaveData): number | null {
  switch (g.type) {
    case 'trophies':
      return Object.keys(save.trophies).length;
    case 'staffGhosts':
      return Object.values(save.records).filter((r) => r.beatStaff).length;
    case 'timeTrials':
      return save.stats.timeTrials;
    case 'totalRaces':
      return save.stats.races;
    case 'trophy': {
      const best = Object.entries(save.trophies)
        .filter(([k]) => k.startsWith(`${g.cup}:`))
        .reduce((m, [, v]) => Math.max(m, MEDAL_RANK[v]), 0);
      return best >= MEDAL_RANK[g.medal] ? 1 : 0;
    }
    default:
      return null;
  }
}

export function challengeProgress(c: ChallengeData, save: SaveData): { value: number; target: number } | null {
  const t = target(c.goal);
  if (t === null) return null;
  const sv = saveValue(c.goal, save);
  const st = save.challenges[c.id];
  const value = st?.done ? t : sv ?? st?.progress ?? 0;
  return { value: Math.floor(value * 10) / 10, target: t };
}

/** How much one race contributes toward a cumulative goal, or whether a one-shot goal is met (1/0). */
function raceAmount(g: ChallengeGoal, r: SessionResult): number {
  const me = r.results.find((x) => x.player === 0);
  if (!me) return 0;
  const s = me.stats;
  const cfg = r.config;
  const isRace = cfg.mode !== 'battle' && cfg.mode !== 'timeTrial';
  const finished = !me.projected;
  switch (g.type) {
    case 'winRace':
      if (!isRace || me.rank !== 1 || !finished) return 0;
      if (g.track && cfg.trackId !== g.track) return 0;
      if (g.speedClass && (cfg.speedClass !== g.speedClass || cfg.mirror)) return 0;
      if (g.mirror && !cfg.mirror) return 0;
      if (g.noItemsUsed && s.itemsUsed > 0) return 0;
      return 1;
    case 'finishPosition':
      if (!isRace || !finished || me.rank > g.maxPosition) return 0;
      if (g.speedClass && cfg.speedClass !== g.speedClass) return 0;
      return 1;
    case 'driftSeconds':
      return s.longestDrift;
    case 'miniTurbos':
      return s.miniTurbos.slice(g.tier - 1).reduce((a, b) => a + b, 0);
    case 'tricks':
      return s.tricks;
    case 'hitWithItem':
      return g.item ? (s.itemHitsByItem[g.item] ?? 0) : s.itemHits;
    case 'dodge':
      return s.dodges;
    case 'shortcut':
      return s.shortcuts;
    case 'perfectStart':
      return s.perfectStart ? 1 : 0;
    case 'boostPads':
      return s.boostPads;
    case 'battleWins':
      return cfg.mode === 'battle' && me.rank === 1 && (!g.arena || cfg.arenaId === g.arena) ? 1 : 0;
    case 'battlePops':
      return cfg.mode === 'battle' ? s.balloonsPopped : 0;
    case 'comeback':
      return isRace && finished && me.rank === 1 && s.worstPosition >= g.fromPosition ? 1 : 0;
    case 'noHitRace':
      return isRace && finished && cfg.items && s.timesHit === 0 ? 1 : 0;
    case 'leadWholeRace':
      return isRace && finished && me.rank === 1 && s.ledWholeRace ? 1 : 0;
    default:
      return 0;
  }
}

/**
 * Update challenge progress after a race (or with `null` after trophies/records change).
 * Completed challenges unlock their reward (queued in save.newUnlocks). Returns newly completed ones.
 */
export function evaluateChallenges(save: SaveData, result: SessionResult | null): ChallengeData[] {
  const done: ChallengeData[] = [];
  for (const c of CHALLENGES) {
    const st = (save.challenges[c.id] ??= { done: false, progress: 0 });
    if (st.done) continue;
    const g = c.goal;
    const t = target(g);
    const sv = saveValue(g, save);
    let complete = false;
    if (sv !== null) {
      st.progress = sv;
      complete = g.type === 'trophy' ? sv >= 1 : sv >= (t ?? 1);
    } else if (result) {
      const amt = raceAmount(g, result);
      if (c.cumulative) {
        st.progress += amt;
        complete = st.progress >= (t ?? 1);
      } else if (g.type === 'driftSeconds') {
        st.progress = Math.max(st.progress, amt);
        complete = amt >= g.seconds;
      } else {
        complete = amt >= 1;
        if (complete) st.progress = 1;
      }
    }
    if (complete) {
      st.done = true;
      unlock(save, c.reward);
      done.push(c);
    }
  }
  return done;
}
