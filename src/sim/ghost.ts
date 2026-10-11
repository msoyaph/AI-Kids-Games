// Ghost recording/playback for Time Trial. Samples at 15 Hz; positions are quantised to 2 cm and yaw to 1 mrad,
// stored as int16 deltas (exact reconstruction), then base64 encoded (≈ 20 KB for a 3-lap run).

export const GHOST_HZ = 15;
const POS_Q = 50;
const YAW_Q = 1000;
const MAGIC = 0x43474831; // "CGH1"

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

  /** Call every sim step with the race time. */
  record(t: number, x: number, y: number, z: number, yaw: number, flags: number): void {
    if (t + 1e-9 < this.next) return;
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

  encode(): string {
    const n = this.qx.length;
    // header: magic, n, then base frame (4 × int32), then n-1 deltas (4 × int16) + flags (n bytes)
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

  static decode(s: string): GhostData | null {
    try {
      const bytes = fromBase64(s);
      const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      if (dv.getUint32(0) !== MAGIC) return null;
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
