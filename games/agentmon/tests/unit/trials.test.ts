import { describe, expect, it } from 'vitest';
import { parseRoom } from '../../src/core/puzzle/puzzle';
import { solve } from '../../src/core/puzzle/solver';
import { TRIALS } from '../../src/data/trials';

describe('every Trial room', () => {
  for (const t of TRIALS) for (const def of t.rooms) {
    it(`${t.id} / ${def.id} "${def.name}" is a fair, solvable puzzle`, () => {
      expect(new Set(def.rows.map(r => r.length)).size, 'rows are even').toBe(1);
      const room = parseRoom(def);
      expect(room.grid.filter(c => c === 'E')).toHaveLength(1);
      expect(def.rows.join('').match(/S/g)).toHaveLength(1);
      for (const e of def.emitters ?? []) expect(room.grid[e.y * room.w + e.x], 'emitter tile').toBe('L');
      for (const p of def.platforms ?? []) for (const [x, y] of p.path) expect(room.grid[y * room.w + x], `platform path ${x},${y}`).toBe('=');
      const sol = solve(room);
      expect(sol, 'solvable').not.toBeNull();
      expect(sol!.actions.length, 'not too long for a kid').toBeLessThanOrEqual(70);
      expect(def.hint.length).toBeGreaterThan(10);
    });
  }
});
