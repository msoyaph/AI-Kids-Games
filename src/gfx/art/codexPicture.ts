import { BODY_BY_ID } from '../../data/bodies';
import { CHAR_BY_ID } from '../../data/characters';
import type { CodexEntry } from '../../data/codex';
import type { Ctx } from '../canvas';
import { drawPortrait } from './characters';
import { drawGlyph } from './glyphs';
import { drawPlanet } from './planets';

/** The small picture on a Codex page (DOM UI art). */
export function drawCodexPicture(ctx: Ctx, e: CodexEntry, w: number, hh: number): void {
  const p = e.picture;
  if ('body' in p) drawPlanet(ctx, BODY_BY_ID[p.body].look, w, hh);
  else if ('glyph' in p) drawGlyph(ctx, p.glyph, w / 2, hh / 2, w * 0.38, p.color);
  else drawPortrait(ctx, CHAR_BY_ID[p.char], w, hh);
}
