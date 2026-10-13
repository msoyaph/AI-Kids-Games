/**
 * Balance sweep: every hero × map × difficulty (and Hard tiers) with the sliding bot at
 * "decent" (0.7) and "expert" (0.9) skill, run in parallel processes, compared with the
 * targets from the upgrade plan.
 *
 * Usage: npx tsx scripts/balance-sweep.ts [seeds=8] [--jobs N] [--only meadow-normal ...]
 *        extra flags (e.g. --tuning file.json) are passed through to simulate.ts
 */
import { spawn } from 'node:child_process';
import { availableParallelism } from 'node:os';

const argv = process.argv.slice(2);
const flag = (name: string): string | null => {
  const i = argv.indexOf(name);
  if (i < 0) return null;
  const v = argv[i + 1];
  argv.splice(i, 2);
  return v;
};
const jobs = Number(flag('--jobs')) || Math.max(2, Math.min(10, availableParallelism() - 2));
const onlyArg = flag('--only');
const seeds = Number(argv[0]) || 8;
const passthrough = argv.slice(Number(argv[0]) ? 1 : 0);

interface Cell {
  key: string;
  map: string;
  difficulty: string;
  tier: number;
  skill: number;
  /** [min, max] average survival (s) and win share for the decent / expert bot. */
  target: { avg?: [number, number]; wins?: [number, number] };
}
const m = (min: number): number => min * 60;
const CELLS: Cell[] = [];
for (const map of ['meadow', 'rimewood']) {
  CELLS.push(
    { key: `${map}-relaxed-0.7`, map, difficulty: 'relaxed', tier: 0, skill: 0.7, target: { avg: [m(13.5), m(17)], wins: [0.4, 0.55] } },
    { key: `${map}-relaxed-0.9`, map, difficulty: 'relaxed', tier: 0, skill: 0.9, target: { wins: [0.6, 1] } },
    {
      key: `${map}-normal-0.7`,
      map,
      difficulty: 'normal',
      tier: 0,
      skill: 0.7,
      target: map === 'meadow' ? { avg: [m(10), m(15)], wins: [0.15, 0.3] } : { avg: [m(9), m(14)], wins: [0.1, 0.25] },
    },
    { key: `${map}-normal-0.9`, map, difficulty: 'normal', tier: 0, skill: 0.9, target: map === 'meadow' ? { wins: [0.3, 0.45] } : { wins: [0.25, 0.4] } },
    { key: `${map}-hard-0.7`, map, difficulty: 'hard', tier: 0, skill: 0.7, target: { avg: [m(7), m(11)], wins: [0, 0.1] } },
    { key: `${map}-hard-0.9`, map, difficulty: 'hard', tier: 0, skill: 0.9, target: { wins: [0.15, 0.25] } },
  );
}
for (let tier = 1; tier <= 5; tier++) {
  // about 15% at tier 1 falling to about 2% at tier 5 (expert bot)
  const w = 0.15 - ((0.15 - 0.02) * (tier - 1)) / 4;
  CELLS.push({ key: `meadow-hard${tier}-0.9`, map: 'meadow', difficulty: 'hard', tier, skill: 0.9, target: { wins: [Math.max(0, w - 0.06), w + 0.06] } });
}

interface Result {
  avg: number;
  wins: number;
  n: number;
  byHero: Record<string, { avg: number; wins: number; n: number }>;
}

function runCell(c: Cell): Promise<Result> {
  return new Promise((resolve, reject) => {
    const args = ['tsx', 'scripts/simulate.ts', String(seeds), String(c.skill), '--map', c.map, '--difficulty', c.difficulty, '--json', ...passthrough];
    if (c.tier) args.push('--tier', String(c.tier));
    const p = spawn('npx', args, { stdio: ['ignore', 'pipe', 'inherit'] });
    let out = '';
    p.stdout.on('data', (d) => (out += String(d)));
    p.on('close', (code) => {
      const line = out.split('\n').find((l) => l.startsWith('JSON '));
      if (code !== 0 || !line) reject(new Error(`${c.key}: simulate failed (${code})`));
      else resolve(JSON.parse(line.slice(5)) as Result);
    });
  });
}

const fmt = (s: number): string => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const cells = onlyArg ? CELLS.filter((c) => onlyArg.split(',').some((o) => c.key.startsWith(o))) : CELLS;
const results = new Map<string, Result>();
const t0 = Date.now();
let next = 0;
await Promise.all(
  Array.from({ length: Math.min(jobs, cells.length) }, async () => {
    while (next < cells.length) {
      const c = cells[next++];
      results.set(c.key, await runCell(c));
      process.stderr.write(`  done ${c.key} (${((Date.now() - t0) / 1000).toFixed(0)} s)\n`);
    }
  }),
);

console.log(`\nBalance sweep — ${seeds} seeds per hero per cell, ${jobs} jobs, ${((Date.now() - t0) / 1000).toFixed(0)} s\n`);
console.log(`${'cell'.padEnd(22)} ${'avg'.padStart(6)} ${'target avg'.padStart(12)} ${'wins'.padStart(6)} ${'target'.padStart(10)}  hero spread (avg)`);
let misses = 0;
for (const c of cells) {
  const r = results.get(c.key)!;
  const share = r.wins / r.n;
  const okAvg = !c.target.avg || (r.avg >= c.target.avg[0] && r.avg <= c.target.avg[1]);
  const okWin = !c.target.wins || (share >= c.target.wins[0] - 1e-9 && share <= c.target.wins[1] + 1e-9);
  if (!okAvg || !okWin) misses++;
  const heroes = Object.entries(r.byHero)
    .map(([id, h]) => `${id} ${fmt(h.avg)}${Math.abs(h.avg - r.avg) > 90 ? '!' : ''}`)
    .join('  ');
  console.log(
    `${c.key.padEnd(22)} ${fmt(r.avg).padStart(6)} ${(c.target.avg ? `${fmt(c.target.avg[0])}–${fmt(c.target.avg[1])}` : '—').padStart(12)} ${`${Math.round(share * 100)}%`.padStart(6)} ${(c.target.wins ? `${Math.round(c.target.wins[0] * 100)}–${Math.round(c.target.wins[1] * 100)}%` : '—').padStart(10)} ${okAvg && okWin ? ' ok ' : ' MISS'}  ${heroes}`,
  );
}
console.log(`\n${misses ? `${misses} cell(s) off target` : 'all cells on target'} ("!" = hero more than 1:30 from the cell average)`);
