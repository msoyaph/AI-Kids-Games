// Small Web Audio instrument kit: every sound in the game is built from oscillators, noise and envelopes.

export type Wave = 'square' | 'saw' | 'triangle' | 'sine' | 'pluck' | 'bell' | 'organ';

export function midiToFreq(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

export class Synth {
  readonly noise: AudioBuffer;

  constructor(readonly ctx: BaseAudioContext) {
    const len = Math.floor(ctx.sampleRate * 1.0);
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    let seed = 12345;
    for (let i = 0; i < len; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      d[i] = (seed / 0x7fffffff) * 2 - 1;
    }
  }

  private env(g: GainNode, t: number, peak: number, attack: number, hold: number, release: number): void {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + Math.max(0.002, attack));
    g.gain.setValueAtTime(Math.max(0.0002, peak), t + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  }

  /** A pitched note. Returns the end time. */
  note(out: AudioNode, t: number, freq: number, dur: number, wave: Wave, gain: number, opts: { cutoff?: number; glide?: number; vibrato?: number; detune?: number } = {}): number {
    const ctx = this.ctx;
    const g = ctx.createGain();
    let last: AudioNode = g;
    let filter: BiquadFilterNode | null = null;
    if (opts.cutoff) {
      filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = opts.cutoff;
      filter.Q.value = 0.8;
      g.connect(filter);
      last = filter;
    }
    last.connect(out);
    const end = t + dur;
    switch (wave) {
      case 'bell': {
        // simple 2-op FM bell
        const car = ctx.createOscillator();
        const mod = ctx.createOscillator();
        const mg = ctx.createGain();
        car.frequency.value = freq;
        mod.frequency.value = freq * 3.5;
        mg.gain.setValueAtTime(freq * 2.2, t);
        mg.gain.exponentialRampToValueAtTime(freq * 0.05, t + Math.min(1.2, dur + 0.4));
        mod.connect(mg).connect(car.frequency);
        car.connect(g);
        this.env(g, t, gain, 0.004, 0.02, Math.max(0.15, dur * 1.4));
        car.start(t);
        mod.start(t);
        car.stop(end + dur * 1.5 + 0.2);
        mod.stop(end + dur * 1.5 + 0.2);
        return end;
      }
      case 'pluck': {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = freq;
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(Math.min(9000, freq * 8), t);
        f.frequency.exponentialRampToValueAtTime(Math.max(200, freq * 1.2), t + 0.25);
        o.connect(f).connect(g);
        this.env(g, t, gain, 0.003, 0.01, Math.min(0.5, dur + 0.15));
        o.start(t);
        o.stop(end + 0.4);
        return end;
      }
      case 'organ': {
        for (const [mult, amp] of [
          [1, 1],
          [2, 0.5],
          [3, 0.25],
        ] as const) {
          const o = ctx.createOscillator();
          o.type = 'sine';
          o.frequency.value = freq * mult;
          const og = ctx.createGain();
          og.gain.value = amp;
          o.connect(og).connect(g);
          o.start(t);
          o.stop(end + 0.15);
        }
        this.env(g, t, gain * 0.6, 0.01, Math.max(0, dur - 0.05), 0.08);
        return end;
      }
      default: {
        const o = ctx.createOscillator();
        o.type = wave === 'saw' ? 'sawtooth' : wave;
        o.frequency.setValueAtTime(freq, t);
        if (opts.glide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * opts.glide), end);
        if (opts.detune) o.detune.value = opts.detune;
        if (opts.vibrato) {
          const lfo = ctx.createOscillator();
          const lg = ctx.createGain();
          lfo.frequency.value = 5.5;
          lg.gain.value = freq * opts.vibrato;
          lfo.connect(lg).connect(o.frequency);
          lfo.start(t);
          lfo.stop(end + 0.2);
        }
        o.connect(g);
        const rel = wave === 'sine' || wave === 'triangle' ? 0.12 : 0.06;
        this.env(g, t, gain, 0.008, Math.max(0, dur - 0.02), rel);
        o.start(t);
        o.stop(end + rel + 0.05);
        return end;
      }
    }
  }

  /** Filtered noise burst. */
  noiseHit(out: AudioNode, t: number, dur: number, gain: number, type: BiquadFilterType, freq: number, q = 1, sweepTo?: number): void {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    src.connect(f).connect(g).connect(out);
    this.env(g, t, gain, 0.002, dur * 0.2, dur * 0.8);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  kick(out: AudioNode, t: number, gain: number): void {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    const g = ctx.createGain();
    o.connect(g).connect(out);
    this.env(g, t, gain, 0.002, 0.03, 0.18);
    o.start(t);
    o.stop(t + 0.3);
  }

  snare(out: AudioNode, t: number, gain: number): void {
    this.noiseHit(out, t, 0.16, gain * 0.8, 'bandpass', 1800, 0.7);
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
    const g = ctx.createGain();
    o.connect(g).connect(out);
    this.env(g, t, gain * 0.5, 0.002, 0.01, 0.08);
    o.start(t);
    o.stop(t + 0.15);
  }

  hat(out: AudioNode, t: number, gain: number, open = false): void {
    this.noiseHit(out, t, open ? 0.18 : 0.045, gain, 'highpass', 7500, 0.6);
  }

  clap(out: AudioNode, t: number, gain: number): void {
    for (let i = 0; i < 3; i++) this.noiseHit(out, t + i * 0.012, 0.09, gain * 0.7, 'bandpass', 1400, 1.2);
  }
}
