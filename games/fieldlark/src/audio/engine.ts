/**
 * Sound, all synthesized with Web Audio (no audio files). One AudioContext, created on the first
 * tap or key press (browsers block sound before that), with music and effects buses into a gentle
 * limiter. Every call is guarded: if audio is missing or blocked, the game plays on silently.
 * Phase 9 adds the music and the full set of effects; this is the engine and the interface sounds.
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

/** Interface sounds. */
export const sfx = {
  tap: () => audio.tone(660, 0.07, { gain: 0.1 }),
  open: () => { audio.tone(520, 0.08, { gain: 0.1 }); audio.tone(780, 0.1, { gain: 0.08, delay: 0.05 }); },
  back: () => audio.tone(440, 0.09, { gain: 0.09, slide: 0.8 }),
  turn: () => audio.tone(380, 0.12, { type: 'sine', gain: 0.08, slide: 1.3 }),
  nope: () => audio.tone(220, 0.16, { type: 'sine', gain: 0.1, slide: 0.85 }),
  dig: () => { audio.tone(140, 0.09, { type: 'triangle', gain: 0.14, slide: 0.6 }); audio.tone(200, 0.06, { type: 'square', gain: 0.03, delay: 0.03 }); },
  plant: () => { audio.tone(520, 0.06, { gain: 0.08 }); audio.tone(690, 0.08, { gain: 0.07, delay: 0.05 }); },
  water: () => { for (let i = 0; i < 4; i++) audio.tone(900 + i * 140, 0.05, { type: 'sine', gain: 0.05, delay: i * 0.035, slide: 0.7 }); },
  clear: () => { audio.tone(330, 0.07, { gain: 0.1, slide: 1.4 }); audio.tone(495, 0.09, { gain: 0.08, delay: 0.06 }); },
  /** A happy pop, brighter for more stars. */
  harvest: (stars: number) => { const base = 523 * (1 + (stars - 1) * 0.125); audio.tone(base, 0.08, { gain: 0.12 }); audio.tone(base * 1.25, 0.08, { gain: 0.1, delay: 0.06 }); if (stars >= 2) audio.tone(base * 1.5, 0.12, { gain: 0.09, delay: 0.12 }); if (stars >= 3) audio.tone(base * 2, 0.16, { type: 'sine', gain: 0.08, delay: 0.18 }); },
  coins: () => { audio.tone(988, 0.06, { type: 'square', gain: 0.04 }); audio.tone(1319, 0.12, { type: 'square', gain: 0.04, delay: 0.06 }); },
  levelUp: () => { [523, 659, 784, 1047].forEach((f, i) => audio.tone(f, 0.18, { gain: 0.1, delay: i * 0.1 })); },
};
