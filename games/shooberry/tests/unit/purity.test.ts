// The rules are pure: nothing under src/sim/ touches the DOM, three.js, storage or the clock, so they
// run the same in tests, bots and the game (farm-wip's purity test pattern).
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const dir = new URL('../../src/sim/', import.meta.url);
const files = readdirSync(dir).filter(f => f.endsWith('.ts'));
const banned = [/from ['"]three/, /\bdocument\./, /\bwindow\./, /localStorage/, /requestAnimationFrame/, /performance\.now/, /Date\.now/, /Math\.random/, /from ['"]\.\.\/(render|ui|input|audio|save)\//];

describe('the rules are pure', () => {
  it('has the rule files', () => expect(files.length).toBeGreaterThanOrEqual(5));
  for (const file of files) {
    it(`${file} uses no DOM, three.js, storage, clock or unseeded randomness`, () => {
      const text = readFileSync(new URL(file, dir), 'utf8');
      expect(banned.filter(re => re.test(text)).map(String)).toEqual([]);
    });
  }
});
