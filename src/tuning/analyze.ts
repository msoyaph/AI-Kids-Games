// Pure playtest analysis (used by scripts/analyzePlaytests.ts and unit tests). Aggregates exported playtest logs,
// compares them with simulator baselines and produces *suggested* BALANCE edits. Nothing here changes the game.
import type { PlaytestExport, PlaytestRecord } from '../save/playtest';
import { BALANCE } from './balance';

export interface Group {
  key: string;
  track: string;
  cls: string;
  races: number;
  finished: number;
  quits: number;
  /** Normalised finish position 0 (won) .. 1 (last), finished races only. */
  posNorm: number[];
  wins: number;
  podiums: number;
  times: number[];
  bestLaps: number[];
  falls: number[];
  mt: [number, number, number];
  drift: number[];
  starts: { perfect: number; boost: number; early: number; none: number };
  hitsTaken: number[];
  walls: number[];
  offroad: number[];
  shortcutRaces: number;
  assist: Record<string, number>;
  input: Record<string, number>;
}

export interface SimBaseline {
  /** Pro-AI-like winner time and per-racer averages for the same track/class. */
  winnerTime: number;
  bestLap: number;
  fallsPerRacer: number;
  miniTurbosPerRacer: [number, number, number];
}

export interface Suggestion {
  /** BALANCE path (or TUNING / track data) the suggestion is about. */
  field: string;
  current: string;
  suggested: string;
  why: string;
  confidence: 'low' | 'medium' | 'high';
}

const avg = (a: number[]): number => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
export const median = (a: number[]): number => {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Accepts one export, an array of exports, or a bare array of records. */
export function collectRecords(inputs: unknown[]): PlaytestRecord[] {
  const out: PlaytestRecord[] = [];
  const take = (x: unknown): void => {
    if (Array.isArray(x)) {
      for (const r of x) take(r);
      return;
    }
    if (!x || typeof x !== 'object') return;
    const o = x as Partial<PlaytestExport> & Partial<PlaytestRecord>;
    if (Array.isArray(o.races)) for (const r of o.races) take(r);
    else if (typeof o.track === 'string' && Array.isArray(o.p)) out.push(o as PlaytestRecord);
  };
  for (const i of inputs) take(i);
  return out;
}

export function groupRecords(records: PlaytestRecord[]): Group[] {
  const map = new Map<string, Group>();
  for (const r of records) {
    if (r.mode === 'battle') continue;
    const key = `${r.track}|${r.cls}${r.mirror ? '|mirror' : ''}`;
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        track: r.track,
        cls: r.mirror ? 'mirror' : r.cls,
        races: 0,
        finished: 0,
        quits: 0,
        posNorm: [],
        wins: 0,
        podiums: 0,
        times: [],
        bestLaps: [],
        falls: [],
        mt: [0, 0, 0],
        drift: [],
        starts: { perfect: 0, boost: 0, early: 0, none: 0 },
        hitsTaken: [],
        walls: [],
        offroad: [],
        shortcutRaces: 0,
        assist: {},
        input: {},
      };
      map.set(key, g);
    }
    for (const p of r.p) {
      g.races++;
      g.assist[p.assist] = (g.assist[p.assist] ?? 0) + 1;
      g.input[p.input] = (g.input[p.input] ?? 0) + 1;
      if (r.quit) {
        g.quits++;
        continue;
      }
      g.finished++;
      if (r.mode !== 'timeTrial' && p.of > 1) {
        g.posNorm.push((p.pos - 1) / (p.of - 1));
        if (p.pos === 1) g.wins++;
        if (p.pos <= 3) g.podiums++;
      }
      if (p.time > 0 && !p.projected) g.times.push(p.time);
      if (p.laps.length) g.bestLaps.push(Math.min(...p.laps));
      g.falls.push(p.falls);
      for (let t = 0; t < 3; t++) g.mt[t] += p.mt[t] ?? 0;
      g.drift.push(p.drift);
      g.starts[p.start] = (g.starts[p.start] ?? 0) + 1;
      g.hitsTaken.push(p.hitsTaken);
      g.walls.push(p.walls);
      g.offroad.push(p.offroad);
      if (p.shortcuts.some((n) => n > 0)) g.shortcutRaces++;
    }
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

/** Turn aggregated player data (+ optional simulator baselines) into suggested edits. */
export function suggest(groups: Group[], baselines: Map<string, SimBaseline> = new Map(), staffTimes: Map<string, number> = new Map()): Suggestion[] {
  const out: Suggestion[] = [];
  const MIN = 5; // races needed before we say anything about a group
  // ---- per class: are players winning too much / too little against the AI?
  const byClass = new Map<string, Group[]>();
  for (const g of groups) byClass.set(g.cls, [...(byClass.get(g.cls) ?? []), g]);
  for (const [cls, gs] of byClass) {
    const pos = gs.flatMap((g) => g.posNorm);
    if (pos.length < MIN * 2 || cls === 'mirror') continue;
    const wins = gs.reduce((a, g) => a + g.wins, 0) / pos.length;
    const mean = avg(pos);
    const c = BALANCE.classes[cls as keyof typeof BALANCE.classes];
    if (!c) continue;
    const conf = pos.length >= 40 ? 'high' : pos.length >= 15 ? 'medium' : 'low';
    if (mean > 0.6 || wins < 0.08) {
      out.push({
        field: `BALANCE.classes.${cls}.aiSkill`,
        current: c.aiSkill.toFixed(2),
        suggested: Math.max(0.1, c.aiSkill - 0.05).toFixed(2),
        why: `Players average ${(mean * 100).toFixed(0)} % down the field and win ${(wins * 100).toFixed(0)} % of ${cls} races — the AI feels too strong.`,
        confidence: conf,
      });
      out.push({
        field: `BALANCE.classes.${cls}.rubberFront`,
        current: c.rubberFront.toFixed(3),
        suggested: (c.rubberFront + 0.015).toFixed(3),
        why: 'Let runaway AI leaders ease off a little more so players can catch up.',
        confidence: conf,
      });
    } else if (mean < 0.18 && wins > 0.6) {
      out.push({
        field: `BALANCE.classes.${cls}.aiSkill`,
        current: c.aiSkill.toFixed(2),
        suggested: Math.min(1, c.aiSkill + 0.05).toFixed(2),
        why: `Players win ${(wins * 100).toFixed(0)} % of ${cls} races (avg position ${(mean * 100).toFixed(0)} %) — the AI is too easy.`,
        confidence: conf,
      });
    }
  }
  // ---- per track
  for (const g of groups) {
    if (g.finished < MIN) continue;
    const fallsPer = avg(g.falls);
    const b = baselines.get(`${g.track}|${g.cls}`);
    if (fallsPer > 1.5 && (!b || fallsPer > b.fallsPerRacer * 3 + 0.5)) {
      out.push({
        field: `track ${g.track} (drop edges) / BALANCE.assist.levels.light.dropBlend`,
        current: BALANCE.assist.levels.light.dropBlend.toFixed(2),
        suggested: Math.min(0.95, BALANCE.assist.levels.light.dropBlend + 0.05).toFixed(2),
        why: `Players fall ${fallsPer.toFixed(1)}×/race on ${g.track} (${g.cls})${b ? ` vs AI ${b.fallsPerRacer.toFixed(2)}` : ''}. Check where (walls or wider road), or strengthen assist.`,
        confidence: g.finished >= 20 ? 'high' : 'medium',
      });
    }
    const quitRate = g.quits / Math.max(1, g.races);
    if (g.races >= MIN && quitRate > 0.3) {
      out.push({
        field: `track ${g.track}`,
        current: `${(quitRate * 100).toFixed(0)} % of races abandoned`,
        suggested: 'review difficulty (falls, hazards, length)',
        why: `Players leave ${g.track} (${g.cls}) early a lot — a sign of frustration.`,
        confidence: g.races >= 20 ? 'medium' : 'low',
      });
    }
    const staff = staffTimes.get(g.track);
    if (staff && g.cls === 'pro' && g.times.length >= MIN) {
      const beat = g.times.filter((t) => t < staff).length / g.times.length;
      const best = Math.min(...g.times);
      if (beat === 0 && best > staff * 1.08) {
        out.push({
          field: `BALANCE.staff.tracks['${g.track}'].pace`,
          current: (BALANCE.staff.tracks[g.track]?.pace ?? BALANCE.staff.defaultPace).toFixed(3),
          suggested: ((BALANCE.staff.tracks[g.track]?.pace ?? BALANCE.staff.defaultPace) * 0.98).toFixed(3),
          why: `Nobody beat the ${g.track} staff ghost (best ${best.toFixed(1)} s vs ${staff.toFixed(1)} s).`,
          confidence: g.times.length >= 20 ? 'medium' : 'low',
        });
      } else if (beat > 0.5) {
        out.push({
          field: `BALANCE.staff.tracks['${g.track}'].pace`,
          current: (BALANCE.staff.tracks[g.track]?.pace ?? BALANCE.staff.defaultPace).toFixed(3),
          suggested: ((BALANCE.staff.tracks[g.track]?.pace ?? BALANCE.staff.defaultPace) * 1.02).toFixed(3),
          why: `${(beat * 100).toFixed(0)} % of runs beat the ${g.track} staff ghost — it should be a real challenge.`,
          confidence: g.times.length >= 20 ? 'medium' : 'low',
        });
      }
    }
  }
  // ---- drifting / starts across everything
  const all = groups.filter((g) => g.finished > 0);
  const finished = all.reduce((a, g) => a + g.finished, 0);
  if (finished >= MIN * 2) {
    const mt = all.reduce((a, g) => [a[0] + g.mt[0], a[1] + g.mt[1], a[2] + g.mt[2]], [0, 0, 0]);
    const total = mt[0] + mt[1] + mt[2];
    if (total / finished < 2) {
      out.push({
        field: 'TUNING.driftTiers',
        current: 'blue/orange/pink charge times',
        suggested: 'shorten blue by ~0.1 s, or add a drift tutorial prompt',
        why: `Players earn only ${(total / finished).toFixed(1)} mini-turbos per race — drifting may be too hard to discover.`,
        confidence: 'medium',
      });
    } else if (mt[2] / Math.max(1, total) < 0.03 && total > 40) {
      out.push({
        field: 'TUNING.driftTiers[2]',
        current: 'pink tier charge time',
        suggested: '−0.2 s',
        why: `Only ${((mt[2] / total) * 100).toFixed(1)} % of mini-turbos reach pink.`,
        confidence: 'low',
      });
    }
    const st = all.reduce((a, g) => ({ perfect: a.perfect + g.starts.perfect, boost: a.boost + g.starts.boost, early: a.early + g.starts.early }), { perfect: 0, boost: 0, early: 0 });
    if ((st.perfect + st.boost) / finished < 0.1 && st.early / finished > 0.15) {
      out.push({
        field: 'world.applyStart window',
        current: 'boost if pressed ≤ 1.05 s before GO',
        suggested: 'show a clearer "press now" cue, or widen to 1.2 s',
        why: `Only ${(((st.perfect + st.boost) / finished) * 100).toFixed(0)} % of starts boost while ${((st.early / finished) * 100).toFixed(0)} % sputter.`,
        confidence: 'low',
      });
    }
  }
  return out;
}

export function groupSummaryRow(g: Group, b?: SimBaseline, staff?: number): string {
  const f = (n: number, d = 1): string => (Number.isFinite(n) ? n.toFixed(d) : '—');
  const mtPer = g.finished ? (g.mt[0] + g.mt[1] + g.mt[2]) / g.finished : NaN;
  return `| ${g.track} | ${g.cls} | ${g.races} | ${(g.quits / Math.max(1, g.races) * 100).toFixed(0)}% | ${g.posNorm.length ? `${f(avg(g.posNorm) * 100, 0)}% · ${g.wins}W` : '—'} | ${f(median(g.times))}${b ? ` (AI ${f(b.winnerTime)})` : ''}${staff ? ` · staff ${f(staff)}` : ''} | ${f(avg(g.falls), 2)}${b ? ` (AI ${f(b.fallsPerRacer, 2)})` : ''} | ${f(mtPer)} | ${g.finished ? f((g.starts.perfect + g.starts.boost) / g.finished * 100, 0) : '—'}% |`;
}

/** Races per touch-controller setup (steering mode · size), plus left-handed / high-contrast / custom-layout use. */
export function touchSummary(records: PlaytestRecord[]): string[] {
  const combos = new Map<string, number>();
  let lefty = 0;
  let hc = 0;
  let custom = 0;
  let blur = 0;
  let n = 0;
  for (const r of records) {
    for (const p of r.p) {
      if (!p.touch) continue;
      n++;
      const key = `${p.touch.steer}${p.touch.steer === 'joystick' ? ` (${p.touch.stick})` : ''} · ${p.touch.size}`;
      combos.set(key, (combos.get(key) ?? 0) + 1);
      if (p.touch.leftHanded) lefty++;
      if (p.touch.highContrast) hc++;
      if (p.touch.custom) custom++;
      if (p.touch.glass === 'blur') blur++;
    }
  }
  if (!n) return ['No touch races recorded.'];
  const rows = [...combos].sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} | ${Math.round((v / n) * 100)}% |`);
  return ['| Steering · size | Races | Share |', '|---|---|---|', ...rows, '', `Left-handed ${lefty} · high contrast ${hc} · custom layout ${custom} · real-blur glass ${blur} (of ${n} touch races)`];
}
