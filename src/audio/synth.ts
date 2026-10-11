/**
 * Synth voices shared by music and sound effects. Every sound is built from
 * oscillators, filtered noise and envelopes — there are no audio files.
 * A Synth can target a live AudioContext or an OfflineAudioContext (the mixing
 * script renders through the same code it measures).
 */

/** Note helper: MIDI number → Hz. */
export const mtof = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

export function makeNoise(ctx: BaseAudioContext): AudioBuffer {
  const len = ctx.sampleRate;
  const b = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = b.getChannelData(0);
  // deterministic noise (same render every time, which keeps mix measurements stable)
  let s = 0x9e3779b9;
  for (let i = 0; i < len; i++) {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    d[i] = ((s >>> 0) / 4294967296) * 2 - 1;
  }
  return b;
}

export class Synth {
  /** Live voice count (sound effects stop adding voices past a cap). */
  voices = 0;

  constructor(
    readonly ctx: BaseAudioContext,
    readonly noise: AudioBuffer,
  ) {}

  private track(node: AudioScheduledSourceNode): void {
    this.voices++;
    node.onended = () => {
      this.voices--;
    };
  }

  private env(g: GainNode, t: number, vol: number, attack: number, dur: number, release: number): void {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + Math.max(0.002, attack));
    g.gain.setValueAtTime(Math.max(0.0002, vol), t + Math.max(attack, dur));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + release);
  }

  /** Oscillator with pitch sweep and a quick envelope. `wobble` adds vibrato (Hz). */
  osc(out: AudioNode, type: OscillatorType, f0: number, f1: number, t: number, dur: number, vol: number, wobble = 0): void {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    if (wobble) {
      const lfo = c.createOscillator();
      const lg = c.createGain();
      lfo.frequency.value = wobble;
      lg.gain.value = f0 * 0.08;
      lfo.connect(lg).connect(o.frequency);
      lfo.start(t);
      lfo.stop(t + dur + 0.05);
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.02);
    this.track(o);
  }

  /** Filtered noise burst. */
  burst(out: AudioNode, t: number, dur: number, freq: number, vol: number, type: BiquadFilterType, sweepTo?: number): void {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(out);
    s.start(t, (t * 7.31) % 0.6);
    s.stop(t + dur + 0.02);
    this.track(s);
  }

  /** Quick arpeggio of notes. */
  notes(out: AudioNode, midis: number[], t: number, step: number, type: OscillatorType, vol: number): void {
    midis.forEach((m, i) => this.osc(out, type, mtof(m), mtof(m), t + i * step, step * 1.6, vol));
  }

  // ---------------------------------------------------------------- music voices

  /** Detuned saw "string section" through a soft low-pass. */
  strings(out: AudioNode, midi: number, t: number, dur: number, vol: number, bright = 1800): void {
    const c = this.ctx;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = bright;
    f.Q.value = 0.6;
    const g = c.createGain();
    this.env(g, t, vol, 0.12, dur, 0.35);
    f.connect(g).connect(out);
    for (const det of [-7, 6]) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = mtof(midi);
      o.detune.value = det;
      o.connect(f);
      o.start(t);
      o.stop(t + dur + 0.4);
      this.track(o);
    }
  }

  /** Brass stab: saw + square with a filter that opens on the attack. */
  brass(out: AudioNode, midi: number, t: number, dur: number, vol: number): void {
    const c = this.ctx;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 2;
    f.frequency.setValueAtTime(500, t);
    f.frequency.exponentialRampToValueAtTime(2600, t + 0.05);
    f.frequency.exponentialRampToValueAtTime(900, t + dur);
    const g = c.createGain();
    this.env(g, t, vol, 0.02, dur, 0.12);
    f.connect(g).connect(out);
    for (const [type, det] of [
      ['sawtooth', 0],
      ['square', 4],
    ] as const) {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = mtof(midi);
      o.detune.value = det;
      o.connect(f);
      o.start(t);
      o.stop(t + dur + 0.15);
      this.track(o);
    }
  }

  /** Pulse arp / pluck. */
  pluck(out: AudioNode, midi: number, t: number, dur: number, vol: number, type: OscillatorType = 'square'): void {
    const c = this.ctx;
    const o = c.createOscillator();
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(3200, t);
    f.frequency.exponentialRampToValueAtTime(700, t + dur);
    const g = c.createGain();
    this.env(g, t, vol, 0.004, dur * 0.4, dur * 0.6);
    o.type = type;
    o.frequency.value = mtof(midi);
    o.connect(f).connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
    this.track(o);
  }

  /** Low saw bass through a resonant low-pass. */
  bass(out: AudioNode, midi: number, t: number, dur: number, vol: number): void {
    const c = this.ctx;
    const o = c.createOscillator();
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 420;
    f.Q.value = 3;
    const g = c.createGain();
    this.env(g, t, vol, 0.006, dur * 0.7, 0.08);
    o.type = 'sawtooth';
    o.frequency.value = mtof(midi);
    o.connect(f).connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.1);
    this.track(o);
  }

  /** Taiko: deep pitched body + a breathy skin. */
  taiko(out: AudioNode, t: number, vol: number, pitch = 72): void {
    this.osc(out, 'sine', pitch * 1.9, pitch * 0.62, t, 0.42, vol);
    this.burst(out, t, 0.14, 380, vol * 0.45, 'lowpass');
  }

  tom(out: AudioNode, t: number, vol: number, pitch = 140): void {
    this.osc(out, 'sine', pitch * 1.6, pitch * 0.8, t, 0.22, vol);
  }

  snare(out: AudioNode, t: number, vol: number): void {
    this.burst(out, t, 0.16, 1900, vol, 'bandpass');
    this.osc(out, 'triangle', 240, 170, t, 0.08, vol * 0.5);
  }

  hat(out: AudioNode, t: number, vol: number): void {
    this.burst(out, t, 0.045, 7500, vol, 'highpass');
  }

  /** FM bell (frost & sky tracks). */
  bell(out: AudioNode, midi: number, t: number, vol: number): void {
    const c = this.ctx;
    const freq = mtof(midi);
    const o = c.createOscillator();
    const m = c.createOscillator();
    const mg = c.createGain();
    const g = c.createGain();
    o.type = 'sine';
    m.type = 'sine';
    o.frequency.value = freq;
    m.frequency.value = freq * 3.5;
    mg.gain.value = freq * 0.6;
    m.connect(mg).connect(o.frequency);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    o.connect(g).connect(out);
    o.start(t);
    m.start(t);
    o.stop(t + 1.45);
    m.stop(t + 1.45);
    this.track(o);
  }

  /** Rising noise swell (into a section change). */
  swell(out: AudioNode, t: number, dur: number, vol: number): void {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.2;
    f.frequency.setValueAtTime(400, t);
    f.frequency.exponentialRampToValueAtTime(5000, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
    s.connect(f).connect(g).connect(out);
    s.start(t);
    s.stop(t + dur + 0.1);
    this.track(s);
  }
}

/**
 * Master chain: glue compressor → limiter → soft-clip ceiling → destination.
 * Web Audio compressors add automatic makeup gain, so the limiter alone can
 * overshoot 0 dBFS in a busy fight; the final waveshaper is a hard guarantee
 * (transparent below −1.4 dBFS, never above −0.2 dBFS).
 * Returns the input node everything should connect to.
 */
export function masterChain(ctx: BaseAudioContext, gain = 1.15, dest: AudioNode = ctx.destination): GainNode {
  const master = ctx.createGain();
  master.gain.value = gain;
  const glue = ctx.createDynamicsCompressor();
  glue.threshold.value = -18;
  glue.ratio.value = 3;
  glue.attack.value = 0.01;
  glue.release.value = 0.2;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -4;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.12;
  // the shaper sees x/2 so inputs up to +6 dBFS land on the curve, not its clamped ends
  const pre = ctx.createGain();
  pre.gain.value = 0.5;
  const clip = ctx.createWaveShaper();
  clip.curve = softClipCurve();
  clip.oversample = 'none'; // oversampling filters ring past the ceiling
  master.connect(glue).connect(limiter).connect(pre).connect(clip).connect(dest);
  return master;
}

/** Linear to 0.85, then a tanh knee that never passes 0.98. */
export function softClip(x: number): number {
  const a = Math.abs(x);
  if (a <= 0.85) return x;
  return Math.sign(x) * (0.85 + 0.13 * Math.tanh((a - 0.85) / 0.13));
}

function softClipCurve(): Float32Array<ArrayBuffer> {
  const n = 2049;
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) c[i] = softClip(((i / (n - 1)) * 2 - 1) * 2);
  return c;
}
