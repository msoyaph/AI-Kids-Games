import type { EdgeSpan, RampData, TrackData, TrackPoint, URange } from '../../data/types';
import { clamp, DEG } from '../../core/math';
import { RAMP_GLIDER, RAMP_NONE, RAMP_TRICK, type GroundHint, type GroundHit, type GroundModel, type SpawnPoint } from '../ground';
import { TUNING } from '../tuning';
import { evalSpline, type SplineKey } from './spline';

export const EDGE_OPEN = 0;
export const EDGE_WALL = 1;
export const EDGE_DROP = 2;

export const F_GAP = 1;
export const F_WATER = 2;
export const F_LOWGRAV = 4;

/** Rectangle in ribbon (s, d) space. */
export interface SDRect {
  s0: number;
  s1: number;
  d0: number;
  d1: number;
}

export interface RampRect extends SDRect {
  height: number;
  kind: number; // RAMP_TRICK | RAMP_GLIDER
}

export interface ItemBoxSpot {
  x: number;
  y: number;
  z: number;
  /** Main-track s (for AI targeting). */
  s: number;
  d: number;
}

const SAMPLE_SPACING = 1.0;
const DENSE_PER_SEGMENT = 48;

/**
 * A baked road ribbon: evenly spaced samples (≈1 m) along a spline, with frames, widths, edges and flags.
 * The main track is a closed ribbon; shortcuts are open ribbons mapped onto main-track distance.
 */
export class Ribbon {
  readonly n: number;
  readonly ds: number;
  readonly length: number;
  readonly px: Float32Array;
  readonly py: Float32Array;
  readonly pz: Float32Array;
  /** Horizontal unit tangent. */
  readonly tx: Float32Array;
  readonly tz: Float32Array;
  /** Height change per metre along the track. */
  readonly ty: Float32Array;
  /** Horizontal unit right vector (= (-tz, tx)). */
  readonly rx: Float32Array;
  readonly rz: Float32Array;
  /** Height change per metre to the right (bank). */
  readonly ry: Float32Array;
  readonly nx: Float32Array;
  readonly ny: Float32Array;
  readonly nz: Float32Array;
  /** Road half-width. */
  readonly hw: Float32Array;
  /** Control-point parameter u at each sample. */
  readonly u: Float32Array;
  /** Signed curvature (1/m), negative = turning right. */
  readonly curv: Float32Array;
  readonly bankDeg: Float32Array;
  readonly edgeL: Uint8Array;
  readonly edgeR: Uint8Array;
  readonly shL: Float32Array;
  readonly shR: Float32Array;
  readonly flags: Uint8Array;
  readonly pads: SDRect[] = [];
  readonly ramps: RampRect[] = [];
  /** Shortcut only: main-track s where this ribbon starts/ends. */
  mainS0 = 0;
  mainS1 = 0;
  offroadSurface = false;
  minX = Infinity;
  maxX = -Infinity;
  minZ = Infinity;
  maxZ = -Infinity;
  /** Dense lookup u → ribbon s (for feature placement). */
  private readonly denseU: Float32Array;
  private readonly denseS: Float32Array;

  constructor(
    points: readonly TrackPoint[],
    readonly closed: boolean,
    defaults: { width: number; autoBank: number; mirror: boolean },
    startU = 0,
  ) {
    // --- keys
    const keys: SplineKey[] = [];
    let lastY = 0;
    for (const p of points) {
      const y = p.y ?? lastY;
      lastY = y;
      keys.push({ x: defaults.mirror ? -p.x : p.x, y, z: p.z, w: p.w ?? defaults.width, bank: (p.bank ?? 0) * (defaults.mirror ? -1 : 1) });
    }
    const segs = closed ? keys.length : keys.length - 1;
    // --- dense sampling for arc length
    const denseCount = segs * DENSE_PER_SEGMENT + 1;
    const dU = new Float32Array(denseCount);
    const dS = new Float32Array(denseCount);
    const tmp: SplineKey = { x: 0, y: 0, z: 0, w: 0, bank: 0 };
    let prevX = 0;
    let prevY = 0;
    let prevZ = 0;
    let acc = 0;
    for (let i = 0; i < denseCount; i++) {
      const u = i / DENSE_PER_SEGMENT;
      evalSpline(keys, u, closed, tmp);
      if (i > 0) acc += Math.hypot(tmp.x - prevX, tmp.y - prevY, tmp.z - prevZ);
      prevX = tmp.x;
      prevY = tmp.y;
      prevZ = tmp.z;
      dU[i] = u;
      dS[i] = acc;
    }
    const totalLen = acc;
    // Start offset (closed ribbons start at the start/finish line).
    const startS = closed ? this.denseLookup(dU, dS, startU, true) : 0;
    this.denseU = dU;
    this.denseS = dS;
    const n = closed ? Math.max(8, Math.round(totalLen / SAMPLE_SPACING)) : Math.max(4, Math.round(totalLen / SAMPLE_SPACING)) + 1;
    this.n = n;
    this.length = totalLen;
    this.ds = closed ? totalLen / n : totalLen / (n - 1);
    const mk = (): Float32Array => new Float32Array(n);
    this.px = mk();
    this.py = mk();
    this.pz = mk();
    this.tx = mk();
    this.tz = mk();
    this.ty = mk();
    this.rx = mk();
    this.rz = mk();
    this.ry = mk();
    this.nx = mk();
    this.ny = mk();
    this.nz = mk();
    this.hw = mk();
    this.u = mk();
    this.curv = mk();
    this.bankDeg = mk();
    this.edgeL = new Uint8Array(n);
    this.edgeR = new Uint8Array(n);
    this.shL = mk();
    this.shR = mk();
    this.flags = new Uint8Array(n);
    const manualBank = mk();

    // --- resample evenly by arc length
    let j = 0;
    for (let i = 0; i < n; i++) {
      let s = startS + i * this.ds;
      if (closed && s >= totalLen) s -= totalLen;
      // dense search (monotonic for open, may wrap for closed)
      if (closed && i > 0 && s < dS[j]) j = 0;
      while (j < denseCount - 2 && dS[j + 1] < s) j++;
      const segLen = dS[j + 1] - dS[j] || 1e-6;
      const f = clamp((s - dS[j]) / segLen, 0, 1);
      const u = dU[j] + (dU[j + 1] - dU[j]) * f;
      evalSpline(keys, u, closed, tmp);
      this.px[i] = tmp.x;
      this.py[i] = tmp.y;
      this.pz[i] = tmp.z;
      this.hw[i] = tmp.w / 2;
      this.u[i] = u;
      manualBank[i] = tmp.bank;
    }
    // --- tangents
    for (let i = 0; i < n; i++) {
      const a = this.idx(i - 1);
      const b = this.idx(i + 1);
      let dx = this.px[b] - this.px[a];
      let dz = this.pz[b] - this.pz[a];
      const dy = this.py[b] - this.py[a];
      const hl = Math.hypot(dx, dz) || 1e-6;
      dx /= hl;
      dz /= hl;
      this.tx[i] = dx;
      this.tz[i] = dz;
      this.ty[i] = dy / hl;
      this.rx[i] = -dz;
      this.rz[i] = dx;
    }
    // --- curvature (heading change over a ±3 sample window)
    const w = 3;
    for (let i = 0; i < n; i++) {
      const a = this.idx(i - w);
      const b = this.idx(i + w);
      const ha = Math.atan2(this.tx[a], this.tz[a]);
      const hb = Math.atan2(this.tx[b], this.tz[b]);
      let dh = hb - ha;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      const span = (b - a + (closed && b < a ? n : 0)) * this.ds || 1;
      this.curv[i] = dh / span;
    }
    // --- banking: auto (from curvature) + manual, smoothed
    const raw = mk();
    for (let i = 0; i < n; i++) {
      const auto = clamp(-this.curv[i] * 300 * defaults.autoBank, -14, 14);
      raw[i] = auto + manualBank[i];
    }
    const sw = 6;
    for (let i = 0; i < n; i++) {
      let sum = 0;
      let cnt = 0;
      for (let k = -sw; k <= sw; k++) {
        const ii = closed ? this.idx(i + k) : clamp(i + k, 0, n - 1);
        sum += raw[ii];
        cnt++;
      }
      this.bankDeg[i] = sum / cnt;
    }
    // --- frames
    for (let i = 0; i < n; i++) {
      const b = this.bankDeg[i] * DEG;
      // positive bank lifts the left edge → right edge goes down
      this.ry[i] = -Math.tan(b);
      // normal = right3 × tangent3, with right3 = (rx, ry, rz), tangent3 = (tx, ty, tz)
      const r0 = this.rx[i];
      const r1 = this.ry[i];
      const r2 = this.rz[i];
      const t0 = this.tx[i];
      const t1 = this.ty[i];
      const t2 = this.tz[i];
      let nx = r1 * t2 - r2 * t1;
      let ny = r2 * t0 - r0 * t2;
      let nz = r0 * t1 - r1 * t0;
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l;
      ny /= l;
      nz /= l;
      if (ny < 0) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
      }
      this.nx[i] = nx;
      this.ny[i] = ny;
      this.nz[i] = nz;
    }
  }

  idx(i: number): number {
    if (this.closed) return ((i % this.n) + this.n) % this.n;
    return i < 0 ? 0 : i >= this.n ? this.n - 1 : i;
  }

  private denseLookup(dU: Float32Array, dS: Float32Array, u: number, closed: boolean): number {
    const maxU = dU[dU.length - 1];
    if (closed) u = ((u % maxU) + maxU) % maxU;
    else u = clamp(u, 0, maxU);
    const f = u * DENSE_PER_SEGMENT;
    const i = Math.min(dU.length - 2, Math.floor(f));
    const t = f - i;
    return dS[i] + (dS[i + 1] - dS[i]) * t;
  }

  /** Ribbon distance s for a control-point parameter u (start offset applied for closed ribbons). */
  sAtU(u: number): number {
    const raw = this.denseLookup(this.denseU, this.denseS, u, this.closed);
    if (!this.closed) return raw;
    const start = this.u[0];
    const s0 = this.denseLookup(this.denseU, this.denseS, start, true);
    let s = raw - s0;
    if (s < 0) s += this.length;
    return s;
  }

  /** Sample index for a ribbon distance. */
  indexAtS(s: number): number {
    if (this.closed) {
      s = ((s % this.length) + this.length) % this.length;
      return Math.round(s / this.ds) % this.n;
    }
    return clamp(Math.round(s / this.ds), 0, this.n - 1);
  }

  /** Apply per-sample attributes for u ranges (wrap-aware on closed ribbons). */
  forURange(r: URange, fn: (i: number) => void): void {
    const s0 = this.sAtU(r.from);
    let s1 = this.sAtU(r.to);
    if (this.closed && s1 < s0) s1 += this.length;
    for (let s = s0; s <= s1; s += this.ds) fn(this.indexAtS(s));
  }

  computeBounds(): void {
    for (let i = 0; i < this.n; i++) {
      const m = this.hw[i] + Math.max(this.shL[i], this.shR[i]) + 2;
      this.minX = Math.min(this.minX, this.px[i] - m);
      this.maxX = Math.max(this.maxX, this.px[i] + m);
      this.minZ = Math.min(this.minZ, this.pz[i] - m);
      this.maxZ = Math.max(this.maxZ, this.pz[i] + m);
    }
  }
}

/** Scratch result of a single-ribbon query. */
interface RibbonHit {
  i0: number;
  s: number;
  d: number;
  hw: number;
  height: number;
  /** 0 road, 1 shoulder, 2 beyond boundary */
  region: number;
  edge: number;
  boundary: number;
  gap: boolean;
  nx: number;
  ny: number;
  nz: number;
  dirX: number;
  dirZ: number;
  rX: number;
  rZ: number;
  ramp: number;
  pad: boolean;
  flags: number;
}

function makeRibbonHit(): RibbonHit {
  return { i0: 0, s: 0, d: 0, hw: 0, height: 0, region: 0, edge: 0, boundary: 0, gap: false, nx: 0, ny: 1, nz: 0, dirX: 0, dirZ: 1, rX: -1, rZ: 0, ramp: 0, pad: false, flags: 0 };
}

const EDGE_CODE: Record<string, number> = { open: EDGE_OPEN, wall: EDGE_WALL, drop: EDGE_DROP };

/**
 * A complete race course built from TrackData: main loop + shortcut ribbons + features.
 * Implements GroundModel so karts can drive on it.
 */
export class TrackModel implements GroundModel {
  readonly main: Ribbon;
  readonly shortcuts: Ribbon[] = [];
  readonly gravityScale: number;
  readonly killY: number;
  readonly length: number;
  readonly itemBoxes: ItemBoxSpot[] = [];
  /** AI racing line: lateral offset per main sample. */
  readonly line: Float32Array;
  /** Max comfortable speed per main sample along the racing line (m/s at Pro top speed scale 1). */
  readonly lineCurv: Float32Array;
  readonly minY: number;
  private readonly hitA = makeRibbonHit();
  private readonly hitB = makeRibbonHit();

  constructor(
    readonly data: TrackData,
    readonly mirror = false,
  ) {
    const defaults = { width: data.width, autoBank: data.autoBank ?? 0.6, mirror };
    this.main = new Ribbon(data.points, true, defaults, data.start ?? 0);
    this.length = this.main.length;
    this.gravityScale = data.gravity ?? 1;
    this.applyEdges(this.main, data.edge, data.edges ?? [], data.shoulder);
    for (const g of data.gaps ?? []) this.main.forURange(g, (i) => (this.main.flags[i] |= F_GAP));
    for (const z of data.zones ?? []) this.main.forURange(z, (i) => (this.main.flags[i] |= z.kind === 'water' ? F_WATER : F_LOWGRAV));
    for (const p of data.boostPads ?? []) this.addPad(this.main, p.at, p.offset, p.width);
    for (const r of data.ramps ?? []) this.addRamp(this.main, r);
    this.main.computeBounds();

    for (const sc of data.shortcuts) {
      const rb = new Ribbon(sc.points, false, { width: sc.width, autoBank: 0.3, mirror });
      const e = EDGE_CODE[sc.edge];
      const sh = e === EDGE_DROP ? 0.4 : 2.5;
      for (let i = 0; i < rb.n; i++) {
        rb.edgeL[i] = rb.edgeR[i] = e;
        rb.shL[i] = rb.shR[i] = sh;
      }
      // Ends of a shortcut blend into the main track: no walls in the first/last few metres.
      const openEnds = Math.min(rb.n >> 2, Math.round(8 / rb.ds));
      for (let i = 0; i < openEnds; i++) {
        rb.edgeL[i] = rb.edgeR[i] = EDGE_OPEN;
        rb.edgeL[rb.n - 1 - i] = rb.edgeR[rb.n - 1 - i] = EDGE_OPEN;
      }
      for (const g of sc.gaps ?? []) rb.forURange(g, (i) => (rb.flags[i] |= F_GAP));
      for (const p of sc.boostPads ?? []) this.addPad(rb, p.at, p.offset, p.width);
      for (const r of sc.ramps ?? []) this.addRamp(rb, r);
      rb.mainS0 = this.main.sAtU(sc.joinFrom);
      rb.mainS1 = this.main.sAtU(sc.joinTo);
      rb.offroadSurface = sc.surface === 'offroad';
      rb.computeBounds();
      this.shortcuts.push(rb);
    }

    // Item boxes
    for (const row of data.itemRows ?? []) this.addItemRow(this.main, row.at, row.count ?? 4, row.spread ?? 0.75, (row.offset ?? 0) * (mirror ? -1 : 1));
    let minY = Infinity;
    for (let i = 0; i < this.main.n; i++) minY = Math.min(minY, this.main.py[i]);
    this.minY = minY;
    this.killY = Math.min(minY, data.sky.groundY ?? minY) - 30;
    this.line = new Float32Array(this.main.n);
    this.lineCurv = new Float32Array(this.main.n);
    this.computeRacingLine();
  }

  private applyEdges(rb: Ribbon, def: string, spans: readonly EdgeSpan[], shoulder: number): void {
    const d = EDGE_CODE[def];
    for (let i = 0; i < rb.n; i++) {
      rb.edgeL[i] = rb.edgeR[i] = d;
    }
    for (const sp of spans) {
      const code = EDGE_CODE[sp.type];
      let side = sp.side;
      if (this.mirror && side !== 'both') side = side === 'left' ? 'right' : 'left';
      rb.forURange(sp, (i) => {
        if (side !== 'right') rb.edgeL[i] = code;
        if (side !== 'left') rb.edgeR[i] = code;
      });
    }
    for (let i = 0; i < rb.n; i++) {
      rb.shL[i] = rb.edgeL[i] === EDGE_DROP ? 0.6 : shoulder;
      rb.shR[i] = rb.edgeR[i] === EDGE_DROP ? 0.6 : shoulder;
    }
  }

  private addPad(rb: Ribbon, u: number, offset: number, width = 3.2): void {
    const s = rb.sAtU(u);
    const i = rb.indexAtS(s);
    const dc = offset * (this.mirror ? -1 : 1) * rb.hw[i];
    rb.pads.push({ s0: s - 2.6, s1: s + 2.6, d0: dc - width / 2, d1: dc + width / 2 });
  }

  private addRamp(rb: Ribbon, r: RampData): void {
    const s = rb.sAtU(r.at);
    const i = rb.indexAtS(s);
    const len = r.length ?? 7;
    const hw = rb.hw[i];
    const width = r.width ?? hw * 2 + 0.2;
    const dc = (r.offset ?? 0) * (this.mirror ? -1 : 1) * hw;
    rb.ramps.push({ s0: s - len, s1: s, d0: dc - width / 2, d1: dc + width / 2, height: r.height ?? 1.6, kind: r.kind === 'glider' ? RAMP_GLIDER : RAMP_TRICK });
  }

  private addItemRow(rb: Ribbon, u: number, count: number, spread: number, offset: number): void {
    const s = rb.sAtU(u);
    const i = rb.indexAtS(s);
    const hw = rb.hw[i];
    for (let k = 0; k < count; k++) {
      const t = count === 1 ? 0 : (k / (count - 1)) * 2 - 1;
      const d = (offset + t * spread) * hw;
      this.itemBoxes.push({
        x: rb.px[i] + rb.rx[i] * d,
        y: rb.py[i] + rb.ry[i] * d + 1.0,
        z: rb.pz[i] + rb.rz[i] * d,
        s,
        d,
      });
    }
  }

  /** Local nearest-sample search on a closed ribbon starting from a hint. */
  private nearestLocal(rb: Ribbon, x: number, y: number, z: number, start: number): number {
    let i = rb.idx(start);
    let best = this.metric(rb, i, x, y, z);
    for (let steps = 0; steps < 400; steps++) {
      const a = rb.idx(i + 1);
      const b = rb.idx(i - 1);
      const da = this.metric(rb, a, x, y, z);
      const db = this.metric(rb, b, x, y, z);
      if (da < best && da <= db) {
        best = da;
        i = a;
      } else if (db < best) {
        best = db;
        i = b;
      } else break;
    }
    return i;
  }

  private nearestGlobal(rb: Ribbon, x: number, y: number, z: number): number {
    let best = Infinity;
    let bi = 0;
    const step = 4;
    for (let i = 0; i < rb.n; i += step) {
      const m = this.metric(rb, i, x, y, z);
      if (m < best) {
        best = m;
        bi = i;
      }
    }
    return rb.closed ? this.nearestLocal(rb, x, y, z, bi) : this.nearestOpen(rb, x, y, z, bi);
  }

  private nearestOpen(rb: Ribbon, x: number, y: number, z: number, start: number): number {
    let i = clamp(start, 0, rb.n - 1);
    let best = this.metric(rb, i, x, y, z);
    for (let steps = 0; steps < 400; steps++) {
      const a = Math.min(rb.n - 1, i + 1);
      const b = Math.max(0, i - 1);
      const da = this.metric(rb, a, x, y, z);
      const db = this.metric(rb, b, x, y, z);
      if (da < best && da <= db) {
        best = da;
        i = a;
      } else if (db < best) {
        best = db;
        i = b;
      } else break;
    }
    return i;
  }

  private metric(rb: Ribbon, i: number, x: number, y: number, z: number): number {
    const dx = x - rb.px[i];
    const dz = z - rb.pz[i];
    const dy = (y - rb.py[i]) * 1.5;
    return dx * dx + dz * dz + dy * dy;
  }

  /** Evaluate one ribbon around sample i. */
  private evalRibbon(rb: Ribbon, i: number, x: number, z: number, out: RibbonHit): RibbonHit {
    let i0 = i;
    const t = (x - rb.px[i]) * rb.tx[i] + (z - rb.pz[i]) * rb.tz[i];
    if (t < 0 && (rb.closed || i > 0)) i0 = rb.idx(i - 1);
    if (!rb.closed && i0 >= rb.n - 1) i0 = rb.n - 2;
    const i1 = rb.idx(i0 + 1);
    const tt = (x - rb.px[i0]) * rb.tx[i0] + (z - rb.pz[i0]) * rb.tz[i0];
    const f = clamp(tt / rb.ds, 0, 1);
    const g = 1 - f;
    const cx = rb.px[i0] * g + rb.px[i1] * f;
    const cy = rb.py[i0] * g + rb.py[i1] * f;
    const cz = rb.pz[i0] * g + rb.pz[i1] * f;
    let rX = rb.rx[i0] * g + rb.rx[i1] * f;
    let rZ = rb.rz[i0] * g + rb.rz[i1] * f;
    const rl = Math.hypot(rX, rZ) || 1;
    rX /= rl;
    rZ /= rl;
    const ry = rb.ry[i0] * g + rb.ry[i1] * f;
    const d = (x - cx) * rX + (z - cz) * rZ;
    const s = rb.closed ? (i0 * rb.ds + f * rb.ds) % rb.length : Math.min(rb.length, i0 * rb.ds + f * rb.ds);
    const hw = rb.hw[i0] * g + rb.hw[i1] * f;
    const left = d < 0;
    const edge = left ? rb.edgeL[f < 0.5 ? i0 : i1] : rb.edgeR[f < 0.5 ? i0 : i1];
    const sh = left ? rb.shL[i0] * g + rb.shL[i1] * f : rb.shR[i0] * g + rb.shR[i1] * f;
    const ad = Math.abs(d);
    const boundary = hw + sh;
    out.i0 = i0;
    out.s = s;
    out.d = d;
    out.hw = hw;
    out.edge = edge;
    out.boundary = boundary;
    out.region = ad <= hw ? 0 : ad <= boundary ? 1 : 2;
    out.flags = rb.flags[f < 0.5 ? i0 : i1];
    out.gap = (out.flags & F_GAP) !== 0;
    out.height = cy + d * ry;
    out.nx = rb.nx[i0] * g + rb.nx[i1] * f;
    out.ny = rb.ny[i0] * g + rb.ny[i1] * f;
    out.nz = rb.nz[i0] * g + rb.nz[i1] * f;
    out.dirX = rb.tx[i0] * g + rb.tx[i1] * f;
    out.dirZ = rb.tz[i0] * g + rb.tz[i1] * f;
    out.rX = rX;
    out.rZ = rZ;
    out.ramp = RAMP_NONE;
    out.pad = false;
    if (out.region === 0) {
      for (let k = 0; k < rb.ramps.length; k++) {
        const r = rb.ramps[k];
        if (d >= r.d0 && d <= r.d1 && inS(rb, s, r.s0, r.s1)) {
          const along = sDelta(rb, s, r.s0) / (r.s1 - r.s0);
          const slope = r.height / (r.s1 - r.s0);
          out.height += r.height * clamp(along, 0, 1);
          out.ramp = r.kind;
          out.nx -= out.dirX * slope;
          out.nz -= out.dirZ * slope;
          const nl = Math.hypot(out.nx, out.ny, out.nz);
          out.nx /= nl;
          out.ny /= nl;
          out.nz /= nl;
          out.gap = false;
          break;
        }
      }
      for (let k = 0; k < rb.pads.length; k++) {
        const p = rb.pads[k];
        if (d >= p.d0 && d <= p.d1 && inS(rb, s, p.s0, p.s1)) {
          out.pad = true;
          break;
        }
      }
    }
    return out;
  }

  query(x: number, y: number, z: number, hint: GroundHint, out: GroundHit): GroundHit {
    const main = this.main;
    const i = this.nearestLocal(main, x, y, z, hint.sample);
    hint.sample = i;
    let best = this.evalRibbon(main, i, x, z, this.hitA);
    let bestRibbon = 0;
    let bestScore = this.score(best, y);
    let shortcutS = -1;
    for (let r = 0; r < this.shortcuts.length; r++) {
      const sc = this.shortcuts[r];
      if (x < sc.minX || x > sc.maxX || z < sc.minZ || z > sc.maxZ) continue;
      const j = this.nearestGlobal(sc, x, y, z);
      const cand = this.evalRibbon(sc, j, x, z, best === this.hitA ? this.hitB : this.hitA);
      const sc2 = this.score(cand, y);
      if (sc2 < bestScore) {
        best = cand;
        bestScore = sc2;
        bestRibbon = r + 1;
        const span = sdiff(this.length, sc.mainS0, sc.mainS1);
        shortcutS = (sc.mainS0 + (cand.s / sc.length) * span) % this.length;
      }
    }
    hint.ribbon = bestRibbon;
    const R = TUNING.kartRadius;
    out.ribbon = bestRibbon;
    out.sample = i;
    out.s = bestRibbon === 0 ? best.s : shortcutS;
    out.d = best.d;
    out.halfWidth = best.hw;
    out.dirX = best.dirX;
    out.dirZ = best.dirZ;
    out.height = best.height;
    out.nx = best.nx;
    out.ny = best.ny;
    out.nz = best.nz;
    out.ramp = best.ramp;
    out.water = (best.flags & F_WATER) !== 0;
    out.lowGrav = (best.flags & F_LOWGRAV) !== 0;
    out.wallHit = false;
    out.wallDepth = 0;
    out.wallNx = 0;
    out.wallNz = 0;
    const offroadRibbon = bestRibbon > 0 && this.shortcuts[bestRibbon - 1].offroadSurface;
    out.surface = best.region === 0 ? (best.pad ? 'boost' : offroadRibbon ? 'offroad' : 'road') : 'offroad';
    // Narrow kerb beside drop edges counts as road.
    if (best.region === 1 && best.edge === EDGE_DROP) out.surface = 'road';
    out.hit = !best.gap;
    const ad = Math.abs(best.d);
    if (best.edge === EDGE_DROP) {
      if (ad > best.boundary) out.hit = false;
    } else if (ad > best.boundary - R) {
      // walls (and invisible fences on open edges)
      out.wallHit = true;
      const sgn = best.d > 0 ? 1 : -1;
      out.wallNx = -best.rX * sgn;
      out.wallNz = -best.rZ * sgn;
      out.wallDepth = ad - (best.boundary - R);
    }
    return out;
  }

  /** Lower is better: prefer being on a road, then the ground closest below the kart. */
  private score(h: RibbonHit, y: number): number {
    let s = h.region === 0 ? 0 : h.region === 1 ? 1 : h.edge === EDGE_DROP ? 50 : 4;
    if (h.gap) s += 40;
    if (h.height > y + TUNING.stepUp) s += 20;
    s += Math.max(0, y - h.height) * 0.05;
    return s;
  }

  respawnAt(s: number, lateral: number, out: SpawnPoint): SpawnPoint {
    const rb = this.main;
    let i = rb.indexAtS(s - 3);
    // Walk back until we're on solid road with no gap just ahead.
    for (let tries = 0; tries < 300; tries++) {
      let ok = true;
      for (let k = -2; k <= 14; k++) {
        if (rb.flags[rb.idx(i + k)] & F_GAP) {
          ok = false;
          break;
        }
      }
      for (const r of rb.ramps) if (inS(rb, i * rb.ds, r.s0 - 4, r.s1 + 4)) ok = false;
      if (ok) break;
      i = rb.idx(i - 2);
    }
    const d = clamp(lateral, -rb.hw[i] * 0.6, rb.hw[i] * 0.6);
    out.x = rb.px[i] + rb.rx[i] * d;
    out.z = rb.pz[i] + rb.rz[i] * d;
    out.y = rb.py[i] + rb.ry[i] * d;
    out.yaw = Math.atan2(rb.tx[i], rb.tz[i]);
    return out;
  }

  resetHint(x: number, y: number, z: number, hint: GroundHint): void {
    hint.sample = this.nearestGlobal(this.main, x, y, z);
    hint.ribbon = 0;
  }

  /** Grid slot transform (slot 0 = pole position). */
  gridSlot(slot: number, out: SpawnPoint): SpawnPoint {
    const rb = this.main;
    const row = Math.floor(slot / 2);
    const col = slot % 2;
    const s = this.length - 7 - row * 6 - col * 3;
    const i = rb.indexAtS(s);
    const d = (col === 0 ? -1 : 1) * Math.min(rb.hw[i] * 0.45, 3.2);
    out.x = rb.px[i] + rb.rx[i] * d;
    out.z = rb.pz[i] + rb.rz[i] * d;
    out.y = rb.py[i] + rb.ry[i] * d;
    out.yaw = Math.atan2(rb.tx[i], rb.tz[i]);
    return out;
  }

  /** World position of main-track (s, d). */
  pointAt(s: number, d: number, out: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
    const rb = this.main;
    const i = rb.indexAtS(s);
    out.x = rb.px[i] + rb.rx[i] * d;
    out.y = rb.py[i] + rb.ry[i] * d;
    out.z = rb.pz[i] + rb.rz[i] * d;
    return out;
  }

  /** Smooth racing line by iterative relaxation (minimum-curvature-ish), constrained to the road. */
  private computeRacingLine(): void {
    const rb = this.main;
    const n = rb.n;
    const d = this.line;
    const tmp = new Float32Array(n);
    const limit = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const margin = rb.edgeL[i] === EDGE_DROP || rb.edgeR[i] === EDGE_DROP ? 2.4 : 1.8;
      limit[i] = Math.max(0, rb.hw[i] - margin);
    }
    for (const pass of [Math.round(24 / rb.ds), Math.round(12 / rb.ds), Math.round(6 / rb.ds)]) {
      const k = Math.max(2, pass);
      for (let iter = 0; iter < 60; iter++) {
        for (let i = 0; i < n; i++) {
          const a = rb.idx(i - k);
          const b = rb.idx(i + k);
          const ax = rb.px[a] + rb.rx[a] * d[a];
          const az = rb.pz[a] + rb.rz[a] * d[a];
          const bx = rb.px[b] + rb.rx[b] * d[b];
          const bz = rb.pz[b] + rb.rz[b] * d[b];
          const mx = (ax + bx) / 2 - rb.px[i];
          const mz = (az + bz) / 2 - rb.pz[i];
          const target = mx * rb.rx[i] + mz * rb.rz[i];
          tmp[i] = clamp(d[i] + (target - d[i]) * 0.6, -limit[i], limit[i]);
        }
        d.set(tmp);
      }
    }
    // curvature of the line path
    const w = Math.max(2, Math.round(4 / rb.ds));
    for (let i = 0; i < n; i++) {
      const a = rb.idx(i - w);
      const b = rb.idx(i + w);
      const ax = rb.px[a] + rb.rx[a] * d[a];
      const az = rb.pz[a] + rb.rz[a] * d[a];
      const cx = rb.px[i] + rb.rx[i] * d[i];
      const cz = rb.pz[i] + rb.rz[i] * d[i];
      const bx = rb.px[b] + rb.rx[b] * d[b];
      const bz = rb.pz[b] + rb.rz[b] * d[b];
      // curvature from three points (Menger)
      const abx = bx - ax;
      const abz = bz - az;
      const acx = cx - ax;
      const acz = cz - az;
      const cross = abx * acz - abz * acx;
      const la = Math.hypot(cx - ax, cz - az);
      const lb = Math.hypot(bx - cx, bz - cz);
      const lc = Math.hypot(abx, abz);
      this.lineCurv[i] = la * lb * lc > 1e-6 ? (2 * cross) / (la * lb * lc) : 0;
    }
  }
}

function sdiff(L: number, a: number, b: number): number {
  let d = b - a;
  if (d < 0) d += L;
  return d;
}

/** s within [s0, s1] on a ribbon (wrap-aware for closed ribbons). */
function inS(rb: Ribbon, s: number, s0: number, s1: number): boolean {
  if (!rb.closed) return s >= s0 && s <= s1;
  const L = rb.length;
  const a = ((s0 % L) + L) % L;
  const len = s1 - s0;
  let ds = s - a;
  if (ds < 0) ds += L;
  return ds <= len;
}

function sDelta(rb: Ribbon, s: number, s0: number): number {
  if (!rb.closed) return s - s0;
  const L = rb.length;
  const a = ((s0 % L) + L) % L;
  let ds = s - a;
  if (ds < 0) ds += L;
  return ds;
}
