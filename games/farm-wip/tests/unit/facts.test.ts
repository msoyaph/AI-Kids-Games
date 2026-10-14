/** The reviewable facts file: complete, sourced, and easy to read. */
import { describe, expect, it } from 'vitest';
import { CROPS } from '../../src/data/crops';
import { FACTS } from '../../src/data/facts';
import { TREES } from '../../src/data/orchard';

const sentences = (text: string) => text.split(/(?<=[.!?])\s+/).filter(Boolean);
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

describe('facts (src/data/facts.ts)', () => {
  it('has exactly one fact for every crop and orchard plant', () => {
    for (const c of CROPS) expect(FACTS.filter(f => f.about === `crop:${c.id}`), c.id).toHaveLength(1);
    for (const t of TREES) expect(FACTS.filter(f => f.about === `tree:${t.id}`), t.id).toHaveLength(1);
    for (const a of ['chicken', 'cow', 'goat', 'sheep', 'duck', 'bee', 'dog']) expect(FACTS.filter(f => f.about === `animal:${a}`), a).toHaveLength(1);
  });

  it('says where a grown-up can check each one', () => {
    for (const f of FACTS) expect(f.check.length, f.about).toBeGreaterThan(5);
  });

  it('keeps each fact short and simple: at most 3 sentences of at most 22 words', () => {
    for (const f of FACTS) {
      const s = sentences(f.text);
      expect(s.length, f.about).toBeLessThanOrEqual(3);
      for (const one of s) expect(words(one), `${f.about}: ${one}`).toBeLessThanOrEqual(22);
      expect(f.text, f.about).toMatch(/[.!]$/);
    }
  });

  it('has no duplicate topics', () => {
    expect(new Set(FACTS.map(f => f.about)).size).toBe(FACTS.length);
  });
});
