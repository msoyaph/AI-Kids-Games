// Music, synthesized: a small looping tune for each world (and the menus), in a gentle pentatonic
// so nothing ever clashes, with layers that join as the waves grow: bass and pads when calm, then
// a bouncy chord rhythm, then the melody, then light percussion for a big wave. Scheduled a little
// ahead of time from the game loop (update()), never with timers.
import { audioContext, musicOut, tone } from './engine';

export type Track = 'menu' | 'meadow' | 'greenhouse' | 'dusk' | 'desert' | 'cloud';

interface Style { bpm: number; root: number; scale: number[]; chords: number[][]; lead: OscillatorType; bass: OscillatorType; melody: number[] }

// scale degrees in semitones; chords as scale-degree indexes; melody as scale indexes (-1 rest)
const MAJOR_PENT = [0, 2, 4, 7, 9, 12, 14, 16];
const STYLES: Record<Track, Style> = {
  menu: { bpm: 100, root: 60, scale: MAJOR_PENT, chords: [[0, 2, 4], [3, 5, 7], [4, 6, 1], [3, 5, 0]], lead: 'triangle', bass: 'sine', melody: [4, 3, 2, -1, 3, 4, 5, -1, 4, 3, 2, 1, 2, -1, 0, -1] },
  meadow: { bpm: 112, root: 60, scale: MAJOR_PENT, chords: [[0, 2, 4], [3, 5, 0], [4, 6, 1], [0, 2, 4]], lead: 'triangle', bass: 'sine', melody: [0, 2, 4, 2, 3, -1, 2, 1, 0, 2, 4, 5, 4, -1, 2, -1] },
  greenhouse: { bpm: 104, root: 67, scale: MAJOR_PENT, chords: [[0, 2, 4], [1, 3, 5], [3, 5, 0], [4, 6, 1]], lead: 'sine', bass: 'triangle', melody: [4, -1, 3, 4, 5, -1, 4, 2, 3, -1, 2, 1, 2, -1, -1, -1] },
  dusk: { bpm: 92, root: 62, scale: [0, 3, 5, 7, 10, 12, 15, 17], chords: [[0, 2, 4], [1, 3, 5], [2, 4, 6], [0, 2, 4]], lead: 'sine', bass: 'sine', melody: [2, -1, 4, 3, 2, -1, 1, -1, 0, 1, 2, -1, 3, 2, -1, -1] },
  desert: { bpm: 108, root: 57, scale: [0, 2, 4, 7, 9, 12, 14, 16], chords: [[0, 2, 4], [0, 3, 5], [4, 6, 1], [3, 5, 0]], lead: 'sawtooth', bass: 'triangle', melody: [0, -1, 2, 3, 4, -1, 3, 2, 4, 5, 4, -1, 2, 1, 0, -1] },
  cloud: { bpm: 96, root: 65, scale: [0, 2, 4, 6, 7, 11, 12, 14], chords: [[0, 2, 4], [1, 3, 5], [4, 6, 1], [3, 5, 0]], lead: 'sine', bass: 'sine', melody: [4, 5, 6, -1, 5, 4, 2, -1, 3, 4, 5, -1, 4, -1, 2, -1] },
};

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export class Music {
  private track: Track | null = null;
  private nextAt = 0;
  private step = 0;
  /** 0 calm … 3 a big wave. */
  intensity = 0;
  on = true;

  play(track: Track) {
    if (track === this.track) return;
    this.track = track;
    this.step = 0;
    const ctx = audioContext();
    this.nextAt = ctx ? ctx.currentTime + 0.1 : 0;
  }

  stop() { this.track = null; }

  /** Schedules the next notes (call every frame). */
  update() {
    const ctx = audioContext();
    if (!ctx || !this.track || !this.on) return;
    const st = STYLES[this.track], beat = 60 / st.bpm / 2; // eighth notes
    if (this.nextAt < ctx.currentTime - 0.5) this.nextAt = ctx.currentTime + 0.05;
    while (this.nextAt < ctx.currentTime + 0.2) {
      this.note(st, this.step, this.nextAt, beat);
      this.step = (this.step + 1) % 64;
      this.nextAt += beat;
    }
  }

  private note(st: Style, s: number, at: number, beat: number) {
    const out = musicOut();
    const bar = Math.floor(s / 16) % st.chords.length, chord = st.chords[bar]!, inBar = s % 16;
    const deg = (i: number) => st.root + (st.scale[i % st.scale.length]! + 12 * Math.floor(i / st.scale.length));
    // bass on the beat, a soft pad at the start of each bar
    if (inBar % 4 === 0) tone(out, at, hz(deg(chord[0]!) - 24), beat * 3.5, st.bass, 0.22, 0.01);
    if (inBar === 0) for (const c of chord) tone(out, at, hz(deg(c) - 12), beat * 15, 'sine', 0.035, 0.3);
    // chord rhythm
    if (this.intensity >= 1 && (inBar % 4 === 2)) for (const c of chord) tone(out, at, hz(deg(c)), beat * 0.9, 'triangle', 0.045, 0.005);
    // melody
    if (this.intensity >= 2) { const m = st.melody[inBar]!; if (m >= 0) tone(out, at, hz(deg(m) + 12), beat * 1.6, st.lead, st.lead === 'sawtooth' ? 0.03 : 0.07, 0.01); }
    // light percussion: a soft tick and a thump
    if (this.intensity >= 3) {
      if (inBar % 4 === 0) tone(out, at, 90, 0.15, 'sine', 0.25, 0.002, 50);
      if (inBar % 2 === 1) tone(out, at, 5000, 0.03, 'square', 0.012, 0.001);
    }
  }
}
