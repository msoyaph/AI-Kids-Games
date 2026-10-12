import { describe,expect,it } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync,readdirSync,readFileSync,statSync } from 'node:fs';
import { resolve } from 'node:path';
import { games } from '../src/data/games';
import media from '../src/data/media.json';
import { temporaryArt } from '../src/data/temporary-art';

const pub = (path: string) => resolve('public',path);
const imports = JSON.parse(readFileSync('BUILD_IMPORTS.json','utf8')) as { games: { slug: string; bytes: number; sha256: string }[] };

describe('game builds',() => {
  it('match BUILD_IMPORTS.json byte for byte',() => {
    for (const game of games) {
      const record = imports.games.find(entry => entry.slug === game.slug);
      expect(record,`${game.slug} is recorded in BUILD_IMPORTS.json`).toBeDefined();
      const bytes = readFileSync(pub(`games/${game.slug}/index.html`));
      expect(bytes.length).toBe(record!.bytes);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(record!.sha256);
    }
  });
  it('expected download sizes for the play page progress bar match the builds',() => {
    const sizes = JSON.parse(readFileSync('src/data/build-sizes.json','utf8'));
    expect(sizes).toEqual(Object.fromEntries(imports.games.map(entry => [entry.slug,entry.bytes])));
  });
  it('folders contain only the game build',() => {
    for (const game of games) expect(readdirSync(pub(`games/${game.slug}`))).toEqual(['index.html']);
  });
});

describe('temporary art (until a game is recaptured)',() => {
  for (const [slug,art] of Object.entries(temporaryArt)) it(`${slug} has its own screenshots as a cover and 3–6 stills, a logo and an OG image`,async () => {
    expect(games.some(game => game.slug === slug),`${slug} is a listed game`).toBe(true);
    expect(art.source.length).toBeGreaterThan(10);
    expect(existsSync(pub(`media/${slug}/temp/cover.webp`))).toBe(true);
    expect(art.shots.length).toBeGreaterThanOrEqual(3);
    expect(art.shots.length).toBeLessThanOrEqual(6);
    art.shots.forEach((alt,index) => {
      expect(alt.trim().length).toBeGreaterThan(10);
      for (const suffix of ['','-thumb']) for (const ext of ['avif','webp','jpg']) expect(existsSync(pub(`media/${slug}/temp/shot-${index+1}${suffix}.${ext}`))).toBe(true);
    });
    expect(readFileSync(pub(`media/${slug}/logo.svg`),'utf8')).toContain('aria-label="');
    const { default: sharp } = await import('sharp');
    const og = await sharp(pub(`og/${slug}.jpg`)).metadata();
    expect([og.width,og.height]).toEqual([1200,630]);
  });
});

describe('gameplay previews',() => {
  for (const game of games.filter(game => !temporaryArt[game.slug])) describe(game.slug,() => {
    const entry = (media as Record<string,{ loopSeconds: number; shots: string[] }>)[game.slug];
    it('has a 6–8 second loop as MP4 and WebM, each under 800 KB',() => {
      expect(entry).toBeDefined();
      expect(entry.loopSeconds).toBeGreaterThanOrEqual(6);
      expect(entry.loopSeconds).toBeLessThanOrEqual(8);
      for (const ext of ['mp4','webm']) {
        const file = pub(`media/${game.slug}/loop.${ext}`);
        expect(existsSync(file),file).toBe(true);
        expect(statSync(file).size).toBeLessThan(800_000);
      }
    });
    it('has a poster in AVIF, WebP and JPG',() => {
      for (const ext of ['avif','webp','jpg']) expect(existsSync(pub(`media/${game.slug}/poster.${ext}`))).toBe(true);
    });
    it('has 4–6 gallery screenshots with thumbnails and alt text',() => {
      expect(entry.shots.length).toBeGreaterThanOrEqual(4);
      expect(entry.shots.length).toBeLessThanOrEqual(6);
      entry.shots.forEach((alt,index) => {
        expect(alt.trim().length).toBeGreaterThan(10);
        for (const suffix of ['','-thumb']) for (const ext of ['avif','webp','jpg']) expect(existsSync(pub(`media/${game.slug}/shot-${index+1}${suffix}.${ext}`))).toBe(true);
      });
      expect(existsSync(pub(`media/${game.slug}/shot-${entry.shots.length+1}.jpg`))).toBe(false);
    });
    it('has a capture route so previews can be redone',() => expect(existsSync(resolve('scripts/capture',`${game.slug}.ts`))).toBe(true));
  });
});

describe('cover art, logos and Open Graph images',() => {
  for (const game of games.filter(game => !temporaryArt[game.slug])) it(`${game.slug} has a text-free cover with its motion layers, a transparent logo and an OG image`,async () => {
    const cover = readFileSync(pub(`media/${game.slug}/cover.svg`),'utf8');
    expect(cover).toContain('viewBox="0 0 1600 900"');
    expect(cover).not.toMatch(/<text\b/); // no baked-in titles: the title is HTML
    for (const motion of game.coverLayers) {
      const layer = readFileSync(pub(`media/${game.slug}/cover-${motion}.svg`),'utf8');
      expect(layer).toContain('viewBox="0 0 1600 900"');
      expect(layer).not.toMatch(/<text\b/);
    }
    const logo = readFileSync(pub(`media/${game.slug}/logo.svg`),'utf8');
    expect(logo).toContain(`aria-label="${game.title}"`);
    expect(logo).not.toMatch(/<rect\b/); // transparent: no background panel
    const { default: sharp } = await import('sharp');
    const og = await sharp(pub(`og/${game.slug}.jpg`)).metadata();
    expect([og.width,og.height]).toEqual([1200,630]);
  });
  it('has a site-wide OG image',async () => {
    const { default: sharp } = await import('sharp');
    const og = await sharp(pub('og/site.jpg')).metadata();
    expect([og.width,og.height]).toEqual([1200,630]);
  });
});
