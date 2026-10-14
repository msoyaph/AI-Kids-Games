/**
 * Web Audio engine (adapted from Cliff Valley): everything is synthesized, no audio files. The
 * context starts on the first touch, click or key press; if Web Audio is missing or blocked the game
 * just stays quiet. Buses: music, effects (sfx) and voice (Agentmon cries), each with its own volume,
 * into a master gain and then a limiter (DynamicsCompressor), so nothing ever gets too loud or clips.
 * The page going into the background mutes everything.
 */
export type Bus = 'music' | 'sfx' | 'voice';

export interface Volumes { master: number; music: number; sfx: number; voice: number }

export class AudioEngine {
  ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private buses: Partial<Record<Bus, GainNode>> = {};
  private noise: AudioBuffer | null = null;
  private vol: Volumes = { master: 0.8, music: 0.7, sfx: 0.8, voice: 0.8 };
  private started = false;
  private hidden = false;
  private onStart: (() => void)[] = [];

  constructor() {
    const start = () => this.start();
    addEventListener('pointerdown', start, { passive: true });
    addEventListener('keydown', start);
    document.addEventListener('visibilitychange', () => {
      this.hidden = document.visibilityState === 'hidden';
      this.apply();
    });
  }

  get ready(): boolean { return this.started && !!this.ctx; }

  whenStarted(f: () => void): void {
    if (this.started) f();
    else this.onStart.push(f);
  }

  start(): void {
    if (this.started) {
      if (this.ctx?.state === 'suspended') void this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      this.ctx = ctx;
      // master → limiter → speakers: a fast, hard compressor keeps peaks under control
      this.limiter = ctx.createDynamicsCompressor();
      this.limiter.threshold.value = -10;
      this.limiter.knee.value = 4;
      this.limiter.ratio.value = 20;
      this.limiter.attack.value = 0.003;
      this.limiter.release.value = 0.15;
      this.limiter.connect(ctx.destination);
      this.master = ctx.createGain();
      this.master.connect(this.limiter);
      for (const b of ['music', 'sfx', 'voice'] as Bus[]) {
        const g = ctx.createGain();
        g.connect(this.master);
        this.buses[b] = g;
      }
      const len = ctx.sampleRate;
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      let seed = 12345;
      for (let i = 0; i < len; i++) { seed = (seed * 1103515245 + 12345) >>> 0; d[i] = (seed / 0xffffffff) * 2 - 1; }
      this.started = true;
      this.apply();
      for (const f of this.onStart) f();
      this.onStart = [];
    } catch {
      this.ctx = null;
    }
  }

  setVolumes(v: Volumes): void {
    this.vol = { ...v };
    this.apply();
  }

  private apply(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t = ctx.currentTime;
    this.master.gain.setTargetAtTime(this.hidden ? 0 : this.vol.master, t, 0.05);
    this.buses.music?.gain.setTargetAtTime(this.vol.music * 0.32, t, 0.1);
    this.buses.sfx?.gain.setTargetAtTime(this.vol.sfx * 0.5, t, 0.05);
    this.buses.voice?.gain.setTargetAtTime(this.vol.voice * 0.45, t, 0.05);
  }

  get now(): number { return this.ctx?.currentTime ?? 0; }

  /** A gain node on a bus (for a song's own fade in and out). */
  sub(bus: Bus): GainNode | null {
    if (!this.ctx || !this.buses[bus]) return null;
    const g = this.ctx.createGain();
    g.connect(this.buses[bus]!);
    return g;
  }

  /** One enveloped oscillator note. */
  tone(o: { freq: number; dur: number; type?: OscillatorType; vol?: number; at?: number; slide?: number; attack?: number; bus?: Bus; out?: AudioNode | null; detune?: number; vibrato?: number }): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const dest = o.out ?? this.buses[o.bus ?? 'sfx'];
    if (!dest) return;
    const t = o.at ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type ?? 'square';
    osc.frequency.setValueAtTime(o.freq, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.freq * o.slide), t + o.dur);
    if (o.detune) osc.detune.setValueAtTime(o.detune, t);
    if (o.vibrato) {
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = 6;
      lg.gain.value = o.vibrato;
      lfo.connect(lg).connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + o.dur + 0.05);
    }
    const v = o.vol ?? 0.2;
    const a = o.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + 0.01, o.dur));
    osc.connect(g).connect(dest);
    osc.start(t);
    osc.stop(t + o.dur + 0.05);
  }

  /** Filtered noise burst (drums, splashes, rustles, whooshes). */
  hiss(o: { dur: number; vol?: number; at?: number; freq?: number; q?: number; type?: BiquadFilterType; bus?: Bus; out?: AudioNode | null; sweep?: number }): void {
    const ctx = this.ctx;
    if (!ctx || !this.noise) return;
    const dest = o.out ?? this.buses[o.bus ?? 'sfx'];
    if (!dest) return;
    const t = o.at ?? ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = o.type ?? 'bandpass';
    f.frequency.setValueAtTime(o.freq ?? 2000, t);
    if (o.sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, (o.freq ?? 2000) * o.sweep), t + o.dur);
    f.Q.value = o.q ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(o.vol ?? 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f).connect(g).connect(dest);
    src.start(t, (t * 0.37) % 0.5);
    src.stop(t + o.dur + 0.05);
  }
}

/** MIDI note number → frequency. */
export const note = (n: number): number => 440 * Math.pow(2, (n - 69) / 12);
