import type { SongData } from '../data/types';
import { Rng } from '../core/rng';
import { Synth, midiToFreq, type Wave } from './synth';

const SCALES: Record<SongData['scale'], number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  pentatonic: [0, 2, 4, 7, 9],
  blues: [0, 3, 5, 6, 7, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  wholeTone: [0, 2, 4, 6, 8, 10],
};

interface Ev {
  len: number;
  midi: number;
  vel: number;
}

type Drum = 'k' | 's' | 'h' | 'o' | 'c';

interface Score {
  steps: number;
  lead: Array<Ev[]>;
  bass: Array<Ev[]>;
  arp: Array<Ev[]>;
  pad: Array<Ev[]>;
  drums: Array<Array<{ d: Drum; vel: number }>>;
}

const DRUMS: Record<SongData['drums'], Array<[number, Drum, number]>> = {
  pop: [[0, 'k', 1], [8, 'k', 1], [10, 'k', 0.6], [4, 's', 1], [12, 's', 1], ...[0, 2, 4, 6, 8, 10, 12, 14].map((s) => [s, 'h', 0.7] as [number, Drum, number])],
  rock: [[0, 'k', 1], [6, 'k', 0.8], [8, 'k', 1], [4, 's', 1], [12, 's', 1], [14, 'o', 0.6], ...[0, 2, 4, 6, 8, 10, 12].map((s) => [s, 'h', 0.8] as [number, Drum, number])],
  latin: [[0, 'k', 1], [6, 'k', 0.7], [8, 'k', 0.9], [3, 'c', 0.5], [10, 'c', 0.5], [12, 's', 0.6], ...[0, 2, 4, 6, 8, 10, 12, 14].map((s) => [s, 'h', 0.6] as [number, Drum, number])],
  shuffle: [[0, 'k', 1], [8, 'k', 1], [4, 's', 1], [12, 's', 1], ...[0, 3, 4, 7, 8, 11, 12, 15].map((s) => [s, 'h', 0.65] as [number, Drum, number])],
  electro: [[0, 'k', 1], [4, 'k', 1], [8, 'k', 1], [12, 'k', 1], [4, 'c', 0.9], [12, 'c', 0.9], ...[2, 6, 10, 14].map((s) => [s, 'o', 0.5] as [number, Drum, number])],
  march: [[0, 'k', 1], [8, 'k', 1], [4, 's', 0.9], [6, 's', 0.5], [12, 's', 0.9], [14, 's', 0.5], [15, 's', 0.4]],
  halftime: [[0, 'k', 1], [10, 'k', 0.8], [8, 's', 1], ...[0, 2, 4, 6, 8, 10, 12, 14].map((s) => [s, 'h', 0.5] as [number, Drum, number])],
  breakbeat: [[0, 'k', 1], [10, 'k', 0.9], [4, 's', 1], [7, 's', 0.35], [12, 's', 1], ...[0, 2, 4, 6, 8, 10, 12, 14].map((s) => [s, 'h', 0.7] as [number, Drum, number])],
  none: [],
};

const BASS: Record<SongData['drums'], Array<[number, number, number]>> = {
  // [step, length, interval: 0 root, 7 fifth, 12 octave]
  pop: [[0, 3, 0], [4, 2, 12], [8, 3, 0], [12, 2, 7]],
  rock: [0, 2, 4, 6, 8, 10, 12, 14].map((s, i) => [s, 2, i === 6 ? 7 : 0] as [number, number, number]),
  latin: [[0, 3, 0], [3, 3, 7], [6, 2, 12], [8, 3, 0], [11, 3, 7], [14, 2, 0]],
  shuffle: [[0, 4, 0], [6, 2, 7], [8, 4, 12], [14, 2, 7]],
  electro: [[2, 2, 0], [6, 2, 0], [10, 2, 0], [14, 2, 12]],
  march: [[0, 6, 0], [8, 6, 7]],
  halftime: [[0, 8, 0], [10, 4, 7]],
  breakbeat: [[0, 3, 0], [3, 2, 0], [8, 2, 7], [10, 3, 0], [14, 2, 12]],
  none: [[0, 14, 0]],
};

const RHYTHM_CELLS: number[][] = [
  [4, 4, 4, 4],
  [2, 2, 4, 4, 4],
  [6, 2, 4, 4],
  [4, 2, 2, 8],
  [8, 4, 4],
  [2, 2, 2, 2, 4, 4],
  [3, 3, 2, 4, 4],
  [4, 4, 8],
];

/** Generate a full 8-bar loop for a song (deterministic from its seed). */
export function buildScore(song: SongData): Score {
  const rng = new Rng(song.seed);
  const scale = SCALES[song.scale];
  const n = scale.length;
  const bars = song.chords.length;
  const steps = bars * 16;
  const mk = <T>(): T[][] => Array.from({ length: steps }, () => [] as T[]);
  const score: Score = { steps, lead: mk(), bass: mk(), arp: mk(), pad: mk(), drums: mk() };
  const degToMidi = (deg: number, base: number): number => {
    const oct = Math.floor(deg / n);
    const d = ((deg % n) + n) % n;
    return base + oct * 12 + scale[d];
  };
  const chordTones = (bar: number): number[] => {
    const c = song.chords[bar % bars];
    return [c, c + 2, c + 4];
  };
  // drums
  for (let b = 0; b < bars; b++) {
    for (const [s, d, v] of DRUMS[song.drums]) score.drums[b * 16 + s].push({ d, vel: v });
    if (b % 4 === 3 && song.drums !== 'none') {
      // little fill at the end of every 4 bars
      for (const s of [13, 14, 15]) score.drums[b * 16 + s].push({ d: 's', vel: 0.55 });
    }
  }
  // bass
  for (let b = 0; b < bars; b++) {
    const root = degToMidi(song.chords[b], song.root - 24);
    for (const [s, len, iv] of BASS[song.drums]) score.bass[b * 16 + s].push({ len, midi: root + iv, vel: 1 });
  }
  // pad
  if (song.pad) {
    for (let b = 0; b < bars; b++) {
      for (const deg of chordTones(b)) score.pad[b * 16].push({ len: 16, midi: degToMidi(deg, song.root - 12), vel: 1 });
    }
  }
  // arpeggio
  if (song.arp && song.arp !== 'none') {
    for (let b = 0; b < bars; b++) {
      const tones = chordTones(b).concat(chordTones(b).map((d) => d + n));
      for (let s = 0; s < 16; s += 2) {
        const i = s / 2;
        let idx: number;
        switch (song.arp) {
          case 'up':
            idx = i % tones.length;
            break;
          case 'down':
            idx = tones.length - 1 - (i % tones.length);
            break;
          case 'updown': {
            const cyc = (tones.length - 1) * 2;
            const p = i % cyc;
            idx = p < tones.length ? p : cyc - p;
            break;
          }
          default:
            idx = rng.int(0, tones.length - 1);
        }
        score.arp[b * 16 + s].push({ len: 2, midi: degToMidi(tones[idx], song.root), vel: s % 4 === 0 ? 1 : 0.7 });
      }
    }
  }
  // lead melody: A A' B A'' phrase structure, 2 bars per phrase
  const makePhrase = (startBar: number, rhythm: number[][], final: boolean, prev?: number[]): number[] => {
    const degs: number[] = [];
    let cur = chordTones(startBar)[rng.int(0, 2)] + n;
    let step = 0;
    let k = 0;
    for (const cell of rhythm) {
      for (const len of cell) {
        const bar = startBar + Math.floor(step / 16);
        const strong = step % 8 === 0;
        if (prev && prev[k] !== undefined && rng.chance(0.7)) cur = prev[k];
        else {
          cur += rng.pick([-2, -1, -1, 1, 1, 2, 0]);
          if (strong) {
            const tones = chordTones(bar).flatMap((d) => [d, d + n]);
            let best = tones[0];
            for (const t of tones) if (Math.abs(t - cur) < Math.abs(best - cur)) best = t;
            cur = best;
          }
        }
        cur = Math.max(n - 2, Math.min(n * 2 + 2, cur));
        const isLast = final && step + len >= 32;
        if (isLast) cur = song.chords[(startBar + 1) % bars] + n;
        degs.push(cur);
        const rest = !strong && rng.chance(0.12);
        if (!rest && step < 32) score.lead[startBar * 16 + step].push({ len: Math.max(1, len - (len > 2 ? 1 : 0)), midi: degToMidi(cur, song.root), vel: strong ? 1 : 0.8 });
        step += len;
        k++;
      }
    }
    return degs;
  };
  const rA = [rng.pick(RHYTHM_CELLS), rng.pick(RHYTHM_CELLS)];
  const rB = [rng.pick(RHYTHM_CELLS), rng.pick(RHYTHM_CELLS)];
  const a = makePhrase(0, rA, false);
  if (bars >= 4) makePhrase(2, rA, false, a);
  if (bars >= 6) makePhrase(4, rB, false);
  if (bars >= 8) makePhrase(6, rA, true, a);
  return score;
}

/**
 * Plays a score with a look-ahead scheduler (timer + AudioContext clock, so timing stays tight even
 * if the frame rate drops). Final-lap speed-up is a tempo multiplier.
 */
export class MusicPlayer {
  private score: Score | null = null;
  private song: SongData | null = null;
  private step = 0;
  private nextTime = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private tempoMul = 1;
  private targetTempo = 1;
  readonly bus: GainNode;
  private suspended = false;

  constructor(
    readonly ctx: AudioContext,
    readonly synth: Synth,
    out: AudioNode,
  ) {
    this.bus = ctx.createGain();
    this.bus.gain.value = 1;
    this.bus.connect(out);
  }

  get currentId(): string | null {
    return this.song?.id ?? null;
  }

  play(song: SongData): void {
    if (this.song?.id === song.id && this.timer) return;
    this.stopNow();
    this.song = song;
    this.score = buildScore(song);
    this.step = 0;
    this.tempoMul = this.targetTempo = 1;
    this.bus.gain.cancelScheduledValues(this.ctx.currentTime);
    this.bus.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    this.bus.gain.exponentialRampToValueAtTime(1, this.ctx.currentTime + 0.4);
    this.nextTime = this.ctx.currentTime + 0.08;
    this.timer = setInterval(() => this.tick(), 25);
  }

  setTempo(mul: number): void {
    this.targetTempo = mul;
  }

  suspend(on: boolean): void {
    this.suspended = on;
    if (!on) this.nextTime = Math.max(this.nextTime, this.ctx.currentTime + 0.05);
  }

  stop(fade = 0.5): void {
    if (!this.timer) return;
    const t = this.ctx.currentTime;
    this.bus.gain.cancelScheduledValues(t);
    this.bus.gain.setValueAtTime(Math.max(0.0001, this.bus.gain.value), t);
    this.bus.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.05, fade));
    const timer = this.timer;
    setTimeout(() => {
      if (this.timer === timer) this.stopNow();
    }, fade * 1000 + 60);
  }

  private stopNow(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.song = null;
    this.score = null;
  }

  private tick(): void {
    const s = this.score;
    const song = this.song;
    if (!s || !song || this.suspended) return;
    const ctx = this.ctx;
    if (this.nextTime < ctx.currentTime - 0.3) this.nextTime = ctx.currentTime + 0.05; // fell behind (tab was throttled)
    this.tempoMul += (this.targetTempo - this.tempoMul) * 0.05;
    const stepDur = 60 / (song.bpm * this.tempoMul) / 4;
    const cutoff = 1400 + (song.bright ?? 0.7) * 5200;
    while (this.nextTime < ctx.currentTime + 0.14) {
      const i = this.step % s.steps;
      let t = this.nextTime;
      if (song.swing && i % 2 === 1) t += stepDur * song.swing * 0.5;
      for (const d of s.drums[i]) {
        if (d.d === 'k') this.synth.kick(this.bus, t, 0.42 * d.vel);
        else if (d.d === 's') this.synth.snare(this.bus, t, 0.2 * d.vel);
        else if (d.d === 'h') this.synth.hat(this.bus, t, 0.045 * d.vel);
        else if (d.d === 'o') this.synth.hat(this.bus, t, 0.05 * d.vel, true);
        else this.synth.clap(this.bus, t, 0.16 * d.vel);
      }
      for (const e of s.bass[i]) this.synth.note(this.bus, t, midiToFreq(e.midi), e.len * stepDur, song.bass as Wave, 0.13, { cutoff: 900 });
      for (const e of s.pad[i]) this.synth.note(this.bus, t, midiToFreq(e.midi), e.len * stepDur * 0.98, (song.pad ?? 'triangle') as Wave, 0.03, { cutoff: 1800 });
      for (const e of s.arp[i]) this.synth.note(this.bus, t, midiToFreq(e.midi), e.len * stepDur * 0.8, 'triangle', 0.035 * e.vel, { cutoff });
      for (const e of s.lead[i]) this.synth.note(this.bus, t, midiToFreq(e.midi), e.len * stepDur, song.lead, 0.085 * e.vel, { cutoff, vibrato: song.lead === 'sine' || song.lead === 'triangle' ? 0.006 : 0 });
      this.nextTime += stepDur;
      this.step++;
    }
  }
}
