/**
 * Uniform grid over the (finite) map, rebuilt every tick with a counting sort.
 * O(n + cells) build, zero allocation. Queries write indices into a caller-supplied buffer.
 */
export class SpatialHash {
  readonly cellSize: number;
  readonly inv: number;
  readonly dim: number;
  readonly half: number;
  private cellStart: Int32Array;
  private cellCount: Int32Array;
  private items: Int32Array;
  private cellOf: Int32Array;
  count = 0;

  constructor(half: number, cellSize: number, capacity: number) {
    this.half = half;
    this.cellSize = cellSize;
    this.inv = 1 / cellSize;
    this.dim = Math.ceil((half * 2) / cellSize) + 1;
    const cells = this.dim * this.dim;
    this.cellStart = new Int32Array(cells + 1);
    this.cellCount = new Int32Array(cells);
    this.items = new Int32Array(capacity);
    this.cellOf = new Int32Array(capacity);
  }

  private cx(x: number): number {
    let c = Math.floor((x + this.half) * this.inv);
    if (c < 0) c = 0;
    else if (c >= this.dim) c = this.dim - 1;
    return c;
  }

  /** Rebuild from position arrays for indices [0, n) where alive[i] != 0. */
  build(xs: Float32Array, zs: Float32Array, alive: Uint8Array, n: number): void {
    const counts = this.cellCount;
    counts.fill(0);
    const cellOf = this.cellOf;
    const dim = this.dim;
    for (let i = 0; i < n; i++) {
      if (!alive[i]) {
        cellOf[i] = -1;
        continue;
      }
      const c = this.cx(zs[i]) * dim + this.cx(xs[i]);
      cellOf[i] = c;
      counts[c]++;
    }
    const start = this.cellStart;
    let total = 0;
    const cells = counts.length;
    for (let c = 0; c < cells; c++) {
      start[c] = total;
      total += counts[c];
      counts[c] = 0;
    }
    start[cells] = total;
    for (let i = 0; i < n; i++) {
      const c = cellOf[i];
      if (c < 0) continue;
      this.items[start[c] + counts[c]++] = i;
    }
    this.count = total;
  }

  /**
   * Collect indices whose cell overlaps the square around (x, z) with half-size r.
   * Caller does exact distance checks. Returns number written (capped at out.length).
   */
  query(x: number, z: number, r: number, out: Int32Array): number {
    const x0 = this.cx(x - r);
    const x1 = this.cx(x + r);
    const z0 = this.cx(z - r);
    const z1 = this.cx(z + r);
    const dim = this.dim;
    const start = this.cellStart;
    const items = this.items;
    const max = out.length;
    let n = 0;
    for (let cz = z0; cz <= z1; cz++) {
      const row = cz * dim;
      for (let cx = x0; cx <= x1; cx++) {
        const c = row + cx;
        const e = start[c + 1];
        for (let k = start[c]; k < e; k++) {
          if (n >= max) return n;
          out[n++] = items[k];
        }
      }
    }
    return n;
  }

  /**
   * Nearest item to (x, z) within maxR whose index passes `accept` (if given), searching
   * outward ring by ring. Returns -1 when nothing found.
   */
  nearest(
    x: number,
    z: number,
    maxR: number,
    xs: Float32Array,
    zs: Float32Array,
    accept: ((i: number) => boolean) | null,
  ): number {
    const ccx = this.cx(x);
    const ccz = this.cx(z);
    const maxRing = Math.ceil(maxR * this.inv) + 1;
    const dim = this.dim;
    const start = this.cellStart;
    const items = this.items;
    let best = -1;
    let bestD2 = maxR * maxR;
    for (let ring = 0; ring <= maxRing; ring++) {
      // once the closest possible point of this ring is farther than best, stop
      const ringDist = (ring - 1) * this.cellSize;
      if (best >= 0 && ringDist > 0 && ringDist * ringDist > bestD2) break;
      const z0 = ccz - ring;
      const z1 = ccz + ring;
      for (let cz = z0; cz <= z1; cz++) {
        if (cz < 0 || cz >= dim) continue;
        const edgeRow = cz === z0 || cz === z1;
        const step = edgeRow ? 1 : ring * 2 || 1;
        for (let cx = ccx - ring; cx <= ccx + ring; cx += step) {
          if (cx < 0 || cx >= dim) continue;
          const c = cz * dim + cx;
          const e = start[c + 1];
          for (let k = start[c]; k < e; k++) {
            const i = items[k];
            const dx = xs[i] - x;
            const dz = zs[i] - z;
            const d2 = dx * dx + dz * dz;
            if (d2 < bestD2 && (accept === null || accept(i))) {
              bestD2 = d2;
              best = i;
            }
          }
        }
      }
    }
    return best;
  }
}
