import { describe, expect, it } from 'vitest';
import { BODY_BY_ID } from '../../src/data/bodies';
import { CHARACTERS } from '../../src/data/characters';
import { DIALOGUE } from '../../src/data/dialogue';
import { ITEM_BY_ID } from '../../src/data/items';
import { LEVELS } from '../../src/data/levels';
import { stickerForLevel } from '../../src/data/stickers';
import { THEMES } from '../../src/data/themes';
import { parseLevel } from '../../src/systems/level';
import { analyzeLevel } from '../../src/systems/reachability';

declare const process: { env: Record<string, string | undefined> };
const only = process.env.LEVEL ? new Set(process.env.LEVEL.split(',')) : null;
const chars = new Set(CHARACTERS.map((c) => c.id));

describe('levels', () => {
  for (const def of Object.values(LEVELS)) {
    if (only && !only.has(def.id)) continue;
    it(`${def.id}: valid data, everything reachable, no soft-locks`, () => {
      const rows = def.map;
      const w = rows[0].length;
      rows.forEach((r, i) => expect(r.length, `row ${i} length`).toBe(w));
      expect(w).toBeGreaterThanOrEqual(60);
      expect(THEMES[def.theme], `theme ${def.theme}`).toBeTruthy();
      const m = parseLevel(def);
      const body = BODY_BY_ID[def.body];
      expect(body, `body ${def.body}`).toBeTruthy();
      expect(body.areas, 'body lists this area').toContain(def.id);
      if (def.intro) expect(DIALOGUE[def.intro], `intro ${def.intro}`).toBeTruthy();
      // Exactly one hidden sticker, and it is in the sticker book.
      expect(m.ents.filter((e) => e.kind === 'sticker').length, 'one * sticker').toBe(1);
      expect(stickerForLevel(def.id), 'sticker def').toBeTruthy();
      for (const e of m.ents) {
        const d = e.def;
        if (!d) continue;
        if (d.kind === 'npc') {
          expect(chars.has(d.char), `npc ${d.char}`).toBe(true);
          expect(DIALOGUE[d.talk], `talk ${d.talk}`).toBeTruthy();
        }
        if (d.kind === 'sample' || d.kind === 'item') expect(ITEM_BY_ID[d.item], `item ${d.item}`).toBeTruthy();
        if (d.kind === 'crystal') expect(def.groups?.[d.group], `group ${d.group}`).toBeTruthy();
        if (d.kind === 'machine') expect(m.ents.filter((o) => o.kind === 'orb').length, `orbs for ${d.id}`).toBeGreaterThanOrEqual(d.needs);
      }
      for (const [gid, g] of Object.entries(def.groups ?? {})) {
        const n = m.ents.filter((e) => e.def?.kind === 'crystal' && e.def.group === gid).length;
        expect(n, `crystals in ${gid}`).toBe(g.target.length);
        expect(m.ents.some((e) => e.def?.kind === 'panel' && e.def.group === gid), `panel for ${gid}`).toBe(true);
      }
      const rep = analyzeLevel(m, { gravityG: body.gravityG, rover: def.avatar === 'rover', hover: 0.9 });
      expect(rep.problems).toEqual([]);
      expect(rep.reachable).toBeGreaterThan(20);
    });
  }
});
