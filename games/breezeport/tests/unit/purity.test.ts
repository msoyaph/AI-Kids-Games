/**
 * The sim is pure: no DOM, no real clock, no Math.random (pattern from Tuck Pop's and Fieldlark's
 * purity tests). That's what makes the playthrough bot, saves and "time only moves while playing"
 * trustworthy.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIRS = ['src/sim', 'src/core', 'src/data'];
const BANNED: [RegExp, string][] = [
  [/\bMath\.random\b/, 'Math.random (use the seeded rng)'],
  [/\bDate\b/, 'Date (town time is play time)'],
  [/\bperformance\.now\b/, 'performance.now'],
  [/\b(document|window|localStorage|navigator)\b/, 'the browser'],
  [/from ['"]three['"]/, 'three.js'],
  [/from ['"]\.\.\/(render|ui|input|audio|save|game)\//, 'a module outside the sim'],
];

function files(dir: string): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith('.ts') ? [join(dir, e.name)] : []));
  } catch { return []; }
}

describe('the sim is pure', () => {
  for (const file of DIRS.flatMap(files)) {
    it(file, () => {
      const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      for (const [re, what] of BANNED) expect(re.test(code), `${file} uses ${what}`).toBe(false);
    });
  }
});
