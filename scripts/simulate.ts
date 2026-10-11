/**
 * Headless AI-vs-AI balance report.  npm run sim  [--quick]
 *  1. Completion: every track (normal + mirror) × every speed class finishes.
 *  2. Fairness: identical AI drivers on different racers/karts — no racer or weight class should dominate.
 *  3. Speed classes: winner times should step up clearly Rookie → Pro → Champion.
 *  4. Items: hits per race and catch-up help for the back of the pack.
 * Writes sim-report/balance.md.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { TRACKS } from '../src/data/tracks/index';
import { RACERS } from '../src/data/racers';
import type { SpeedClass } from '../src/data/types';
import { runHeadlessRace } from '../src/sim/headless';
import { WEIGHT_BASE } from '../src/sim/tuning';
import { kartStats } from '../src/sim/factory';
import { measureCatchUp } from '../src/sim/catchup';
import { staffReferences } from '../src/sim/timeTrialRun';
import { staffGhost } from '../src/game/modes/timeTrial';
import { BALANCE } from '../src/tuning/balance';

const quick = process.argv.includes('--quick');
const fairOnly = process.argv.includes('--fair-only');
const fairItems = process.argv.includes('--fair-items');
const out: string[] = ['# Calex Cart — balance report', ''];
const log = (s: string): void => {
  console.log(s);
  out.push(s);
};
const t0 = Date.now();
const avg = (a: number[]): number => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
const entries8 = RACERS.slice(0, 8).map((r) => ({ racerId: r.id, kart: { ...r.defaultKart, paint: 'cherry', decal: 'none' } }));

// ---------------------------------------------------------------- 1. completion
if (!fairOnly) {
log('## 1. Completion (8 AI, items on)');
log('| Track | Rookie | Pro | Champion | Mirror |');
log('|---|---|---|---|---|');
const classes: SpeedClass[] = ['rookie', 'pro', 'champion'];
const classTimes: Record<SpeedClass, number[]> = { rookie: [], pro: [], champion: [] };
let failures = 0;
for (const t of TRACKS) {
  const cells: string[] = [];
  for (const c of [...classes, 'mirror' as const]) {
    const r = runHeadlessRace({ trackId: t.id, speedClass: c === 'mirror' ? 'champion' : c, mirror: c === 'mirror', entries: entries8, seed: 17, items: true });
    const done = r.projected.filter((p) => !p).length;
    const falls = r.stats.reduce((a, s) => a + s.falls, 0);
    if (done < 7) failures++;
    if (c !== 'mirror') classTimes[c].push(r.winnerTime);
    cells.push(`${done}/8 · ${r.winnerTime.toFixed(0)}s · ${falls}↓`);
  }
  log(`| ${t.name} | ${cells.join(' | ')} |`);
}
log('');
log(failures ? `**${failures} race(s) where fewer than 7 AI finished!**` : 'Every track is completable by the AI in every class (normal and mirror).');

// ---------------------------------------------------------------- 3. speed classes
log('');
log('## 2. Speed classes (average winner time)');
const rk = avg(classTimes.rookie);
const pr = avg(classTimes.pro);
const ch = avg(classTimes.champion);
log(`Rookie ${rk.toFixed(1)} s · Pro ${pr.toFixed(1)} s (${((1 - pr / rk) * 100).toFixed(0)}% faster) · Champion ${ch.toFixed(1)} s (${((1 - ch / pr) * 100).toFixed(0)}% faster than Pro)`);
}

// ---------------------------------------------------------------- 2. fairness
log('');
log(`## 3. Racer fairness (identical AI skill & personality, items ${fairItems ? 'on' : 'off'}, rotating grid)`);
const tracks = quick ? TRACKS.slice(0, 4) : TRACKS;
const posSum = new Map<string, number[]>();
const groups = [RACERS.slice(0, 6), RACERS.slice(6, 12), [RACERS[0], RACERS[3], RACERS[6], RACERS[9], RACERS[1], RACERS[10]]];
let race = 0;
for (const t of tracks) {
  for (const group of groups) {
    for (let rot = 0; rot < (quick ? 2 : 3); rot++) {
      const ents = group.map((r) => ({ racerId: r.id, kart: { ...r.defaultKart, paint: 'cherry', decal: 'none' } }));
      const grid = ents.map((_, i) => (i + rot * 2) % ents.length);
      const r = runHeadlessRace({ trackId: t.id, speedClass: 'pro', entries: ents, seed: 100 + race++, items: fairItems, personality: 'balanced', equalSkill: true, gridOrder: grid });
      group.forEach((g, i) => {
        const list = posSum.get(g.id) ?? [];
        // normalise to 0 (won) .. 1 (last)
        list.push((r.ranks[i] - 1) / (group.length - 1));
        posSum.set(g.id, list);
      });
    }
  }
}
log('| Racer | Class | Stats (spd/acc/hnd/wgt/trc) | Avg finish (0 = always 1st, 1 = always last) |');
log('|---|---|---|---|');
const byClass: Record<string, number[]> = { light: [], medium: [], heavy: [] };
let worstSpread = 0;
const scores: number[] = [];
for (const r of RACERS) {
  const s = avg(posSum.get(r.id) ?? []);
  scores.push(s);
  byClass[r.weight].push(s);
  const st = kartStats(r.id, { ...r.defaultKart, paint: 'cherry', decal: 'none' });
  log(`| ${r.name} | ${r.weight} | ${st.speed}/${st.accel}/${st.handling}/${st.weight}/${st.traction} | ${s.toFixed(2)} |`);
}
worstSpread = Math.max(...scores) - Math.min(...scores);
log('');
log(`Weight classes: light ${avg(byClass.light).toFixed(2)} · medium ${avg(byClass.medium).toFixed(2)} · heavy ${avg(byClass.heavy).toFixed(2)} (0.5 = perfectly even). Spread best→worst racer: ${worstSpread.toFixed(2)}`);
void WEIGHT_BASE;

// ---------------------------------------------------------------- 4. items & catch-up
log('');
log('## 4. Items and catch-up (Pro, 8 AI, rubber-band on)');
let hits = 0;
let used = 0;
let races = 0;
let lastToTop4 = 0;
for (const t of tracks) {
  const r = runHeadlessRace({ trackId: t.id, speedClass: 'pro', entries: entries8, seed: 900 + races, items: true, rubberBand: true });
  hits += r.stats.reduce((a, s) => a + s.itemHits, 0);
  used += r.stats.reduce((a, s) => a + s.itemsUsed, 0);
  // the kart that started last (grid slot 7 = index 7)
  if (r.ranks[7] <= 4) lastToTop4++;
  races++;
}
log(`Per race: ${(used / races).toFixed(1)} items used, ${(hits / races).toFixed(1)} hits. Last-on-grid finished top-4 in ${lastToTop4}/${races} races.`);

// ---------------------------------------------------------------- 5. catch-up targets (simulated human)
if (!quick && !fairOnly) {
  log('');
  log('## 5. Catch-up targets (Pro, 8 racers, a simulated human vs Pro AI, every track × 10 seeds)');
  const cu = measureCatchUp({ seeds: [11, 23, 37, 41, 53, 61, 73, 89, 97, 101] });
  const mark = (ok: boolean): string => (ok ? '✅' : '❌');
  log('| Target | Result | |');
  log('|---|---|---|');
  log(`| Equal skill: median gap 1st→4th ≤ 4 s | ${cu.gap4.toFixed(2)} s | ${mark(cu.gap4 <= 4)} |`);
  log(`| Equal skill: median gap 1st→8th ≤ 12 s | ${cu.gap8.toFixed(2)} s | ${mark(cu.gap8 <= 12)} |`);
  log(`| Skill 1.0 wins ≥ 45 % | ${(cu.strongWin * 100).toFixed(0)} % | ${mark(cu.strongWin >= 0.45)} |`);
  log(`| Skill 1.0 top-3 ≥ 80 % | ${(cu.strongTop3 * 100).toFixed(0)} % | ${mark(cu.strongTop3 >= 0.8)} |`);
  log(`| Skill 0.3 wins ≤ 8 % | ${(cu.weakWin * 100).toFixed(0)} % (avg place ${cu.weakAvgPos.toFixed(1)}) | ${mark(cu.weakWin <= 0.08)} |`);
  log(`| Pro skill from last on the grid → top 4 in 30–50 % | ${(cu.lastTop4 * 100).toFixed(0)} % (avg place ${cu.lastAvgPos.toFixed(1)}) | ${mark(cu.lastTop4 >= 0.3 && cu.lastTop4 <= 0.5)} |`);

  // ---------------------------------------------------------------- 6. staff ghosts
  log('');
  log(`## 6. Staff ghosts (strong bot + ${BALANCE.staff.gapFraction * 100} % of the gap to the best of ${BALANCE.staff.proSeeds} Pro-AI runs)`);
  log('| Track | Strong bot | Staff ghost | Pro AI best | Position in gap |');
  log('|---|---|---|---|---|');
  for (const t of TRACKS) {
    const ref = staffReferences(t.id);
    const st = staffGhost(t.id).time;
    log(`| ${t.name} | ${ref.strong.toFixed(2)} | **${st.toFixed(2)}** | ${ref.proBest.toFixed(2)} | ${(((st - ref.strong) / (ref.proBest - ref.strong)) * 100).toFixed(0)} % |`);
  }
}

log('');
log(`_Generated in ${((Date.now() - t0) / 1000).toFixed(1)} s._`);
mkdirSync('sim-report', { recursive: true });
writeFileSync('sim-report/balance.md', out.join('\n'));
