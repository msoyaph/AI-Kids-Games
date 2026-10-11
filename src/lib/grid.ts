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
 * Column spans for each card: the desktop grid has 6 tracks (rows of up to 3 cards),
 * the tablet grid 2 tracks (rows of up to 2). Phones are one column.
 */
export function gridSpans(count: number): { lg: number; md: number; solo: boolean }[] {
  const expand = (rows: number[],tracks: number) => rows.flatMap(size => Array(size).fill(tracks/size) as number[]);
  const lgRows = balancedRows(count,3), md = expand(balancedRows(count,2),2), lg = expand(lgRows,6);
  return lg.map((span,index) => ({ lg: span,md: md[index],solo: count === 1 }));
}
