import { describe, expect, it } from 'vitest';
import { layout, trayFit, type Layout, type Rect } from '../../src/render/layout';

const inside = (a: Rect, w: number, h: number) => a.x >= 0 && a.y >= 0 && a.x + a.w <= w + 0.5 && a.y + a.h <= h + 0.5;
const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;
function sane(l: Layout) {
  for (const r of [l.board, l.tray, l.hud, l.helpers, l.streak, ...l.slots]) expect(inside(r, l.w, l.h), JSON.stringify(r)).toBe(true);
  expect(overlap(l.board, l.tray)).toBe(false);
  expect(overlap(l.board, l.helpers)).toBe(false);
  expect(overlap(l.board, l.hud)).toBe(false);
  expect(l.board.w).toBe(l.board.h);
  // a 3×3 fits every slot at the shared size; a 5-long line fits after trayFit
  for (const s of l.slots) { expect(3 * l.trayCell).toBeLessThanOrEqual(s.w); expect(3 * l.trayCell).toBeLessThanOrEqual(s.h); expect(5 * trayFit(l, s, 5, 1)).toBeLessThanOrEqual(s.w); expect(5 * trayFit(l, s, 1, 5)).toBeLessThanOrEqual(s.h); }
  // the board's frame (0.2 cells) stays on screen
  expect(l.board.x - l.cell * 0.2).toBeGreaterThanOrEqual(0); expect(l.board.x + l.board.w + l.cell * 0.2).toBeLessThanOrEqual(l.w);
  expect(l.trayCell).toBeLessThan(l.cell);
}

describe('layout', () => {
  it('phones in portrait: board on top of the tray, full width, below the notch', () => {
    const l = layout(390, 844, { top: 47, right: 0, bottom: 34, left: 0 });
    sane(l);
    expect(l.portrait).toBe(true);
    expect(l.board.w).toBeGreaterThan(340);
    expect(l.hud.y).toBeGreaterThanOrEqual(47);
    expect(l.tray.y).toBeGreaterThan(l.board.y + l.board.h);
    expect(l.helpers.y + l.helpers.h).toBeLessThanOrEqual(844 - 34);
  });
  it('small phones still fit everything', () => sane(layout(320, 568)));
  it('phones on their side: tray beside the board, clear of the notch', () => {
    const l = layout(844, 390, { top: 0, right: 47, bottom: 21, left: 47 });
    sane(l);
    expect(l.portrait).toBe(false);
    expect(l.tray.x).toBeGreaterThanOrEqual(l.board.x + l.board.w);
    expect(l.hud.x).toBeGreaterThanOrEqual(47);
    expect(l.tray.x + l.tray.w).toBeLessThanOrEqual(844 - 47);
  });
  it('tablets and computers: landscape with a capped, centred board', () => {
    for (const [w, h] of [[1280, 720], [1920, 1080], [1024, 768], [1180, 820]]) {
      const l = layout(w, h); sane(l);
      expect(l.portrait).toBe(false);
      expect(l.board.w).toBeLessThanOrEqual(640);
    }
  });
  it('tablets in portrait use the portrait layout', () => { const l = layout(820, 1180); sane(l); expect(l.portrait).toBe(true); });
  it('lifts a dragged piece clear of a finger', () => expect(layout(390, 844).lift).toBeGreaterThanOrEqual(44));
});
