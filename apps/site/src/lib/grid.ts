/**
 * Split `count` cards into rows of at most `columns`, as evenly as possible, with the
 * wider rows (fewer, larger cards) first. No row is ever left with a lonely card while
 * another row is full: 5 → [2,3], 4 → [2,2], 7 → [2,2,3], 1 → [1].
 */
export function balancedRows(count: number,columns: number): number[] {
  if (count <= 0 || columns <= 0) return [];
  const rows = Math.ceil(count/columns);
  const base = Math.floor(count/rows), bigger = count % rows;
  return [...Array(rows-bigger).fill(base),...Array(bigger).fill(base+1)];
}

/**
 * Column spans for each card. Desktop (6 tracks): 3 equal columns, row after row, so the last row
 * may be shorter and starts at the left (owner, 2026-10-14: "make the gallery in 3 Columns on
 * Desktop"). Tablet (2 tracks): balanced rows of up to 2. Phones are one column. A single game is a
 * wide card centred on every screen.
 */
export function gridSpans(count: number): { lg: number; md: number; solo: boolean }[] {
  const expand = (rows: number[],tracks: number) => rows.flatMap(size => Array(size).fill(tracks/size) as number[]);
  const md = expand(balancedRows(count,2),2);
  return md.map(span => ({ lg: count === 1 ? 6 : 2,md: span,solo: count === 1 }));
}
