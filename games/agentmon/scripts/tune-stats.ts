/**
 * Balance helper (not part of the game or the test suite):
 *   npx tsx scripts/tune-stats.ts [rounds] [--new]
 * --new tunes only the 1.1 families (numbers 53+), so 1.0 friends in existing saves keep their stats;
 * each new family then also absorbs its element's gap from 50% (averaged over three seeds a round).
 * Runs the balance simulation in rounds and nudges each family's overall stat level toward a 50%
 * win rate, then prints the multipliers to apply to the family `stats` in src/data/species.ts.
 */
import { DEX } from '../src/data/index';
import { elementRates, simulateBalance, speciesRates } from '../src/sim/balance';

const rounds = Number(process.argv.find(a => /^\d+$/.test(a)) ?? 12);
const onlyNew = process.argv.includes('--new');
const sp = Object.values(DEX.species);
const orig = new Map(sp.map(s => [s.id, { ...s.base }]));
const mult: Record<string, number> = {};
for (const s of sp) mult[s.family] = 1;
const apply = (m: Record<string, number>) => {
  for (const s of sp) {
    const o = orig.get(s.id)!, k = m[s.family]!;
    s.base = { energy: Math.round(o.energy * k), power: Math.round(o.power * k), guard: Math.round(o.guard * k), speed: Math.round(o.speed * k) };
  }
};
const hist: Record<string, number>[] = [];
for (let round = 0; round < rounds; round++) {
  apply(mult);
  const runs = (onlyNew ? [0, 1, 2] : [0]).map(k => simulateBalance(DEX, { seedsPerPair: 8, teamBattles: 0, seed: 100 + round * 3 + k }));
  const r = runs[0]!;
  const avgOf = (f: (x: typeof r) => Record<string, number>) => {
    const all = runs.map(f), out: Record<string, number> = {};
    for (const k of Object.keys(all[0]!)) out[k] = all.reduce((a, x) => a + (x[k] ?? 0.5), 0) / all.length;
    return out;
  };
  const rates = avgOf(speciesRates), el = avgOf(elementRates);
  const fam: Record<string, number[]> = {};
  for (const s of sp) if (!s.guardian) (fam[s.family] ??= []).push(rates[s.id] ?? 0.5);
  for (const [f, v] of Object.entries(fam)) {
    if (onlyNew && !sp.some(s => s.family === f && s.num > 52)) continue;
    const own = 0.5 - v.reduce((a, b) => a + b, 0) / v.length;
    const element = onlyNew ? 0.5 - el[sp.find(s => s.family === f)!.element]! : 0;
    mult[f] = mult[f]! * (1 + 0.06 * own + 0.25 * element);
  }
  hist.push({ ...mult });
  console.log(`round ${round}: ${JSON.stringify(Object.fromEntries(Object.entries(el).map(([k, v]) => [k, +v.toFixed(3)])))}`);
}
const last = hist.slice(-5);
const avg = Object.fromEntries(Object.keys(mult).map(k => [k, last.reduce((a, h) => a + h[k]!, 0) / last.length]));
apply(avg);
for (const seed of [999, 2026, 7, 42]) {
  const fin = simulateBalance(DEX, { seedsPerPair: 8, teamBattles: 0, seed });
  const fr = Object.entries(speciesRates(fin)).sort((a, b) => b[1] - a[1]);
  console.log(`check seed ${seed}: elements ${JSON.stringify(Object.fromEntries(Object.entries(elementRates(fin)).map(([k, v]) => [k, +v.toFixed(3)])))}`);
  console.log(`  best ${fr.slice(0, 3).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(', ')}; worst ${fr.slice(-3).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(', ')}`);
}
console.log('multipliers ' + JSON.stringify(Object.fromEntries(Object.entries(avg).filter(([, v]) => Math.abs(v - 1) > 1e-6).map(([k, v]) => [k, +v.toFixed(3)]))));
