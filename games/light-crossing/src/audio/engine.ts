// Web Audio engine: synthesized SFX, generative music and ambience. No audio files.
import { hashInts, Rng } from '../core/rng';

type Mood = 'morning' | 'day' | 'evening' | 'night' | 'rain' | 'title' | 'festival' | 'indoor';

const NOTE = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

interface MoodDef {
  root: number;
  scale: number[];
  bpm: number;
  prog: number[][];
  pluck: OscillatorType;
  density: number;
  bright: number;
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const PENTA = [0, 2, 4, 7, 9];
const MINOR = [0, 2, 3, 5, 7, 8, 10];

const MOODS: Record<Mood, MoodDef> = {
  morning: { root: 65, scale: MAJOR, bpm: 92, prog: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [4, 7, 11]], pluck: 'triangle', density: 0.55, bright: 2600 },
  day: { root: 60, scale: MAJOR, bpm: 100, prog: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]], pluck: 'triangle', density: 0.6, bright: 3000 },
  evening: { root: 57, scale: MAJOR, bpm: 84, prog: [[5, 9, 12], [4, 7, 11], [2, 5, 9], [0, 4, 7]], pluck: 'sine', density: 0.45, bright: 1900 },
  night: { root: 63, scale: PENTA, bpm: 68, prog: [[0, 7, 16], [5, 12, 16], [-3, 4, 9], [2, 9, 14]], pluck: 'sine', density: 0.3, bright: 1400 },
  rain: { root: 62, scale: MINOR, bpm: 74, prog: [[0, 3, 7], [-4, 0, 3], [-7, -3, 0], [-2, 2, 5]], pluck: 'sine', density: 0.35, bright: 1500 },
  title: { root: 62, scale: MAJOR, bpm: 80, prog: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]], pluck: 'triangle', density: 0.45, bright: 2200 },
  festival: { root: 64, scale: MAJOR, bpm: 96, prog: [[0, 4, 7], [5, 9, 12], [9, 12, 16], [7, 11, 14]], pluck: 'triangle', density: 0.7, bright: 3200 },
  indoor: { root: 58, scale: MAJOR, bpm: 88, prog: [[0, 4, 7], [5, 9, 12], [2, 5, 9], [7, 11, 14]], pluck: 'sine', density: 0.5, bright: 1800 },
};

export class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private ambBus!: GainNode;
  private noise!: AudioBuffer;
  private mood: Mood = 'title';
  private nextBeat = 0;
  private beat = 0;
  private rng = new Rng(7);
  private motif: number[] = [];
  private rainGain: GainNode | null = null;
  private waveGain: GainNode | null = null;
  private volumes = { master: 0.8, music: 0.6, sfx: 0.8 };
  enabled = true;

  /** Must be called from a user gesture (autoplay policies). */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state !== 'running' && !this.hiddenPause) {
        void this.ctx.resume().catch(() => {});
        this.kick();
      }
      return;
    }
    try {
      const AC = (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) as typeof AudioContext | undefined;
      if (!AC) return;
      this.ctx = new AC();
      const c = this.ctx;
      this.master = c.createGain();
      this.master.connect(c.destination);
      this.musicBus = c.createGain();
      this.sfxBus = c.createGain();
      this.ambBus = c.createGain();
      // gentle reverb-ish echo on music
      const delay = c.createDelay(1);
      delay.delayTime.value = 0.33;
      const fb = c.createGain();
      fb.gain.value = 0.22;
      const wet = c.createGain();
      wet.gain.value = 0.25;
      this.musicBus.connect(this.master);
      this.musicBus.connect(delay);
      delay.connect(fb);
      fb.connect(delay);
      delay.connect(wet);
      wet.connect(this.master);
      this.sfxBus.connect(this.master);
      this.ambBus.connect(this.master);
      const len = c.sampleRate * 2;
      this.noise = c.createBuffer(1, len, c.sampleRate);
      const d = this.noise.getChannelData(0);
      let b = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b = 0.97 * b + 0.03 * w;
        d[i] = w * 0.6 + b * 2.2;
      }
      this.applyVolumes();
      this.startAmbience();
      this.nextBeat = c.currentTime + 0.2;
      this.kick();
    } catch {
      this.ctx = null;
    }
  }

  /** iOS only starts audio for real once something plays inside the tap: a silent click. */
  private kick(): void {
    try {
      const c = this.ctx!;
      const src = c.createBufferSource();
      src.buffer = c.createBuffer(1, 1, c.sampleRate);
      src.connect(c.destination);
      src.start(0);
    } catch {
      /* ignore */
    }
  }

  /** the page went to the background: stay quiet until it's back */
  private hiddenPause = false;
  setHidden(hidden: boolean): void {
    this.hiddenPause = hidden;
    if (!this.ctx) return;
    if (hidden) void this.ctx.suspend().catch(() => {});
    else void this.ctx.resume().catch(() => {});
  }

  setVolumes(master: number, music: number, sfx: number): void {
    this.volumes = { master, music, sfx };
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.volumes.master, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.volumes.music * 0.32, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.volumes.sfx * 0.7, t, 0.05);
    this.ambBus.gain.setTargetAtTime(this.volumes.sfx * 0.5, t, 0.05);
  }

  setMood(m: Mood): void {
    if (m === this.mood) return;
    this.mood = m;
    this.motif = [];
  }

  // ---------------------------------------------------------------- primitives

  private tone(freq: number, dur: number, opts: { type?: OscillatorType; vol?: number; attack?: number; at?: number; bus?: AudioNode; slide?: number; filter?: number; detune?: number } = {}): void {
    const c = this.ctx;
    if (!c) return;
    const t = opts.at ?? c.currentTime;
    const o = c.createOscillator();
    o.type = opts.type ?? 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * opts.slide), t + dur);
    if (opts.detune) o.detune.value = opts.detune;
    const g = c.createGain();
    const a = opts.attack ?? 0.005;
    const v = opts.vol ?? 0.3;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node: AudioNode = o;
    if (opts.filter) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = opts.filter;
      o.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(opts.bus ?? this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private burst(dur: number, opts: { freq?: number; q?: number; type?: BiquadFilterType; vol?: number; at?: number; sweep?: number; bus?: AudioNode } = {}): void {
    const c = this.ctx;
    if (!c) return;
    const t = opts.at ?? c.currentTime;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = opts.type ?? 'bandpass';
    f.frequency.setValueAtTime(opts.freq ?? 1000, t);
    if (opts.sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, (opts.freq ?? 1000) * opts.sweep), t + dur);
    f.Q.value = opts.q ?? 1;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(opts.vol ?? 0.3, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(opts.bus ?? this.sfxBus);
    s.start(t, Math.random() * 1.5);
    s.stop(t + dur + 0.05);
  }

  private arp(notes: number[], step: number, type: OscillatorType = 'triangle', vol = 0.18): void {
    const c = this.ctx;
    if (!c) return;
    notes.forEach((n, i) => this.tone(NOTE(n), 0.35, { type, vol, at: c.currentTime + i * step }));
  }

  // ---------------------------------------------------------------- SFX

  play(name: string, opts: { vol?: number; pitch?: number } = {}): void {
    if (!this.ctx || !this.enabled) return;
    const p = opts.pitch ?? 1;
    const v = opts.vol ?? 1;
    switch (name) {
      case 'step':
        return this.burst(0.07, { freq: 900 * p, q: 0.7, type: 'lowpass', vol: 0.09 * v });
      case 'stepSand':
        return this.burst(0.09, { freq: 2200 * p, q: 0.6, type: 'bandpass', vol: 0.08 * v });
      case 'stepWood':
        return this.tone(220 * p, 0.06, { type: 'triangle', vol: 0.1 * v, slide: 0.7 });
      case 'pickup':
        this.tone(880, 0.12, { type: 'triangle', vol: 0.2 });
        return this.tone(1320, 0.18, { type: 'triangle', vol: 0.18, at: this.ctx.currentTime + 0.07 });
      case 'equip':
      case 'tick':
        return this.tone(1600, 0.04, { type: 'square', vol: 0.05, filter: 3000 });
      case 'select':
        return this.tone(1200, 0.08, { type: 'triangle', vol: 0.12, slide: 1.3 });
      case 'back':
        return this.tone(700, 0.08, { type: 'triangle', vol: 0.1, slide: 0.7 });
      case 'chop':
        this.burst(0.12, { freq: 500, q: 2, vol: 0.4 });
        return this.tone(180, 0.15, { type: 'triangle', vol: 0.25, slide: 0.5 });
      case 'thunk':
        return this.tone(140, 0.12, { type: 'triangle', vol: 0.2, slide: 0.6 });
      case 'rock':
        this.tone(1800, 0.12, { type: 'triangle', vol: 0.18, slide: 0.9 });
        return this.burst(0.1, { freq: 3000, q: 3, vol: 0.25 });
      case 'clink':
        return this.tone(2200, 0.1, { type: 'triangle', vol: 0.12 });
      case 'dig':
        return this.burst(0.25, { freq: 700, q: 1.2, vol: 0.3, sweep: 0.5 });
      case 'pluck':
        return this.tone(500, 0.08, { type: 'sine', vol: 0.2, slide: 1.8 });
      case 'rustle':
        return this.burst(0.45, { freq: 3500, q: 0.8, vol: 0.18, sweep: 0.6 });
      case 'water':
        return this.burst(0.6, { freq: 4000, q: 0.5, type: 'highpass', vol: 0.12 });
      case 'cast':
        return this.burst(0.35, { freq: 1500, q: 2, vol: 0.2, sweep: 2.5 });
      case 'plop':
        return this.tone(600 * p, 0.12, { type: 'sine', vol: 0.25 * v, slide: 0.4 });
      case 'nibble':
        return this.tone(900, 0.05, { type: 'sine', vol: 0.12, slide: 0.6 });
      case 'bite':
        this.tone(420, 0.25, { type: 'sine', vol: 0.4, slide: 0.35 });
        return this.burst(0.25, { freq: 1200, q: 1, vol: 0.3 });
      case 'hook':
        return this.tone(500, 0.15, { type: 'sawtooth', vol: 0.08, slide: 3, filter: 2400 });
      case 'reelIn':
        return this.tone(1000, 0.05, { type: 'square', vol: 0.04, filter: 2000 });
      case 'splash':
        return this.burst(0.5, { freq: 1800, q: 0.6, vol: 0.3, sweep: 0.4 });
      case 'swish':
        return this.burst(0.25, { freq: 800, q: 1.5, vol: 0.25, sweep: 3 });
      case 'fanfare':
        return this.arp([72, 76, 79, 84], 0.08, 'triangle', 0.18);
      case 'fanfareBig':
        this.arp([72, 76, 79, 84, 88, 91], 0.07, 'triangle', 0.18);
        return this.arp([96, 100, 103], 0.05, 'sine', 0.08);
      case 'coins':
        this.tone(2093, 0.12, { type: 'triangle', vol: 0.12 });
        return this.tone(2637, 0.2, { type: 'triangle', vol: 0.12, at: this.ctx.currentTime + 0.08 });
      case 'craft':
        for (let k = 0; k < 3; k++) this.tone(320 + k * 40, 0.08, { type: 'triangle', vol: 0.2, at: this.ctx.currentTime + k * 0.14, slide: 0.6 });
        return this.arp([79, 84], 0.1, 'sine', 0.12);
      case 'learn':
      case 'achievement':
      case 'challenge':
        return this.arp([84, 88, 91, 96], 0.06, 'sine', 0.14);
      case 'quest':
        return this.arp([67, 72, 76, 79, 84], 0.09, 'triangle', 0.16);
      case 'donate':
      case 'deliver':
        return this.arp([76, 79, 84], 0.08, 'triangle', 0.14);
      case 'heart':
        this.tone(988, 0.15, { type: 'sine', vol: 0.15 });
        return this.tone(1319, 0.25, { type: 'sine', vol: 0.15, at: this.ctx.currentTime + 0.12 });
      case 'error':
        return this.tone(160, 0.18, { type: 'square', vol: 0.06, filter: 900 });
      case 'door':
        return this.burst(0.3, { freq: 400, q: 4, vol: 0.15, sweep: 1.6 });
      case 'knock':
        this.tone(200, 0.06, { type: 'triangle', vol: 0.3 });
        return this.tone(200, 0.06, { type: 'triangle', vol: 0.3, at: this.ctx.currentTime + 0.14 });
      case 'climb':
        for (let k = 0; k < 4; k++) this.tone(300 + k * 60, 0.05, { type: 'triangle', vol: 0.12, at: this.ctx.currentTime + k * 0.18 });
        return;
      case 'place':
      case 'drop':
        return this.tone(260, 0.12, { type: 'triangle', vol: 0.2, slide: 0.7 });
      case 'build':
        return this.arp([60, 64, 67, 72], 0.1, 'triangle', 0.16);
      case 'whistle':
        return this.tone(1800, 0.5, { type: 'sine', vol: 0.15, slide: 1.1 });
      case 'break':
        this.burst(0.2, { freq: 2500, q: 2, vol: 0.3 });
        return this.tone(400, 0.25, { type: 'square', vol: 0.06, slide: 0.4, filter: 1600 });
      default:
        return;
    }
  }

  /** Dialogue voice blip. */
  blip(voice: number): void {
    if (!this.ctx) return;
    const base = 330 * voice;
    this.tone(base * (0.9 + Math.random() * 0.25), 0.05, { type: 'triangle', vol: 0.06, filter: 2500 });
  }

  // ---------------------------------------------------------------- ambience

  private startAmbience(): void {
    const c = this.ctx!;
    const mk = (freq: number, type: BiquadFilterType) => {
      const s = c.createBufferSource();
      s.buffer = this.noise;
      s.loop = true;
      const f = c.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      const g = c.createGain();
      g.gain.value = 0;
      s.connect(f);
      f.connect(g);
      g.connect(this.ambBus);
      s.start();
      return { s, g };
    };
    const rain = mk(5000, 'highpass');
    this.rainGain = rain.g;
    const waves = mk(500, 'lowpass');
    this.waveGain = waves.g;
  }

  setAmbience(rain: boolean, seaNear: number, night: number, t: number): void {
    const c = this.ctx;
    if (!c || !this.rainGain || !this.waveGain) return;
    this.rainGain.gain.setTargetAtTime(rain ? 0.22 : 0, c.currentTime, 0.5);
    const swell = 0.5 + 0.5 * Math.sin(t * 0.6);
    this.waveGain.gain.setTargetAtTime(seaNear * (0.15 + swell * 0.18), c.currentTime, 0.3);
    // occasional critters: birds by day, crickets at night
    if (Math.random() < 0.012) {
      if (night > 0.6) {
        for (let k = 0; k < 3; k++) this.tone(4200, 0.03, { type: 'sine', vol: 0.025, at: c.currentTime + k * 0.07, bus: this.ambBus });
      } else if (!rain) {
        const f = 2400 + Math.random() * 1500;
        this.tone(f, 0.12, { type: 'sine', vol: 0.03, slide: 1.4, bus: this.ambBus });
        this.tone(f * 1.2, 0.1, { type: 'sine', vol: 0.025, slide: 0.8, at: c.currentTime + 0.14, bus: this.ambBus });
      }
    }
  }

  // ---------------------------------------------------------------- music

  /** Schedule music a little ahead of time; call every frame. */
  update(): void {
    const c = this.ctx;
    if (!c || c.state !== 'running') return;
    const m = MOODS[this.mood];
    const spb = 60 / m.bpm / 2; // eighth notes
    if (this.nextBeat < c.currentTime - 0.5) this.nextBeat = c.currentTime + 0.05;
    while (this.nextBeat < c.currentTime + 0.2) {
      this.scheduleStep(this.beat, this.nextBeat, m, spb);
      this.beat++;
      this.nextBeat += spb;
    }
  }

  private scheduleStep(step: number, t: number, m: MoodDef, spb: number): void {
    const bar = Math.floor(step / 8) % m.prog.length;
    const inBar = step % 8;
    const chord = m.prog[bar]!;
    if (inBar === 0) {
      // soft pad
      for (const n of chord) this.tone(NOTE(m.root - 12 + n), spb * 8.2, { type: 'triangle', vol: 0.05, attack: 0.4, at: t, bus: this.musicBus, filter: 1200, detune: (Math.random() - 0.5) * 8 });
      // bass
      this.tone(NOTE(m.root - 24 + chord[0]!), spb * 3.5, { type: 'sine', vol: 0.12, attack: 0.02, at: t, bus: this.musicBus });
    }
    if (inBar === 4) this.tone(NOTE(m.root - 24 + chord[0]! + 7), spb * 3, { type: 'sine', vol: 0.08, at: t, bus: this.musicBus });
    // melody: a 2-bar motif, repeated with small variations
    if (!this.motif.length) {
      const r = new Rng(hashInts(this.beat, m.root, m.bpm));
      let deg = r.int(2, 5);
      for (let k = 0; k < 16; k++) {
        if (r.chance(m.density)) {
          deg = Math.max(0, Math.min(m.scale.length * 2 - 1, deg + r.pick([-2, -1, -1, 0, 1, 1, 2])));
          this.motif.push(deg);
        } else this.motif.push(-1);
      }
    }
    const phrase = Math.floor(step / 16) % 4;
    let deg = this.motif[step % 16]!;
    if (deg >= 0) {
      if (phrase === 3 && this.rng.chance(0.4)) deg = Math.max(0, deg + this.rng.pick([-1, 1, 2]));
      const oct = Math.floor(deg / m.scale.length);
      const midi = m.root + 12 + m.scale[deg % m.scale.length]! + oct * 12;
      // keep melody consonant-ish with the chord on strong beats
      const fit = inBar % 4 === 0 ? this.nearestChordTone(midi, m.root + 12, chord) : midi;
      this.tone(NOTE(fit), spb * 1.8, { type: m.pluck, vol: 0.09, attack: 0.008, at: t, bus: this.musicBus, filter: m.bright });
      if (this.rng.chance(0.18)) this.tone(NOTE(fit + 12), spb * 0.9, { type: 'sine', vol: 0.03, at: t + spb * 0.5, bus: this.musicBus });
    }
    if (step % 64 === 63) this.motif = [];
  }

  private nearestChordTone(midi: number, base: number, chord: number[]): number {
    let best = midi;
    let bd = 99;
    for (const n of chord)
      for (const o of [-12, 0, 12, 24]) {
        const c = base + n + o;
        const d = Math.abs(c - midi);
        if (d < bd) {
          bd = d;
          best = c;
        }
      }
    return best;
  }
}
