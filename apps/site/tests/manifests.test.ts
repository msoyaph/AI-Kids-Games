import { describe,expect,it } from 'vitest';
import { readManifests,validateManifest,type Manifest } from '../../../scripts/lib/manifest';
import { games } from '../src/data/games';

const manifests = readManifests();
const sample = () => structuredClone(manifests.find(m => m.slug === 'cliff-valley')!) as Manifest;

describe('game manifests (games/<slug>/game.json)',() => {
  it('are all valid',() => expect(manifests.flatMap(m => validateManifest(m))).toEqual([]));
  it('drive the site registry: one listing per manifest, with the same facts',() => {
    expect(games.map(game => game.slug).sort()).toEqual(manifests.map(m => m.slug).sort());
    for (const m of manifests) {
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
  it('reject storage keys outside the game\'s own prefix',() => {
    const m = sample(); m.storage.keys = [...m.storage.keys,'aikg:favorites'];
    expect(validateManifest(m)).toContain('cliff-valley: storage key "aikg:favorites" does not start with the prefix "cliffvalley.".');
  });
  it('require touch controls for phones and tablets, and an age range that starts at minAge',() => {
    const m = sample(); m.controls.types = ['Keyboard']; m.ageRange = '9–14';
    const errors = validateManifest(m);
    expect(errors).toContain('cliff-valley: phones and tablets need Touch in controls.types.');
    expect(errors).toContain('cliff-valley: ageRange must start at minAge.');
  });
});
