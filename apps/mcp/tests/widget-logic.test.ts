import { mkdtempSync,readFileSync,writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import { describe,expect,it } from 'vitest';
import { catalog } from '../src/catalog';
import { checkDeployment } from '../scripts/check-deployment';
import { safeLink } from '../widget/src/links';
import { SIGNALS } from '../widget/src/signals';

const SITE = 'https://aikids.games';
const build = (slug: string) => readFileSync(resolve(import.meta.dirname,`../../site/public/games/${slug}/index.html`),'utf8');

describe('widget links',() => {
  it('go only to the website and the GitHub repo, with no query strings or tracking',() => {
    expect(safeLink(`${SITE}/game/tuck-pop?utm_source=chat#x`,SITE)).toBe(`${SITE}/game/tuck-pop`);
    expect(safeLink('https://github.com/msoyaph/AI-Kids-Games/tree/main/games/tuck-pop?ref=x',SITE)).toBe('https://github.com/msoyaph/AI-Kids-Games/tree/main/games/tuck-pop');
    expect(safeLink('https://github.com/someone-else/repo',SITE)).toBeUndefined();
    expect(safeLink('https://example.com/',SITE)).toBeUndefined();
    expect(safeLink('javascript:alert(1)',SITE)).toBeUndefined();
    expect(safeLink('http://aikids.games/',SITE)).toBeUndefined();
  });
});

describe('pause and round-end signals',() => {
  it('exist for every game that plays here, and read hooks and markers that are in the verified builds',() => {
    const marks: Record<string,string[]> = {
      'tuck-pop': ['__tuckpop','snapshot'],agentmon: ['__agentmon','panel.menu.pause'],'calex-cart': ['__calex'],'light-crossing': ['panel center pause'],
      'space-sky': ['pause-menu','race-result','complete-stats'],theabonk: ['__theabonk'],'vanex-defense': ['__vanexTest'],shooberry: ['__shooberry','snapshot']
    };
    for (const game of catalog.games.filter(entry => entry.embed !== 'site')) {
      expect(SIGNALS[game.slug],game.slug).toBeTypeOf('function');
      for (const mark of marks[game.slug] ?? []) expect(build(game.slug).includes(mark),`${game.slug}: ${mark}`).toBe(true);
    }
  });
});

describe('the production gate',() => {
  const fixture = (approval: object | null) => {
    const dir = mkdtempSync(join(tmpdir(),'aikg-mcp-gate-'));
    writeFileSync(join(dir,'package.json'),JSON.stringify({ version: '1.0.0' }));
    writeFileSync(join(dir,'DEPLOYMENT.json'),JSON.stringify({ productionApproval: approval }));
    return dir;
  };
  const approved = fixture({ approved: true,release: '1.0.0',date: '2026-10-14' });
  it('lets previews and local builds through',() => {
    expect(checkDeployment({ VERCEL_ENV: 'preview' },approved)).toMatch(/Not a production build/);
    expect(checkDeployment({},approved)).toMatch(/Not a production build/);
  });
  it('refuses production without the owner\'s approval for this exact version',() => {
    expect(() => checkDeployment({ VERCEL_ENV: 'production',AIKG_ALLOW_PRODUCTION: '1.0.0' },fixture(null))).toThrow(/no recorded owner approval/);
    expect(() => checkDeployment({ VERCEL_TARGET_ENV: 'production',AIKG_ALLOW_PRODUCTION: '1.0.0' },fixture({ approved: true,release: '0.9.0' }))).toThrow(/no recorded owner approval/);
  });
  it('refuses production without AIKG_ALLOW_PRODUCTION for this version, or from a branch other than main',() => {
    expect(() => checkDeployment({ VERCEL_ENV: 'production' },approved)).toThrow(/AIKG_ALLOW_PRODUCTION/);
    expect(() => checkDeployment({ VERCEL_ENV: 'production',AIKG_ALLOW_PRODUCTION: '0.1.0' },approved)).toThrow(/AIKG_ALLOW_PRODUCTION/);
    expect(() => checkDeployment({ VERCEL_ENV: 'production',AIKG_ALLOW_PRODUCTION: '1.0.0',VERCEL_GIT_COMMIT_REF: 'mcp-app' },approved)).toThrow(/only from main/);
  });
  it('allows production with both keys, from main',() => {
    expect(checkDeployment({ VERCEL_ENV: 'production',AIKG_ALLOW_PRODUCTION: '1.0.0',VERCEL_GIT_COMMIT_REF: 'main' },approved)).toMatch(/approved by the owner on 2026-10-14/);
  });
});
