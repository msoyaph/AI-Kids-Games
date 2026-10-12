export type MusicMood = 'off' | 'menu' | 'run' | 'boss';

interface Song {
  bpm: number;
  /** Chord tones (MIDI) per bar. */
  chords: number[][];
  bass: number[];
  kick: number[];
  snare: number[];
  bassWave: OscillatorType;
  leadWave: OscillatorType;
  scale: number[];
}

const SONGS: Record<Exclude<MusicMood, 'off'>, Song> = {
  menu: {
    bpm: 84,
    chords: [
      [65, 69, 72, 76],
      [64, 67, 71, 74],
      [62, 65, 69, 72],
      [60, 64, 67, 71],
    ],
    bass: [0, 10],
    kick: [],
    snare: [],
    bassWave: 'triangle',
    leadWave: 'sine',
    scale: [60, 62, 64, 67, 69, 72, 74, 76],
  },
  run: {
    bpm: 116,
    chords: [
      [57, 60, 64],
      [53, 57, 60],
      [60, 64, 67],
      [55, 59, 62],
    ],
    bass: [0, 3, 6, 8, 11, 14],
    kick: [0, 8],
    snare: [4, 12],
    bassWave: 'sawtooth',
    leadWave: 'triangle',
    scale: [69, 72, 74, 76, 79, 81, 84],
  },
  boss: {
    bpm: 132,
    chords: [
      [62, 65, 69],
      [58, 62, 65],
      [55, 58, 62],
      [57, 61, 64],
    ],
    bass: [0, 2, 3, 6, 8, 10, 11, 14],
    kick: [0, 4, 8, 12],
    snare: [4, 12],
    bassWave: 'sawtooth',
    leadWave: 'square',
    scale: [62, 65, 67, 69, 72, 74, 77],
  },
};

const freq = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);
const LEAD_STEPS = [0, 3, 6, 10, 12];

/** Lookahead step sequencer producing layered, intensity-driven music. */
export class Music {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private lp: BiquadFilterNode | null = null;
  private noise: AudioBuffer | null = null;
  mood: MusicMood = 'off';
  /** 0..1 — how many layers play. */
  intensity = 0;
  private nextTime = 0;
  private step = 0;
  private bar = 0;
  private melodySeed = 1;

  attach(ctx: AudioContext, dest: AudioNode, noise: AudioBuffer): void {
    this.ctx = ctx;
    this.noise = noise;
    this.lp = ctx.createBiquadFilter();
    this.lp.type = 'lowpass';
    this.lp.frequency.value = 18000;
    this.out = ctx.createGain();
    this.out.gain.value = 0.9;
    this.out.connect(this.lp);
    this.lp.connect(dest);
    this.nextTime = ctx.currentTime + 0.1;
  }

  setMood(m: MusicMood): void {
    if (m === this.mood) return;
    this.mood = m;
    this.step = 0;
    this.bar = 0;
    if (this.ctx) this.nextTime = Math.max(this.nextTime, this.ctx.currentTime + 0.05);
  }

  /** Muffle the mix (pause menu). */
  setMuffled(on: boolean): void {
    if (!this.ctx || !this.lp) return;
    this.lp.frequency.setTargetAtTime(on ? 700 : 18000, this.ctx.currentTime, 0.15);
  }

  update(): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || this.mood === 'off') {
      if (ctx) this.nextTime = ctx.currentTime + 0.05;
      return;
    }
    const song = SONGS[this.mood];
    const stepDur = 60 / song.bpm / 4;
    // if we fell behind (tab hidden), skip ahead instead of bursting
    if (this.nextTime < ctx.currentTime - 0.2) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < ctx.currentTime + 0.18) {
      this.playStep(song, this.step, this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.step++;
      if (this.step >= 16) {
        this.step = 0;
        this.bar++;
        if (this.bar % 4 === 0) this.melodySeed = (this.melodySeed * 16807) % 2147483647;
      }
    }
  }

  private rand(n: number): number {
    const x = Math.sin(this.melodySeed * 0.001 + n * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  private playStep(song: Song, s: number, t: number, stepDur: number): void {
    const chord = song.chords[this.bar % song.chords.length];
    const I = this.mood === 'menu' ? 0.5 : this.intensity;
    // pad on bar start
    if (s === 0) {
      for (const n of chord) this.pad(freq(n), t, stepDur * 16, this.mood === 'menu' ? 0.035 : 0.025);
    }
    if (song.bass.includes(s)) this.bass(freq(chord[0] - 24), t, stepDur * (this.mood === 'menu' ? 6 : 1.6), song.bassWave);
    if (I > 0.45 && song.kick.includes(s)) this.kick(t);
    if (I > 0.75 && this.mood === 'run' && (s === 4 || s === 12)) this.kick(t);
    if (I > 0.3 && song.snare.includes(s)) this.snare(t);
    if (I > 0.15 && this.mood !== 'menu' && s % 2 === 0) this.hat(t, s % 4 === 2 ? 0.05 : 0.03);
    if (I > 0.6 || this.mood === 'menu') {
      // arpeggio
      const every = this.mood === 'menu' ? 2 : 1;
      if (s % every === 0) {
        const idx = (s / every) % (chord.length * 2);
        const n = chord[idx % chord.length] + (idx >= chord.length ? 12 : 0);
        this.pluck(freq(n + (this.mood === 'menu' ? 12 : 0)), t, stepDur * 0.9, this.mood === 'menu' ? 0.03 : 0.025, this.mood === 'menu' ? 'sine' : 'square');
      }
    }
    // lead melody on phrase bars 2-3 at higher intensity
    if ((I > 0.8 || this.mood === 'boss') && this.bar % 4 >= 2 && LEAD_STEPS.includes(s)) {
      const k = Math.floor(this.rand(this.bar * 16 + s) * song.scale.length);
      this.pluck(freq(song.scale[k]), t, stepDur * 2.5, 0.04, song.leadWave);
    }
  }

  private voice(type: OscillatorType, f: number, t: number, dur: number, vol: number, attack: number, cutoff: number, detune = 0): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = detune;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const f1 = ctx.createBiquadFilter();
    f1.type = 'lowpass';
    f1.frequency.value = cutoff;
    o.connect(f1);
    f1.connect(g);
    g.connect(this.out!);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private pad(f: number, t: number, dur: number, vol: number): void {
    this.voice('sawtooth', f, t, dur, vol, Math.min(0.6, dur * 0.3), 900, -7);
    this.voice('sawtooth', f, t, dur, vol, Math.min(0.6, dur * 0.3), 900, 7);
  }

  private bass(f: number, t: number, dur: number, wave: OscillatorType): void {
    this.voice(wave, f, t, dur, 0.13, 0.01, wave === 'sawtooth' ? 500 : 2000);
  }

  private pluck(f: number, t: number, dur: number, vol: number, wave: OscillatorType): void {
    this.voice(wave, f, t, dur, vol, 0.005, 2600);
  }

  private kick(t: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.32, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g);
    g.connect(this.out!);
    o.start(t);
    o.stop(t + 0.2);
  }

  private noiseVoice(t: number, dur: number, vol: number, type: BiquadFilterType, f: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const bf = ctx.createBiquadFilter();
    bf.type = type;
    bf.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bf);
    bf.connect(g);
    g.connect(this.out!);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  private snare(t: number): void {
    this.noiseVoice(t, 0.13, 0.12, 'bandpass', 1900);
  }

  private hat(t: number, vol: number): void {
    this.noiseVoice(t, 0.035, vol, 'highpass', 7500);
  }
}
