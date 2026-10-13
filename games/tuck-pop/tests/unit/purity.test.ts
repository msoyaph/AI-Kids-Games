import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith('.ts') ? [join(dir, e.name)] : []));

describe('the rules stay pure and seeded', () => {
  it('src/sim and src/core never touch the DOM, Pixi, the clock or Math.random', () => {
    for (const file of [...files('src/sim'), ...files('src/core')]) {
      const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      expect(code, file).not.toMatch(/Math\.random|Date\.|new Date|performance\.now|\bwindow\b|\bdocument\b|localStorage|from 'pixi\.js/);
    }
  });
});
