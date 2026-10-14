import { describe, expect, it } from 'vitest';
import { effectiveness, matchup, weaknessesOf } from '../../src/core/elements';
import { ELEMENTS } from '../../src/core/types';
import { ELEMENT_INFO } from '../../src/data/elements';
import { TUNING } from '../../src/tuning';

describe('the element chart', () => {
  it('gives every element exactly two strengths and exactly two weaknesses', () => {
    for (const e of ELEMENTS) {
      const strong = ELEMENTS.filter(t => matchup(e, t) === 'strong');
      const weakTo = weaknessesOf(e);
      expect(strong, e).toHaveLength(2);
      expect(weakTo, e).toHaveLength(2);
      expect(new Set(ELEMENT_INFO[e].strong).size).toBe(2);
      expect(ELEMENT_INFO[e].strong).not.toContain(e);
    }
  });

  it('never has two elements strong against each other, so matchups are consistent', () => {
    for (const a of ELEMENTS) for (const b of ELEMENTS) {
      if (matchup(a, b) === 'strong') {
        expect(matchup(b, a), `${a} vs ${b}`).toBe('weak');
      }
    }
  });

  it('has no immunities and keeps same-element matchups neutral', () => {
    for (const a of ELEMENTS) {
      expect(effectiveness(a, a)).toBe(1);
      for (const b of ELEMENTS) expect(effectiveness(a, b)).toBeGreaterThan(0);
    }
  });

  it('uses the tuned multipliers, and plain moves are always neutral', () => {
    expect(effectiveness('tide', 'flare')).toBe(TUNING.elements.strong);
    expect(effectiveness('flare', 'tide')).toBe(TUNING.elements.weak);
    expect(effectiveness('flare', 'gust')).toBe(1);
    for (const e of ELEMENTS) expect(effectiveness('plain', e)).toBe(1);
  });

  it('matches the chart in the plan', () => {
    const chart: Record<string, string[]> = {
      flare: ['leaf', 'frost'], tide: ['flare', 'stone'], leaf: ['tide', 'glow'], stone: ['flare', 'volt'],
      gust: ['leaf', 'glow'], frost: ['stone', 'gust'], volt: ['tide', 'gust'], glow: ['frost', 'volt'],
    };
    for (const e of ELEMENTS) expect([...ELEMENT_INFO[e].strong].sort()).toEqual([...chart[e]!].sort());
  });

  it('gives each element its own color, icon and letter (colorblind-friendly)', () => {
    const infos = ELEMENTS.map(e => ELEMENT_INFO[e]);
    expect(new Set(infos.map(i => i.color)).size).toBe(8);
    expect(new Set(infos.map(i => i.icon)).size).toBe(8);
    expect(new Set(infos.map(i => i.letter)).size).toBe(8);
    expect(new Set(infos.map(i => i.ability.id)).size).toBe(8);
  });
});
