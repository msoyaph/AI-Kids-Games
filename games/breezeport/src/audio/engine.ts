// Adapted from games/fieldlark/src/audio/engine.ts (the shared engine): the same AudioContext, buses,
// limiter and tones; the town's own sounds below.
/**
 * Sound, all synthesized with Web Audio (no audio files). One AudioContext, created on the first
 * tap or key press (browsers block sound before that), with music and effects buses into a gentle
 * limiter. Every call is guarded: if audio is missing or blocked, the game plays on silently.
 * The music lives in music.ts; this is the engine and the town's sounds.
 */

type Bus = 'music' | 'sfx';

class AudioEngine {
  ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buses: Partial<Record<Bus, GainNode>> = {};
  private volumes = { master: 0.8, music: 0.6, sfx: 0.8 };
  private hidden = false;

  /** Start (or resume) audio. Call from a user gesture. */
  unlock() {
    try {
      if (!this.ctx) {
        const Ctor = globalThis.AudioContext ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
        const limiter = this.ctx.createDynamicsCompressor();
        limiter.threshold.value = -10;
        limiter.knee.value = 6;
        limiter.ratio.value = 8;
        limiter.attack.value = 0.003;
        limiter.release.value = 0.2;
        limiter.connect(this.ctx.destination);
        this.master = this.ctx.createGain();
        this.master.connect(limiter);
        for (const b of ['music', 'sfx'] as Bus[]) { const g = this.ctx.createGain(); g.connect(this.master); this.buses[b] = g; }
        this.applyVolumes();
        // iOS: a silent buffer started inside the gesture wakes the output
        const silent = this.ctx.createBuffer(1, 1, 22050);
        const src = this.ctx.createBufferSource();
        src.buffer = silent; src.connect(this.ctx.destination); src.start(0);
      }
      if (this.ctx.state === 'suspended' && !this.hidden) void this.ctx.resume().catch(() => undefined);
    } catch { this.ctx = null; }
  }

  setVolumes(v: { master: number; music: number; sfx: number }) {
    this.volumes = { ...v };
    this.applyVolumes();
  }

  private applyVolumes() {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.volumes.master, now, 0.05);
    this.buses.music?.gain.setTargetAtTime(this.volumes.music * 0.5, now, 0.05);
    this.buses.sfx?.gain.setTargetAtTime(this.volumes.sfx, now, 0.05);
  }

  /** Quiet everything while the page is hidden. */
  setHidden(hidden: boolean) {
    this.hidden = hidden;
    try {
      if (!this.ctx) return;
      if (hidden) void this.ctx.suspend().catch(() => undefined);
      else void this.ctx.resume().catch(() => undefined);
    } catch { /* ignore */ }
  }

  get state() { return this.ctx ? this.ctx.state : 'off'; }

  bus(b: Bus): GainNode | null { return this.buses[b] ?? null; }

  /** A burst of soft noise (a swish, a splash, the wind): filtered white noise. */
  noise(dur: number, opts: { gain?: number; freq?: number; q?: number; delay?: number; bus?: Bus; sweep?: number } = {}) {
    const ctx = this.ctx, out = this.bus(opts.bus ?? 'sfx');
    if (!ctx || !out || ctx.state !== 'running') return;
    try {
      const t0 = ctx.currentTime + (opts.delay ?? 0);
      const n = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = buf.getChannelData(0);
      let s = 12345;
      for (let i = 0; i < n; i++) { s = (s * 1103515245 + 12345) >>> 0; d[i] = (s / 4294967296) * 2 - 1; }
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = buf;
      f.type = 'bandpass';
      f.frequency.setValueAtTime(opts.freq ?? 1200, t0);
      if (opts.sweep) f.frequency.exponentialRampToValueAtTime(Math.max(60, (opts.freq ?? 1200) * opts.sweep), t0 + dur);
      f.Q.value = opts.q ?? 0.8;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.08, t0 + Math.min(0.04, dur / 3));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(f); f.connect(g); g.connect(out);
      src.start(t0); src.stop(t0 + dur + 0.02);
    } catch { /* ignore */ }
  }

  /** A short tone: the building block of the interface sounds. */
  tone(freq: number, dur: number, opts: { type?: OscillatorType; gain?: number; slide?: number; delay?: number; bus?: Bus } = {}) {
    const ctx = this.ctx, out = this.bus(opts.bus ?? 'sfx');
    if (!ctx || !out || ctx.state !== 'running') return;
    try {
      const t0 = ctx.currentTime + (opts.delay ?? 0);
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = opts.type ?? 'triangle';
      o.frequency.setValueAtTime(freq, t0);
      if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * opts.slide), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.18, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(out);
      o.start(t0); o.stop(t0 + dur + 0.02);
    } catch { /* ignore */ }
  }
}

export const audio = new AudioEngine();

/** The town's sounds: friendly, short, never loud or sudden. */
export const sfx = {
  tap: () => audio.tone(660, 0.07, { gain: 0.1 }),
  open: () => { audio.tone(520, 0.08, { gain: 0.1 }); audio.tone(780, 0.1, { gain: 0.08, delay: 0.05 }); },
  back: () => audio.tone(440, 0.09, { gain: 0.09, slide: 0.8 }),
  turn: () => audio.tone(380, 0.12, { type: 'sine', gain: 0.08, slide: 1.3 }),
  nope: () => audio.tone(220, 0.16, { type: 'sine', gain: 0.1, slide: 0.85 }),
  /** A road laid: a soft thunk and the hiss of fresh asphalt. */
  road: () => { audio.tone(110, 0.12, { type: 'triangle', gain: 0.14, slide: 0.7 }); audio.noise(0.22, { gain: 0.05, freq: 2400, delay: 0.04, sweep: 0.5 }); },
  /** Zones painted: a bright brush swish. */
  zone: () => { audio.noise(0.18, { gain: 0.06, freq: 900, sweep: 2.4 }); audio.tone(620, 0.08, { type: 'sine', gain: 0.05, delay: 0.08 }); },
  /** Something placed: a wooden knock and a chime. */
  place: () => { audio.tone(196, 0.08, { type: 'square', gain: 0.05 }); audio.tone(784, 0.14, { type: 'sine', gain: 0.07, delay: 0.06 }); },
  /** A building finishes growing: a little fanfare pop. */
  built: () => { audio.tone(523, 0.07, { gain: 0.09 }); audio.tone(659, 0.07, { gain: 0.08, delay: 0.06 }); audio.tone(784, 0.14, { gain: 0.08, delay: 0.12 }); },
  /** A building levels up: a rising sparkle. */
  levelUp: () => { [523, 659, 784, 1047].forEach((f, i) => audio.tone(f, 0.16, { gain: 0.09, delay: i * 0.08 })); audio.noise(0.4, { gain: 0.03, freq: 6000, delay: 0.3 }); },
  /** Coins collected: brighter for a bigger bubble. */
  coins: (big = false) => { audio.tone(988, 0.06, { type: 'square', gain: 0.04 }); audio.tone(1319, 0.12, { type: 'square', gain: 0.04, delay: 0.06 }); if (big) audio.tone(1760, 0.16, { type: 'square', gain: 0.03, delay: 0.12 }); },
  /** The bus's friendly two-note horn. */
  bus: () => { audio.tone(392, 0.16, { type: 'square', gain: 0.03 }); audio.tone(330, 0.2, { type: 'square', gain: 0.03, delay: 0.18 }); },
  /** The ferry's horn: two soft, low toots. */
  ferry: () => { audio.tone(174, 0.45, { type: 'sawtooth', gain: 0.04 }); audio.tone(174, 0.6, { type: 'sawtooth', gain: 0.04, delay: 0.55 }); audio.tone(131, 0.6, { type: 'sine', gain: 0.05, delay: 0.55 }); },
  /** The tram's bell. */
  tram: () => { audio.tone(1568, 0.3, { type: 'sine', gain: 0.05 }); audio.tone(1568, 0.3, { type: 'sine', gain: 0.04, delay: 0.22 }); },
  /** A gull far off over the bay. */
  gull: () => { audio.tone(1400, 0.18, { type: 'sine', gain: 0.025, slide: 0.7 }); audio.tone(1300, 0.22, { type: 'sine', gain: 0.02, delay: 0.24, slide: 0.65 }); },
  /** Waves on the beach. */
  waves: () => audio.noise(1.6, { gain: 0.025, freq: 500, q: 0.4, sweep: 0.6 }),
  /** A chapter or a goal done: a cheerful run. */
  cheer: () => { [392, 523, 659, 784, 1047].forEach((f, i) => audio.tone(f, 0.2, { gain: 0.09, delay: i * 0.09 })); },
};
