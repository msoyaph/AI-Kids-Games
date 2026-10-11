import { describe,expect,it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const guard = (env: Record<string,string>) => spawnSync('node_modules/.bin/tsx',['scripts/check-deployment.ts'],{ env: { PATH: process.env.PATH ?? '',...env },encoding: 'utf8' });
describe('production approval guard',() => {
  it('allows the approved release in a Vercel production build',() => {
    const { version } = JSON.parse(readFileSync('package.json','utf8'));
    const approval = JSON.parse(readFileSync('DEPLOYMENT.json','utf8')).productionApproval;
    expect(approval).toMatchObject({ approved: true,release: version });
    expect(approval.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(guard({ VERCEL: '1',VERCEL_ENV: 'production' }).status).toBe(0);
  });
  it('still refuses a preview-only deploy that Vercel classifies as production',() => {
    const run = guard({ VERCEL: '1',VERCEL_ENV: 'production',AIKG_PREVIEW_ONLY: '1' });
    expect(run.status).not.toBe(0); expect(run.stderr).toContain('Preview-only deployment refused');
  });
  it('allows preview builds',() => expect(guard({ VERCEL: '1',VERCEL_ENV: 'preview',AIKG_PREVIEW_ONLY: '1' }).status).toBe(0));
});
