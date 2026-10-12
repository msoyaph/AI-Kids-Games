// Grid A* + connectivity map over World.blocked (respects water, cliffs, ramps, bridges, objects).
import type { World } from './world';

/** Binary min-heap keyed by f-score. */
class Heap {
  private a: number[] = [];
  private f: Float64Array;
  constructor(size: number) {
    this.f = new Float64Array(size);
  }
  push(i: number, f: number): void {
    this.f[i] = f;
    const a = this.a;
    a.push(i);
    let k = a.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (this.f[a[p]!]! <= f) break;
      a[k] = a[p]!;
      k = p;
    }
    a[k] = i;
  }
  pop(): number | undefined {
    const a = this.a;
    if (!a.length) return undefined;
    const top = a[0]!;
    const last = a.pop()!;
    if (a.length) {
      let k = 0;
      const f = this.f[last]!;
      for (;;) {
        const l = k * 2 + 1, r = l + 1;
        let m = k;
        let mf = f;
        if (l < a.length && this.f[a[l]!]! < mf) {
          m = l;
          mf = this.f[a[l]!]!;
        }
        if (r < a.length && this.f[a[r]!]! < mf) m = r;
        if (m === k) break;
        a[k] = a[m]!;
        k = m;
      }
      a[k] = last;
    }
    return top;
  }
  get size(): number {
    return this.a.length;
  }
}

const D4 = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;

/** A* from tile `start` to tile `goal`. Returns tile indices (excluding start) or null. */
export function findPath(w: World, start: number, goal: number, maxNodes = 4000): number[] | null {
  if (start === goal) return [];
  const N = w.size;
  const gx = goal % N, gz = (goal / N) | 0;
  const came = new Map<number, number>();
  const gScore = new Map<number, number>([[start, 0]]);
  const heap = new Heap(N * N);
  const h = (i: number) => Math.abs((i % N) - gx) + Math.abs(((i / N) | 0) - gz);
  heap.push(start, h(start));
  const closed = new Set<number>();
  let n = 0;
  while (heap.size && n++ < maxNodes) {
    const cur = heap.pop()!;
    if (cur === goal) {
      const path: number[] = [];
      for (let c = cur; c !== start; c = came.get(c)!) path.push(c);
      return path.reverse();
    }
    if (closed.has(cur)) continue;
    closed.add(cur);
    const cx = cur % N, cz = (cur / N) | 0;
    for (const [dx, dz] of D4) {
      const nx = cx + dx, nz = cz + dz;
      if (!w.inb(nx, nz)) continue;
      const ni = w.idx(nx, nz);
      if (closed.has(ni) || w.blocked(cur, ni)) continue;
      const g = gScore.get(cur)! + 1;
      if (g < (gScore.get(ni) ?? Infinity)) {
        gScore.set(ni, g);
        came.set(ni, cur);
        heap.push(ni, g + h(ni));
      }
    }
  }
  return null;
}

/** Flood-fill components of mutually reachable tiles. */
export function computeComponents(w: World): Int32Array {
  const N = w.size;
  const comp = new Int32Array(N * N).fill(-1);
  let c = 0;
  const stack: number[] = [];
  for (let i = 0; i < N * N; i++) {
    if (comp[i] !== -1 || !w.standable(i)) continue;
    comp[i] = c;
    stack.push(i);
    while (stack.length) {
      const j = stack.pop()!;
      const x = j % N, z = (j / N) | 0;
      for (const [dx, dz] of D4) {
        const nx = x + dx, nz = z + dz;
        if (!w.inb(nx, nz)) continue;
        const k = w.idx(nx, nz);
        if (comp[k] !== -1 || w.blocked(j, k)) continue;
        comp[k] = c;
        stack.push(k);
      }
    }
    c++;
  }
  return comp;
}

/** Straight-line walkability between two world points (for path smoothing). */
export function lineClear(w: World, ax: number, az: number, bx: number, bz: number): boolean {
  const d = Math.hypot(bx - ax, bz - az);
  const steps = Math.ceil(d / 0.25);
  let prev = w.idx(Math.floor(ax), Math.floor(az));
  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
    // keep a little clearance from corners
    for (const [ox, oz] of [
      [0, 0],
      [0.3, 0],
      [-0.3, 0],
      [0, 0.3],
      [0, -0.3],
    ] as const) {
      const tx = Math.floor(x + ox), tz = Math.floor(z + oz);
      if (!w.inb(tx, tz)) return false;
      const ti = w.idx(tx, tz);
      if (ti !== prev && w.blocked(prev, ti)) return false;
    }
    prev = w.idx(Math.floor(x), Math.floor(z));
  }
  return true;
}
