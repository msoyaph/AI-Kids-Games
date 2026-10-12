import type { Grid } from './grid';

export const UNREACHABLE = 1e9;
const SQRT2 = Math.SQRT2;
// 8 neighbours: orthogonal first so ties prefer straight moves.
const DX = [1, -1, 0, 0, 1, 1, -1, -1];
const DY = [0, 0, 1, -1, 1, -1, 1, -1];
const COST = [1, 1, 1, 1, SQRT2, SQRT2, SQRT2, SQRT2];
/** Walking into a gate and out of its partner costs this much (tiles). */
export const TELEPORT_COST = 0.5;

/**
 * Distance-to-castle field (octile Dijkstra, no corner cutting).
 * Recomputed only when towers are built or sold — never per frame.
 */
export class FlowField {
  readonly dist: Float64Array;
  /** Next cell toward the castle (-1 at goal / unreachable). Blocked cells point to an escape neighbour. */
  readonly next: Int32Array;
  private heapIdx: Int32Array;
  private heapKey: Float64Array;
  private heapSize = 0;

  constructor(private readonly grid: Grid) {
    const n = grid.cols * grid.rows;
    this.dist = new Float64Array(n);
    this.next = new Int32Array(n);
    this.heapIdx = new Int32Array(n * 8 + 8);
    this.heapKey = new Float64Array(n * 8 + 8);
  }

  /**
   * Compute into `dist`/`next`. `extraBlocked` treats one more cell as solid
   * (used for "what if I build here?" checks).
   */
  compute(extraBlocked = -1): void {
    this.fill(this.dist, this.next, extraBlocked);
  }

  /** Same algorithm writing into caller-provided buffers (for previews). */
  fill(dist: Float64Array, next: Int32Array, extraBlocked = -1): void {
    const g = this.grid;
    const { cols, rows } = g;
    dist.fill(UNREACHABLE);
    next.fill(-1);
    this.heapSize = 0;
    const open = (i: number): boolean => i !== extraBlocked && g.isOpen(i);
    const tele = g.teleports;
    for (const goal of g.goals) {
      if (!open(goal)) continue;
      dist[goal] = 0;
      this.push(goal, 0);
    }
    while (this.heapSize > 0) {
      const key = this.heapKey[0]!;
      const i = this.pop();
      if (key > dist[i]!) continue;
      const x = i % cols;
      const y = (i / cols) | 0;
      for (let d = 0; d < 8; d++) {
        const nx = x + DX[d]!;
        const ny = y + DY[d]!;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const ni = ny * cols + nx;
        if (!open(ni)) continue;
        if (d >= 4 && (!open(y * cols + nx) || !open(ny * cols + x))) continue; // no corner cutting
        const nd = key + COST[d]!;
        if (nd < dist[ni]!) {
          dist[ni] = nd;
          this.push(ni, nd);
        }
      }
      // teleporter: reaching a gate exit makes its entrance this close too
      for (let t = 0; t < tele.length; t++) {
        const tp = tele[t]!;
        if (tp.to !== i || !open(tp.from)) continue;
        const nd = key + TELEPORT_COST;
        if (nd < dist[tp.from]!) {
          dist[tp.from] = nd;
          this.push(tp.from, nd);
        }
      }
    }
    // next pointers: open cells step to their Dijkstra predecessor (ties prefer straight moves);
    // blocked cells (a tower was just built on them) point to an escape neighbour so nobody gets stuck.
    for (let i = 0; i < cols * rows; i++) {
      if (dist[i] === 0) continue;
      const isOpen = open(i);
      if (isOpen && dist[i]! >= UNREACHABLE) continue;
      const x = i % cols;
      const y = (i / cols) | 0;
      let best = -1;
      let bestV = Infinity;
      for (let d = 0; d < 8; d++) {
        const nx = x + DX[d]!;
        const ny = y + DY[d]!;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const ni = ny * cols + nx;
        if (!open(ni) || dist[ni]! >= UNREACHABLE) continue;
        if (isOpen && d >= 4 && (!open(y * cols + nx) || !open(ny * cols + x))) continue;
        const v = dist[ni]! + COST[d]!;
        if (v < bestV - 1e-9) {
          bestV = v;
          best = ni;
        }
      }
      // a gate entrance jumps to its exit when that's the way home
      const exit = g.teleportTo[i]!;
      if (isOpen && exit >= 0 && open(exit) && dist[exit]! + TELEPORT_COST < bestV - 1e-9) best = exit;
      next[i] = best;
    }
  }

  /** True when every spawn can reach the castle. */
  spawnsConnected(dist: Float64Array = this.dist): boolean {
    for (const s of this.grid.spawns) if (dist[s]! >= UNREACHABLE) return false;
    return true;
  }

  /** Walk `next` pointers from a cell to the goal. */
  pathFrom(start: number, out: number[] = [], dist: Float64Array = this.dist, next: Int32Array = this.next): number[] {
    out.length = 0;
    let c = start;
    let guard = this.grid.cols * this.grid.rows + 4;
    while (c >= 0 && guard-- > 0) {
      out.push(c);
      if (dist[c] === 0) break;
      c = next[c]!;
    }
    return out;
  }

  // --- tiny binary heap (preallocated) ---
  private push(i: number, k: number): void {
    let p = this.heapSize++;
    const hi = this.heapIdx;
    const hk = this.heapKey;
    while (p > 0) {
      const parent = (p - 1) >> 1;
      if (hk[parent]! <= k) break;
      hi[p] = hi[parent]!;
      hk[p] = hk[parent]!;
      p = parent;
    }
    hi[p] = i;
    hk[p] = k;
  }

  private pop(): number {
    const hi = this.heapIdx;
    const hk = this.heapKey;
    const top = hi[0]!;
    const n = --this.heapSize;
    if (n > 0) {
      const li = hi[n]!;
      const lk = hk[n]!;
      let p = 0;
      for (;;) {
        let c = p * 2 + 1;
        if (c >= n) break;
        if (c + 1 < n && hk[c + 1]! < hk[c]!) c++;
        if (hk[c]! >= lk) break;
        hi[p] = hi[c]!;
        hk[p] = hk[c]!;
        p = c;
      }
      hi[p] = li;
      hk[p] = lk;
    }
    return top;
  }
}
