/** Emote bubbles (16×16) shown above characters. */
import type { Atlas } from '../atlas';
import { P } from '../palette';
import { PixelCanvas } from '../pixelcanvas';

function bubble(): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  c.ellipse(8, 6.5, 7, 6, P.white);
  c.line(6, 12, 5, 15, P.white);
  c.line(7, 12, 5, 15, P.white);
  return c;
}

export function bakeEmotes(atlas: Atlas): void {
  const make = (name: string, draw: (c: PixelCanvas) => void) => {
    const c = bubble();
    draw(c);
    c.outline(P.ink);
    atlas.add(`emote.${name}`, c, true);
  };
  make('happy', (c) => { c.set(5, 5, P.ink); c.set(10, 5, P.ink); c.line(5, 8, 7, 10, P.ink); c.line(8, 10, 10, 8, P.ink); });
  make('laugh', (c) => { c.line(4, 5, 6, 4, P.ink); c.line(9, 4, 11, 5, P.ink); c.ellipse(7.5, 8.5, 3, 2, P.r2); });
  make('sad', (c) => { c.set(5, 5, P.ink); c.set(10, 5, P.ink); c.line(5, 10, 7, 8, P.ink); c.line(8, 8, 10, 10, P.ink); c.set(4, 7, P.bl2); });
  make('surprised', (c) => { c.vline(7, 2, 7, P.r2); c.vline(8, 2, 7, P.r2); c.rect(7, 9, 2, 2, P.r2); });
  make('heart', (c) => c.rows(['.aa.aa.', 'abbabba', 'abbbbba', '.abbba.', '..aba..', '...a...'], { a: P.r1, b: P.r2 }, 4, 3));
  make('music', (c) => { c.vline(6, 3, 8, P.ink); c.vline(10, 2, 7, P.ink); c.line(6, 3, 10, 2, P.ink); c.ellipse(5, 9, 1.5, 1.2, P.ink); c.ellipse(9, 8, 1.5, 1.2, P.ink); });
  make('idea', (c) => { c.circle(8, 5, 3, P.y1); c.rect(7, 8, 3, 2, P.s3); c.set(7, 4, P.y3); });
  make('sweat', (c) => { c.ellipse(9, 6, 2, 3, P.bl3); c.set(9, 3, P.bl3); c.set(8, 5, P.white); });
  make('question', (c) => { c.line(6, 3, 9, 3, P.bl1); c.vline(10, 4, 5, P.bl1); c.line(9, 6, 8, 7, P.bl1); c.set(8, 8, P.bl1); c.set(8, 10, P.bl1); });
  make('sleepy', (c) => { c.hline(4, 7, 4, P.bl1); c.line(7, 4, 4, 8, P.bl1); c.hline(4, 7, 8, P.bl1); c.hline(9, 11, 6, P.bl1); c.line(11, 6, 9, 9, P.bl1); c.hline(9, 11, 9, P.bl1); });
  make('dots', (c) => { c.set(5, 7, P.ink); c.set(8, 7, P.ink); c.set(11, 7, P.ink); });
  make('gift', (c) => { c.rect(4, 5, 8, 6, P.r2); c.vline(7, 5, 10, P.y1); c.vline(8, 5, 10, P.y1); c.hline(4, 11, 7, P.y1); c.set(6, 4, P.y1); c.set(9, 4, P.y1); });
}
