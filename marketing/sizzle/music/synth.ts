// A small, deterministic offline synthesizer: every sound is computed from code (no samples),
// so the same score always renders the same 48 kHz stereo audio.

export const SR = 48_000;
export const midiHz = (m: number) => 440 * 2 ** ((m - 69) / 12);

/** Seeded noise (mulberry32), so "random" textures are identical on every render. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296 * 2 - 1;
  };
}

/** RBJ biquad filter. */
export class Biquad {
  private b0 = 1; private b1 = 0; private b2 = 0; private a1 = 0; private a2 = 0;
  private x1 = 0; private x2 = 0; private y1 = 0; private y2 = 0;
  constructor(private type: 'lp' | 'hp' | 'bp', freq: number, private q = 0.707) { this.set(freq); }
  set(freq: number) {
    const w = 2 * Math.PI * Math.min(freq, SR * 0.45) / SR, cos = Math.cos(w), alpha = Math.sin(w) / (2 * this.q);
    let b0: number, b1: number, b2: number;
    if (this.type === 'lp') { b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = b0; }
    else if (this.type === 'hp') { b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = b0; }
    else { b0 = alpha; b1 = 0; b2 = -alpha; }
    const a0 = 1 + alpha;
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = -2 * cos / a0; this.a2 = (1 - alpha) / a0;
  }
  run(x: number) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

/** Band-limited saw wavetables, one per MIDI note (cached). */
const TABLE = 4096;
const saws = new Map<number, Float32Array>();
function sawTable(midi: number) {
  const key = Math.round(midi);
  let t = saws.get(key);
  if (!t) {
    t = new Float32Array(TABLE + 1);
    const n = Math.max(1, Math.min(64, Math.floor(15_000 / midiHz(key + 1))));
    for (let h = 1; h <= n; h++) {
      const amp = (h % 2 ? 1 : -1) / h * (1 - 0.6 * h / n); // gentle roll-off: warm, not buzzy
      for (let i = 0; i <= TABLE; i++) t[i] += amp * Math.sin(2 * Math.PI * h * i / TABLE);
    }
    for (let i = 0; i <= TABLE; i++) t[i] *= 0.55;
    saws.set(key, t);
  }
  return t;
}
const lookup = (t: Float32Array, phase: number) => { const p = (phase - Math.floor(phase)) * TABLE, i = p | 0, f = p - i; return t[i] + (t[i + 1] - t[i]) * f; };

/** A mono voice rendered into a buffer that the mixer places in time. */
export type Voice = Float32Array;
const buf = (seconds: number) => new Float32Array(Math.ceil(seconds * SR));

export function kick(vel = 1, punch = 1): Voice {
  const out = buf(0.42); let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR, f = 46 + 92 * Math.exp(-t * 30) * punch;
    phase += f / SR;
    out[i] = Math.sin(2 * Math.PI * phase) * Math.exp(-t * 7.5) * vel + Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t * 300) * 0.12 * vel * punch;
  }
  return out;
}

export function clap(vel = 1, seed = 1): Voice {
  const out = buf(0.3), noise = rng(seed), bp = new Biquad('bp', 1350, 1.1), hp = new Biquad('hp', 600);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let env = Math.exp(-t * 16) * 0.55;
    for (const o of [0, 0.011, 0.022]) if (t >= o) env += Math.exp(-(t - o) * 140) * 0.9;
    out[i] = hp.run(bp.run(noise())) * env * vel * 1.6;
  }
  return out;
}

export function snare(vel = 1, seed = 2): Voice {
  const out = buf(0.25), noise = rng(seed), hp = new Biquad('hp', 1800);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    out[i] = (hp.run(noise()) * Math.exp(-t * 22) * 0.7 + Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 30) * 0.5) * vel;
  }
  return out;
}

export function shaker(vel = 1, seed = 3): Voice {
  const out = buf(0.09), noise = rng(seed), hp = new Biquad('hp', 6500);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR, env = Math.min(1, t / 0.004) * Math.exp(-t * 45);
    out[i] = hp.run(noise()) * env * vel * 0.5;
  }
  return out;
}

/** Round bass: a soft saw through a low-pass, with a sine sub an octave down. */
export function bass(midi: number, seconds: number, vel = 1): Voice {
  const out = buf(seconds + 0.08), t0 = sawTable(midi), f = midiHz(midi), lp = new Biquad('lp', 520, 0.9);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR, env = Math.min(1, t / 0.006) * (t < seconds ? 0.75 + 0.25 * Math.exp(-t * 6) : Math.exp(-(t - seconds) * 60));
    phase += f / SR;
    lp.set(260 + 900 * Math.exp(-t * 9));
    out[i] = (lp.run(lookup(t0, phase)) * 0.9 + Math.sin(2 * Math.PI * phase * 0.5) * 0.55) * env * vel;
  }
  return out;
}

/** Marimba-like pluck: a few inharmonic partials with fast decays. */
export function marimba(midi: number, vel = 1): Voice {
  const out = buf(0.9), f = midiHz(midi), parts = [[1, 1, 5.5], [3.99, 0.32, 16], [10.6, 0.08, 40]];
  for (let i = 0; i < out.length; i++) {
    const t = i / SR, a = Math.min(1, t / 0.002);
    let s = 0;
    for (const [m, amp, d] of parts) s += Math.sin(2 * Math.PI * f * m * t) * amp * Math.exp(-t * d);
    out[i] = s * a * vel * 0.6;
  }
  return out;
}

/** Glockenspiel: bright metal partials and a long, soft ring. */
export function glock(midi: number, vel = 1): Voice {
  const out = buf(1.6), f = midiHz(midi), parts = [[1, 1, 2.4], [2.76, 0.42, 4.5], [5.4, 0.22, 8], [8.93, 0.09, 14]];
  for (let i = 0; i < out.length; i++) {
    const t = i / SR, a = Math.min(1, t / 0.0015);
    let s = 0;
    for (const [m, amp, d] of parts) s += Math.sin(2 * Math.PI * f * m * t) * amp * Math.exp(-t * d);
    out[i] = s * a * vel * 0.32;
  }
  return out;
}

/** Warm pad: three detuned saws per note, slow attack, low-passed. */
export function pad(notes: number[], seconds: number, vel = 1, bright = 1): Voice {
  const out = buf(seconds + 0.5), lp = new Biquad('lp', 1400 * bright, 0.7);
  const voices = notes.flatMap(m => [-7, 0, 7].map(c => ({ t: sawTable(m), f: midiHz(m) * 2 ** (c / 1200), p: (m * 0.37 + c) % 1 })));
  for (let i = 0; i < out.length; i++) {
    const t = i / SR, env = Math.min(1, t / 0.18) * (t < seconds ? 1 : Math.exp(-(t - seconds) * 9));
    let s = 0;
    for (const v of voices) { v.p += v.f / SR; s += lookup(v.t, v.p); }
    out[i] = lp.run(s) * env * vel * 0.16;
  }
  return out;
}

/** Short saw chord stab (racing colour). */
export function stab(notes: number[], vel = 1): Voice {
  const out = buf(0.3), lp = new Biquad('lp', 2600, 0.8), voices = notes.map(m => ({ t: sawTable(m), f: midiHz(m), p: 0 }));
  for (let i = 0; i < out.length; i++) {
    const t = i / SR, env = Math.min(1, t / 0.003) * Math.exp(-t * 14);
    let s = 0;
    for (const v of voices) { v.p += v.f / SR; s += lookup(v.t, v.p); }
    out[i] = lp.run(s) * env * vel * 0.3;
  }
  return out;
}

/** Ukulele-like pluck (Karplus–Strong). */
export function uke(midi: number, vel = 1, seed = 5): Voice {
  const out = buf(0.8), n = Math.round(SR / midiHz(midi)), line = new Float32Array(n), noise = rng(seed + midi);
  for (let i = 0; i < n; i++) line[i] = noise() * 0.8;
  let idx = 0, last = 0;
  const lp = new Biquad('lp', 3200);
  for (let i = 0; i < out.length; i++) {
    const cur = line[idx], next = (cur + last) * 0.5 * 0.996;
    last = cur; line[idx] = next; idx = (idx + 1) % n;
    out[i] = lp.run(cur) * vel * 0.55 * Math.min(1, i / 40);
  }
  return out;
}

/** Whistle lead (farm colour): a sine with a little vibrato and breath. */
export function whistle(midi: number, seconds: number, vel = 1, seed = 7): Voice {
  const out = buf(seconds + 0.12), f = midiHz(midi), noise = rng(seed), bp = new Biquad('bp', f * 2, 4);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR, env = Math.min(1, t / 0.035) * (t < seconds ? 1 : Math.exp(-(t - seconds) * 40));
    phase += f * (1 + 0.004 * Math.sin(2 * Math.PI * 5.5 * t) * Math.min(1, t / 0.25)) / SR;
    out[i] = (Math.sin(2 * Math.PI * phase) * 0.9 + bp.run(noise()) * 0.06) * env * vel * 0.42;
  }
  return out;
}

/** Filtered-noise swish (game changes) or riser (a sweep up over `seconds`). */
export function sweep(seconds: number, from: number, to: number, vel = 1, seed = 9, shape: 'swish' | 'rise' = 'swish'): Voice {
  const out = buf(seconds), noise = rng(seed), bp = new Biquad('bp', from, 1.4);
  for (let i = 0; i < out.length; i++) {
    const x = i / out.length;
    bp.set(from * (to / from) ** x);
    const env = shape === 'swish' ? Math.sin(Math.PI * x) ** 2 : x ** 2.2 * (1 - Math.max(0, x - 0.96) * 25);
    out[i] = bp.run(noise()) * env * vel * 0.9;
  }
  return out;
}

/** Stereo mix bus with placement, panning, a gentle compressor and a peak limiter. */
export class Mix {
  readonly L: Float32Array; readonly R: Float32Array;
  constructor(readonly seconds: number) { this.L = new Float32Array(Math.ceil(seconds * SR)); this.R = new Float32Array(this.L.length); }
  add(v: Voice, at: number, gain = 1, pan = 0) {
    const start = Math.round(at * SR), gl = gain * Math.cos((pan + 1) * Math.PI / 4) * Math.SQRT2, gr = gain * Math.sin((pan + 1) * Math.PI / 4) * Math.SQRT2;
    for (let i = 0; i < v.length; i++) { const j = start + i; if (j < 0) continue; if (j >= this.L.length) break; this.L[j] += v[i] * gl; this.R[j] += v[i] * gr; }
  }
  /** Gentle glue compressor (1.8:1 above −12 dBFS) and a 3 ms look-ahead limiter. */
  master(ceiling = 0.84) {
    const att = Math.exp(-1 / (0.02 * SR)), rel = Math.exp(-1 / (0.25 * SR)), thr = 10 ** (-12 / 20);
    let env = 0;
    for (let i = 0; i < this.L.length; i++) {
      const x = Math.max(Math.abs(this.L[i]), Math.abs(this.R[i]));
      env = x > env ? att * env + (1 - att) * x : rel * env + (1 - rel) * x;
      const g = env > thr ? (thr * (env / thr) ** (1 / 1.8)) / env : 1;
      this.L[i] *= g * 1.15; this.R[i] *= g * 1.15;
    }
    const look = Math.round(0.003 * SR), n = this.L.length, gain = new Float32Array(n).fill(1);
    for (let i = 0; i < n; i++) { const p = Math.max(Math.abs(this.L[i]), Math.abs(this.R[i])); if (p > ceiling) { const g = ceiling / p; for (let k = Math.max(0, i - look); k <= i; k++) gain[k] = Math.min(gain[k], g + (1 - g) * (i - k) / look); } }
    let smooth = 1;
    for (let i = 0; i < n; i++) { smooth = gain[i] < smooth ? gain[i] : smooth + (gain[i] - smooth) * 0.0015; this.L[i] *= smooth; this.R[i] *= smooth; }
  }
}

/** 24-bit PCM WAV. */
export function wav(L: Float32Array, R: Float32Array): Buffer {
  const n = L.length, data = Buffer.alloc(n * 6), head = Buffer.alloc(44);
  for (let i = 0; i < n; i++) for (const [c, ch] of [L, R].entries()) {
    const v = Math.max(-1, Math.min(1, ch[i])) * 8388607 | 0;
    data.writeIntLE(v, i * 6 + c * 3, 3);
  }
  head.write('RIFF', 0); head.writeUInt32LE(36 + data.length, 4); head.write('WAVE', 8); head.write('fmt ', 12);
  head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(2, 22); head.writeUInt32LE(SR, 24);
  head.writeUInt32LE(SR * 6, 28); head.writeUInt16LE(6, 32); head.writeUInt16LE(24, 34); head.write('data', 36); head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}
