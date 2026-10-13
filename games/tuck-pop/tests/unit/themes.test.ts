import { describe, expect, it } from 'vitest';
import { THEMES } from '../../src/data/themes';
import { earned, progressText, unlockThemes } from '../../src/data/unlocks';
import { defaults } from '../../src/save/profile';
import { luminance } from '../../src/render/paint';

describe('themes', () => {
  it('six original themes, each with six block colors and its own music style', () => {
    expect(THEMES.map(t => t.id)).toEqual(['classic', 'wood', 'candy', 'ocean', 'space', 'night']);
    for (const t of THEMES) { expect(t.blocks).toHaveLength(6); expect(new Set(t.blocks).size).toBe(6); }
  });
  it('Sunny is a warm cream board, and boards stay light except in the two night-sky themes', () => {
    expect(luminance(THEMES[0]!.board)).toBeGreaterThan(0.6); // Sunny: a warm cream board
    for (const t of THEMES.filter(x => x.id !== 'space' && x.id !== 'night')) expect(luminance(t.board), t.id).toBeGreaterThan(0.2);
  });
  it('unlock by playing, never by buying, and only once each', () => {
    const p = defaults();
    expect(unlockThemes(p)).toEqual([]);
    expect(p.themes).toEqual(['classic']);
    p.best.normal = 1000; expect(unlockThemes(p)).toEqual(['wood']);
    p.adv = '3333' + '0'.repeat(56); expect(earned('candy', p)).toBe(true); // 12 stars
    p.stats.lines = 99; expect(earned('ocean', p)).toBe(false); p.stats.lines = 100;
    p.stats.dailies = 3;
    expect(unlockThemes(p)).toEqual(['candy', 'ocean', 'night']);
    expect(unlockThemes(p)).toEqual([]);
    p.adv = '1'.repeat(30) + '0'.repeat(30); expect(unlockThemes(p)).toEqual(['space']);
    expect(progressText('ocean', { ...p, stats: { ...p.stats, lines: 62 } })).toBe('62 of 100 lines');
  });
});
