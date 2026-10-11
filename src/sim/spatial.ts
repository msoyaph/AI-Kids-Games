import type { Enemy } from './enemy';

/**
 * Uniform-grid spatial hash rebuilt once per tick. Linked lists in typed
 * arrays → no allocation. Queries write into a caller-owned array.
 */
export class SpatialHash {
  readonly cell: number;
  readonly cols: number;
  readonly rows: number;
  private head: Int32Array;
  private nextIdx: Int32Array;
  private items: Enemy[] = [];

  constructor(widthTiles: number, heightTiles: number, cell = 1.5, capacity = 2048) {
    this.cell = cell;
    // pad by one bucket on each side so flyers slightly off-map still hash
    this.cols = Math.ceil(widthTiles / cell) + 2;
    this.rows = Math.ceil(heightTiles / cell) + 2;
    this.head = new Int32Array(this.cols * this.rows);
    this.nextIdx = new Int32Array(capacity);
  }

  private bucketOf(x: number, y: number): number {
    let bx = Math.floor(x / this.cell) + 1;
    let by = Math.floor(y / this.cell) + 1;
    if (bx < 0) bx = 0;
    else if (bx >= this.cols) bx = this.cols - 1;
    if (by < 0) by = 0;
    else if (by >= this.rows) by = this.rows - 1;
    return by * this.cols + bx;
  }

  rebuild(enemies: Enemy[]): void {
    this.head.fill(-1);
    if (enemies.length > this.nextIdx.length) this.nextIdx = new Int32Array(enemies.length * 2);
    this.items = enemies;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i]!;
      if (!e.alive) continue;
      const b = this.bucketOf(e.x, e.y);
      this.nextIdx[i] = this.head[b]!;
      this.head[b] = i;
    }
  }

  /**
   * Collect live enemies whose centre is within r (+ their own radius) of (x, y).
   * `air`: 0 = ground only, 1 = both. Returns the count written to `out`.
   */
  query(x: number, y: number, r: number, air: 0 | 1, out: Enemy[]): number {
    let n = 0;
    const reach = r + 0.7;
    const bx0 = Math.max(0, Math.floor((x - reach) / this.cell) + 1);
    const by0 = Math.max(0, Math.floor((y - reach) / this.cell) + 1);
    const bx1 = Math.min(this.cols - 1, Math.floor((x + reach) / this.cell) + 1);
    const by1 = Math.min(this.rows - 1, Math.floor((y + reach) / this.cell) + 1);
    for (let by = by0; by <= by1; by++) {
      for (let bx = bx0; bx <= bx1; bx++) {
        let i = this.head[by * this.cols + bx]!;
        while (i >= 0) {
          const e = this.items[i]!;
          if (e.alive && (air || !e.flying)) {
            const dx = e.x - x;
            const dy = e.y - y;
            const rr = r + e.radius;
            if (dx * dx + dy * dy <= rr * rr) out[n++] = e;
          }
          i = this.nextIdx[i]!;
        }
      }
    }
    return n;
  }
}
