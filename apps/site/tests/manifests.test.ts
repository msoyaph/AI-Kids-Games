import { describe,expect,it } from 'vitest';
import { listedManifests,readManifests,validateManifest,type Manifest } from '../../../scripts/lib/manifest';
import { games } from '../src/data/games';

const manifests = readManifests();
const sample = () => structuredClone(manifests.find(m => m.slug === 'cliff-valley')!) as Manifest;

describe('game manifests (games/<slug>/game.json)',() => {
  it('are all valid',() => expect(manifests.flatMap(m => validateManifest(m))).toEqual([]));
  it('drive the site registry: one listing per manifest, with the same facts',() => {
    expect(games.map(game => game.slug).sort()).toEqual(listedManifests().map(m => m.slug).sort());
    for (const m of listedManifests()) {
      const game = games.find(entry => entry.slug === m.slug)!;
      expect(game).toMatchObject({ title: m.title,version: m.version,tagline: m.tagline,description: m.shortDescription,minAge: m.minAge,ageGuidance: `Ages ${m.ageRange}`,estimatedPlayTime: m.playTime,contentNotes: m.contentNotes,supportedDevices: m.devices,categories: m.genres,keywords: m.keywords });
    }
  });
  it('reject other companies\' game titles and trademarks anywhere in a listing',() => {
    const m = sample(); m.keywords = [...m.keywords,'like stardew valley'];
    expect(validateManifest(m).some(error => error.includes('"stardew"'))).toBe(true);
    const n = sample(); n.shortDescription = 'A farming game you can play with an Xbox controller and more.';
    expect(validateManifest(n).some(error => error.includes('"xbox"'))).toBe(true);
  });
  it('keep games that are still "In development" off the site',() => {
    for (const m of manifests.filter(entry => entry.site.status === 'In development')) expect(games.some(game => game.slug === m.slug)).toBe(false);
    const m = sample(); m.site.status = 'Unknown' as Manifest['site']['status'];
    expect(validateManifest(m)).toContain('cliff-valley: site.status must be one of "Ready to play", "Coming soon", "In development".');
  });
  it('reject the block puzzles that inspired the seventh game, by name',() => {
    for (const [field,text] of [['tagline','Like Block Blast, for kids.'],['tagline','A Woodoku-style grid.'],['tagline','Better than 1010! for kids.'],['tagline','Blockudoku, but cozy.']] as const) {
      const m = sample(); m[field] = text;
      expect(validateManifest(m).some(error => error.includes('another company')),text).toBe(true);
    }
  });
  it('reject storage keys outside the game\'s own prefix',() => {
    const m = sample(); m.storage.keys = [...m.storage.keys,'aikg:favorites'];
    expect(validateManifest(m)).toContain('cliff-valley: storage key "aikg:favorites" does not start with the prefix "cliffvalley.".');
  });
  it('say how each game plays in AI assistants: one sitting, its moods and how it embeds',() => {
    const m = sample(); m.sessionMinutes = [30,10]; m.moods = ['spooky' as Manifest['moods'][number]]; m.embed = 'popup' as Manifest['embed'];
    const errors = validateManifest(m);
    expect(errors).toContain('cliff-valley: sessionMinutes must be [shortest, longest] whole minutes for one sitting, from 1 to 240.');
    expect(errors).toContain('cliff-valley: moods: "spooky" is not one of calm, cozy, cheerful, exciting, brainy, creative, curious.');
    expect(errors).toContain('cliff-valley: embed must be one of "inline", "fullscreen", "site".');
    const n = sample(); delete (n as Partial<Manifest>).embed;
    expect(validateManifest(n)).toContain('cliff-valley: embed must be one of "inline", "fullscreen", "site".');
  });
  it('require touch controls for phones and tablets, and an age range that starts at minAge',() => {
    const m = sample(); m.controls.types = ['Keyboard']; m.ageRange = '9–14';
    const errors = validateManifest(m);
    expect(errors).toContain('cliff-valley: phones and tablets need Touch in controls.types.');
    expect(errors).toContain('cliff-valley: ageRange must start at minAge.');
  });
});
