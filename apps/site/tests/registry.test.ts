import { describe,expect,it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { games } from '../src/data/games';
import { validateRegistry } from '../src/lib/registry';
describe('registry validation',() => {
  it('accepts launch games and their real local assets',() => expect(validateRegistry(games,path => existsSync(resolve('public',path)))).toEqual([]));
  it('rejects duplicate slugs',() => expect(validateRegistry([games[0],games[0]],() => true)).toContain(`${games[0].slug}: duplicate slug.`));
  it('identifies missing game folders, art and previews',() => { const errors = validateRegistry(games,() => false); expect(errors).toContain('theabonk: public/games/theabonk/index.html does not exist.'); expect(errors).toContain('theabonk: public/media/theabonk/cover.svg does not exist.'); expect(errors).toContain('theabonk: public/media/theabonk/loop.mp4 does not exist.'); expect(errors).toContain('cliff-valley: public/media/cliff-valley/temp/cover.webp does not exist.'); });
  it('reports missing required fields',() => expect(validateRegistry([{ ...games[0], title: '' }],() => true)).toContain(`${games[0].slug}: required field "title" is missing.`));
  it('requires a valid minimum age',() => expect(validateRegistry([{ ...games[0], minAge: NaN }],() => true)).toContain(`${games[0].slug}: minAge must be a whole number from 0 to 18.`));
  it('rejects unsafe slugs, unknown cover motions and missing quick-start steps',() => { const errors = validateRegistry([{ ...games[0], slug: '../escape', coverLayers: ['spin' as never], quickStart: [] }],() => true); expect(errors.some(error => error.includes('lowercase slug'))).toBe(true); expect(errors.some(error => error.includes('coverLayers'))).toBe(true); expect(errors.some(error => error.includes('quickStart'))).toBe(true); });
  it('rejects invalid dates, colors, or empty controls',() => { const errors = validateRegistry([{ ...games[0], releaseDate: 'not-a-date', accentColor: 'red', controls: { types: [], howToPlay: [] } }],() => true); expect(errors.length).toBe(3); });
});
