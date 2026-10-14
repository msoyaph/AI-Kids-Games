import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
      'space-sky': ['pause-menu','race-result','complete-stats'],theabonk: ['__theabonk'],'vanex-defense': ['__vanexTest']
    };
    for (const game of catalog.games.filter(entry => entry.embed !== 'site')) {
      expect(SIGNALS[game.slug],game.slug).toBeTypeOf('function');
      for (const mark of marks[game.slug] ?? []) expect(build(game.slug).includes(mark),`${game.slug}: ${mark}`).toBe(true);
    }
  });
});

describe('the production gate',() => {
  it('lets previews through and refuses production without the owner\'s approval',() => {
    expect(checkDeployment({ VERCEL_ENV: 'preview' })).toMatch(/Not a production build/);
    expect(() => checkDeployment({ VERCEL_ENV: 'production',AIKG_ALLOW_PRODUCTION: '0.1.0' })).toThrow(/no recorded owner approval/);
    expect(() => checkDeployment({ VERCEL_TARGET_ENV: 'production' })).toThrow(/no recorded owner approval/);
  });
});
