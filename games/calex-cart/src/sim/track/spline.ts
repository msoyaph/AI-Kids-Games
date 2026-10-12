// Catmull-Rom splines (centripetal-ish via tension 0.5 uniform; control points are hand-placed so this is fine).

export interface SplineKey {
  x: number;
  y: number;
  z: number;
  w: number;
  bank: number;
}

function cr(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

/** Evaluate a closed (loop) or open spline at parameter u in [0, n) (closed) or [0, n-1] (open). */
export function evalSpline(keys: readonly SplineKey[], u: number, closed: boolean, out: SplineKey): SplineKey {
  const n = keys.length;
  let i = Math.floor(u);
  let t = u - i;
  if (!closed) {
    if (i >= n - 1) {
      i = n - 2;
      t = 1;
    }
    if (i < 0) {
      i = 0;
      t = 0;
    }
  }
  const idx = (k: number): SplineKey => {
    if (closed) return keys[((k % n) + n) % n];
    if (k < 0) {
      // reflect for open-start tangents
      const a = keys[0];
      const b = keys[1];
      return { x: 2 * a.x - b.x, y: 2 * a.y - b.y, z: 2 * a.z - b.z, w: a.w, bank: a.bank };
    }
    if (k >= n) {
      const a = keys[n - 1];
      const b = keys[n - 2];
      return { x: 2 * a.x - b.x, y: 2 * a.y - b.y, z: 2 * a.z - b.z, w: a.w, bank: a.bank };
    }
    return keys[k];
  };
  const p0 = idx(i - 1);
  const p1 = idx(i);
  const p2 = idx(i + 1);
  const p3 = idx(i + 2);
  out.x = cr(p0.x, p1.x, p2.x, p3.x, t);
  out.y = cr(p0.y, p1.y, p2.y, p3.y, t);
  out.z = cr(p0.z, p1.z, p2.z, p3.z, t);
  // width/bank: smooth (no overshoot) interpolation between the two neighbours
  const s = t * t * (3 - 2 * t);
  out.w = p1.w + (p2.w - p1.w) * s;
  out.bank = p1.bank + (p2.bank - p1.bank) * s;
  return out;
}
