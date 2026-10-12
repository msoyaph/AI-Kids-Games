/**
 * Text drawn on the game canvas uses a baked bitmap font with a fixed glyph
 * set: ASCII letters and digits plus the accented letters Filipino (and its
 * Spanish loanwords) use. Messages rendered that way must stay inside it.
 */
export const BITMAP_CHARS = '+-!?.,%x :×·ÁÉÍÓÚÑÜáéíóúñü';

/** Keys whose text is drawn with the bitmap font (floating combat labels). */
export function isBitmapKey(key: string): boolean {
  return key.startsWith('fx.') || key === 'hero.levelUp';
}

/** True if every character of `s` (placeholders excluded) has a glyph. */
export function fitsBitmapFont(s: string): boolean {
  for (const ch of s.replace(/\{\w+\}/g, '')) {
    if (/[0-9A-Za-z]/.test(ch) || BITMAP_CHARS.includes(ch)) continue;
    return false;
  }
  return true;
}
