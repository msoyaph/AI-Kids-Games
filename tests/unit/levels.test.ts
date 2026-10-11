import { describe, expect, it } from 'vitest';
import { BODY_BY_ID } from '../../src/data/bodies';
import { LEVELS } from '../../src/data/levels';
import { parseLevel } from '../../src/systems/level';
import { analyzeLevel } from '../../src/systems/reachability';

describe('levels', () => {
  for (const def of Object.values(LEVELS)) {
    it(`${def.id} parses and everything is reachable (Normal, no extra help)`, () => {
      const m = parseLevel(def);
      const body = BODY_BY_ID[def.body];
      expect(body, `body ${def.body}`).toBeTruthy();
      expect(body.areas).toContain(def.id);
      const rep = analyzeLevel(m, { gravityG: body.gravityG, rover: def.avatar === 'rover', hover: 0.9 });
      expect(rep.problems).toEqual([]);
      expect(rep.reachable).toBeGreaterThan(20);
    });
  }
});
