// What the glass touch controls cost: the benchmark race (Neon Nightway, 8 karts) on the throttled phone and tablet
// profiles at every quality tier, with no controls, fake glass and real blur.
// Usage: npx vite preview --port 4173 &  then  node scripts/benchControls.mjs [--seconds 20] [--profiles phone,tablet]
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : d;
};
const seconds = opt('--seconds', '20');
const profiles = opt('--profiles', 'phone,tablet').split(',');
const tiers = opt('--tiers', 'auto,low,medium,high').split(',');
const variants = ['none', 'fake', 'blur'];
const runs = Number(opt('--runs', '1'));
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
mkdirSync('sim-report/touch', { recursive: true });
const rows = [];
for (const profile of profiles) {
  for (const q of tiers) {
    const r = {};
    for (const v of variants) {
      const all = [];
      for (let n = 0; n < runs; n++) {
        const file = `sim-report/touch/bench-${profile}-${q}-${v}-${n}.json`;
        execFileSync('node', ['scripts/bench.mjs', '--profile', profile, '--quality', q, '--seconds', seconds, '--controls', v, '--json', file], { stdio: 'ignore' });
        const d = JSON.parse(readFileSync(file, 'utf8'));
        all.push(d);
        console.log(`${profile} ${q} ${v} #${n + 1}: ${d.avgFps} fps (1 % low ${d.low1Fps}, p99 ${d.p99Ms} ms) tier ${d.finalTier}@${d.finalScale}`);
      }
      // medians over the runs (single 1 %-low readings are noisy)
      r[v] = { ...all[0], avgFps: median(all.map((d) => d.avgFps)), low1Fps: median(all.map((d) => d.low1Fps)), runs: all.length };
    }
    rows.push({ profile, q, r });
  }
}
const f = (d) => `${d.avgFps} / ${d.low1Fps}`;
const md = [
  '# Glass touch controls — frame-rate cost',
  '',
  `Benchmark race (Neon Nightway, 8 karts, ${seconds} s, median of ${runs} run${runs > 1 ? 's' : ''}) on the throttled profiles (4× CPU slowdown; phone 844×390 DPR 3, tablet 1024×768 DPR 2). Cells: average FPS / 1 % low FPS.`,
  '',
  '| Profile | Tier | No controls | Fake glass | Real blur | Fake − none | Blur − none |',
  '|---|---|---|---|---|---|---|',
  ...rows.map(({ profile, q, r }) => `| ${profile} | ${q}${q === 'auto' ? ` (→ ${r.none.finalTier})` : ''} | ${f(r.none)} | ${f(r.fake)} | ${f(r.blur)} | ${(r.fake.avgFps - r.none.avgFps).toFixed(1)} | ${(r.blur.avgFps - r.none.avgFps).toFixed(1)} |`),
  '',
].join('\n');
writeFileSync('sim-report/touch-perf.md', md);
writeFileSync('sim-report/touch-perf.json', JSON.stringify(rows.map(({ profile, q, r }) => ({ profile, tier: q, none: r.none, fake: r.fake, blur: r.blur })), null, 1));
console.log('\n' + md);
