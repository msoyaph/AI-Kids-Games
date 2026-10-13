/** npx tsx scripts/level-curve.ts — quick look at the no-grind level curve (all starters × difficulties). */
import { DEX } from '../src/data/index';
import { STARTERS } from '../src/data/species';
import { simulateProgression } from '../src/sim/progression';
import type { Difficulty } from '../src/core/types';

const seeds = Number(process.argv[2] ?? 6);
for (const difficulty of ['easy', 'normal', 'hard'] as Difficulty[]) {
  const keeper: Record<string, { first: number; ok: number; n: number; att: number; lv: number; foe: number }> = {};
  let battles = 0;
  for (const starter of STARTERS) for (let s = 0; s < seeds; s++) {
    const r = simulateProgression(DEX, starter, difficulty, 1000 + s * 7 + starter.length);
    battles += r.battles;
    for (const t of r.trainers) {
      if (t.kind !== 'keeper' && t.kind !== 'rival' && t.kind !== 'club') continue;
      const k = (keeper[t.id] ??= { first: 0, ok: 0, n: 0, att: 0, lv: 0, foe: t.topFoeLevel });
      k.n++; if (t.attempts === 1) k.first++; if (t.attempts <= 2) k.ok++; k.att += Number.isFinite(t.attempts) ? t.attempts : 9;
      k.lv += Math.max(...t.teamLevels); (k as any).avg = ((k as any).avg ?? 0) + t.teamLevels.reduce((a, b) => a + b, 0) / t.teamLevels.length;
    }
  }
  console.log(`\n${difficulty} (${battles} battles)`);
  for (const [id, k] of Object.entries(keeper)) console.log(`  ${id.padEnd(16)} foe L${k.foe}  team max L${(k.lv / k.n).toFixed(1)} avg L${((k as any).avg / k.n).toFixed(1)}  first-try ${(k.first / k.n * 100).toFixed(0)}%  within 2 ${(k.ok / k.n * 100).toFixed(0)}%  avg tries ${(k.att / k.n).toFixed(2)}`);
}
