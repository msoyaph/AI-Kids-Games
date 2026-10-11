/**
 * Playtest analyzer.  npm run analyze-playtests -- <folder-or-file> [more…] [--no-sim]
 * Reads exported playtest .json files, aggregates them per track and class, compares them with fresh simulator
 * baselines and prints SUGGESTED edits to src/tuning/balance.ts. It never changes any file except its own report
 * (sim-report/playtests.md).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { collectRecords, groupRecords, groupSummaryRow, suggest, type SimBaseline } from '../src/tuning/analyze';
import { runHeadlessRace } from '../src/sim/headless';
import { RACERS } from '../src/data/racers';
import { TRACKS } from '../src/data/tracks/index';
import type { SpeedClass } from '../src/data/types';
import { staffGhost } from '../src/game/modes/timeTrial';

const args = process.argv.slice(2);
const paths = args.filter((a) => !a.startsWith('--'));
const noSim = args.includes('--no-sim');
if (!paths.length) {
  console.log('Usage: npm run analyze-playtests -- <folder-with-exports> [--no-sim]');
  process.exit(1);
}

const files: string[] = [];
for (const p of paths) {
  if (!existsSync(p)) {
    console.error(`Not found: ${p}`);
    continue;
  }
  if (statSync(p).isDirectory()) {
    for (const f of readdirSync(p)) if (f.toLowerCase().endsWith('.json')) files.push(join(p, f));
  } else files.push(p);
}
const inputs: unknown[] = [];
for (const f of files) {
  try {
    inputs.push(JSON.parse(readFileSync(f, 'utf8')));
  } catch (e) {
    console.warn(`Skipping ${f}: ${(e as Error).message}`);
  }
}
const records = collectRecords(inputs);
const groups = groupRecords(records);
const out: string[] = ['# Calex Cart — playtest analysis', '', `${files.length} file(s), ${records.length} race(s), ${groups.length} track/class group(s).`, ''];

// ---- simulator baselines for the same track/class (8 AI, items on)
const baselines = new Map<string, SimBaseline>();
const staffTimes = new Map<string, number>();
const known = new Set(TRACKS.map((t) => t.id));
if (!noSim) {
  const entries8 = RACERS.slice(0, 8).map((r) => ({ racerId: r.id, kart: { ...r.defaultKart, paint: 'cherry', decal: 'none' } }));
  for (const g of groups) {
    if (!known.has(g.track)) continue;
    const key = `${g.track}|${g.cls}`;
    if (baselines.has(key)) continue;
    const cls: SpeedClass = g.cls === 'mirror' ? 'champion' : (g.cls as SpeedClass);
    let win = 0;
    let lap = 0;
    let falls = 0;
    const mt: [number, number, number] = [0, 0, 0];
    const seeds = [3, 5, 7];
    for (const seed of seeds) {
      const r = runHeadlessRace({ trackId: g.track, speedClass: cls, mirror: g.cls === 'mirror', entries: entries8, seed, items: true });
      win += r.winnerTime / seeds.length;
      lap += Math.min(...r.bestLaps) / seeds.length;
      for (const s of r.stats) {
        falls += s.falls / (8 * seeds.length);
        for (let t = 0; t < 3; t++) mt[t] += s.miniTurbos[t] / (8 * seeds.length);
      }
    }
    baselines.set(key, { winnerTime: win, bestLap: lap, fallsPerRacer: falls, miniTurbosPerRacer: mt });
    if (!staffTimes.has(g.track)) staffTimes.set(g.track, staffGhost(g.track).time);
  }
}

out.push('## Per track and class');
out.push('| Track | Class | Races | Quit | Avg pos · wins | Median time (AI winner · staff) | Falls/race (AI) | Mini-turbos/race | Rocket starts |');
out.push('|---|---|---|---|---|---|---|---|---|');
for (const g of groups) out.push(groupSummaryRow(g, baselines.get(`${g.track}|${g.cls}`), staffTimes.get(g.track)));
out.push('');

const inputs2: Record<string, number> = {};
const assists: Record<string, number> = {};
for (const g of groups) {
  for (const [k, v] of Object.entries(g.input)) inputs2[k] = (inputs2[k] ?? 0) + v;
  for (const [k, v] of Object.entries(g.assist)) assists[k] = (assists[k] ?? 0) + v;
}
out.push(`Input: ${Object.entries(inputs2).map(([k, v]) => `${k} ${v}`).join(' · ') || '—'}  ·  Assist: ${Object.entries(assists).map(([k, v]) => `${k} ${v}`).join(' · ') || '—'}`);
const fpsRows = new Map<string, number[]>();
for (const r of records) fpsRows.set(r.tier, [...(fpsRows.get(r.tier) ?? []), r.fps]);
out.push(`Average FPS by tier: ${[...fpsRows].map(([t, f]) => `${t} ${(f.reduce((a, b) => a + b, 0) / f.length).toFixed(0)}`).join(' · ') || '—'}`);
out.push('');

const sug = suggest(groups, baselines, staffTimes);
out.push('## Suggested edits (NOT applied)');
if (!sug.length) out.push('No changes suggested — not enough data, or everything is within targets.');
for (const s of sug) out.push(`- **${s.field}**: ${s.current} → ${s.suggested}  _(${s.confidence})_ — ${s.why}`);
out.push('');
out.push('_Suggestions only. Edit src/tuning/balance.ts by hand, then re-run `npm run sim` and the tests._');

const text = out.join('\n');
console.log(text);
mkdirSync('sim-report', { recursive: true });
writeFileSync('sim-report/playtests.md', text);
