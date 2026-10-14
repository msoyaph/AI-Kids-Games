/** Breadth-first path on the tile grid (maps are small), 4 directions. Excludes the start tile. */
export function findPath(w: number, h: number, sx: number, sy: number, tx: number, ty: number, passable: (x: number, y: number) => boolean, maxNodes = 4000): [number, number][] | null {
  if (sx === tx && sy === ty) return [];
  const idx = (x: number, y: number) => y * w + x;
  const prev = new Int32Array(w * h).fill(-1);
  const seen = new Uint8Array(w * h);
  const queue: number[] = [idx(sx, sy)];
  seen[idx(sx, sy)] = 1;
  let head = 0;
  while (head < queue.length && head < maxNodes) {
    const cur = queue[head++]!;
    const cx = cur % w, cy = (cur / w) | 0;
    for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]] as const) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const n = idx(nx, ny);
      if (seen[n]) continue;
      const goal = nx === tx && ny === ty;
      if (!goal && !passable(nx, ny)) continue;
      if (goal && !passable(nx, ny)) continue;
      seen[n] = 1;
      prev[n] = cur;
      if (goal) {
        const out: [number, number][] = [];
        for (let p = n; p !== idx(sx, sy); p = prev[p]!) out.push([p % w, (p / w) | 0]);
        return out.reverse();
      }
      queue.push(n);
    }
  }
  return null;
}
