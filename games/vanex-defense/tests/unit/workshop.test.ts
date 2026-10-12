import { describe, expect, it } from 'vitest';
import { blankWorkshop, decodeWorkshop, encodeWorkshop, workshopToMapDef, WS_COLS, WS_PREFIX, WS_ROWS, WS_WORDS, type WorkshopMap } from '../../src/data/workshop';
import { t } from '../../src/i18n';
import { checkWorkshop, WorkshopBotRun } from '../../src/sim/workshopCheck';

const def = (m: WorkshopMap) => workshopToMapDef(m, 'Test', 'story');
const edit = (m: WorkshopMap, x: number, y: number, ch: string): WorkshopMap => {
  const grid = m.grid.slice();
  grid[y] = grid[y]!.slice(0, x) + ch + grid[y]!.slice(x + 1);
  return { ...m, grid };
};

describe('workshop share codes', () => {
  it('round-trip exactly and carry only map data', () => {
    let m = blankWorkshop(12345);
    m = { ...edit(edit(m, 5, 3, 'P'), 12, 8, 'Q'), theme: 'rift', tier: 5 };
    const code = encodeWorkshop(m);
    expect(code.startsWith(WS_PREFIX)).toBe(true);
    expect(code).toMatch(/^VX1\.[0-9A-HJKMNP-TV-Z]+$/);
    const back = decodeWorkshop(code);
    expect('map' in back && back.map).toEqual(m);
    // tolerant of spaces, dashes and lower case when pasted
    const messy = code.toLowerCase().replace(/(.{20})/g, '$1 - ');
    expect(decodeWorkshop(messy)).toEqual(back);
  });

  it('rejects damaged, foreign and malicious input', () => {
    const code = encodeWorkshop(blankWorkshop(7));
    // flip one character in the middle → checksum (or tile) error, never a silent wrong map
    const i = 40;
    const flipped = code.slice(0, i) + (code[i] === '0' ? '1' : '0') + code.slice(i + 1);
    const r = decodeWorkshop(flipped);
    expect('error' in r).toBe(true);
    expect(decodeWorkshop('')).toEqual({ error: 'format' });
    expect(decodeWorkshop('hello world')).toEqual({ error: 'format' });
    expect(decodeWorkshop('VX1.<script>alert(1)</script>')).toEqual({ error: 'format' });
    expect(decodeWorkshop(code.slice(0, 30))).toHaveProperty('error');
    expect(decodeWorkshop('VX1.' + 'Z'.repeat(5000))).toEqual({ error: 'format' });
    // a different version number
    const v2 = 'VX1.' + 'G' + code.slice(5);
    expect(decodeWorkshop(v2)).toHaveProperty('error');
  });

  it('names come from two 32-word lists', () => {
    expect(t('workshop.words.adj').split(',')).toHaveLength(WS_WORDS);
    expect(t('workshop.words.noun').split(',')).toHaveLength(WS_WORDS);
    const m = blankWorkshop(99);
    expect(m.adj).toBeLessThan(WS_WORDS);
    expect(m.noun).toBeLessThan(WS_WORDS);
    // edits make a new map id (fresh thumbnails, no stale cache)
    expect(def(edit(m, 5, 5, '#')).id).not.toBe(def(m).id);
  });
});

describe('workshop rules', () => {
  it('a blank map is playable', () => {
    const m = blankWorkshop(1);
    expect(m.grid).toHaveLength(WS_ROWS);
    expect(m.grid[0]).toHaveLength(WS_COLS);
    expect(checkWorkshop(def(m))).toEqual([]);
  });

  it('catches every broken layout', () => {
    const m = blankWorkshop(1);
    // no castle
    const noCastle = { ...m, grid: m.grid.map((r) => r.replace(/C/g, '.')) };
    expect(checkWorkshop(def(noCastle))).toContain('castle');
    // castle not a 2×2 block
    expect(checkWorkshop(def(edit(m, 10, 10, 'C')))).toContain('castleShape');
    // gate without a partner
    expect(checkWorkshop(def(edit(m, 6, 6, 'P')))).toContain('gates');
    // sealed: a full rock wall
    let wall = m;
    for (let y = 0; y < WS_ROWS; y++) wall = edit(wall, 9, y, '#');
    expect(checkWorkshop(def(wall))).toContain('path');
    // no room to build: all roads
    const roads = { ...m, grid: m.grid.map((r) => r.replace(/\./g, '=')) };
    expect(checkWorkshop(def(roads))).toContain('room');
    // castle right next to the spawn
    const close = edit(edit(edit(edit(m, 2, 5, 'C'), 3, 5, 'C'), 2, 6, 'C'), 3, 6, 'C');
    const closeOnly = { ...close, grid: close.grid.map((r, y) => (y === 5 || y === 6 ? r.slice(0, 18) + '..' : r)) };
    expect(checkWorkshop(def(closeOnly))).toContain('close');
  });

  it('the bot test plays the map in slices and reports the result', () => {
    const run = new WorkshopBotRun(def(blankWorkshop(3)), 'normal', 1);
    let slices = 0;
    while (!run.done && slices < 10_000) {
      run.stepFor(50);
      slices++;
    }
    expect(run.done).toBe(true);
    expect(slices).toBeGreaterThan(1);
    expect(run.won).toBe(true);
    expect(run.progress).toBe(1);
  });
});
