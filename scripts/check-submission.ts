// npm run check-submission -- <slug> [--untrusted] [--json] [--record <dir>]
// Every check a community game (community/<slug>/) must pass before it can be listed, with a fix
// for each problem. Creators (and their AI assistants) run it locally; CI runs it on every
// community pull request; the owner's review kit runs it with --untrusted (the submission's own
// unit tests never run on the owner's computer). Writes community/<slug>/.check/report.md and
// report.json. Exits 1 when any check fails. SUBMITTING.md explains every check.
import { createHash } from 'node:crypto';
import { mkdirSync,writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SLUG } from './lib/repo';
import { browserChecks } from './submission/browser';
import { buildGame,typecheck,unitTests } from './submission/build';
import { checkContent } from './submission/content';
import { checkDependencies,checkFiles,checkManifest,loadSubmission } from './submission/files';
import { scanSource } from './submission/source';
import { skipped,type CheckResult } from './submission/types';

const args = process.argv.slice(2);
const slug = args.find((arg,index) => !arg.startsWith('--') && args[index-1] !== '--record');
const untrusted = args.includes('--untrusted'), json = args.includes('--json');
const recordAt = args.indexOf('--record'), record = recordAt >= 0 ? args[recordAt+1] : undefined;
if (!slug || !SLUG.test(slug)) { console.error('Usage: npm run check-submission -- <slug>    (the folder name under community/)'); process.exit(2); }

const s = loadSubmission(slug);
const checks: CheckResult[] = [];
const say = (line: string) => { if (!json) console.log(line); };
say(`\nChecking community/${slug} for AI Kids Games…\n`);
const add = (check: CheckResult) => { checks.push(check); if (!json) print(check); };
function print(check: CheckResult) {
  const mark = { pass: '✓',fail: '✗',warn: '!',skip: '–' }[check.status];
  console.log(`${mark} ${check.title}${check.notes.length ? `  (${check.notes.join('; ')})` : ''}`);
  for (const problem of check.problems) {
    console.log(`    ${(problem.severity ?? 'fail') === 'fail' ? '✗' : '!'} ${problem.message.split('\n').join('\n      ')}`);
    console.log(`      How to fix: ${problem.fix}`);
  }
}

add(checkFiles(s));
add(checkManifest(s));
add(checkDependencies(s));
const scan = scanSource(s);
add(scan.access);
add(scan.storage);
add(checkContent(scan.texts));
const ready = !checks.some(check => check.id === 'files' && check.problems.some(problem => /is missing|is empty/.test(problem.message))) && s.manifest !== null;
let bytes: number | undefined, run: Awaited<ReturnType<typeof browserChecks>> | undefined;
if (ready) {
  add(typecheck(s));
  add(unitTests(s,untrusted));
  const built = await buildGame(s);
  add(built.check);
  bytes = built.file ? (await import('node:fs')).statSync(built.file).size : undefined;
  if (built.file && built.check.status !== 'fail') {
    say('  (playing it in a browser for about 40 seconds…)');
    run = await browserChecks(s,built.file,{ record });
    for (const check of run.checks) add(check);
  } else for (const [id,title] of [['contract','Contract'],['smoke','Browser play test'],['storage-runtime','Storage (while playing)'],['flash','Flash safety'],['accessibility','Accessibility']]) add(skipped(id!,title!,'needs a successful build'));
} else add(skipped('build','Build','fix the files and game.json first'));

const failed = checks.filter(check => check.status === 'fail'), warned = checks.filter(check => check.status === 'warn');
const ok = failed.length === 0;
mkdirSync(s.checkDir,{ recursive: true });
const report = { slug,ok,checkedAt: new Date().toISOString(),untrusted,bytes,checks,texts: scan.texts,risks: scan.risks,storageKeys: run?.storageKeys ?? [],screens: run?.screens ?? [],video: run?.video };
const reportJson = `${JSON.stringify(report,null,2)}\n`;
writeFileSync(join(s.checkDir,'report.json'),reportJson);
writeFileSync(join(s.checkDir,'report.md'),[
  `# check-submission: ${slug}`,'',`${ok ? '**All checks passed.**' : `**${failed.length} check${failed.length === 1 ? '' : 's'} failed.**`} ${warned.length ? `${warned.length} with notes for the review.` : ''}`,'',
  ...checks.flatMap(check => [`## ${{ pass: '✓',fail: '✗',warn: '!',skip: '–' }[check.status]} ${check.title}`,...check.notes.map(note => `- ${note}`),...check.problems.flatMap(problem => [`- ${(problem.severity ?? 'fail') === 'fail' ? '✗' : '!'} ${problem.message}`,`  - How to fix: ${problem.fix}`]),''])
].join('\n'));
const summary = `${ok ? 'PASS' : 'FAIL'}: ${checks.filter(check => check.status === 'pass').length} passed, ${failed.length} failed, ${warned.length} with notes, ${checks.filter(check => check.status === 'skip').length} skipped (report ${createHash('sha256').update(reportJson).digest('hex').slice(0,12)})`;
if (json) console.log(reportJson); else {
  console.log(`\n${summary}`);
  console.log(untrusted ? (ok ? 'Every check passed.' : 'Some checks failed.') : ok ? `Every check passed. Next: open a pull request that changes only community/${slug}/ (SUBMITTING.md).` : 'Fix the ✗ items above and run this again.');
  console.log(`Report: community/${slug}/.check/report.md`);
}
process.exit(ok ? 0 : 1);
