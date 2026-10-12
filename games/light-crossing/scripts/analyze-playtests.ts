// Compare exported playtest logs with the pacing model and suggest (never apply) tuning changes.
//
//   npm run analyze-playtests -- <folder-with-json-exports>
//
// Each file is one export from Settings → Playtest mode (light-crossing-playtest-*.json).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CHAPTERS, MISSION_BY_ID } from '../src/data/missions';
import { HOME_TIERS } from '../src/data/economy';
import type { Objective } from '../src/data/questTypes';
import { PLAYTEST_KIND, type PlaytestLog } from '../src/sim/playtest';
import { DAY_MIN, estimatePacing, type PacingResult } from './pacing';

export interface MissionRow {
  id: string;
  title: string;
  chapter: number;
  n: number;
  realMin: number;
  modelMin: number;
  ratio: number;
  realDays: number;
  modelDays: number;
  stalledShare: number;
  topStallObj: number;
}

export interface Report {
  players: number;
  finished: number;
  storyHours: number | null;
  modelHours: number;
  chapters: { chapter: number; n: number; realMin: number; modelMin: number; realDays: number; modelDays: number }[];
  missions: MissionRow[];
  split: { play: number; menu: number; idle: number };
  menus: [string, number][];
  income: { realPerMin: number; modelPerMin: number; earned: [string, number][]; spent: [string, number][] };
  loans: { level: number; n: number; realMin: number; modelMin: number; days: number }[];
  activityPerHour: [string, number][];
  suggestions: string[];
}

export function median(xs: number[]): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
/** A friendly number near `n` (multiples of 1/5/10/50/500...). */
export function nice(n: number): number {
  if (n <= 10) return Math.max(1, Math.round(n));
  const step = n <= 30 ? 5 : n <= 100 ? 10 : n <= 1000 ? 50 : 500;
  return Math.max(step, Math.round(n / step) * step);
}

/** The objective whose size best controls how long a mission takes. */
function biggestObjective(id: string): { i: number; o: Objective; n: number } | null {
  const m = MISSION_BY_ID[id];
  if (!m) return null;
  let best: { i: number; o: Objective; n: number } | null = null;
  m.objectives.forEach((o, i) => {
    const n = o.kind === 'deliver' ? o.qty : o.kind === 'event' ? o.count : o.kind === 'state' ? o.n : 0;
    if (n > 1 && (!best || n > best.n)) best = { i, o, n };
  });
  return best;
}

export function analyze(logs: PlaytestLog[], est: PacingResult = estimatePacing()): Report {
  const suggestions: string[] = [];

  // ---- missions
  const missions: MissionRow[] = [];
  for (const em of est.missions) {
    const done = logs.map((l) => l.missions[em.id]).filter((m): m is NonNullable<typeof m> => !!m && m.e !== undefined);
    const stalledBy = logs.filter((l) => (l.missions[em.id]?.stalls ?? 0) > 0).length;
    const seen = logs.filter((l) => l.missions[em.id]).length;
    const objStalls = new Map<number, number>();
    for (const l of logs) for (const s of l.stalls) if (s.id === em.id) objStalls.set(s.obj, (objStalls.get(s.obj) ?? 0) + 1);
    const topStallObj = [...objStalls.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? -1;
    if (!done.length && !seen) continue;
    const realMin = median(done.map((m) => (m.play + m.menu) / 60));
    const realDays = median(done.map((m) => (m.ed ?? m.sd) - m.sd));
    missions.push({
      id: em.id,
      title: MISSION_BY_ID[em.id]?.title ?? em.id,
      chapter: em.chapter,
      n: done.length,
      realMin: round(realMin),
      modelMin: round(em.activeMin),
      ratio: round(realMin / Math.max(0.5, em.activeMin), 2),
      realDays: round(realDays),
      modelDays: em.endDay - em.startDay,
      stalledShare: seen ? round(stalledBy / seen, 2) : 0,
      topStallObj,
    });
  }

  // ---- chapters + total
  const chapters = CHAPTERS.map((c) => {
    const rows = logs.map((l) => l.chapters[c.n]).filter((x): x is NonNullable<typeof x> => !!x && x.e !== undefined);
    const row = est.rows.find((r) => r.chapter === c.n)!;
    return {
      chapter: c.n,
      n: rows.length,
      realMin: round(median(rows.map((r) => (r.e! - r.s) / 60))),
      modelMin: round(row.minutes),
      realDays: round(median(rows.map((r) => r.ed! - r.sd))),
      modelDays: row.days[1] - row.days[0],
    };
  });
  const finishedLogs = logs.filter((l) => l.storyDone);
  const storyHours = finishedLogs.length ? round(median(finishedLogs.map((l) => (l.storyDone!.t - l.idle) / 3600)), 2) : null;

  // ---- time split + menus
  const tot = logs.reduce((a, l) => a + l.total, 0) || 1;
  const split = {
    play: round(logs.reduce((a, l) => a + l.play, 0) / tot, 3),
    menu: round(logs.reduce((a, l) => a + l.menu, 0) / tot, 3),
    idle: round(logs.reduce((a, l) => a + l.idle, 0) / tot, 3),
  };
  const menuTotals = new Map<string, number>();
  for (const l of logs) for (const [k, v] of Object.entries(l.menus)) menuTotals.set(k, (menuTotals.get(k) ?? 0) + v);
  const menus = [...menuTotals.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, round(v / tot, 3)] as [string, number]);

  // ---- economy
  const sumRec = (pick: (l: PlaytestLog) => Record<string, number>) => {
    const m = new Map<string, number>();
    for (const l of logs) for (const [k, v] of Object.entries(pick(l))) m.set(k, (m.get(k) ?? 0) + v);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const earned = sumRec((l) => l.glints.earned);
  const spent = sumRec((l) => l.glints.spent);
  const playMin = logs.reduce((a, l) => a + l.play, 0) / 60 || 1;
  const earnedFromWork = earned.filter(([k]) => k === 'sell' || k === 'found' || k === 'request').reduce((a, [, v]) => a + v, 0);
  const income = { realPerMin: round(earnedFromWork / playMin), modelPerMin: round(est.incomePerMin), earned, spent };
  const loans = HOME_TIERS.filter((t) => t.cost > 0).map((t) => {
    const paid = logs.flatMap((l) => l.loans.filter((x) => x.level === t.level && x.paidT !== undefined));
    return { level: t.level, n: paid.length, realMin: round(median(paid.map((x) => (x.paidT! - x.t) / 60))), modelMin: round(t.cost / est.incomePerMin), days: round(median(paid.map((x) => x.paidDay! - x.day))) };
  });

  // ---- activity
  const actTotals = sumRec((l) => l.activity);
  const hours = tot / 3600;
  const activityPerHour = actTotals.map(([k, v]) => [k, round(v / hours)] as [string, number]);

  // ---------------------------------------------------------------- suggestions
  if (logs.length < 5) suggestions.push(`Only ${logs.length} playtest log(s): treat these as hints, not conclusions (aim for 5+ players).`);
  if (storyHours !== null && (storyHours < 5.5 || storyHours > 6.5))
    suggestions.push(`Story took a median ${storyHours} h (model ${round(est.total / 60, 2)} h, target ~6 h). Start with the largest mission gaps below.`);
  const slow = missions.filter((m) => m.n > 0 && m.ratio >= 1.5 && m.realMin - m.modelMin >= 4).sort((a, b) => b.realMin - b.modelMin - (a.realMin - a.modelMin));
  for (const m of slow.slice(0, 6)) {
    const big = biggestObjective(m.id);
    const scale = Math.max(0.5, m.modelMin / m.realMin);
    if (big && big.o.kind !== 'state')
      suggestions.push(`src/data/missions.ts › ${m.id} "${m.title}": players need ${m.realMin} min vs model ${m.modelMin} min. Consider "${big.o.label}" ${big.n} → ${nice(big.n * scale)}.`);
    else suggestions.push(`src/data/missions.ts › ${m.id} "${m.title}": players need ${m.realMin} min vs model ${m.modelMin} min. Check its marker/hint, or raise its cost in scripts/pacing.ts if it's simply bigger than modelled.`);
  }
  const fast = missions.filter((m) => m.n > 0 && m.ratio <= 0.5 && m.modelMin - m.realMin >= 4);
  for (const m of fast.slice(0, 4)) suggestions.push(`scripts/pacing.ts: ${m.id} "${m.title}" takes ${m.realMin} min, the model expects ${m.modelMin} min — lower its modelled cost (the content may be fine).`);
  for (const m of missions.filter((x) => x.stalledShare >= 0.3)) {
    const def = MISSION_BY_ID[m.id];
    const obj = m.topStallObj >= 0 ? def?.objectives[m.topStallObj]?.label : 'turning it in';
    suggestions.push(`src/data/missions.ts › ${m.id}: ${Math.round(m.stalledShare * 100)}% of players stalled (mostly on "${obj}"). Add a clearer \`hint\`, a \`marker\`, or an intro line that says where to go.`);
  }
  if (income.realPerMin > 0 && Math.abs(income.realPerMin / income.modelPerMin - 1) > 0.25) {
    const r = income.realPerMin / income.modelPerMin;
    const tiers = HOME_TIERS.filter((t) => t.cost > 0)
      .map((t) => `${t.name} ${t.cost.toLocaleString('en-US')} → ${nice(t.cost * r).toLocaleString('en-US')}`)
      .join(', ');
    suggestions.push(`src/data/economy.ts: players earn ${income.realPerMin} Glints/min vs model ${income.modelPerMin}. To keep loan pacing, consider HOME_TIERS costs: ${tiers}. Also update the income model in scripts/pacing.ts.`);
  }
  for (const l of loans) if (l.n && l.realMin > l.modelMin * 1.5 + 10) suggestions.push(`src/data/economy.ts: the level ${l.level} loan takes ${l.realMin} min of play to repay (model ${l.modelMin} min). Consider a smaller HOME_TIERS[${l.level}].cost.`);
  if (split.menu > 0 && Math.abs(split.menu - est.model.pausedShare) > 0.08)
    suggestions.push(`scripts/pacing.ts: players spend ${Math.round(split.menu * 100)}% of time in menus/dialogue (model pausedShare ${est.model.pausedShare}). Update M.pausedShare.`);
  if (split.idle > 0.2) suggestions.push(`Idle time is ${Math.round(split.idle * 100)}% — players step away a lot. Check where (per-day log) before tuning content.`);
  return { players: logs.length, finished: finishedLogs.length, storyHours, modelHours: round(est.total / 60, 2), chapters, missions, split, menus, income, loans, activityPerHour, suggestions };
}

export function formatReport(r: Report): string {
  const out: string[] = [];
  const pad = (s: string | number, n: number) => String(s).padEnd(n);
  const num = (n: number) => (Number.isNaN(n) ? '—' : String(n));
  out.push(`Light Crossing — playtest analysis (${r.players} log${r.players === 1 ? '' : 's'}, ${r.finished} finished the story)`);
  out.push(`Story: ${r.storyHours ?? '—'} h median (model ${r.modelHours} h; one in-game day = ${DAY_MIN} min)\n`);
  out.push(pad('Chapter', 10) + pad('Players', 9) + pad('Real min', 10) + pad('Model min', 11) + pad('Real days', 11) + 'Model days');
  for (const c of r.chapters) out.push(pad(c.chapter, 10) + pad(c.n, 9) + pad(num(c.realMin), 10) + pad(c.modelMin, 11) + pad(num(c.realDays), 11) + c.modelDays);
  out.push('');
  out.push(pad('Mission', 34) + pad('n', 4) + pad('Real', 8) + pad('Model', 8) + pad('×', 7) + pad('Days', 12) + 'Stalled');
  for (const m of r.missions) out.push(pad(`${m.id} ${m.title}`.slice(0, 33), 34) + pad(m.n, 4) + pad(num(m.realMin), 8) + pad(m.modelMin, 8) + pad(num(m.ratio), 7) + pad(`${num(m.realDays)}/${m.modelDays}`, 12) + (m.stalledShare ? `${Math.round(m.stalledShare * 100)}%` : ''));
  out.push('');
  out.push(`Time split: play ${Math.round(r.split.play * 100)}% · menus ${Math.round(r.split.menu * 100)}% · idle ${Math.round(r.split.idle * 100)}%`);
  out.push(`Top menus: ${r.menus.slice(0, 8).map(([k, v]) => `${k} ${Math.round(v * 100)}%`).join(' · ') || '—'}`);
  out.push(`Income: ${r.income.realPerMin} Glints/min of play (model ${r.income.modelPerMin})`);
  out.push(`Earned: ${r.income.earned.map(([k, v]) => `${k} ${Math.round(v)}`).join(' · ') || '—'}`);
  out.push(`Spent:  ${r.income.spent.map(([k, v]) => `${k} ${Math.round(v)}`).join(' · ') || '—'}`);
  for (const l of r.loans) if (l.n) out.push(`Loan level ${l.level}: repaid in ${l.realMin} min / ${l.days} days (model ${l.modelMin} min, n=${l.n})`);
  out.push(`Activity per hour: ${r.activityPerHour.slice(0, 12).map(([k, v]) => `${k} ${v}`).join(' · ') || '—'}`);
  out.push('\nSuggestions (not applied — edit the files yourself if you agree):');
  if (!r.suggestions.length) out.push('  Nothing stands out. Pacing matches the model.');
  for (const s of r.suggestions) out.push(`  • ${s}`);
  return out.join('\n');
}

export function loadLogs(dir: string): PlaytestLog[] {
  const files = statSync(dir).isDirectory() ? readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => join(dir, f)) : [dir];
  const logs: PlaytestLog[] = [];
  for (const f of files) {
    try {
      const j = JSON.parse(readFileSync(f, 'utf8'));
      if (j && j.kind === PLAYTEST_KIND) logs.push(j as PlaytestLog);
      else console.warn(`skipping ${f}: not a Light Crossing playtest export`);
    } catch (e) {
      console.warn(`skipping ${f}: ${(e as Error).message}`);
    }
  }
  return logs;
}

if (process.argv[1] && /analyze-playtests\.ts$/.test(process.argv[1])) {
  const dir = process.argv[2];
  if (!dir) {
    console.error('Usage: npm run analyze-playtests -- <folder with playtest .json exports>');
    process.exit(1);
  }
  const logs = loadLogs(dir);
  if (!logs.length) {
    console.error(`No playtest exports found in ${dir}.`);
    process.exit(1);
  }
  console.log(formatReport(analyze(logs)));
}
