/**
 * Playtest analysis (pure; used by scripts/analyze-playtests.ts and tests).
 * Aggregates exported runs per map + difficulty, compares them with bot runs
 * and turns the differences into tuning SUGGESTIONS — nothing is ever applied.
 */
import type { PlaytestRun } from '../../src/app/playtest';

export interface BotSummary {
  skill: 'good' | 'casual';
  won: boolean;
  lives: number;
  maxLives: number;
  wave: number;
}

export interface GroupStats {
  key: string;
  map: string;
  diff: string;
  mode: string;
  runs: number;
  wins: number;
  losses: number;
  quits: number;
  /** wins / (wins + losses), null when nothing was decided. */
  winRate: number | null;
  /** Waves where runs ended in a loss or quit. */
  endWaves: number[];
  /** Mean lives kept on wins (0..1). */
  livesKept: number | null;
  /** Mean lives lost per wave across runs that reached it. */
  leakByWave: number[];
  medianMinutes: number;
  /** Share of active time at 1×. */
  normalSpeedShare: number;
  towers: Record<string, number>;
  fpsAvg: number;
  fpsLow: number;
}

export interface Suggestion {
  kind: 'harder' | 'easier' | 'spike' | 'quits' | 'pace' | 'performance' | 'unused';
  where: string;
  text: string;
}

const median = (xs: number[]): number => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};
const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Loose shape check — exports come from players' devices. */
export function isRun(x: unknown): x is PlaytestRun {
  const r = x as Partial<PlaytestRun>;
  return !!r && typeof r.map === 'string' && typeof r.diff === 'string' && typeof r.wave === 'number' && (r.result === 'won' || r.result === 'lost' || r.result === 'quit') && Array.isArray(r.leaksByWave);
}

/** Runs from one export file (object with `runs`, or a bare array). Duplicates are removed by the caller. */
export function runsFromExport(json: unknown): PlaytestRun[] {
  const arr = Array.isArray(json) ? json : Array.isArray((json as { runs?: unknown })?.runs) ? (json as { runs: unknown[] }).runs : [];
  return arr.filter(isRun);
}

export function dedupe(runs: PlaytestRun[]): PlaytestRun[] {
  const seen = new Set<string>();
  return runs.filter((r) => {
    const k = JSON.stringify(r);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function groupRuns(runs: PlaytestRun[]): GroupStats[] {
  const groups = new Map<string, PlaytestRun[]>();
  for (const r of runs) {
    const key = `${r.map} ${r.diff} ${r.mode}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const out: GroupStats[] = [];
  for (const [key, rs] of groups) {
    const wins = rs.filter((r) => r.result === 'won');
    const losses = rs.filter((r) => r.result === 'lost');
    const quits = rs.filter((r) => r.result === 'quit');
    const maxWave = Math.max(0, ...rs.map((r) => r.wave));
    const leakByWave: number[] = [];
    for (let w = 0; w < maxWave; w++) {
      const reached = rs.filter((r) => r.wave > w);
      leakByWave.push(mean(reached.map((r) => r.leaksByWave[w] ?? 0)));
    }
    const towers: Record<string, number> = {};
    for (const r of rs) for (const [id, n] of Object.entries(r.towers ?? {})) towers[id] = (towers[id] ?? 0) + n;
    const decided = wins.length + losses.length;
    out.push({
      key,
      map: rs[0]!.map,
      diff: rs[0]!.diff,
      mode: rs[0]!.mode,
      runs: rs.length,
      wins: wins.length,
      losses: losses.length,
      quits: quits.length,
      winRate: decided ? wins.length / decided : null,
      endWaves: [...losses, ...quits].map((r) => r.wave),
      livesKept: wins.length ? mean(wins.map((r) => r.lives / Math.max(1, r.maxLives))) : null,
      leakByWave,
      medianMinutes: median(rs.map((r) => r.realSeconds / 60)),
      normalSpeedShare: mean(rs.map((r) => r.speed?.[0] ?? 1)),
      towers,
      fpsAvg: mean(rs.map((r) => r.fps?.avg ?? 0)),
      fpsLow: mean(rs.map((r) => r.fps?.low1 ?? 0)),
    });
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

/** The 3-wave window holding the most losses/quits. */
export function lossCluster(waves: number[]): { from: number; to: number; count: number } | null {
  if (!waves.length) return null;
  let best = { from: 0, to: 0, count: 0 };
  for (const w of waves) {
    const count = waves.filter((x) => x >= w && x <= w + 2).length;
    if (count > best.count) best = { from: w, to: w + 2, count };
  }
  return best;
}

/** Turn one group (+ bot results) into suggestions. Thresholds are deliberately conservative. */
export function suggest(g: GroupStats, bots: BotSummary[]): Suggestion[] {
  const out: Suggestion[] = [];
  const where = `${g.map} ${g.diff}${g.mode === 'campaign' ? '' : ` (${g.mode})`}`;
  const decided = g.wins + g.losses;
  const good = bots.find((b) => b.skill === 'good');
  const casual = bots.find((b) => b.skill === 'casual');
  const cluster = lossCluster(g.endWaves);
  if (decided >= 3 && g.winRate !== null && g.winRate < 0.5) {
    const at = cluster ? `waves ${cluster.from}–${cluster.to} (${cluster.count} of ${g.endWaves.length} lost/quit runs end there)` : 'no single wave';
    const bot = good ? ` The good bot ${good.won ? `wins with ${good.lives}/${good.maxLives} lives` : `also loses (wave ${good.wave})`}.` : '';
    out.push({
      kind: 'easier',
      where,
      text: `Players win only ${Math.round(g.winRate * 100)} % (${g.wins}/${decided}); losses cluster at ${at}.${bot} Consider easing that stretch: lower TUNING.waves.hp around those waves, a little more gold before them (TUNING.economy.waveClear), or TUNING.difficulties.${g.diff}.hp −5 %.`,
    });
  }
  if (decided >= 3 && g.winRate === 1 && (g.livesKept ?? 0) >= 0.9 && (!casual || casual.won)) {
    out.push({
      kind: 'harder',
      where,
      text: `Every run was won with ${Math.round((g.livesKept ?? 0) * 100)} % of lives kept${casual ? ' and the casual bot wins too' : ''}. If this map should challenge, consider TUNING.difficulties.${g.diff}.hp +5 % or fewer start coins (TUNING.economy.mapStartCoins.${g.map}).`,
    });
  }
  const avgLeak = mean(g.leakByWave);
  g.leakByWave.forEach((l, i) => {
    const others = mean(g.leakByWave.filter((_, j) => j !== i));
    if (g.runs >= 3 && l >= 1.5 && l >= 3 * Math.max(0.2, others)) {
      out.push({
        kind: 'spike',
        where,
        text: `Wave ${i + 1} is a spike: ${l.toFixed(1)} lives lost per run vs ${others.toFixed(1)} on other waves (avg ${avgLeak.toFixed(1)}). Inspect it (\`npx vite-node scripts/simdebug.ts ${g.map} ${g.diff}\`) — fewer constructs, a longer breather, or a counter hint in the wave preview.`,
      });
    }
  });
  if (g.runs >= 4 && g.quits / g.runs >= 0.3) {
    out.push({
      kind: 'quits',
      where,
      text: `${g.quits} of ${g.runs} runs were abandoned${cluster ? ` (around waves ${cluster.from}–${cluster.to})` : ''}. The map may feel too long or stuck — check pacing there.`,
    });
  }
  if (g.runs >= 3 && g.normalSpeedShare < 0.2) {
    out.push({
      kind: 'pace',
      where,
      text: `Players spend only ${Math.round(g.normalSpeedShare * 100)} % of the time at 1× speed — early waves may feel slow (TUNING.economy.breather, wave gaps).`,
    });
  }
  if (g.fpsAvg > 0 && (g.fpsAvg < 45 || g.fpsLow < 25)) {
    out.push({
      kind: 'performance',
      where,
      text: `Frame rate averaged ${Math.round(g.fpsAvg)} fps (slowest 1 %: ${Math.round(g.fpsLow)} fps). Check the device rows below; consider a lower default quality for such devices (src/render/quality.ts).`,
    });
  }
  return out;
}

/** Towers nobody built across enough runs. */
export function unusedTowers(groups: GroupStats[], allTowers: readonly string[], minRuns = 10): Suggestion[] {
  const runs = groups.reduce((a, g) => a + g.runs, 0);
  if (runs < minRuns) return [];
  const used = new Set(groups.flatMap((g) => Object.keys(g.towers)));
  const unused = allTowers.filter((t) => !used.has(t));
  return unused.length ? [{ kind: 'unused', where: 'all maps', text: `Never built in ${runs} runs: ${unused.join(', ')}. Check their cost and value (TUNING.towers), or whether players find them.` }] : [];
}
