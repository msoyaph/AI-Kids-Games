/**
 * Balance helper (not part of the game or the test suite):
 *   npx tsx scripts/tune-stats.ts [rounds]
 * Runs the balance simulation in rounds and nudges each family's overall stat level toward a 50%
 * win rate, then prints the multipliers to apply to the family `stats` in src/data/species.ts.
 */
import { DEX } from '../src/data/index';
import { elementRates, simulateBalance, speciesRates } from '../src/sim/balance';

const rounds = Number(process.argv[2] ?? 12);
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
  const r = simulateBalance(DEX, { seedsPerPair: 8, teamBattles: 0, seed: 100 + round });
  const rates = speciesRates(r);
  const fam: Record<string, number[]> = {};
  for (const s of sp) if (!s.guardian) (fam[s.family] ??= []).push(rates[s.id] ?? 0.5);
  for (const [f, v] of Object.entries(fam)) mult[f] = mult[f]! * (1 + 0.12 * (0.5 - v.reduce((a, b) => a + b, 0) / v.length));
  hist.push({ ...mult });
  console.log(`round ${round}: ${JSON.stringify(Object.fromEntries(Object.entries(elementRates(r)).map(([k, v]) => [k, +v.toFixed(3)])))}`);
}
const last = hist.slice(-5);
const avg = Object.fromEntries(Object.keys(mult).map(k => [k, last.reduce((a, h) => a + h[k]!, 0) / last.length]));
apply(avg);
for (const seed of [999, 2026]) {
  const fin = simulateBalance(DEX, { seedsPerPair: 8, teamBattles: 0, seed });
  const fr = Object.entries(speciesRates(fin)).sort((a, b) => b[1] - a[1]);
  console.log(`check seed ${seed}: elements ${JSON.stringify(Object.fromEntries(Object.entries(elementRates(fin)).map(([k, v]) => [k, +v.toFixed(3)])))}`);
  console.log(`  best ${fr.slice(0, 3).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(', ')}; worst ${fr.slice(-3).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(', ')}`);
}
console.log('multipliers ' + JSON.stringify(Object.fromEntries(Object.entries(avg).filter(([, v]) => Math.abs(v - 1) > 1e-6).map(([k, v]) => [k, +v.toFixed(3)]))));
