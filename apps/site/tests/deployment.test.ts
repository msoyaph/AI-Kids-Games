import { describe,expect,it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync,readFileSync,writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import { LOCAL_SUITES } from '../scripts/local-suites';

// tsx may be hoisted to the monorepo root, so resolve its CLI instead of assuming node_modules/.bin.
const tsx = createRequire(import.meta.url).resolve('tsx/cli');
const script = resolve('scripts/check-deployment.ts');
const { version } = JSON.parse(readFileSync('package.json','utf8'));
const deployment = JSON.parse(readFileSync('DEPLOYMENT.json','utf8'));
const approval = deployment.productionApproval;
const imports = JSON.parse(readFileSync('BUILD_IMPORTS.json','utf8')).games as { slug: string; inputsSha256: string }[];
const production = { VERCEL: '1',VERCEL_ENV: 'production' };

/** A release record for the guard: approved, with passing local GPU suites for the shipped sources. */
function release(change: (record: any) => void = () => {}) {
  const record: any = {
    productionApproval: { approved: true,release: '9.9.9',date: '2026-10-13' },
    localSuites: { release: '9.9.9',commit: 'abc1234',suites: LOCAL_SUITES.map(game => ({ game,version: '1.0.0',inputsSha256: imports.find(entry => entry.slug === game)!.inputsSha256,command: 'npx playwright test',passed: 40,failed: 0,flaky: 1,skipped: 2,ranAt: '2026-10-13T00:00:00Z' })) }
  };
  change(record);
  const dir = mkdtempSync(join(tmpdir(),'aikg-guard-'));
  writeFileSync(join(dir,'package.json'),JSON.stringify({ version: '9.9.9' }));
  writeFileSync(join(dir,'DEPLOYMENT.json'),JSON.stringify(record));
  writeFileSync(join(dir,'BUILD_IMPORTS.json'),JSON.stringify({ games: imports }));
  return dir;
}
const guard = (env: Record<string,string>,cwd = release()) => spawnSync(process.execPath,[tsx,script],{ cwd,env: { PATH: process.env.PATH ?? '',...env },encoding: 'utf8' });
const approved = { ...production,AIKG_ALLOW_PRODUCTION: '9.9.9',VERCEL_GIT_COMMIT_REF: 'main' };

describe('production approval guard',{ timeout: 30000 },() => {
  it('records the owner approval for exactly this release',() => {
    expect(approval).toMatchObject({ approved: true,release: version });
    expect(approval.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('allows production from main when the repo record and the Vercel production variable both name this release',() => {
    const run = guard(approved);
    expect(run.status,run.stderr).toBe(0); expect(run.stdout).toContain('GPU browser suites passed on abc1234');
  });
  it('refuses production without the Production-only variable, or with one for another release',() => {
    for (const value of [undefined,'approved','0.0.1']) {
      const run = guard({ ...production,...(value ? { AIKG_ALLOW_PRODUCTION: value } : {}) });
      expect(run.status).not.toBe(0); expect(run.stderr).toContain('AIKG_ALLOW_PRODUCTION');
    }
  });
  it('refuses production without the owner approval recorded for this release',() => {
    const run = guard(approved,release(record => { record.productionApproval.release = '9.9.8'; }));
    expect(run.status).not.toBe(0); expect(run.stderr).toContain('no recorded owner approval');
  });
  it('refuses production from any branch but main',() => {
    const run = guard({ ...approved,VERCEL_GIT_COMMIT_REF: 'release-test' });
    expect(run.status).not.toBe(0); expect(run.stderr).toContain('only from main');
  });
  it('refuses production unless the GPU browser suites passed on the release machine for this release',() => {
    const cases: [string,(record: any) => void][] = [
      ['missing',record => { delete record.localSuites; }],
      ['another release',record => { record.localSuites.release = '9.9.8'; }],
      ['a suite missing',record => { record.localSuites.suites.pop(); }],
      ['a failure',record => { record.localSuites.suites[0].failed = 1; }],
      ['nothing ran',record => { record.localSuites.suites[0].passed = 0; }]
    ];
    for (const [name,change] of cases) {
      const run = guard(approved,release(change));
      expect(run.status,name).not.toBe(0); expect(run.stderr,name).toContain('npm run release:local');
    }
  });
  it('refuses production when a GPU suite ran on different game sources than the release ships',() => {
    const run = guard(approved,release(record => { record.localSuites.suites[1].inputsSha256 = '0'.repeat(64); }));
    expect(run.status).not.toBe(0); expect(run.stderr).toContain('ran on different sources');
  });
  it('still refuses a preview-only deploy that Vercel classifies as production',() => {
    const run = guard({ ...approved,AIKG_PREVIEW_ONLY: '1' });
    expect(run.status).not.toBe(0); expect(run.stderr).toContain('Preview-only deployment refused');
  });
  it('allows preview builds, which need no approval or local run',() => expect(guard({ VERCEL: '1',VERCEL_ENV: 'preview',AIKG_PREVIEW_ONLY: '1' },release(record => { delete record.productionApproval; delete record.localSuites; })).status).toBe(0));
  it('covers the GPU suites CI skips, and every one of them ships in the site',() => {
    expect([...LOCAL_SUITES].sort()).toEqual(['light-crossing','space-sky']);
    for (const game of LOCAL_SUITES) expect(imports.some(entry => entry.slug === game)).toBe(true);
    if (deployment.localSuites?.release === version) for (const game of LOCAL_SUITES) expect(deployment.localSuites.suites.find((suite: any) => suite.game === game)).toMatchObject({ failed: 0,inputsSha256: imports.find(entry => entry.slug === game)!.inputsSha256 });
  });
});
