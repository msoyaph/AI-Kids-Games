// Ghost recording/playback for Time Trial. Samples at 15 Hz; positions are quantised to 2 cm and yaw to 1 mrad.
//
// Storage format "G2" (current): a varint stream of second differences (karts move smoothly, so most values fit
// in one byte) plus run-length flags, packed 15 bits per UTF-16 character (offset past control characters and
// far below the surrogate range, so it survives localStorage in every browser). ≈ 35 chars per second of race —
// about 5× smaller than the old format.
// Legacy format "CGH1" (saves from v0.1): int16 deltas, base64. Still decoded; re-encoded to G2 at startup.

export const GHOST_HZ = 15;
/** Ghosts are only stored for runs up to this long (keeps the worst-case storage bounded). */
export const GHOST_MAX_SECONDS = 240;
const POS_Q = 50;
const YAW_Q = 1000;
const MAGIC = 0x43474831; // "CGH1"
const G2 = 'G2';
const CHAR_BASE = 0x100;

export const GF_DRIFT = 1;
export const GF_DRIFT_LEFT = 2;
export const GF_GLIDE = 4;
export const GF_BOOST = 8;
export const GF_AIR = 16;

export interface GhostFrame {
  x: number;
  y: number;
  z: number;
  yaw: number;
  flags: number;
}

export class GhostRecorder {
  private qx: number[] = [];
  private qy: number[] = [];
  private qz: number[] = [];
  private qyaw: number[] = [];
  private flags: number[] = [];
  private next = 0;

  /** `maxSeconds`: recording stops there (stored ghosts are capped; re-encoding an old ghost never truncates). */
  constructor(private readonly maxSeconds = GHOST_MAX_SECONDS + 1) {}

  /** Call every sim step with the race time. */
  record(t: number, x: number, y: number, z: number, yaw: number, flags: number): void {
    if (t + 1e-9 < this.next || t > this.maxSeconds) return;
    this.next += 1 / GHOST_HZ;
    this.qx.push(Math.round(x * POS_Q));
    this.qy.push(Math.round(y * POS_Q));
    this.qz.push(Math.round(z * POS_Q));
    this.qyaw.push(Math.round(yaw * YAW_Q));
    this.flags.push(flags & 255);
  }

  get length(): number {
    return this.qx.length;
  }

  /** Unwrapped yaw track (deltas wrapped to ±π), exactly as playback reconstructs it. */
  private yawTrack(): number[] {
    const out: number[] = [];
    for (let i = 0; i < this.qyaw.length; i++) out.push(i === 0 ? this.qyaw[0] : out[i - 1] + wrapQ(this.qyaw[i] - this.qyaw[i - 1]));
    return out;
  }

  /** Compact G2 encoding (what gets stored). */
  encode(): string {
    const n = this.qx.length;
    const w = new ByteWriter();
    w.uvar(n);
    const yaw = this.yawTrack();
    for (const ch of [this.qx, this.qy, this.qz, yaw]) {
      if (n === 0) break;
      w.svar(ch[0]);
      if (n > 1) w.svar(ch[1] - ch[0]);
      for (let i = 2; i < n; i++) w.svar(ch[i] - 2 * ch[i - 1] + ch[i - 2]);
    }
    // flags: run-length (value, count)
    for (let i = 0; i < n; ) {
      let j = i + 1;
      while (j < n && this.flags[j] === this.flags[i]) j++;
      w.byte(this.flags[i]);
      w.uvar(j - i);
      i = j;
    }
    return G2 + pack15(w.bytes());
  }

  /** The original v0.1 format (kept for tests and to prove old saves still load). */
  encodeLegacy(): string {
    const n = this.qx.length;
    const bytes = new ArrayBuffer(8 + 16 + Math.max(0, n - 1) * 8 + n);
    const dv = new DataView(bytes);
    dv.setUint32(0, MAGIC);
    dv.setUint32(4, n);
    if (n > 0) {
      dv.setInt32(8, this.qx[0]);
      dv.setInt32(12, this.qy[0]);
      dv.setInt32(16, this.qz[0]);
      dv.setInt32(20, this.qyaw[0]);
    }
    let o = 24;
    for (let i = 1; i < n; i++) {
      dv.setInt16(o, clamp16(this.qx[i] - this.qx[i - 1]));
      dv.setInt16(o + 2, clamp16(this.qy[i] - this.qy[i - 1]));
      dv.setInt16(o + 4, clamp16(this.qz[i] - this.qz[i - 1]));
      dv.setInt16(o + 6, clamp16(wrapQ(this.qyaw[i] - this.qyaw[i - 1])));
      o += 8;
    }
    for (let i = 0; i < n; i++) dv.setUint8(o + i, this.flags[i]);
    return toBase64(new Uint8Array(bytes));
  }
}

function clamp16(v: number): number {
  return v < -32768 ? -32768 : v > 32767 ? 32767 : v;
}

/** Yaw deltas wrap at ±π. */
function wrapQ(d: number): number {
  const full = Math.round(Math.PI * 2 * YAW_Q);
  while (d > full / 2) d -= full;
  while (d < -full / 2) d += full;
  return d;
}

// ------------------------------------------------------------------ byte stream helpers
class ByteWriter {
  private buf = new Uint8Array(1024);
  private n = 0;
  byte(v: number): void {
    if (this.n >= this.buf.length) {
      const b = new Uint8Array(this.buf.length * 2);
      b.set(this.buf);
      this.buf = b;
    }
    this.buf[this.n++] = v & 255;
  }
  uvar(v: number): void {
    // unsigned LEB128 (values up to 2^53 via division, no 32-bit overflow)
    while (v >= 0x80) {
      this.byte((v % 0x80) | 0x80);
      v = Math.floor(v / 0x80);
    }
    this.byte(v);
  }
  svar(v: number): void {
    this.uvar(v >= 0 ? v * 2 : -v * 2 - 1); // zigzag
  }
  bytes(): Uint8Array {
    return this.buf.subarray(0, this.n);
  }
}

class ByteReader {
  o = 0;
  constructor(private readonly b: Uint8Array) {}
  byte(): number {
    if (this.o >= this.b.length) throw new Error('eof');
    return this.b[this.o++];
  }
  uvar(): number {
    let v = 0;
    let mul = 1;
    for (let k = 0; k < 8; k++) {
      const c = this.byte();
      v += (c & 0x7f) * mul;
      if (c < 0x80) return v;
      mul *= 0x80;
    }
    throw new Error('varint');
  }
  svar(): number {
    const z = this.uvar();
    return z % 2 === 0 ? z / 2 : -(z + 1) / 2;
  }
}

/** 8-bit bytes → 15-bit UTF-16 characters (CHAR_BASE … CHAR_BASE + 0x7FFF, never a surrogate). */
export function pack15(bytes: Uint8Array): string {
  let acc = 0;
  let bits = 0;
  const out: number[] = [];
  for (let i = 0; i < bytes.length; i++) {
    acc = (acc << 8) | bytes[i];
    bits += 8;
    if (bits >= 15) {
      bits -= 15;
      out.push(CHAR_BASE + ((acc >> bits) & 0x7fff));
      acc &= (1 << bits) - 1;
    }
  }
  if (bits > 0) out.push(CHAR_BASE + ((acc << (15 - bits)) & 0x7fff));
  let s = '';
  const CH = 0x2000;
  for (let i = 0; i < out.length; i += CH) s += String.fromCharCode(...out.slice(i, i + CH));
  return s;
}

export function unpack15(s: string, from = 0): Uint8Array {
  const out = new Uint8Array(Math.floor(((s.length - from) * 15) / 8));
  let acc = 0;
  let bits = 0;
  let o = 0;
  for (let i = from; i < s.length; i++) {
    const v = s.charCodeAt(i) - CHAR_BASE;
    if (v < 0 || v > 0x7fff) throw new Error('bad char');
    acc = ((acc << 15) | v) >>> 0;
    bits += 15;
    while (bits >= 8 && o < out.length) {
      bits -= 8;
      out[o++] = (acc >>> bits) & 255;
      acc &= (1 << bits) - 1;
    }
  }
  return out;
}

export class GhostData {
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly z: Float32Array;
  readonly yaw: Float32Array;
  readonly flags: Uint8Array;
  readonly n: number;

  constructor(n: number) {
    this.n = n;
    this.x = new Float32Array(n);
    this.y = new Float32Array(n);
    this.z = new Float32Array(n);
    this.yaw = new Float32Array(n);
    this.flags = new Uint8Array(n);
  }

  /** True for ghosts saved in the old v0.1 format (re-encode them with `reencode`). */
  static isLegacy(s: string): boolean {
    return !s.startsWith(G2);
  }

  /** Re-encode any stored ghost in the current compact format (null if it can't be read). */
  static reencode(s: string): string | null {
    const g = GhostData.decode(s);
    if (!g) return null;
    const r = new GhostRecorder(Infinity);
    for (let i = 0; i < g.n; i++) r.record(i / GHOST_HZ, g.x[i], g.y[i], g.z[i], g.yaw[i], g.flags[i]);
    return r.encode();
  }

  static decode(s: string): GhostData | null {
    try {
      return s.startsWith(G2) ? decodeG2(s) : decodeLegacy(s);
    } catch {
      return null;
    }
  }

  get duration(): number {
    return (this.n - 1) / GHOST_HZ;
  }

  /** Interpolated frame at race time t (clamped to the recording). */
  sample(t: number, out: GhostFrame): GhostFrame {
    if (this.n === 0) return out;
    const f = Math.max(0, Math.min(this.n - 1, t * GHOST_HZ));
    const i = Math.min(this.n - 2, Math.floor(f));
    if (i < 0) {
      out.x = this.x[0];
      out.y = this.y[0];
      out.z = this.z[0];
      out.yaw = this.yaw[0];
      out.flags = this.flags[0];
      return out;
    }
    const a = f - i;
    out.x = this.x[i] + (this.x[i + 1] - this.x[i]) * a;
    out.y = this.y[i] + (this.y[i + 1] - this.y[i]) * a;
    out.z = this.z[i] + (this.z[i + 1] - this.z[i]) * a;
    let dy = this.yaw[i + 1] - this.yaw[i];
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    out.yaw = this.yaw[i] + dy * a;
    out.flags = this.flags[a < 0.5 ? i : i + 1];
    return out;
  }
}

function decodeG2(s: string): GhostData | null {
  const r = new ByteReader(unpack15(s, G2.length));
  const n = r.uvar();
  if (n < 2 || n > GHOST_HZ * 60 * 30) return null; // sanity: a real run has frames, and lasts < 30 minutes
  const g = new GhostData(n);
  const chans: Array<{ arr: Float32Array; q: number }> = [
    { arr: g.x, q: POS_Q },
    { arr: g.y, q: POS_Q },
    { arr: g.z, q: POS_Q },
    { arr: g.yaw, q: YAW_Q },
  ];
  for (const { arr, q } of chans) {
    let v0 = r.svar();
    arr[0] = v0 / q;
    if (n > 1) {
      let d = r.svar();
      let v = v0 + d;
      arr[1] = v / q;
      for (let i = 2; i < n; i++) {
        d += r.svar();
        v0 = v;
        v = v0 + d;
        arr[i] = v / q;
      }
    }
  }
  let i = 0;
  while (i < n) {
    const f = r.byte();
    const run = r.uvar();
    if (run <= 0 || i + run > n) return null;
    g.flags.fill(f, i, i + run);
    i += run;
  }
  return g;
}

function decodeLegacy(s: string): GhostData | null {
  const bytes = fromBase64(s);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength < 8 || dv.getUint32(0) !== MAGIC) return null;
  const n = dv.getUint32(4);
  if (bytes.byteLength < 8 + 16 + Math.max(0, n - 1) * 8 + n) return null;
  const g = new GhostData(n);
  if (n === 0) return g;
  let qx = dv.getInt32(8);
  let qy = dv.getInt32(12);
  let qz = dv.getInt32(16);
  let qyaw = dv.getInt32(20);
  g.x[0] = qx / POS_Q;
  g.y[0] = qy / POS_Q;
  g.z[0] = qz / POS_Q;
  g.yaw[0] = qyaw / YAW_Q;
  let o = 24;
  for (let i = 1; i < n; i++) {
    qx += dv.getInt16(o);
    qy += dv.getInt16(o + 2);
    qz += dv.getInt16(o + 4);
    qyaw += dv.getInt16(o + 6);
    o += 8;
    g.x[i] = qx / POS_Q;
    g.y[i] = qy / POS_Q;
    g.z[i] = qz / POS_Q;
    g.yaw[i] = qyaw / YAW_Q;
  }
  for (let i = 0; i < n; i++) g.flags[i] = dv.getUint8(o + i);
  return g;
}

function toBase64(bytes: Uint8Array): string {
  let s = '';
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode(...bytes.subarray(i, i + CH));
  return btoa(s);
}

function fromBase64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
