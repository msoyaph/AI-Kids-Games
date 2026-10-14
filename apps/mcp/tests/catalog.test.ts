import { describe,expect,it } from 'vitest';
import { buildCatalog } from '../../../scripts/lib/catalog';
import { bySiteOrder,readManifests,type Manifest } from '../../../scripts/lib/manifest';
import { buildImportsPath,readJson,type BuildImports } from '../../../scripts/lib/repo';
import type { Game } from '../../site/src/data/games';
import { catalog,findGames,plays } from '../src/catalog';

const manifests = readManifests().sort(bySiteOrder), builds = readJson<BuildImports>(buildImportsPath).games;
const variant = (slug: string,change: (m: Manifest) => void) => { const m = structuredClone(manifests.find(entry => entry.slug === slug)!); change(m); return m; };
const community = (slug: string,preview: boolean): Game => ({
  slug,title: `Community ${slug}`,version: '1.0.0',tagline: 'A tagline.',description: 'A community game.',categories: ['Casual'],tags: ['A','B'],keywords: [],
  ageGuidance: 'Ages 6+',minAge: 6,contentNotes: 'Calm.',estimatedPlayTime: '5 minutes',quickStart: ['a','b','c'],controls: { types: ['Touch'],howToPlay: [] },
  supportedDevices: ['Phone'],orientation: 'any',requirements: [],coverLayers: [],releaseDate: '2026-10-13',featured: false,accentColor: '#e7e3f7',status: 'Ready to play',
  storage: { prefix: `${slug}.`,keys: [] },safety: { ads: false,purchases: false,chat: false,accounts: false,network: false },license: 'MIT',
  community: { handle: '@maker',playUrl: `https://aikg-${slug}.vercel.app/`,preview,longDescription: 'Long.',cover: `/media/community/${slug}/cover.webp`,shots: [],og: '/og/site.jpg' }
});

describe('the catalog (npm run manifests → apps/mcp/src/data/catalog.generated.json)',() => {
  it('is up to date with the manifests, the verified builds and the approved community games',() => {
    expect(catalog).toEqual(JSON.parse(JSON.stringify(buildCatalog(manifests,[],builds))));
  });

  it('lists only released games: never "In development" or "Coming soon"',() => {
    const list = [...manifests,variant('tuck-pop',m => { m.slug = 'dev-game'; m.site.status = 'In development'; }),variant('agentmon',m => { m.slug = 'soon-game'; m.site.status = 'Coming soon'; })];
    const slugs = buildCatalog(list,[],builds).games.map(game => game.slug);
    expect(slugs).not.toContain('dev-game');
    expect(slugs).not.toContain('soon-game');
    expect(slugs).toEqual(manifests.filter(m => m.site.status === 'Ready to play').map(m => m.slug));
  });

  it('includes community games only once approved (never previews), and only as cards that link to the website',() => {
    const games = buildCatalog(manifests,[community('star-sprint',false),community('test-garden',true)],builds).games;
    expect(games.some(game => game.slug === 'test-garden')).toBe(false);
    const approved = games.find(game => game.slug === 'star-sprint')!;
    expect(approved).toMatchObject({ embed: 'site',community: { handle: '@maker' },page: '/game/star-sprint' });
    expect(approved.build).toBeUndefined();
  });

  it('carries each playable game\'s verified build, byte size and SHA-256, and none for website-only games',() => {
    for (const game of catalog.games) {
      const imported = builds.find(entry => entry.slug === game.slug);
      if (game.embed === 'site') expect(game.build).toBeUndefined();
      else expect(game.build).toEqual({ path: `/games/${game.slug}/index.html`,bytes: imported!.bytes,sha256: imported!.sha256 });
    }
    expect(catalog.games.find(game => game.slug === 'cliff-valley')!.embed).toBe('site');
  });

  it('refuses a playable game without an imported build',() => {
    expect(() => buildCatalog([variant('tuck-pop',m => { m.slug = 'no-build'; })],[],builds)).toThrow(/no imported build/);
  });

  it('filters by age, genre, device, time and mood',() => {
    const all = catalog.games;
    expect(findGames(all,{ age: 7 }).games.every(game => game.minAge <= 7)).toBe(true);
    expect(findGames(all,{ device: 'Phone' }).games.length).toBe(all.filter(game => game.devices.includes('Phone')).length);
    expect(findGames(all,{ minutes: 5 }).games.map(game => game.slug)).toEqual(all.filter(game => game.sessionMinutes && game.sessionMinutes[0] <= 5).map(game => game.slug));
    expect(findGames(all,{ mood: 'cozy' }).games.every(game => game.moods.includes('cozy'))).toBe(true);
    expect(plays(all.find(game => game.slug === 'cliff-valley')!)).toBe(false);
  });
});
