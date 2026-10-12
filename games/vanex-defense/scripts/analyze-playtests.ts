// Playtest analysis: reads exported playtest JSON files (Title → Playtest data →
// Download / Copy, with `?playtest=1` on), compares them with bot runs on the
// same maps and prints tuning SUGGESTIONS. Nothing is applied automatically.
//   npm run analyze-playtests -- <folder>
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { Difficulty } from '../src/data/difficulty';
import { mapById } from '../src/data/maps';
import { TOWER_IDS } from '../src/data/towers';
import { simulate } from '../src/sim/autoplay';
import { dedupe, groupRuns, lossCluster, runsFromExport, suggest, unusedTowers, type BotSummary, type Suggestion } from './lib/playtests';
import type { PlaytestRun } from '../src/app/playtest';

const folder = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (!folder || !statSync(folder, { throwIfNoEntry: false })?.isDirectory()) {
  console.error('usage: npm run analyze-playtests -- <folder with playtest .json exports>');
  process.exit(1);
}

let runs: PlaytestRun[] = [];
const files = readdirSync(folder).filter((f) => f.toLowerCase().endsWith('.json') || f.toLowerCase().endsWith('.txt'));
for (const f of files) {
  try {
    const got = runsFromExport(JSON.parse(readFileSync(join(folder, f), 'utf8')));
    if (!got.length) console.warn(`skipped ${f}: no playtest runs inside`);
    runs.push(...got);
  } catch {
    console.warn(`skipped ${f}: not valid JSON`);
  }
}
const before = runs.length;
runs = dedupe(runs);
console.log(`Read ${files.length} file(s): ${runs.length} runs${before > runs.length ? ` (${before - runs.length} duplicates removed)` : ''}.\n`);
if (!runs.length) process.exit(0);

const pct = (x: number | null): string => (x === null ? '  –' : `${Math.round(x * 100)}%`.padStart(4));
const groups = groupRuns(runs);
const suggestions: Suggestion[] = [];

console.log('map   diff    mode       runs  won lost quit  win%  lives  ends at      min  1x%   fps   bot good   bot casual');
for (const g of groups) {
  const map = mapById(g.map);
  const bots: BotSummary[] = [];
  // bots only replay campaign-style runs on maps the game knows (not Workshop / endless)
  if (map && (g.mode === 'campaign' || g.mode === 'daily')) {
    for (const skill of ['good', 'casual'] as const) {
      const r = simulate(map, g.diff as Difficulty, { seed: 1, skill });
      bots.push({ skill, won: r.won, lives: r.lives, maxLives: r.maxLives, wave: r.wave });
    }
  }
  const c = lossCluster(g.endWaves);
  const bot = (s: 'good' | 'casual'): string => {
    const b = bots.find((x) => x.skill === s);
    return b ? (b.won ? `won ${b.lives}/${b.maxLives}` : `lost w${b.wave}`) : '–';
  };
  console.log(
    `${g.map.padEnd(5)} ${g.diff.padEnd(7)} ${g.mode.padEnd(9)} ${String(g.runs).padStart(5)} ${String(g.wins).padStart(4)} ${String(g.losses).padStart(4)} ${String(g.quits).padStart(4)}  ${pct(g.winRate)}  ${pct(g.livesKept)}  ${(c ? `w${c.from}-${c.to}×${c.count}` : '–').padEnd(11)} ${g.medianMinutes.toFixed(0).padStart(4)} ${pct(g.normalSpeedShare)} ${String(Math.round(g.fpsAvg)).padStart(5)}   ${bot('good').padEnd(10)} ${bot('casual')}`,
  );
  suggestions.push(...suggest(g, bots));
}
suggestions.push(...unusedTowers(groups, TOWER_IDS));

// devices (frame rate by screen + renderer)
const devices = new Map<string, number[]>();
for (const r of runs) {
  const k = `${r.device.w}×${r.device.h} @${r.device.dpr}x ${r.device.touch ? 'touch' : 'mouse'} ${r.device.renderer} (${r.quality})`;
  devices.set(k, [...(devices.get(k) ?? []), r.fps.avg]);
}
console.log('\nDevices (average fps per run):');
for (const [k, f] of devices) console.log(`  ${k.padEnd(48)} ${f.length} run(s), avg ${Math.round(f.reduce((a, b) => a + b, 0) / f.length)} fps, worst ${Math.min(...f)} fps`);

console.log(`\nSuggestions (${suggestions.length}) — suggestions only, nothing was changed:`);
if (!suggestions.length) console.log('  None: the data looks balanced (or there is not enough of it yet — aim for 3+ finished runs per map).');
for (const s of suggestions) console.log(`  • [${s.kind}] ${s.where}: ${s.text}`);
console.log('\nTo act on one: edit src/data/tuning.ts, then run `npm run sim` (good bot must still win everything) and `npm test`.');
