/**
 * Balance simulation: the heuristic bot plays full headless runs for every character
 * (no shop upgrades, no unlocked weapons — a true first run) and reports survival stats.
 *
 * Usage: npm run simulate -- [seeds=8] [skill=0.7] [--tuning exported.json]
 *        npx tsx scripts/simulate.ts 12 0.7
 */
import { readFileSync } from 'node:fs';
import { CHARACTERS } from '../src/config/characters';
import { diffTuning, mergeTuning, TUNING_DEFAULTS, TUNING_EXPORT_FORMAT, type TuningIssue, type TuningOverrides } from '../src/config/tuning';
import { formatTime } from '../src/core/math';
import { simulateRun, type HeadlessResult } from '../src/sim/headless';

const argv = process.argv.slice(2);
const tIdx = argv.indexOf('--tuning');
let tuning: TuningOverrides | undefined;
if (tIdx >= 0) {
  const file = argv[tIdx + 1];
  const raw = JSON.parse(readFileSync(file, 'utf8')) as { format?: string; values?: TuningOverrides };
  const issues: TuningIssue[] = [];
  const merged = mergeTuning(TUNING_DEFAULTS, raw.format === TUNING_EXPORT_FORMAT ? raw.values : raw, issues);
  for (const i of issues) console.warn(`tuning: ignored ${i.path} (${i.problem})`);
  tuning = diffTuning(TUNING_DEFAULTS, merged);
  argv.splice(tIdx, 2);
}
const seeds = Number(argv[0] ?? 8);
const skill = Number(argv[1] ?? 0.7);

function median(v: number[]): number {
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

console.log(`TheaBonk balance sim — ${seeds} seeds per hero, bot skill ${skill}, first-run (no meta)${tuning ? ' — WITH TUNING OVERRIDES' : ''}\n`);
const t0 = performance.now();
const all: HeadlessResult[] = [];
for (const c of CHARACTERS) {
  const res: HeadlessResult[] = [];
  for (let s = 0; s < seeds; s++) res.push(simulateRun({ characterId: c.id, seed: 1000 + s * 7919, skill, tuning }));
  all.push(...res);
  const times = res.map((r) => r.time);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const wins = res.filter((r) => r.state === 'won').length;
  const lvl = res.reduce((a, r) => a + r.level, 0) / res.length;
  const kills = res.reduce((a, r) => a + r.kills, 0) / res.length;
  const bosses = res.reduce((a, r) => a + Object.values(r.bossKills).reduce((x, y) => x + y, 0), 0) / res.length;
  const evo = res.reduce((a, r) => a + r.evolutions, 0) / res.length;
  if (process.env.VERBOSE) console.log('   ', res.map((r) => `${formatTime(r.time)}${r.state === 'won' ? 'W' : ''}`).join(' '));
  console.log(
    `${c.name.padEnd(8)} avg ${formatTime(avg).padStart(5)}  median ${formatTime(median(times)).padStart(5)}  ` +
      `min ${formatTime(Math.min(...times)).padStart(5)}  max ${formatTime(Math.max(...times)).padStart(5)}  ` +
      `wins ${wins}/${res.length}  lvl ${lvl.toFixed(1)}  kills ${kills.toFixed(0)}  bosses ${bosses.toFixed(1)}  evolutions ${evo.toFixed(1)}`,
  );
}
const avgAll = all.reduce((a, r) => a + r.time, 0) / all.length;
console.log(`\nall heroes: avg survival ${formatTime(avgAll)} (target for a decent first run: 10:00–15:00)`);
console.log(`(${((performance.now() - t0) / 1000).toFixed(1)}s)`);
