/** Creature art rules (1.1): 64 px battle sprites keep the 32 px look, every pose draws. */
import { describe, expect, it } from 'vitest';
import { drawCreature, RECIPES } from '../../src/art/creatures';
import { Painter, POSES, spritePad } from '../../src/art/painter';
import { PixelCanvas, T } from '../../src/art/pixelcanvas';
import { SPECIES } from '../../src/data/species';
import { drawPortrait, expressionFor, PORTRAIT_EXPRS } from '../../src/art/portraits';
import { CAST, townsLook } from '../../src/data/cast';

const ids = Object.keys(SPECIES);

describe('creature art', () => {
  it('every Agentmon has its own recipe', () => {
    for (const id of ids) expect(RECIPES[id], id).toBeTypeOf('function');
  });

  it('every pose draws at 16, 32 and 64 px', () => {
    for (const id of ids) for (const size of [16, 32, 64] as const) for (const pose of Object.keys(POSES)) {
      const pc = drawCreature(id, size, POSES[pose]!);
      const filled = pc.px.filter(c => c !== T).length;
      expect(filled, `${id} ${size} ${pose}`).toBeGreaterThan(size * size * 0.12);
    }
  });

  it('64 px battle sprites show whole: the body leaves room for the 2 px outline at every edge', () => {
    const ring = 2;
    for (const id of ids) for (const pose of Object.keys(POSES)) {
      const p = new Painter(64);
      RECIPES[id]!(p, POSES[pose]!);
      const { w, h, px } = p.pc;
      expect(w, id).toBe(64 + 2 * spritePad(64));
      const cut: string[] = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const margin = x < ring || y < ring || x >= w - ring || y >= h - ring;
        if (margin && px[y * w + x] !== T) cut.push(`${x},${y}`);
      }
      expect(cut, `${id} ${pose}`).toEqual([]);
    }
  });

  it('the 64 px outline is two pixels wide (one design pixel), like 32 px at 2×', () => {
    // a 4×4 square: a two-pixel ring around it (corners rounded by one pixel) = 16 + 32 + 4
    const pc = new PixelCanvas(12, 12).rect(4, 4, 4, 4, 0x88aa66).outline(0x2a1f3d, true).thicken();
    expect(pc.px.filter(c => c !== T).length).toBe(52);
    expect(pc.px[4 * 12 + 2]).not.toBe(T);
    expect(pc.px[4 * 12 + 1]).toBe(T);
  });
});

describe('dialogue portraits', () => {
  it('every named character and a crowd of townsfolk draw in every expression', () => {
    const looks = [...Object.values(CAST).map(c => c.look), ...Array.from({ length: 40 }, (_, i) => townsLook(`t${i}`))];
    for (const look of looks) for (const e of PORTRAIT_EXPRS) {
      const pc = drawPortrait(look, e);
      expect(pc.w).toBe(32);
      expect(pc.px.filter(c => c !== T).length).toBeGreaterThan(400);
    }
  });

  it('picks a face that fits the line', () => {
    expect(expressionFor('Hi! Are you new too?')).toBe('curious');
    expect(expressionFor('Wow, you are good!')).toBe('surprised');
    expect(expressionFor('Oh no, the Beacon went out.')).toBe('worried');
    expect(expressionFor('My turn! I pick this one!')).toBe('happy');
    expect(expressionFor('The Rest Stop is just over there.')).toBe('smile');
  });
});
