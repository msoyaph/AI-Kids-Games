/**
 * Staff ghost calibration.  npm run calibrate-staff [-- <track ids…>] [--dry]
 * For each track: strong bot (expert style, full pace) and Pro AI (skill 0.65), best of BALANCE.staff.proSeeds
 * seeds each. Target = strong + gapFraction × (proBest − strong). Searches the staff pace multiplier whose run
 * lands closest to the target while staying strictly between the two, then writes the paces into
 * src/tuning/balance.ts between the <staff-pace> markers (unless --dry). Prints a table for the report.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { TRACKS } from '../src/data/tracks/index';
import { BALANCE } from '../src/tuning/balance';
import { expertStyle, runTimeTrial, staffReferences } from '../src/sim/timeTrialRun';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const only = args.filter((a) => !a.startsWith('--'));
const tracks = TRACKS.filter((t) => !only.length || only.includes(t.id));
const paces: Record<string, { pace: number; seed: number }> = { ...BALANCE.staff.tracks };
const rows: string[] = ['| Track | Strong bot | Staff | Pro AI (best of 5) | Staff position | Pace |', '|---|---|---|---|---|---|'];
for (const t of tracks) {
  const ref = staffReferences(t.id);
  const runAt = (id: string, pace: number): number => runTimeTrial({ trackId: id, skill: 1, seed: ref.strongSeed, style: expertStyle(pace) }).time;
  const lo = ref.strong + 0.08 * (ref.proBest - ref.strong);
  const hi = ref.strong + 0.75 * (ref.proBest - ref.strong);
  let best = { pace: 1, time: runAt(t.id, 1), score: Infinity };
  const consider = (pace: number): void => {
    const time = runAt(t.id, pace);
    const inside = time > lo && time < hi;
    const score = Math.abs(time - ref.target) + (inside ? 0 : 1000);
    if (score < best.score) best = { pace, time, score };
  };
  for (let p = 1; p >= 0.8; p -= 0.01) consider(+p.toFixed(3));
  // refine around the best coarse value
  for (let d = -0.009; d <= 0.009; d += 0.0015) consider(+(best.pace + d).toFixed(4));
  paces[t.id] = { pace: +best.pace.toFixed(4), seed: ref.strongSeed };
  const pos = (best.time - ref.strong) / (ref.proBest - ref.strong);
  const ok = ref.proBest > ref.strong && best.time > ref.strong && best.time < ref.proBest;
  rows.push(`| ${t.name} | ${ref.strong.toFixed(2)} | ${best.time.toFixed(2)} | ${ref.proBest.toFixed(2)} | ${(pos * 100).toFixed(0)} %${ok ? '' : ' ⚠️'} | ${best.pace.toFixed(4)} |`);
  console.log(rows[rows.length - 1]);
}

if (!dry) {
  const file = 'src/tuning/balance.ts';
  const src = readFileSync(file, 'utf8');
  const body = Object.entries(paces)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, p]) => `      '${id}': { pace: ${p.pace}, seed: ${p.seed} },`)
    .join('\n');
  const next = src.replace(/\/\/ <staff-pace>\n[\s\S]*?\/\/ <\/staff-pace>/, `// <staff-pace>\n${body}\n      // </staff-pace>`);
  writeFileSync(file, next);
  console.log(`\nWrote ${Object.keys(paces).length} staff paces to ${file}`);
}
writeFileSync('sim-report/staff.md', ['# Staff ghosts', '', `Target: strong bot + ${BALANCE.staff.gapFraction * 100} % of the gap to the best Pro-AI run.`, '', ...rows].join('\n'));
