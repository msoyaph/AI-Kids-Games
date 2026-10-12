import { afterEach, describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../../src/data/achievements';
import { DIFFICULTY_ORDER } from '../../src/data/difficulty';
import { ELEMENT_ORDER, ELEMENTS } from '../../src/data/elements';
import { ENEMY_IDS } from '../../src/data/enemies';
import { ALL_MAPS } from '../../src/data/maps';
import { TARGET_MODES, TOWER_IDS, TOWERS } from '../../src/data/towers';
import { WORLDS } from '../../src/data/worlds';
import { detectLocale, formatNumber, hasKey, registerMessages, setLocale, t } from '../../src/i18n';
import { en } from '../../src/i18n/en';
import { fil, FIL_REVIEW_STATUS } from '../../src/i18n/fil';
import { fitsBitmapFont, isBitmapKey } from '../../src/i18n/glyphs';
import { pseudoMessages, pseudoString } from '../../src/i18n/pseudo';

afterEach(() => {
  setLocale('en');
  registerMessages('fil', fil);
});

describe('i18n core', () => {
  it('interpolates and formats numbers for the locale', () => {
    expect(t('hud.waveOf', { n: 3, total: 40 })).toBe('3/40');
    expect(t('unit.seconds', { n: 1234.56 })).toBe('1,234.6s');
    expect(formatNumber(1000)).toBe('1,000');
  });

  it('chooses English plural forms', () => {
    expect(t('unit.constructs', { count: 1 })).toBe('1 construct');
    expect(t('unit.constructs', { count: 0 })).toBe('0 constructs');
    expect(t('unit.constructs', { count: 12 })).toBe('12 constructs');
  });

  it('uses Filipino plural rules and falls back to English for missing keys', () => {
    registerMessages('fil', { 'unit.constructs': { one: '{count} A', other: '{count} B' } });
    setLocale('en');
    setLocale('fil');
    // CLDR fil: integers ending in 4, 6 or 9 take "other"; the rest take "one"
    expect(t('unit.constructs', { count: 1 })).toBe('1 A');
    expect(t('unit.constructs', { count: 2 })).toBe('2 A');
    expect(t('unit.constructs', { count: 4 })).toBe('4 B');
    expect(t('hud.lives')).toBe('Lives'); // not translated yet → English
  });

  it('data text follows the current language', () => {
    const before = TOWERS.arrow.name;
    registerMessages('fil', { 'tower.arrow.name': 'Toreng Kidlat' });
    setLocale('fil');
    expect(TOWERS.arrow.name).toBe('Toreng Kidlat');
    setLocale('en');
    expect(TOWERS.arrow.name).toBe(before);
  });

  it('detects the browser language', () => {
    expect(detectLocale(['fil-PH', 'en-US'])).toBe('fil');
    expect(detectLocale(['tl'])).toBe('fil');
    expect(detectLocale(['de-DE', 'en-GB'])).toBe('en');
    expect(detectLocale([])).toBe('en');
  });

  it('pseudo-localises without breaking placeholders', () => {
    const p = pseudoString('Wave {n} cleared');
    expect(p).toContain('{n}');
    expect(p.length).toBeGreaterThan('Wave {n} cleared'.length * 1.3);
    setLocale('pseudo');
    expect(t('hud.waveOf', { n: 2, total: 9 })).toContain('2/9');
    expect(t('hud.lives')).not.toBe('Lives');
  });
});

describe('English messages', () => {
  it('cover every data id', () => {
    const need: string[] = [];
    for (const id of TOWER_IDS) need.push(`tower.${id}.name`, `tower.${id}.blurb`, `tower.${id}.ability`);
    for (const id of ENEMY_IDS) need.push(`enemy.${id}.name`, `enemy.${id}.blurb`, `enemy.${id}.tip`);
    for (const id of ELEMENT_ORDER) need.push(`element.${id}.name`, `element.${id}.why`, `element.${id}.blurb`, `element.${id}.prefix`);
    for (const id of DIFFICULTY_ORDER) need.push(`difficulty.${id}.label`, `difficulty.${id}.blurb`);
    for (const a of ACHIEVEMENTS) need.push(`badge.${a.id}.name`, `badge.${a.id}.desc`);
    for (const w of WORLDS) need.push(`world.${w.id}.name`, `world.${w.id}.blurb`);
    for (const m of ALL_MAPS) need.push(`map.${m.id}.name`, `map.${m.id}.story`);
    for (const m of TARGET_MODES) need.push(`target.${m}`);
    const missing = need.filter((k) => !hasKey(k));
    expect(missing).toEqual([]);
    expect(ELEMENTS.fire.name).toBe('Fire');
  });

  it('are well formed', () => {
    for (const [k, v] of Object.entries(en)) {
      const forms = typeof v === 'string' ? [v] : Object.values(v);
      if (typeof v !== 'string') expect('other' in v, k).toBe(true);
      for (const s of forms) {
        expect(s.trim().length, k).toBeGreaterThan(0);
        // placeholders are {word}; no stray braces
        expect(s.replace(/\{\w+\}/g, ''), k).not.toMatch(/[{}]/);
      }
    }
  });
});

const placeholders = (s: string): string[] => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();
const forms = (m: unknown): string[] => (typeof m === 'string' ? [m] : Object.values(m as Record<string, string>));
/** Proper nouns that stay in English in every language. */
const KEEP_ENGLISH = /^((tower|enemy|hero|ability|spec|world|map|research|boss)\..*\.name|element\.\w+\.prefix|workshop\.words\.\w+)$/;

describe('Filipino messages', () => {
  const keys = Object.keys(en) as (keyof typeof en)[];

  it('are a complete draft, flagged for native review', () => {
    expect(Object.keys(fil).sort()).toEqual([...keys].sort());
    for (const k of keys) for (const f of forms(fil[k])) expect(f.trim(), k).not.toBe('');
    expect(['needs-native-review', 'reviewed']).toContain(FIL_REVIEW_STATUS);
  });

  it('keep every placeholder and both plural forms', () => {
    for (const k of keys) {
      const want = placeholders(forms(en[k]).at(-1)!);
      for (const f of forms(fil[k])) expect(placeholders(f), k).toEqual(want);
      if (typeof en[k] !== 'string') expect(Object.keys(fil[k] as object).sort(), k).toEqual(['one', 'other']);
    }
  });

  it('keep proper nouns in English', () => {
    for (const k of keys.filter((k) => KEEP_ENGLISH.test(k))) expect(fil[k], k).toEqual(en[k]);
  });

  it('canvas labels only use letters the bitmap font has', () => {
    const pseudo = pseudoMessages(en);
    for (const k of keys.filter(isBitmapKey)) {
      for (const msgs of [en, fil, pseudo] as Record<string, unknown>[]) for (const f of forms(msgs[k])) expect(fitsBitmapFont(f), `${k}: ${f}`).toBe(true);
    }
  });

  it('switch the whole game over, data text included', () => {
    setLocale('fil');
    expect(t('hud.lives')).toBe(fil['hud.lives']);
    expect(ELEMENTS.fire.name).toBe('Apoy');
    expect(TOWERS.arrow.name).toBe(en['tower.arrow.name']); // proper noun
    expect(t('unit.constructs', { count: 4 })).toContain('4');
  });
});
