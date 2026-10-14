import { describe,expect,it } from 'vitest';
import { balancedRows, gridSpans } from '../src/lib/grid';

describe('balanced grid',() => {
  it('splits counts into full rows, wider rows first',() => {
    expect(balancedRows(5,3)).toEqual([2,3]);
    expect(balancedRows(4,3)).toEqual([2,2]);
    expect(balancedRows(6,3)).toEqual([3,3]);
    expect(balancedRows(7,3)).toEqual([2,2,3]);
    expect(balancedRows(8,3)).toEqual([2,3,3]);
    expect(balancedRows(9,3)).toEqual([3,3,3]);
    expect(balancedRows(10,3)).toEqual([2,2,3,3]);
    expect(balancedRows(12,3)).toEqual([3,3,3,3]);
    expect(balancedRows(1,3)).toEqual([1]);
    expect(balancedRows(5,2)).toEqual([1,2,2]);
    expect(balancedRows(0,3)).toEqual([]);
  });
  it('never leaves a lonely last card or a row bigger than the column count',() => {
    for (let count = 1; count <= 40; count++) for (const columns of [1,2,3]) {
      const rows = balancedRows(count,columns);
      expect(rows.reduce((a,b) => a+b,0)).toBe(count);
      expect(Math.max(...rows)).toBeLessThanOrEqual(columns);
      expect(Math.max(...rows)-Math.min(...rows)).toBeLessThanOrEqual(1);
      for (let i = 1; i < rows.length; i++) expect(rows[i]).toBeGreaterThanOrEqual(rows[i-1]);
    }
  });
  it('turns rows into column spans that fill 6 desktop tracks and 2 tablet tracks',() => {
    expect(gridSpans(5).map(span => span.lg)).toEqual([3,3,2,2,2]);
    expect(gridSpans(5).map(span => span.md)).toEqual([2,1,1,1,1]);
    expect(gridSpans(8).map(span => span.lg)).toEqual([3,3,2,2,2,2,2,2]);
    expect(gridSpans(8).map(span => span.md)).toEqual([1,1,1,1,1,1,1,1]);
    expect(gridSpans(9).map(span => span.lg)).toEqual([2,2,2,2,2,2,2,2,2]);
    expect(gridSpans(9).map(span => span.md)).toEqual([2,1,1,1,1,1,1,1,1]);
    expect(gridSpans(10).map(span => span.lg)).toEqual([3,3,3,3,2,2,2,2,2,2]);
    expect(gridSpans(10).map(span => span.md)).toEqual([1,1,1,1,1,1,1,1,1,1]);
    expect(gridSpans(1)[0]).toEqual({ lg: 6,md: 2,solo: true });
  });
});
