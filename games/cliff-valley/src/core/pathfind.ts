/**
 * A* on a tile grid with preallocated buffers (no per-search allocation of big arrays).
 * 4-directional, unit cost, Manhattan heuristic. Returns a list of [x, y] tiles (start excluded).
 */
export interface Grid {
  w: number;
  h: number;
  blocked(x: number, y: number): boolean;
}

let cap = 0;
let gScore = new Int32Array(0);
let parent = new Int32Array(0);
let closed = new Uint8Array(0);
let stamp = new Int32Array(0);
let curStamp = 0;
// binary heap of (f, node)
let heapF = new Int32Array(0);
let heapN = new Int32Array(0);
let heapLen = 0;

function ensure(n: number): void {
  if (n <= cap) return;
  cap = n;
  gScore = new Int32Array(n);
  parent = new Int32Array(n);
  closed = new Uint8Array(n);
  stamp = new Int32Array(n);
  heapF = new Int32Array(n * 4);
  heapN = new Int32Array(n * 4);
}

function push(f: number, n: number): void {
  let i = heapLen++;
  heapF[i] = f;
  heapN[i] = n;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (heapF[p] <= heapF[i]) break;
    const tf = heapF[p], tn = heapN[p];
    heapF[p] = heapF[i];
    heapN[p] = heapN[i];
    heapF[i] = tf;
    heapN[i] = tn;
    i = p;
  }
}

function pop(): number {
  const top = heapN[0];
  heapLen--;
  if (heapLen > 0) {
    heapF[0] = heapF[heapLen];
    heapN[0] = heapN[heapLen];
    let i = 0;
    for (;;) {
      const l = i * 2 + 1, r = l + 1;
      let m = i;
      if (l < heapLen && heapF[l] < heapF[m]) m = l;
      if (r < heapLen && heapF[r] < heapF[m]) m = r;
      if (m === i) break;
      const tf = heapF[m], tn = heapN[m];
      heapF[m] = heapF[i];
      heapN[m] = heapN[i];
      heapF[i] = tf;
      heapN[i] = tn;
      i = m;
    }
  }
  return top;
}

const DX = [1, -1, 0, 0];
const DY = [0, 0, 1, -1];

/**
 * Find a path from (sx,sy) to (tx,ty). The goal tile may be blocked (e.g. a counter or a
 * warp into a building) — `goalOk` lets the caller accept it. Returns null if unreachable.
 */
export function findPath(g: Grid, sx: number, sy: number, tx: number, ty: number, maxNodes = 6000): [number, number][] | null {
  const n = g.w * g.h;
  ensure(n);
  curStamp++;
  heapLen = 0;
  const start = sy * g.w + sx, goal = ty * g.w + tx;
  if (sx === tx && sy === ty) return [];
  stamp[start] = curStamp;
  gScore[start] = 0;
  closed[start] = 0;
  parent[start] = -1;
  push(Math.abs(sx - tx) + Math.abs(sy - ty), start);
  let expanded = 0;
  while (heapLen > 0) {
    const cur = pop();
    if (cur === goal) break;
    if (stamp[cur] === curStamp && closed[cur]) continue;
    closed[cur] = 1;
    if (++expanded > maxNodes) return null;
    const cx = cur % g.w, cy = (cur / g.w) | 0;
    for (let k = 0; k < 4; k++) {
      const nx = cx + DX[k], ny = cy + DY[k];
      if (nx < 0 || ny < 0 || nx >= g.w || ny >= g.h) continue;
      const ni = ny * g.w + nx;
      if (ni !== goal && g.blocked(nx, ny)) continue;
      const ng = gScore[cur] + 1;
      if (stamp[ni] !== curStamp) {
        stamp[ni] = curStamp;
        closed[ni] = 0;
        gScore[ni] = 1 << 30;
      }
      if (closed[ni] || ng >= gScore[ni]) continue;
      gScore[ni] = ng;
      parent[ni] = cur;
      push(ng + Math.abs(nx - tx) + Math.abs(ny - ty), ni);
    }
  }
  if (stamp[goal] !== curStamp) return null;
  const out: [number, number][] = [];
  let c = goal;
  while (c !== start && c >= 0) {
    out.push([c % g.w, (c / g.w) | 0]);
    c = parent[c];
  }
  out.reverse();
  return out;
}

/** Nearest walkable tile to (x, y) by spiral search. */
export function nearestOpen(g: Grid, x: number, y: number, maxR = 6): [number, number] {
  if (!g.blocked(x, y)) return [x, y];
  for (let r = 1; r <= maxR; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < g.w && ny < g.h && !g.blocked(nx, ny)) return [nx, ny];
      }
  return [x, y];
}
