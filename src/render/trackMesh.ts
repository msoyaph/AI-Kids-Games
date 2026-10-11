import * as THREE from 'three';
import type { TrackPalette } from '../data/types';
import { EDGE_DROP, EDGE_OPEN, EDGE_WALL, F_GAP, Ribbon, TrackModel } from '../sim/track/trackModel';
import { RAMP_GLIDER } from '../sim/ground';
import { Materials } from './materials';

/** Growable typed-array geometry writer (position + colour), triangles only. */
class GeoWriter {
  pos: number[] = [];
  col: number[] = [];
  private c = new THREE.Color();

  tri(ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number, hex: number): void {
    this.c.setHex(hex);
    this.pos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    for (let i = 0; i < 3; i++) this.col.push(this.c.r, this.c.g, this.c.b);
  }

  /** Quad a-b-c-d (counter-clockwise when viewed from the visible side). */
  quad(a: number[], b: number[], c: number[], d: number[], hex: number): void {
    this.tri(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], hex);
    this.tri(a[0], a[1], a[2], c[0], c[1], c[2], d[0], d[1], d[2], hex);
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }
}

function pt(rb: Ribbon, i: number, d: number, lift = 0): number[] {
  return [rb.px[i] + rb.rx[i] * d, rb.py[i] + rb.ry[i] * d + lift, rb.pz[i] + rb.rz[i] * d];
}

interface StripOpts {
  /** Lateral offsets (functions of sample index) — inner/outer. d0 < d1 (left to right). */
  d0: (i: number) => number;
  d1: (i: number) => number;
  color: (s: number, i: number) => number;
  lift?: number;
  /** Height override for each edge (e.g. verge sloping to ground). */
  y0?: (i: number) => number | null;
  y1?: (i: number) => number | null;
  /** Skip a segment. */
  skip?: (i: number) => boolean;
}

function strip(w: GeoWriter, rb: Ribbon, stride: number, o: StripOpts): void {
  const segs = rb.closed ? Math.ceil(rb.n / stride) : Math.floor((rb.n - 1) / stride);
  for (let k = 0; k < segs; k++) {
    const i = rb.idx(k * stride);
    let j = rb.idx(Math.min(k * stride + stride, rb.closed ? k * stride + stride : rb.n - 1));
    if (rb.closed && k === segs - 1) j = 0;
    if (o.skip?.(i) && o.skip?.(j)) continue;
    const lift = o.lift ?? 0;
    const a = pt(rb, i, o.d0(i), lift);
    const b = pt(rb, i, o.d1(i), lift);
    const c = pt(rb, j, o.d1(j), lift);
    const d = pt(rb, j, o.d0(j), lift);
    if (o.y0) {
      const ya = o.y0(i);
      const yd = o.y0(j);
      if (ya !== null) a[1] = ya;
      if (yd !== null) d[1] = yd;
    }
    if (o.y1) {
      const yb = o.y1(i);
      const yc = o.y1(j);
      if (yb !== null) b[1] = yb;
      if (yc !== null) c[1] = yc;
    }
    w.quad(a, b, c, d, o.color(i * rb.ds, i));
  }
}

/** Vertical wall strip at lateral offset d (facing toward the road centre). */
function wallStrip(w: GeoWriter, rb: Ribbon, stride: number, side: -1 | 1, dAt: (i: number) => number, height: number, on: (i: number) => boolean, color: (s: number) => number, thickness = 0.6): void {
  const segs = rb.closed ? Math.ceil(rb.n / stride) : Math.floor((rb.n - 1) / stride);
  for (let k = 0; k < segs; k++) {
    const i = rb.idx(k * stride);
    let j = rb.idx(k * stride + stride);
    if (!rb.closed) j = Math.min(j, rb.n - 1);
    if (rb.closed && k === segs - 1) j = 0;
    if (!on(i) && !on(j)) continue;
    const di = dAt(i);
    const dj = dAt(j);
    const ai = pt(rb, i, di);
    const aj = pt(rb, j, dj);
    const ti = [ai[0], ai[1] + height, ai[2]];
    const tj = [aj[0], aj[1] + height, aj[2]];
    const oi = pt(rb, i, di + side * thickness);
    const oj = pt(rb, j, dj + side * thickness);
    const toi = [oi[0], ai[1] + height, oi[2]];
    const toj = [oj[0], aj[1] + height, oj[2]];
    const col = color(i * rb.ds);
    // inner face (visible from the road)
    if (side > 0) w.quad(ai, ti, tj, aj, col);
    else w.quad(aj, tj, ti, ai, col);
    // top cap
    if (side > 0) w.quad(ti, toi, toj, tj, col);
    else w.quad(tj, toj, toi, ti, col);
    // outer face
    if (side > 0) w.quad(oj, toj, toi, oi, col);
    else w.quad(oi, toi, toj, oj, col);
  }
}

/** Vertical skirt hanging below the road edge (floating-platform look for drop edges). */
function skirt(w: GeoWriter, rb: Ribbon, stride: number, side: -1 | 1, dAt: (i: number) => number, depth: (i: number) => number, on: (i: number) => boolean, color: number): void {
  const segs = rb.closed ? Math.ceil(rb.n / stride) : Math.floor((rb.n - 1) / stride);
  for (let k = 0; k < segs; k++) {
    const i = rb.idx(k * stride);
    let j = rb.idx(k * stride + stride);
    if (!rb.closed) j = Math.min(j, rb.n - 1);
    if (rb.closed && k === segs - 1) j = 0;
    if (!on(i) && !on(j)) continue;
    const ai = pt(rb, i, dAt(i));
    const aj = pt(rb, j, dAt(j));
    const bi = [ai[0], ai[1] - depth(i), ai[2]];
    const bj = [aj[0], aj[1] - depth(j), aj[2]];
    if (side > 0) w.quad(ai, aj, bj, bi, color);
    else w.quad(aj, ai, bi, bj, color);
  }
}

export interface TrackMeshes {
  group: THREE.Group;
  boostMaterial: THREE.MeshBasicMaterial;
}

/** Build all static geometry for a track. One merged mesh for the surfaces + one for boost pads. */
export function buildTrackMeshes(track: TrackModel): TrackMeshes {
  const pal = track.data.palette;
  const groundY = track.data.sky.groundY ?? track.minY - 0.5;
  const hasGround = track.data.sky.ground !== null;
  const w = new GeoWriter();
  const pads = new GeoWriter();
  buildRibbon(w, pads, track.main, pal, groundY, hasGround, false);
  for (const sc of track.shortcuts) buildRibbon(w, pads, sc, pal, groundY, hasGround, true);
  // start line checkers
  const rb = track.main;
  const cols = 10;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < 2; r++) {
      const i0 = rb.idx(r);
      const i1 = rb.idx(r + 1);
      const hw0 = rb.hw[i0];
      const hw1 = rb.hw[i1];
      const a = pt(rb, i0, -hw0 + (c / cols) * hw0 * 2, 0.03);
      const b = pt(rb, i0, -hw0 + ((c + 1) / cols) * hw0 * 2, 0.03);
      const cc = pt(rb, i1, -hw1 + ((c + 1) / cols) * hw1 * 2, 0.03);
      const d = pt(rb, i1, -hw1 + (c / cols) * hw1 * 2, 0.03);
      w.quad(a, b, cc, d, (c + r) % 2 === 0 ? 0xffffff : 0x1d1d2b);
    }
  }
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(w.build(), Materials.flatDouble);
  mesh.receiveShadow = true;
  mesh.name = 'track';
  group.add(mesh);
  const boostMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });
  if (pads.pos.length) {
    const padMesh = new THREE.Mesh(pads.build(), boostMaterial);
    padMesh.name = 'boostPads';
    group.add(padMesh);
  }
  // Start gate arch
  group.add(buildStartGate(track));
  return { group, boostMaterial };
}

function buildRibbon(w: GeoWriter, pads: GeoWriter, rb: Ribbon, pal: TrackPalette, groundY: number, hasGround: boolean, isShortcut: boolean): void {
  const stride = 2;
  const gap = (i: number): boolean => (rb.flags[i] & F_GAP) !== 0;
  const lift = isShortcut ? 0.04 : 0;
  const kerbW = 0.7;
  const roadColor = rb.offroadSurface ? (s: number) => (Math.floor(s / 6) % 2 ? pal.offroad : shade(pal.offroad, 0.93)) : (s: number) => (Math.floor(s / 10) % 2 ? pal.road : pal.road2);
  // road
  strip(w, rb, stride, { d0: (i) => -rb.hw[i], d1: (i) => rb.hw[i], color: roadColor, lift, skip: gap });
  if (!rb.offroadSurface) {
    // centre dashes
    for (let i = 0; i < rb.n - 4; i += 8) {
      if (Math.floor((i * rb.ds) / 8) % 2 === 0 || gap(i) || gap(rb.idx(i + 4))) continue;
      const j = rb.idx(i + 4);
      const a = pt(rb, i, -0.15, 0.015 + lift);
      const b = pt(rb, i, 0.15, 0.015 + lift);
      const c = pt(rb, j, 0.15, 0.015 + lift);
      const d = pt(rb, j, -0.15, 0.015 + lift);
      w.quad(a, b, c, d, pal.line);
    }
    // kerbs
    const kerbCol = (s: number): number => (Math.floor(s / 3) % 2 ? pal.kerb : pal.kerb2);
    strip(w, rb, 1, { d0: (i) => -rb.hw[i] - kerbW, d1: (i) => -rb.hw[i], color: kerbCol, lift: 0.02 + lift, skip: gap });
    strip(w, rb, 1, { d0: (i) => rb.hw[i], d1: (i) => rb.hw[i] + kerbW, color: kerbCol, lift: 0.02 + lift, skip: gap });
  }
  // shoulders (offroad) where not a drop edge
  const offCol = (s: number): number => (Math.floor(s / 7) % 2 ? pal.offroad : shade(pal.offroad, 0.94));
  strip(w, rb, stride, {
    d0: (i) => -rb.hw[i] - rb.shL[i],
    d1: (i) => -rb.hw[i] - (rb.edgeL[i] === EDGE_DROP ? rb.shL[i] : kerbW),
    color: offCol,
    lift: lift - 0.01,
    skip: (i) => gap(i) || rb.edgeL[i] === EDGE_DROP,
  });
  strip(w, rb, stride, {
    d0: (i) => rb.hw[i] + (rb.edgeR[i] === EDGE_DROP ? rb.shR[i] : kerbW),
    d1: (i) => rb.hw[i] + rb.shR[i],
    color: offCol,
    lift: lift - 0.01,
    skip: (i) => gap(i) || rb.edgeR[i] === EDGE_DROP,
  });
  // verges: terrain sloping from the boundary down to the ground plane
  if (hasGround) {
    const V = 22;
    const vergeCol = (s: number): number => (Math.floor(s / 9) % 2 ? shade(pal.offroad, 0.97) : shade(pal.offroad, 0.9));
    strip(w, rb, stride, {
      d0: (i) => -rb.hw[i] - rb.shL[i] - V,
      d1: (i) => -rb.hw[i] - rb.shL[i],
      color: vergeCol,
      lift: lift - 0.02,
      y0: (i) => Math.min(groundY, rb.py[i] - 0.4),
      skip: (i) => gap(i) || rb.edgeL[i] === EDGE_DROP,
    });
    strip(w, rb, stride, {
      d0: (i) => rb.hw[i] + rb.shR[i],
      d1: (i) => rb.hw[i] + rb.shR[i] + V,
      color: vergeCol,
      lift: lift - 0.02,
      y1: (i) => Math.min(groundY, rb.py[i] - 0.4),
      skip: (i) => gap(i) || rb.edgeR[i] === EDGE_DROP,
    });
  }
  // walls / low fences
  const wallCol = (s: number): number => (Math.floor(s / 6) % 2 ? pal.wall : pal.wall2);
  wallStrip(w, rb, stride, -1, (i) => -rb.hw[i] - rb.shL[i], 1.15, (i) => rb.edgeL[i] === EDGE_WALL && !gap(i), wallCol);
  wallStrip(w, rb, stride, 1, (i) => rb.hw[i] + rb.shR[i], 1.15, (i) => rb.edgeR[i] === EDGE_WALL && !gap(i), wallCol);
  wallStrip(w, rb, stride * 2, -1, (i) => -rb.hw[i] - rb.shL[i], 0.45, (i) => rb.edgeL[i] === EDGE_OPEN && !gap(i) && !isShortcut, () => pal.wall2, 0.25);
  wallStrip(w, rb, stride * 2, 1, (i) => rb.hw[i] + rb.shR[i], 0.45, (i) => rb.edgeR[i] === EDGE_OPEN && !gap(i) && !isShortcut, () => pal.wall2, 0.25);
  // drop-edge skirts and undersides
  const depth = (i: number): number => Math.max(2.2, Math.min(4, rb.py[i] - groundY));
  skirt(w, rb, stride, -1, (i) => -rb.hw[i] - rb.shL[i], depth, (i) => rb.edgeL[i] === EDGE_DROP && !gap(i), pal.side);
  skirt(w, rb, stride, 1, (i) => rb.hw[i] + rb.shR[i], depth, (i) => rb.edgeR[i] === EDGE_DROP && !gap(i), pal.side);
  // underside (only visible from below on floating sections)
  strip(w, rb, stride * 2, {
    d0: (i) => rb.hw[i] + rb.shR[i],
    d1: (i) => -rb.hw[i] - rb.shL[i],
    color: () => shade(pal.side, 0.8),
    y0: (i) => rb.py[i] - depth(i),
    y1: (i) => rb.py[i] - depth(i),
    skip: (i) => gap(i) || (rb.edgeL[i] !== EDGE_DROP && rb.edgeR[i] !== EDGE_DROP),
  });
  // gap end-caps: vertical faces where the road stops
  for (let i = 0; i < rb.n; i++) {
    const j = rb.idx(i + 1);
    if (!rb.closed && i === rb.n - 1) break;
    const gi = gap(i);
    const gj = gap(j);
    if (gi === gj) continue;
    const at = gi ? j : i;
    const hwl = rb.hw[at] + rb.shL[at];
    const hwr = rb.hw[at] + rb.shR[at];
    const dep = depth(at);
    const a = pt(rb, at, -hwl);
    const b = pt(rb, at, hwr);
    const c = [b[0], b[1] - dep, b[2]];
    const d = [a[0], a[1] - dep, a[2]];
    // face toward the gap
    if (gj) w.quad(a, d, c, b, pal.side);
    else w.quad(b, c, d, a, pal.side);
  }
  // ramps
  for (const r of rb.ramps) {
    const glider = r.kind === RAMP_GLIDER;
    const c1 = glider ? 0x3fa7ff : pal.kerb;
    const c2 = glider ? 0xffffff : pal.kerb2;
    const steps = Math.max(2, Math.round((r.s1 - r.s0) / rb.ds));
    let prevL: number[] | null = null;
    let prevR: number[] | null = null;
    for (let k = 0; k <= steps; k++) {
      const s = r.s0 + ((r.s1 - r.s0) * k) / steps;
      const i = rb.indexAtS(s);
      const h = (r.height * k) / steps;
      const L = pt(rb, i, r.d0, h + 0.03 + lift);
      const R = pt(rb, i, r.d1, h + 0.03 + lift);
      if (prevL && prevR) {
        w.quad(prevL, L, R, prevR, k % 2 ? c1 : c2);
        // sides
        const pLb = [prevL[0], prevL[1] - (r.height * (k - 1)) / steps, prevL[2]];
        const Lb = [L[0], L[1] - h, L[2]];
        const pRb = [prevR[0], prevR[1] - (r.height * (k - 1)) / steps, prevR[2]];
        const Rb = [R[0], R[1] - h, R[2]];
        w.quad(pLb, Lb, L, prevL, shade(c1, 0.75));
        w.quad(prevR, R, Rb, pRb, shade(c1, 0.75));
      }
      prevL = L;
      prevR = R;
    }
    if (prevL && prevR) {
      // back face (the lip)
      const Lb = [prevL[0], prevL[1] - r.height, prevL[2]];
      const Rb = [prevR[0], prevR[1] - r.height, prevR[2]];
      w.quad(prevL, prevR, Rb, Lb, shade(c1, 0.6));
    }
  }
  // boost pads: chevrons
  for (const p of rb.pads) {
    const n = 3;
    for (let k = 0; k < n; k++) {
      const s0 = p.s0 + ((p.s1 - p.s0) * k) / n;
      const s1 = p.s0 + ((p.s1 - p.s0) * (k + 1)) / n;
      const i0 = rb.indexAtS(s0);
      const i1 = rb.indexAtS(s1);
      const im = rb.indexAtS((s0 + s1) / 2);
      const dc = (p.d0 + p.d1) / 2;
      const hwp = (p.d1 - p.d0) / 2;
      // base plate
      pads.quad(pt(rb, i0, p.d0, 0.04 + lift), pt(rb, i1, p.d0, 0.04 + lift), pt(rb, i1, p.d1, 0.04 + lift), pt(rb, i0, p.d1, 0.04 + lift), 0xff9f1c);
      // chevron arrow
      pads.tri(...(pt(rb, i0, dc - hwp * 0.8, 0.06 + lift) as [number, number, number]), ...(pt(rb, im, dc, 0.06 + lift) as [number, number, number]), ...(pt(rb, i0, dc - hwp * 0.2, 0.06 + lift) as [number, number, number]), 0xffe45c);
      pads.tri(...(pt(rb, i0, dc + hwp * 0.2, 0.06 + lift) as [number, number, number]), ...(pt(rb, im, dc, 0.06 + lift) as [number, number, number]), ...(pt(rb, i0, dc + hwp * 0.8, 0.06 + lift) as [number, number, number]), 0xffe45c);
      pads.tri(...(pt(rb, i0, dc - hwp * 0.2, 0.06 + lift) as [number, number, number]), ...(pt(rb, im, dc, 0.06 + lift) as [number, number, number]), ...(pt(rb, i1, dc, 0.06 + lift) as [number, number, number]), 0xfff6b0);
      pads.tri(...(pt(rb, i1, dc, 0.06 + lift) as [number, number, number]), ...(pt(rb, im, dc, 0.06 + lift) as [number, number, number]), ...(pt(rb, i0, dc + hwp * 0.2, 0.06 + lift) as [number, number, number]), 0xfff6b0);
    }
  }
}

function buildStartGate(track: TrackModel): THREE.Mesh {
  const rb = track.main;
  const i = 0;
  const hw = rb.hw[i] + 1.2;
  const w = new GeoWriter();
  const pal = track.data.palette;
  const yaw = Math.atan2(rb.tx[i], rb.tz[i]);
  const g = new THREE.Group();
  void g;
  const post = (side: number): void => {
    const p = pt(rb, i, side * hw);
    const s = 0.5;
    const h = 6.5;
    const corners = [
      [-s, -s],
      [s, -s],
      [s, s],
      [-s, s],
    ].map(([a, b]) => [p[0] + rb.rx[i] * a + rb.tx[i] * b, p[2] + rb.rz[i] * a + rb.tz[i] * b]);
    for (let k = 0; k < 4; k++) {
      const c0 = corners[k];
      const c1 = corners[(k + 1) % 4];
      w.quad([c0[0], p[1], c0[1]], [c1[0], p[1], c1[1]], [c1[0], p[1] + h, c1[1]], [c0[0], p[1] + h, c0[1]], pal.wall);
    }
  };
  post(-1);
  post(1);
  // banner
  const a = pt(rb, i, -hw, 5.2);
  const b = pt(rb, i, hw, 5.2);
  const c = pt(rb, i, hw, 6.6);
  const d = pt(rb, i, -hw, 6.6);
  w.quad(a, b, c, d, pal.wall2);
  w.quad(b, a, d, c, pal.wall2);
  void yaw;
  const mesh = new THREE.Mesh(w.build(), Materials.flatDouble);
  return mesh;
}

export function shade(hex: number, f: number): number {
  const r = Math.min(255, Math.round(((hex >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((hex >> 8) & 255) * f));
  const b = Math.min(255, Math.round((hex & 255) * f));
  return (r << 16) | (g << 8) | b;
}
