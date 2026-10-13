// npm run release:local [-- <slug>...]
// A required release step: runs the browser suites that need a real GPU (CI's runners have only
// software WebGL; the list is apps/site/scripts/local-suites.ts) on this machine, then records each
// result in apps/site/DEPLOYMENT.json (localSuites) for the site's current version. The production
// guard refuses a release unless every suite passed for that version and for exactly the game
// sources it ships. Commit the updated DEPLOYMENT.json with the release.
import { execFileSync,spawnSync } from 'node:child_process';
import { mkdtempSync,readFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import { LOCAL_SUITES,type LocalSuites } from '../apps/site/scripts/local-suites';
import { readManifest } from './lib/manifest';
import { buildInputsHash,gameDir,readJson,root,site,writeJson } from './lib/repo';

/** Extra Playwright options per suite. Light Crossing's long touch playthroughs time out when more than two share one GPU; one retry, as on CI (a test that passes on retry is recorded as flaky). */
const OPTIONS: Record<string,string[]> = { 'space-sky': [],'light-crossing': ['--workers=2','--retries=1'] };

const asked = process.argv.slice(2);
const unknown = asked.filter(slug => !(LOCAL_SUITES as readonly string[]).includes(slug));
if (unknown.length) throw new Error(`Not a local GPU suite: ${unknown.join(', ')}. The suites are ${LOCAL_SUITES.join(', ')}.`);
const games = asked.length ? asked : [...LOCAL_SUITES];

// Never alongside other test runs: they share the GPU and the CPU, and timings decide these suites.
const busy = spawnSync('pgrep',['-fl','[p]laywright test|[v]itest'],{ encoding: 'utf8' }).stdout.trim();
if (busy) throw new Error(`Other tests are running; try again when they finish:\n${busy}`);
for (const game of games) {
  const dirty = execFileSync('git',['status','--porcelain','--',`games/${game}`],{ cwd: root,encoding: 'utf8' }).trim();
  if (dirty) throw new Error(`games/${game} has uncommitted changes. Record a run only for committed sources:\n${dirty}`);
}

const deploymentPath = resolve(site,'DEPLOYMENT.json');
const { version } = readJson<{ version: string }>(resolve(site,'package.json'));
const commit = execFileSync('git',['rev-parse','--short','HEAD'],{ cwd: root,encoding: 'utf8' }).trim();
let failed = 0;
for (const game of games) {
  const out = mkdtempSync(join(tmpdir(),`aikg-${game}-`)), report = join(out,'report.json');
  const args = ['playwright','test','--reporter=list,json',...(OPTIONS[game] ?? [])];
  const command = `npx ${args.join(' ')}`;
  console.log(`\n${game}: ${command} (games/${game})`);
  const run = spawnSync('npx',args,{ cwd: gameDir(game),stdio: 'inherit',env: { ...process.env,PLAYWRIGHT_JSON_OUTPUT_FILE: report } });
  let stats: { expected: number; unexpected: number; flaky: number; skipped: number };
  try { stats = (JSON.parse(readFileSync(report,'utf8')) as { stats: typeof stats }).stats; } catch { throw new Error(`${game}: Playwright wrote no report (exit ${run.status}).`); } finally { rmSync(out,{ recursive: true,force: true }); }
  const result = { game,version: readManifest(game).version,inputsSha256: buildInputsHash(game).sha256,command,passed: stats.expected,failed: stats.unexpected,flaky: stats.flaky,skipped: stats.skipped,ranAt: new Date().toISOString() };
  if (run.status !== 0 && !result.failed) result.failed = 1;
  failed += result.failed;
  // Re-read before each write, so a long run never overwrites other edits to the record.
  const record = readJson<{ localSuites?: LocalSuites } & Record<string,unknown>>(deploymentPath);
  const previous = record.localSuites?.release === version ? record.localSuites.suites.filter(suite => suite.game !== game) : [];
  record.localSuites = { release: version,commit,suites: [...previous,result].sort((a,b) => LOCAL_SUITES.indexOf(a.game as never)-LOCAL_SUITES.indexOf(b.game as never)) };
  writeJson(deploymentPath,record);
  console.log(`${game}: ${result.passed} passed, ${result.failed} failed, ${result.flaky} flaky, ${result.skipped} skipped. Recorded for release ${version} (${commit}).`);
}
if (failed) { console.error(`\n${failed} failing test(s): the production guard will refuse release ${version} until they pass.`); process.exit(1); }
console.log(`\nAll GPU browser suites passed for release ${version}. Commit apps/site/DEPLOYMENT.json with the release.`);
