import { existsSync,readFileSync,statSync } from 'node:fs';
import { join } from 'node:path';
import { describe,expect,it } from 'vitest';
import trailer from '../src/data/trailer.json';

const pub = join(import.meta.dirname,'../public');
describe('the self-hosted trailer',() => {
  it('has every web file, each under 8 MB',() => {
    for (const file of ['trailer-1080.webm','trailer-1080.mp4','trailer-720.webm','trailer-720.mp4']) {
      const path = join(pub,'trailer',file);
      expect(existsSync(path),file).toBe(true);
      expect(statSync(path).size,file).toBeLessThan(8_000_000);
    }
  });
  it('has a poster, captions and a text description',() => {
    for (const url of [trailer.poster,trailer.posterWebp,trailer.captions]) expect(existsSync(join(pub,url)),url).toBe(true);
    expect(readFileSync(join(pub,trailer.captions),'utf8')).toMatch(/^WEBVTT\n/);
    expect(trailer.description.length).toBeGreaterThan(5);
    expect(trailer.seconds).toBeCloseTo(60,0);
  });
});
