/**
 * Balance summary for reports.  npm run balance-report
 * Measures, on every track: catch-up (Pro, 8 racers, 160 races per scenario — the same seeds as
 * tests/sim/catchup.test.ts), staff ghost times against the strong bot and the best Pro-AI run, and steering-assist
 * falls for a simulated beginner. Writes sim-report/final/balance.json + .md. Changes nothing in the game.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { TRACKS } from '../src/data/tracks/index';
import { RACERS } from '../src/data/racers';
import { staffGhost } from '../src/game/modes/timeTrial';
import { staffReferences } from '../src/sim/timeTrialRun';
import { measureCatchUp } from '../src/sim/catchup';
import { runHeadlessRace } from '../src/sim/headless';
import type { AssistLevel } from '../src/tuning/balance';

const t0 = Date.now();
const catchUp = measureCatchUp({ seeds: [11, 23, 37, 41, 53, 61, 73, 89, 97, 101] });
console.log('catch-up', JSON.stringify(catchUp));

const staff = TRACKS.map((t) => {
  const ref = staffReferences(t.id);
  const time = staffGhost(t.id).time;
  return { id: t.id, name: t.name, strong: ref.strong, staff: time, proBest: ref.proBest, position: (time - ref.strong) / (ref.proBest - ref.strong) };
});
for (const s of staff) console.log(`${s.name.padEnd(22)} strong ${s.strong.toFixed(2)}  staff ${s.staff.toFixed(2)}  pro ${s.proBest.toFixed(2)}  ${(s.position * 100).toFixed(0)} %`);

const entries = RACERS.slice(0, 4).map((r) => ({ racerId: r.id, kart: { ...r.defaultKart, paint: 'cherry', decal: 'none' } }));
const assist: Record<AssistLevel, { falls: number; avgTime: number }> = { off: { falls: 0, avgTime: 0 }, light: { falls: 0, avgTime: 0 }, full: { falls: 0, avgTime: 0 } };
for (const level of ['off', 'light', 'full'] as AssistLevel[]) {
  for (const tr of TRACKS) {
    const r = runHeadlessRace({ trackId: tr.id, speedClass: 'rookie', entries, seed: 5, items: false, human: { index: 0, skill: 0.2, style: { steerNoise: 0.6 }, assist: level } });
    assist[level].falls += r.stats[0].falls;
    assist[level].avgTime += r.finishTimes[0] / TRACKS.length;
  }
}
console.log('assist', JSON.stringify(assist));

mkdirSync('sim-report/final', { recursive: true });
writeFileSync('sim-report/final/balance.json', JSON.stringify({ catchUp, staff, assist }, null, 1));
const pct = (x: number): string => `${Math.round(x * 100)} %`;
const md = [
  '# Balance summary',
  '',
  `## Catch-up (Pro, 8 racers, ${TRACKS.length} tracks × 10 seeds)`,
  '| Measure | Result | Target |',
  '|---|---|---|',
  `| Median gap 1st → 4th (equal skill) | ${catchUp.gap4.toFixed(2)} s | ≤ 4 s |`,
  `| Median gap 1st → 8th (equal skill) | ${catchUp.gap8.toFixed(2)} s | ≤ 12 s |`,
  `| Strong racer (skill 1.0) wins / top 3 | ${pct(catchUp.strongWin)} / ${pct(catchUp.strongTop3)} | ≥ 45 % / ≥ 80 % |`,
  `| Weak racer (skill 0.3) wins | ${pct(catchUp.weakWin)} | ≤ 8 % |`,
  `| From last on the grid to top 4 | ${pct(catchUp.lastTop4)} | 30–50 % |`,
  '',
  '## Staff ghosts (Time Trial, Pro)',
  '| Track | Strong bot | **Staff** | Pro AI (best of 5) | Staff sits at |',
  '|---|---|---|---|---|',
  ...staff.map((s) => `| ${s.name} | ${s.strong.toFixed(2)} | **${s.staff.toFixed(2)}** | ${s.proBest.toFixed(2)} | ${pct(s.position)} of the gap |`),
  '',
  `## Steering assist (simulated beginner, Rookie, all ${TRACKS.length} tracks)`,
  '| Level | Falls | Average finish |',
  '|---|---|---|',
  ...(['off', 'light', 'full'] as AssistLevel[]).map((l) => `| ${l} | ${assist[l].falls} | ${assist[l].avgTime.toFixed(1)} s |`),
  '',
  `_${((Date.now() - t0) / 1000).toFixed(0)} s to measure._`,
].join('\n');
writeFileSync('sim-report/final/balance.md', md + '\n');
console.log('\nwrote sim-report/final/balance.md');
