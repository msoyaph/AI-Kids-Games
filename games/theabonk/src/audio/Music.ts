/**
 * Procedural music: a lookahead step sequencer playing named songs, layered by intensity
 * (pad → bass → hats → snare → kick → arpeggio → lead as the screen fills up).
 *
 * Song sets: Gloam Meadow has three run songs across the night (dusk / deep night / before
 * dawn), Rimewood its own three with bells; each map has a mid-boss theme and a final-boss
 * theme (the Regent / Old Rime); plus menu and collection themes.
 */

import { SONG_GAIN } from './mix';

export type SongName =
  | 'menu'
  | 'collection'
  | 'runA'
  | 'runB'
  | 'runC'
  | 'boss'
  | 'final'
  | 'rimeA'
  | 'rimeB'
  | 'rimeC'
  | 'rimeBoss'
  | 'oldRime';

/** Calm songs (menus) always play every layer softly; run songs follow the intensity. */
type Feel = 'calm' | 'run' | 'boss';

interface Song {
  bpm: number;
  feel: Feel;
  /** Chord tones (MIDI) per bar. */
  chords: number[][];
  bass: number[];
  kick: number[];
  snare: number[];
  bassWave: OscillatorType;
  leadWave: OscillatorType;
  scale: number[];
  /** Lead plays as bells (sine + octave shimmer) — Rimewood. */
  bell?: boolean;
}

export const SONGS: Record<SongName, Song> = {
  menu: {
    bpm: 84,
    feel: 'calm',
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
  collection: {
    bpm: 72,
    feel: 'calm',
    chords: [
      [62, 66, 69, 73],
      [59, 62, 66, 69],
      [55, 59, 62, 66],
      [57, 61, 64, 69],
    ],
    bass: [0],
    kick: [],
    snare: [],
    bassWave: 'sine',
    leadWave: 'sine',
    scale: [74, 76, 78, 81, 83, 86],
    bell: true,
  },
  // Gloam Meadow: dusk
  runA: {
    bpm: 116,
    feel: 'run',
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
  // deep night: darker, driving
  runB: {
    bpm: 120,
    feel: 'run',
    chords: [
      [50, 53, 57],
      [46, 50, 53],
      [53, 57, 60],
      [48, 52, 55],
    ],
    bass: [0, 2, 3, 6, 8, 10, 11, 14],
    kick: [0, 6, 8],
    snare: [4, 12],
    bassWave: 'sawtooth',
    leadWave: 'square',
    scale: [62, 65, 67, 69, 72, 74, 77],
  },
  // before dawn: bright, hopeful
  runC: {
    bpm: 126,
    feel: 'run',
    chords: [
      [60, 64, 67],
      [55, 59, 62],
      [57, 60, 64],
      [53, 57, 60],
    ],
    bass: [0, 3, 6, 8, 11, 14],
    kick: [0, 8],
    snare: [4, 12],
    bassWave: 'triangle',
    leadWave: 'triangle',
    scale: [72, 74, 76, 79, 81, 84, 86],
  },
  boss: {
    bpm: 132,
    feel: 'boss',
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
  // the Gloam Regent
  final: {
    bpm: 138,
    feel: 'boss',
    chords: [
      [52, 55, 59],
      [48, 52, 55],
      [50, 54, 57],
      [47, 51, 54],
    ],
    bass: [0, 1, 3, 4, 6, 8, 9, 11, 12, 14],
    kick: [0, 3, 4, 8, 11, 12],
    snare: [4, 12],
    bassWave: 'sawtooth',
    leadWave: 'square',
    scale: [64, 66, 67, 71, 72, 74, 76],
  },
  // Rimewood: dusk on the ice
  rimeA: {
    bpm: 104,
    feel: 'run',
    chords: [
      [52, 55, 59, 62],
      [48, 52, 55, 59],
      [55, 59, 62, 66],
      [50, 54, 57, 61],
    ],
    bass: [0, 6, 8, 14],
    kick: [0, 8],
    snare: [12],
    bassWave: 'triangle',
    leadWave: 'sine',
    scale: [76, 79, 81, 83, 86, 88],
    bell: true,
  },
  // aurora night
  rimeB: {
    bpm: 110,
    feel: 'run',
    chords: [
      [57, 60, 64],
      [52, 55, 59],
      [53, 57, 60],
      [55, 59, 62],
    ],
    bass: [0, 3, 6, 8, 11, 14],
    kick: [0, 8],
    snare: [4, 12],
    bassWave: 'triangle',
    leadWave: 'sine',
    scale: [69, 71, 72, 76, 79, 81, 84],
    bell: true,
  },
  // the thaw approaches
  rimeC: {
    bpm: 118,
    feel: 'run',
    chords: [
      [53, 57, 60],
      [60, 64, 67],
      [55, 59, 62],
      [57, 60, 64],
    ],
    bass: [0, 3, 6, 8, 11, 14],
    kick: [0, 8],
    snare: [4, 12],
    bassWave: 'sawtooth',
    leadWave: 'triangle',
    scale: [72, 74, 77, 79, 81, 84],
    bell: true,
  },
  rimeBoss: {
    bpm: 130,
    feel: 'boss',
    chords: [
      [59, 62, 66],
      [55, 59, 62],
      [57, 61, 64],
      [54, 58, 61],
    ],
    bass: [0, 2, 3, 6, 8, 10, 11, 14],
    kick: [0, 4, 8, 12],
    snare: [4, 12],
    bassWave: 'sawtooth',
    leadWave: 'square',
    scale: [71, 73, 74, 78, 81, 83],
    bell: true,
  },
  // Old Rime, the Frost Stag
  oldRime: {
    bpm: 136,
    feel: 'boss',
    chords: [
      [48, 51, 55],
      [44, 48, 51],
      [51, 55, 58],
      [46, 50, 53],
    ],
    bass: [0, 1, 3, 4, 6, 8, 9, 11, 12, 14],
    kick: [0, 3, 4, 8, 11, 12],
    snare: [4, 12],
    bassWave: 'sawtooth',
    leadWave: 'sawtooth',
    scale: [60, 63, 65, 67, 70, 72, 75],
    bell: true,
  },
};

const freq = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);
const LEAD_STEPS = [0, 3, 6, 10, 12];

/** Which run song plays at a point of the night (dusk / deep night / before dawn). */
export function runSong(map: string, progress: number): SongName {
  const k = progress < 0.35 ? 0 : progress < 0.7 ? 1 : 2;
  return (map === 'rimewood' ? ['rimeA', 'rimeB', 'rimeC'] : ['runA', 'runB', 'runC'])[k] as SongName;
}

/** Boss music: the final boss gets its own theme. */
export function bossSong(map: string, final: boolean): SongName {
  if (map === 'rimewood') return final ? 'oldRime' : 'rimeBoss';
  return final ? 'final' : 'boss';
}

/** Lookahead step sequencer producing layered, intensity-driven music. */
export class Music {
  private ctx: BaseAudioContext | null = null;
  private out: GainNode | null = null;
  private lp: BiquadFilterNode | null = null;
  private noise: AudioBuffer | null = null;
  /** The song playing (null = silence). */
  song: SongName | null = null;
  /** 0..1 — how many layers play. */
  intensity = 0;
  private nextTime = 0;
  private step = 0;
  private bar = 0;
  private melodySeed = 1;

  attach(ctx: BaseAudioContext, dest: AudioNode, noise: AudioBuffer): void {
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

  /** Switch songs (starts on the next step, from the top). */
  play(name: SongName | null): void {
    if (name === this.song) return;
    this.song = name;
    // per-song level trim from the audio report
    if (this.out && name) this.out.gain.value = 0.9 * (SONG_GAIN[name] ?? 1);
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
    if (!ctx || (ctx as AudioContext).state !== 'running' || !this.song) {
      if (ctx) this.nextTime = ctx.currentTime + 0.05;
      return;
    }
    // if we fell behind (tab hidden), skip ahead instead of bursting
    if (this.nextTime < ctx.currentTime - 0.2) this.nextTime = ctx.currentTime + 0.05;
    this.scheduleUntil(ctx.currentTime + 0.18);
  }

  /** Offline (audio report): schedule `seconds` of the current song from time 0. */
  scheduleOffline(seconds: number): void {
    this.nextTime = 0.02;
    this.scheduleUntil(seconds);
  }

  private scheduleUntil(t: number): void {
    if (!this.song) return;
    const song = SONGS[this.song];
    const stepDur = 60 / song.bpm / 4;
    while (this.nextTime < t) {
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
    const calm = song.feel === 'calm';
    const boss = song.feel === 'boss';
    const I = calm ? 0.5 : boss ? Math.max(0.7, this.intensity) : this.intensity;
    // pad on bar start
    if (s === 0) for (const n of chord) this.pad(freq(n), t, stepDur * 16, calm ? 0.035 : 0.025);
    if (song.bass.includes(s)) this.bass(freq(chord[0] - 24), t, stepDur * (calm ? 6 : 1.6), song.bassWave);
    if (I > 0.45 && song.kick.includes(s)) this.kick(t);
    if (I > 0.75 && song.feel === 'run' && (s === 4 || s === 12)) this.kick(t);
    if (I > 0.3 && song.snare.includes(s)) this.snare(t);
    if (I > 0.15 && !calm && s % 2 === 0) this.hat(t, s % 4 === 2 ? 0.05 : 0.03);
    if (I > 0.6 || calm) {
      // arpeggio
      const every = calm ? 2 : 1;
      if (s % every === 0) {
        const idx = (s / every) % (chord.length * 2);
        const n = chord[idx % chord.length] + (idx >= chord.length ? 12 : 0);
        if (song.bell) this.bellNote(freq(n + 12), t, stepDur * 2, calm ? 0.028 : 0.022);
        else this.pluck(freq(n + (calm ? 12 : 0)), t, stepDur * 0.9, calm ? 0.03 : 0.025, calm ? 'sine' : 'square');
      }
    }
    // lead melody on phrase bars 2-3 at higher intensity (always for bosses)
    if ((I > 0.8 || boss) && this.bar % 4 >= 2 && LEAD_STEPS.includes(s)) {
      const k = Math.floor(this.rand(this.bar * 16 + s) * song.scale.length);
      if (song.bell) this.bellNote(freq(song.scale[k]), t, stepDur * 3, 0.045);
      else this.pluck(freq(song.scale[k]), t, stepDur * 2.5, 0.04, song.leadWave);
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

  /** A bell: a sine with a slightly sharp octave shimmer and a long ring. */
  private bellNote(f: number, t: number, dur: number, vol: number): void {
    this.voice('sine', f, t, dur * 1.6, vol, 0.004, 8000);
    this.voice('sine', f * 2.01, t, dur, vol * 0.35, 0.004, 8000);
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
