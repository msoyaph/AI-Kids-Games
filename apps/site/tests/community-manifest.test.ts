import { describe,expect,it } from 'vitest';
import { validateCommunityManifest,type CommunityManifest } from '../../../scripts/lib/manifest';

// A complete, valid community manifest; each test breaks one rule.
const valid = (): CommunityManifest => ({
  slug: 'star-sprint',title: 'Star Sprint',tagline: 'Race the comet across the sky.',
  shortDescription: 'Steer a little rocket through a field of stars and race a friendly comet to the moon.',
  longDescription: 'Star Sprint is a short arcade race: steer around space rocks, collect stars and reach the moon before the comet does.',
  version: '0.1.0',minAge: 6,ageRange: '6+',genres: ['Action'],tags: ['Space','Racing'],keywords: ['space game','racing','arcade','kids game'],
  features: ['Plays with keyboard, mouse or touch','Remembers your best time','One self-contained file'],
  contentNotes: 'Gentle arcade play with no fighting or scary content. Best times save in this browser.',
  controls: { types: ['Keyboard','Mouse','Touch'],quickStart: ['Press Play.','Steer with the arrow keys or your finger.','Reach the moon first.'],howToPlay: ['Arrow keys or WASD steer.'] },
  devices: ['Computer','Tablet','Phone'],orientation: 'any',requirements: [],playTime: '2 minutes per race',
  storage: { prefix: 'starsprint.',keys: ['starsprint.save'],probe: 'starsprint.__probe' },
  safety: { ads: false,purchases: false,chat: false,accounts: false,network: false },
  hook: '__starsprint',capture: { scenes: ['?scene=title','?scene=play&seed=7'] },creator: { handle: '@star-maker' },license: 'MIT',
  originality: 'I made this game myself with an AI coding assistant. The rocket, the comet and the music are all new and drawn in code.',
  submitted: { date: '2026-10-13',sourceCommit: 'pending' },listing: 'submitted'
});
const others = { slugs: ['tuck-pop','theabonk'],prefixes: ['tuckpop.','theabonk.'] };
const problems = (change: (m: CommunityManifest) => void) => { const m = valid(); change(m); return validateCommunityManifest(m,'star-sprint',others).join('\n'); };

describe('community game manifests',() => {
  it('accept a complete submission',() => expect(validateCommunityManifest(valid(),'star-sprint',others)).toEqual([]));
  it('need a nickname, never a real name',() => expect(problems(m => { m.creator.handle = 'Jane Smith'; })).toMatch(/creator\.handle must be a nickname/));
  it('must be MIT',() => expect(problems(m => { (m as { license: string }).license = 'GPL-3.0'; })).toMatch(/license must be "MIT"/));
  it('need an originality statement',() => expect(problems(m => { m.originality = 'Mine.'; })).toMatch(/originality is missing or too short/));
  it('can only be listed with the owner’s approval',() => expect(problems(m => { m.listing = 'listed'; })).toMatch(/no approval/));
  it('take a slug and a storage prefix nobody else uses',() => {
    expect(problems(m => { m.slug = 'tuck-pop'; })).toMatch(/already taken/);
    expect(problems(m => { m.storage = { prefix: 'tuckpop.x.',keys: ['tuckpop.x.save'] }; })).toMatch(/overlaps another game/);
    expect(problems(m => { m.storage = { prefix: 'aikg.',keys: ['aikg.save'] }; })).toMatch(/overlaps another game/);
  });
  it('never name another company’s games, even in the originality statement',() => expect(problems(m => { m.originality = 'My own take on the minecraft idea, made with an AI assistant and drawn in code by me.'; })).toMatch(/uses "minecraft"/));
  it('reject unknown fields and outside-looking capture routes',() => {
    expect(problems(m => { (m as unknown as Record<string,unknown>).homepage = 'https://example.com'; })).toMatch(/unknown field "homepage"/);
    expect(problems(m => { m.capture.scenes = ['https://example.com']; })).toMatch(/capture scene/);
  });
  it('start with sourceCommit "pending"',() => expect(problems(m => { m.submitted.sourceCommit = 'abc'; })).toMatch(/sourceCommit must be "pending"/));
  it('keep the shared listing rules: every safety flag false, keys under the prefix',() => {
    expect(problems(m => { (m.safety as Record<string,boolean>).chat = true; })).toMatch(/safety\.chat must be false/);
    expect(problems(m => { m.storage.keys = ['other.save']; })).toMatch(/does not start with the prefix/);
  });
});
