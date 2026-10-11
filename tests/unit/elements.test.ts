import { describe, expect, it } from 'vitest';
import { counterOf, ELEMENT_ORDER, ELEMENTS, elementMultiplier, elementVs, STRONG_MULT, WEAK_MULT } from '../../src/data/elements';

describe('element wheel', () => {
  it('every element beats exactly one and is beaten by exactly one', () => {
    for (const el of ELEMENT_ORDER) {
      const beatenBy = ELEMENT_ORDER.filter((o) => ELEMENTS[o].beats === el);
      expect(beatenBy).toHaveLength(1);
      expect(ELEMENTS[el].beats).not.toBe(el);
    }
  });

  it('applies strong / weak / neutral multipliers', () => {
    expect(elementVs('water', 'fire')).toBe(STRONG_MULT);
    expect(elementVs('fire', 'water')).toBe(WEAK_MULT);
    expect(elementVs('fire', 'light')).toBe(1);
    expect(elementVs('light', 'shadow')).toBe(STRONG_MULT);
    expect(elementVs('earth', 'light')).toBe(STRONG_MULT);
    expect(elementVs('fire', null)).toBe(1);
  });

  it('basic towers are neutral, combos use their best element', () => {
    expect(elementMultiplier([], 'fire')).toBe(1);
    expect(elementMultiplier(['fire', 'water'], 'fire')).toBe(STRONG_MULT);
    expect(elementMultiplier(['fire', 'light'], 'earth')).toBe(1);
    expect(elementMultiplier(['fire', 'nature'], 'water')).toBe(STRONG_MULT);
  });

  it('counterOf finds the element that beats it', () => {
    for (const el of ELEMENT_ORDER) expect(ELEMENTS[counterOf(el)].beats).toBe(el);
  });

  it('every element has a unique icon shape (colour-blind friendly)', () => {
    const icons = new Set(ELEMENT_ORDER.map((e) => ELEMENTS[e].icon));
    expect(icons.size).toBe(ELEMENT_ORDER.length);
  });
});
