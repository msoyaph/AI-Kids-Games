import { describe, expect, it } from 'vitest';
import { isFree, makeCreature, movesAtLevel } from '../../src/core/creature';
import { Rng } from '../../src/core/rng';
import { ELEMENTS } from '../../src/core/types';
import { AREAS, AREA_BY_ID } from '../../src/data/areas';
import { FACTS, FACT_BY_ID } from '../../src/data/facts';
import { DEX } from '../../src/data/index';
import { ITEMS, SNACKS } from '../../src/data/items';
import { ELEMENT_MOVES, MOVES } from '../../src/data/moves';
import { NICKNAMES, PLAYER_NAMES } from '../../src/data/names';
import { SPECIES, SPECIES_LIST, STARTERS } from '../../src/data/species';
import { RIVAL_PARTNER, TRAINERS, resolveSpecies } from '../../src/data/trainers';
import { effectiveness } from '../../src/core/elements';

const words = (s: string) => s.trim().split(/\s+/).length;

describe('the roster', () => {
  it('has 52 Agentmon: 16 families of three stages, plus 4 guardians, numbered 1–52', () => {
    expect(SPECIES_LIST).toHaveLength(52);
    expect(SPECIES_LIST.map(s => s.num)).toEqual(Array.from({ length: 52 }, (_, i) => i + 1));
    const families = new Map<string, number>();
    for (const s of SPECIES_LIST.filter(s => !s.guardian)) families.set(s.family, (families.get(s.family) ?? 0) + 1);
    expect(families.size).toBe(16);
    expect([...families.values()].every(n => n === 3)).toBe(true);
    expect(SPECIES_LIST.filter(s => s.guardian)).toHaveLength(4);
    expect(new Set(SPECIES_LIST.map(s => s.name)).size).toBe(52);
  });

  it('gives every element exactly two families', () => {
    for (const e of ELEMENTS) expect(new Set(SPECIES_LIST.filter(s => s.element === e && !s.guardian).map(s => s.family)).size, e).toBe(2);
  });

  it('grows stage by stage at rising levels, into the same family and element', () => {
    for (const s of SPECIES_LIST) {
      if (!s.grows) { expect(s.guardian || s.stage === 3, s.id).toBe(true); continue; }
      const next = SPECIES[s.grows.to]!;
      expect(next.stage).toBe(s.stage + 1);
      expect(next.family).toBe(s.family);
      expect(next.element).toBe(s.element);
      if (next.grows) expect(next.grows.level).toBeGreaterThan(s.grows.level);
    }
  });

  it('only uses moves that exist, and every Agentmon always keeps a free move', () => {
    for (const s of SPECIES_LIST) {
      for (const [, m] of s.learnset) expect(MOVES[m], `${s.id}: ${m}`).toBeDefined();
      expect(s.learnset.some(([lv, m]) => lv === 1 && isFree(DEX, m)), s.id).toBe(true);
      for (let level = 1; level <= 50; level++) expect(movesAtLevel(DEX, s, level).some(m => isFree(DEX, m)), `${s.id} L${level}`).toBe(true);
    }
  });

  it('stats grow with each stage, and guardians are the strongest', () => {
    const total = (id: string) => Object.values(SPECIES[id]!.base).reduce((a, b) => a + b, 0);
    for (const s of SPECIES_LIST) if (s.grows) expect(total(s.grows.to)).toBeGreaterThan(total(s.id));
    const best = Math.max(...SPECIES_LIST.filter(s => !s.guardian).map(s => total(s.id)));
    for (const g of SPECIES_LIST.filter(s => s.guardian)) expect(total(g.id)).toBeGreaterThan(best);
  });

  it('every favorite snack exists, and every snack is someone\'s favorite', () => {
    for (const s of SPECIES_LIST) expect(SNACKS).toContain(s.favoriteSnack);
    for (const snack of SNACKS) expect(SPECIES_LIST.some(s => s.favoriteSnack === snack), snack).toBe(true);
  });

  it('offers three partners that are not a heat, water and plant trio', () => {
    expect(STARTERS.map(id => SPECIES[id]!.element).sort()).toEqual(['gust', 'stone', 'volt']);
    for (const p of STARTERS) {
      const rival = SPECIES[RIVAL_PARTNER[p]!]!;
      expect(effectiveness(rival.element, SPECIES[p]!.element), `rival vs ${p}`).toBeLessThanOrEqual(1);
    }
  });
});

describe('moves', () => {
  const list = Object.values(MOVES);
  it('has about ninety moves with unique, stable numbers', () => {
    expect(list.length).toBeGreaterThanOrEqual(88);
    expect(new Set(list.map(m => m.n)).size).toBe(list.length);
    expect(new Set(list.map(m => m.name)).size).toBe(list.length);
  });

  it('gives every element its ten roles, including one free move', () => {
    for (const e of ELEMENTS) {
      const ids = ELEMENT_MOVES[e]!;
      expect(ids).toHaveLength(10);
      expect(ids.every(id => MOVES[id]!.element === e)).toBe(true);
      expect(ids.filter(id => MOVES[id]!.cost === 0 && MOVES[id]!.power > 0)).toHaveLength(1);
    }
  });

  it('keeps costs and powers in range, and stronger moves cost more', () => {
    for (const m of list) {
      expect(m.cost).toBeGreaterThanOrEqual(0);
      expect(m.cost).toBeLessThanOrEqual(0.2);
      if (m.power >= 90) expect(m.cost).toBeGreaterThanOrEqual(0.17);
      if (m.cost === 0 && m.power > 0) expect(m.power).toBeLessThanOrEqual(35);
    }
  });

  it('describes every move in one or two short, plain sentences', () => {
    for (const m of list) {
      const sentences = m.desc.split(/[.!?]\s*/).filter(Boolean);
      expect(sentences.length, m.id).toBeLessThanOrEqual(2);
      for (const s of sentences) expect(words(s), `${m.id}: ${s}`).toBeLessThanOrEqual(14);
    }
  });
});

describe('facts (the reviewable real-world file)', () => {
  it('has exactly one fact for every Agentmon, each with where to check it', () => {
    expect(FACTS).toHaveLength(52);
    for (const s of SPECIES_LIST) {
      const f = FACT_BY_ID[s.fact];
      expect(f, s.id).toBeDefined();
      expect(f!.check.length).toBeGreaterThan(5);
    }
  });

  it('keeps facts short and simply worded', () => {
    for (const f of FACTS) {
      const sentences = f.text.split(/(?<=[.!?])\s+/).filter(Boolean);
      expect(sentences.length, f.id).toBeLessThanOrEqual(3);
      for (const s of sentences) expect(words(s), `${f.id}: ${s}`).toBeLessThanOrEqual(22);
    }
  });
});

describe('items and names', () => {
  it('has unique item numbers and the eight snacks', () => {
    const list = Object.values(ITEMS);
    expect(new Set(list.map(i => i.n)).size).toBe(list.length);
    for (const s of SNACKS) expect(ITEMS[s]?.kind).toBe('snack');
  });

  it('offers plenty of short, unique names to pick from', () => {
    expect(new Set(PLAYER_NAMES).size).toBe(PLAYER_NAMES.length);
    expect(new Set(NICKNAMES).size).toBe(NICKNAMES.length);
    expect(NICKNAMES.length).toBeGreaterThanOrEqual(200);
    for (const n of [...PLAYER_NAMES, ...NICKNAMES]) {
      expect(n.length, n).toBeLessThanOrEqual(12);
      expect(/^[A-Z][A-Za-z ]+$/.test(n), n).toBe(true);
    }
  });
});

describe('areas and trainers', () => {
  it('lets every stage-1 Agentmon be met in the wild (or chosen as a partner)', () => {
    const wild = new Set(AREAS.flatMap(a => a.wild.map(e => e.species)));
    for (const s of SPECIES_LIST.filter(s => s.stage === 1 && !s.guardian)) expect(wild.has(s.id) || (STARTERS as readonly string[]).includes(s.id), s.id).toBe(true);
    for (const a of AREAS) for (const e of a.wild) {
      expect(SPECIES[e.species], `${a.id}: ${e.species}`).toBeDefined();
      expect(e.min).toBeLessThanOrEqual(e.max);
    }
  });

  it('only uses real species, areas and sensible levels for trainers', () => {
    for (const t of TRAINERS) {
      expect(AREA_BY_ID[t.area], t.id).toBeDefined();
      expect(t.team.length).toBeGreaterThan(0);
      expect(t.team.length).toBeLessThanOrEqual(6);
      for (const m of t.team) {
        for (const p of STARTERS) expect(SPECIES[resolveSpecies(m.species, p)], `${t.id}: ${m.species}`).toBeDefined();
        expect(m.level).toBeGreaterThanOrEqual(2);
        expect(m.level).toBeLessThanOrEqual(50);
      }
    }
    expect(TRAINERS.filter(t => t.kind === 'keeper')).toHaveLength(6);
  });

  it('makes trainer creatures with moves they know', () => {
    const rng = new Rng(1);
    for (const t of TRAINERS) for (const m of t.team) {
      const c = makeCreature(DEX, { species: resolveSpecies(m.species, 'spinnet'), level: m.level }, rng);
      expect(c.moves.length).toBeGreaterThan(0);
    }
  });
});
