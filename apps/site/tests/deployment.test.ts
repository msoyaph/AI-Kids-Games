import { describe,expect,it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// tsx may be hoisted to the monorepo root, so resolve its CLI instead of assuming node_modules/.bin.
const tsx = createRequire(import.meta.url).resolve('tsx/cli');
const guard = (env: Record<string,string>) => spawnSync(process.execPath,[tsx,'scripts/check-deployment.ts'],{ env: { PATH: process.env.PATH ?? '',...env },encoding: 'utf8' });
const { version } = JSON.parse(readFileSync('package.json','utf8'));
const approval = JSON.parse(readFileSync('DEPLOYMENT.json','utf8')).productionApproval;
const production = { VERCEL: '1',VERCEL_ENV: 'production' };
describe('production approval guard',{ timeout: 30000 },() => {
  it('records the owner approval for exactly this release',() => {
    expect(approval).toMatchObject({ approved: true,release: version });
    expect(approval.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('allows production from main when the repo record and the Vercel production variable both name this release',() => {
    expect(guard({ ...production,AIKG_ALLOW_PRODUCTION: version,VERCEL_GIT_COMMIT_REF: 'main' }).status).toBe(0);
  });
  it('refuses production without the Production-only variable, or with one for another release',() => {
    for (const value of [undefined,'approved','0.0.1']) {
      const run = guard({ ...production,...(value ? { AIKG_ALLOW_PRODUCTION: value } : {}) });
      expect(run.status).not.toBe(0); expect(run.stderr).toContain('AIKG_ALLOW_PRODUCTION');
    }
  });
  it('refuses production from any branch but main',() => {
    const run = guard({ ...production,AIKG_ALLOW_PRODUCTION: version,VERCEL_GIT_COMMIT_REF: 'release-test' });
    expect(run.status).not.toBe(0); expect(run.stderr).toContain('only from main');
  });
  it('still refuses a preview-only deploy that Vercel classifies as production',() => {
    const run = guard({ ...production,AIKG_ALLOW_PRODUCTION: version,AIKG_PREVIEW_ONLY: '1' });
    expect(run.status).not.toBe(0); expect(run.stderr).toContain('Preview-only deployment refused');
  });
  it('allows preview builds',() => expect(guard({ VERCEL: '1',VERCEL_ENV: 'preview',AIKG_PREVIEW_ONLY: '1' }).status).toBe(0));
});
