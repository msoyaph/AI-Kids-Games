// Building a submission from source with the shared kit: type-check, unit tests (only where the
// submission's own code may run: CI and the creator's machine, never in the owner's review), the
// single-file build and the checks on the built file.
import { spawnSync } from 'node:child_process';
import { existsSync,mkdirSync,readdirSync,readFileSync,statSync,writeFileSync } from 'node:fs';
import { join,relative,resolve } from 'node:path';
import { build } from 'vite';
import { root } from '../lib/repo';
import { result,skipped,type CheckResult,type Problem,type Submission } from './types';
import { communityViteConfig,KIT } from './vite-config';

export const MAX_BUILD = 2 * 1024 * 1024;
const bin = (name: string) => resolve(root,'node_modules/.bin',name);
const tail = (text: string,lines = 12) => text.trim().split('\n').slice(-lines).join('\n');

export function typecheck(s: Submission): CheckResult {
  mkdirSync(s.checkDir,{ recursive: true });
  const config = join(s.checkDir,'tsconfig.json');
  writeFileSync(config,JSON.stringify({ extends: relative(s.checkDir,join(KIT,'tsconfig.community.json')),include: ['../src/**/*','../tests/**/*'] },null,2));
  const run = spawnSync(bin('tsc'),['-p',config],{ cwd: s.dir,encoding: 'utf8' });
  if (run.status === 0) return result('typecheck','Type check',[]);
  const errors = (run.stdout+run.stderr).split('\n').filter(line => /error TS\d+/.test(line));
  return result('typecheck','Type check',errors.slice(0,10).map((line): Problem => {
    const at = /^(?:\.\.\/)*(?:community\/[^/]+\/)?([^(]+)\((\d+),\d+\): (.*)$/.exec(line.trim());
    return { message: at ? `${at[1]}:${at[2]} ${at[3]}` : line.trim(),fix: 'Fix the type error (your editor shows it too). TypeScript is strict here, like in the starter.',file: at?.[1],line: at ? Number(at[2]) : undefined };
  }).concat(errors.length > 10 ? [{ message: `…and ${errors.length-10} more type errors.`,fix: 'Fix the ones above first.' } as Problem] : []));
}

export function unitTests(s: Submission,untrusted: boolean): CheckResult {
  if (!s.files.some(file => file.path.startsWith('tests/unit/'))) return result('unit-tests','Unit tests',[{ message: 'There are no unit tests in tests/unit/.',fix: 'Keep the starter\'s tests and add some for your own rules.',severity: 'warn' }]);
  if (untrusted) return skipped('unit-tests','Unit tests','Not run here: a submission\'s tests are its own code, so they run in CI (a throwaway machine) and on the creator\'s computer only.');
  const run = spawnSync(bin('vitest'),['run','--root',s.dir,'--config',join(KIT,'vitest.config.ts'),'--reporter','dot'],{ cwd: s.dir,encoding: 'utf8',timeout: 120_000 });
  if (run.status === 0) return result('unit-tests','Unit tests',[],[(/Tests\s+(\d+ passed)/.exec(run.stdout.replace(/\x1b\[[0-9;]*m/g,''))?.[1] ?? 'passed')]);
  return result('unit-tests','Unit tests',[{ message: `Your unit tests failed:\n${tail((run.stdout+run.stderr).replace(/\x1b\[[0-9;]*m/g,''))}`,fix: 'Fix the failing tests (or the code they test).' }]);
}

export async function buildGame(s: Submission): Promise<{ check: CheckResult; file?: string }> {
  const outDir = join(s.checkDir,'dist');
  try {
    await build(communityViteConfig(s.dir,outDir));
  } catch (error) {
    const message = String((error as Error).message ?? error).split('\n').slice(0,6).join('\n');
    return { check: result('build','Build',[{ message: `The build failed: ${message}`,fix: 'Fix the error above. The build uses only your src/, index.html and the allowed packages.' }]) };
  }
  const problems: Problem[] = [];
  const files = existsSync(outDir) ? readdirSync(outDir) : [];
  if (files.length !== 1 || files[0] !== 'index.html') problems.push({ message: `The build made ${files.join(', ') || 'nothing'} instead of one index.html.`,fix: 'Import your art and sounds from src/ so they are inlined; don\'t use a public/ folder.' });
  const file = join(outDir,'index.html');
  if (!existsSync(file)) return { check: result('build','Build',problems) };
  const bytes = statSync(file).size, html = readFileSync(file,'utf8');
  if (bytes > MAX_BUILD) problems.push({ message: `The built game is ${(bytes/1048576).toFixed(2)} MB; the limit is 2 MB.`,fix: 'Make it smaller: draw art in code, reuse shapes, and remove unused code or packages.' });
  // The starter's build check (templates/game-starter/scripts/check-build.mjs), on the built file.
  const checks: [RegExp,string][] = [
    [/<script[^>]+src=/i,'an outside <script src>'],[/<link[^>]+href=["'](?!data:)/i,'an outside <link href>'],[/@import\s+url/i,'a CSS @import'],
    [/url\(\s*["']?https?:/i,'a CSS url() to another site'],[/\bimport\(\s*["'`]/,'a dynamic import()'],[/new\s+Worker\(/,'a Web Worker file'],
    [/navigator\.sendBeacon|new\s+WebSocket|new\s+EventSource/,'a network channel']
  ];
  for (const [pattern,what] of checks) if (pattern.test(html)) problems.push({ message: `The built game has ${what}.`,fix: 'Remove whatever adds it; everything must be inside the one file.' });
  return { check: result('build','Build',problems,[`index.html ${(bytes/1024).toFixed(0)} KB (limit 2 MB)`]),file };
}
