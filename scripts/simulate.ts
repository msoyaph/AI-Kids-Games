// Headless balance check: the autoplay bot plays every campaign map on every difficulty.
//   npm run sim                 all maps x difficulties
//   npm run sim -- w2m1 hard    one map / difficulty
//   npm run sim -- --casual     a less clever "younger player" bot
import { DIFFICULTY_ORDER, starsFor, type Difficulty } from '../src/data/difficulty';
import { CAMPAIGN_MAPS } from '../src/data/maps';
import { simulate } from '../src/sim/autoplay';

const args = process.argv.slice(2);
const casual = args.includes('--casual');
const mapArg = args.find((a) => /^w\dm\d$/.test(a));
const diffArg = args.find((a) => (DIFFICULTY_ORDER as string[]).includes(a)) as Difficulty | undefined;
const seeds = Number(args.find((a) => a.startsWith('--seeds='))?.split('=')[1] ?? 1);

const maps = CAMPAIGN_MAPS.filter((m) => !mapArg || m.id === mapArg);
const diffs = diffArg ? [diffArg] : DIFFICULTY_ORDER;
let failures = 0;
const t0 = Date.now();
console.log(`bot: ${casual ? 'casual' : 'good'}  seeds: ${seeds}`);
console.log('map        diff    result  lives   stars  wave  towers  path  time');
for (const m of maps) {
  for (const d of diffs) {
    for (let seed = 1; seed <= seeds; seed++) {
      const r = simulate(m, d, { seed, skill: casual ? 'casual' : 'good' });
      const stars = r.won ? starsFor(r.lives, r.maxLives) : 0;
      if (!r.won) failures++;
      console.log(
        `${m.id.padEnd(10)} ${d.padEnd(7)} ${(r.won ? 'WIN' : 'LOSE').padEnd(7)} ${`${r.lives}/${r.maxLives}`.padEnd(7)} ${'★'.repeat(stars).padEnd(6)} ${String(r.wave).padStart(4)}  ${String(r.towers).padStart(6)}  ${String(r.pathLength).padStart(4)}  ${Math.round(r.seconds / 60)}m`,
      );
    }
  }
}
console.log(`\n${failures === 0 ? 'All runs won' : `${failures} run(s) lost`} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
process.exitCode = failures ? 1 : 0;
