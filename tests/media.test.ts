import { describe,expect,it } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync,readdirSync,readFileSync,statSync } from 'node:fs';
import { resolve } from 'node:path';
import { games } from '../src/data/games';
import media from '../src/data/media.json';

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
  it('folders contain only the game build',() => {
    for (const game of games) expect(readdirSync(pub(`games/${game.slug}`))).toEqual(['index.html']);
  });
});

describe('gameplay previews',() => {
  for (const game of games) describe(game.slug,() => {
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
