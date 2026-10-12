import type { TrackPoint } from '../types';

/**
 * Tiny layout DSL: describe a closed track as straights and arcs (like a toy train set) and get
 * evenly spaced control points back. The loop is closed automatically by spreading any leftover
 * position error along the path, so designs only need to be roughly closed (total turn ±360°).
 *
 *   const L = layout({ x: 0, z: 0, heading: 0 }, [
 *     straight(80), right(90, 40, { y: 4 }), straight(40, { mark: 'jump' }), left(180, 25), ...
 *   ]);
 *   L.points → TrackPoint[], L.marks.jump → control-point u at the end of that segment.
 */

export interface SegOpts {
  /** Elevation at the END of the segment (linear along the segment). */
  y?: number;
  /** Road width at the end of the segment. */
  w?: number;
  /** Manual bank (degrees) applied to points in this segment. */
  bank?: number;
  /** Record the u at the end of this segment under this name. */
  mark?: string;
  /** Record the u at the start of this segment under this name. */
  markStart?: string;
  /** Point spacing override (metres). */
  step?: number;
}

export type Seg = { kind: 'straight'; len: number; o: SegOpts } | { kind: 'arc'; deg: number; r: number; o: SegOpts };

export const straight = (len: number, o: SegOpts = {}): Seg => ({ kind: 'straight', len, o });
/** Turn right by `deg` degrees with radius `r` (seen from above, driving forward). */
export const right = (deg: number, r: number, o: SegOpts = {}): Seg => ({ kind: 'arc', deg: -Math.abs(deg), r, o });
export const left = (deg: number, r: number, o: SegOpts = {}): Seg => ({ kind: 'arc', deg: Math.abs(deg), r, o });

export interface MarkPos {
  x: number;
  y: number;
  z: number;
  /** Heading in degrees (0 = +Z). */
  heading: number;
}

export interface Layout {
  points: TrackPoint[];
  marks: Record<string, number>;
  /** World position/heading at each mark (after loop closure). */
  pos: Record<string, MarkPos>;
  length: number;
}

export interface LayoutOptions {
  /** Control-point spacing (metres) for straights / large arcs. Default 22. */
  step?: number;
  /**
   * Compatibility for the 16 original tracks: mark headings from the chord of the polyline segment the mark sits
   * on (10–15° skewed at the end of curves). Props in those tracks were placed against that skew, so they keep it.
   * New tracks must NOT set this: by default a mark's heading is the road's true tangent there.
   */
  legacyMarkHeadings?: boolean;
}

/**
 * Heading convention matches the game: heading 0 drives toward +Z; a RIGHT turn rotates toward -X.
 */
export function layout(start: { x: number; z: number; heading?: number; y?: number; w?: number }, segs: Seg[], opts: number | LayoutOptions = {}): Layout {
  const o0: LayoutOptions = typeof opts === 'number' ? { step: opts } : opts;
  const defaultStep = o0.step ?? 22;
  type P = { x: number; z: number; y: number; w?: number; bank?: number; dist: number };
  const pts: P[] = [];
  const marks: Record<string, number> = {};
  const pos: Record<string, MarkPos> = {};
  let x = start.x;
  let z = start.z;
  let h = ((start.heading ?? 0) * Math.PI) / 180;
  let y = start.y ?? 0;
  let w = start.w;
  let dist = 0;
  pts.push({ x, z, y, w, dist });
  /** `h` = exact heading of the path at the mark (before loop closure). */
  const markAt: Array<{ name: string; dist: number; h: number }> = [];
  for (const seg of segs) {
    const o = seg.o;
    const y0 = y;
    const y1 = o.y ?? y;
    const w0 = w;
    const w1 = o.w ?? w;
    if (o.markStart) markAt.push({ name: o.markStart, dist, h });
    const segLen = seg.kind === 'straight' ? seg.len : (Math.abs(seg.deg) * Math.PI * seg.r) / 180;
    const step = o.step ?? (seg.kind === 'arc' ? Math.min(defaultStep, Math.max(8, seg.r * 0.45)) : defaultStep);
    const n = Math.max(1, Math.round(segLen / step));
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      if (seg.kind === 'straight') {
        x += Math.sin(h) * (segLen / n);
        z += Math.cos(h) * (segLen / n);
      } else {
        const dh = ((seg.deg * Math.PI) / 180) / n;
        // advance along the arc chord for this sub-step
        const chord = 2 * seg.r * Math.sin(Math.abs(dh) / 2);
        const mid = h + dh / 2;
        x += Math.sin(mid) * chord;
        z += Math.cos(mid) * chord;
        h += dh;
      }
      dist += segLen / n;
      const yy = y0 + (y1 - y0) * t;
      const ww = w0 !== undefined && w1 !== undefined ? w0 + (w1 - w0) * t : w1;
      pts.push({ x, z, y: yy, w: ww, bank: o.bank, dist });
    }
    y = y1;
    w = w1;
    if (o.mark) markAt.push({ name: o.mark, dist, h });
  }
  // Close the loop: drop the final point if it lands on the start, then distribute the error.
  const last = pts[pts.length - 1];
  const ex = last.x - pts[0].x;
  const ez = last.z - pts[0].z;
  const ey = last.y - pts[0].y;
  const total = dist;
  for (const p of pts) {
    const f = p.dist / total;
    p.x -= ex * f;
    p.z -= ez * f;
    p.y -= ey * f;
  }
  pts.pop();
  const points: TrackPoint[] = pts.map((p) => {
    const tp: TrackPoint = { x: round(p.x), z: round(p.z), y: round(p.y) };
    if (p.w !== undefined) tp.w = round(p.w);
    if (p.bank) tp.bank = p.bank;
    return tp;
  });
  // marks → u (fractional point index by distance)
  for (const m of markAt) {
    let i = 0;
    while (i < pts.length - 1 && pts[i + 1].dist < m.dist) i++;
    const a = pts[i];
    const b = pts[i + 1] ?? { dist: total };
    const f = b.dist > a.dist ? (m.dist - a.dist) / (b.dist - a.dist) : 0;
    const ff = Math.min(1, Math.max(0, f));
    marks[m.name] = round((i + ff) % pts.length, 3);
    const nb = pts[(i + 1) % pts.length];
    const px = a.x + (nb.x - a.x) * ff;
    const pz = a.z + (nb.z - a.z) * ff;
    const py = a.y + (nb.y - a.y) * ff;
    let heading: number;
    if (o0.legacyMarkHeadings) heading = Math.atan2(nb.x - a.x, nb.z - a.z);
    else {
      // true tangent: the path's exact heading there, tilted by the loop-closure correction (−error per metre)
      heading = Math.atan2(Math.sin(m.h) - ex / total, Math.cos(m.h) - ez / total);
    }
    pos[m.name] = { x: round(px), y: round(py), z: round(pz), heading: round((heading * 180) / Math.PI, 1) };
  }
  return { points, marks, pos, length: total };
}

function round(v: number, d = 2): number {
  const k = 10 ** d;
  return Math.round(v * k) / k;
}

/** Offset a u position by a number of control points (wraps). */
export function uAdd(u: number, du: number, n: number): number {
  return (((u + du) % n) + n) % n;
}

/** A point `fwd` metres ahead and `right` metres to the right of a mark (uses the mark's heading). */
export function offset(p: MarkPos, fwd: number, right: number, y?: number): { x: number; z: number; y: number } {
  const h = (p.heading * Math.PI) / 180;
  const fx = Math.sin(h);
  const fz = Math.cos(h);
  const rx = -fz;
  const rz = fx;
  return { x: round(p.x + fx * fwd + rx * right), z: round(p.z + fz * fwd + rz * right), y: y ?? p.y };
}

/** Point a fraction `t` of the way from mark a to mark b (plus a lateral nudge relative to a→b, + = right). */
export function between(a: MarkPos, b: MarkPos, t: number, right = 0, y?: number): { x: number; z: number; y: number } {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  const rx = -dz / len;
  const rz = dx / len;
  return { x: round(a.x + dx * t + rx * right), z: round(a.z + dz * t + rz * right), y: y ?? round(a.y + (b.y - a.y) * t) };
}
