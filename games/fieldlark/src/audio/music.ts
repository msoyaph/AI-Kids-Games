/**
 * Gentle generative music, made live with Web Audio (no audio files): a soft pad holding each chord,
 * a plucked tune wandering over it, and now and then a bell. Each season has its own key and pace
 * (bright spring, lazy summer, warm autumn, quiet winter); evenings slow down and thin out, and the
 * lantern night is just the pad and a few bells. The tune is chosen from the chord's own notes, so it
 * always fits. Nothing loops exactly, but it never surprises: no sudden loud notes, no drums.
 *
 * It schedules a bar ahead with the audio clock, so it keeps time even when frames stutter, and it
 * rests while the page is hidden (the engine suspends the whole context).
 */
import { audio } from './engine';
import type { Season } from '../sim/clock';

const KEYS: Record<Season, { root: number; bpm: number; scale: number[] }> = {
  spring: { root: 60, bpm: 92, scale: [0, 2, 4, 7, 9] }, // C major pentatonic
  summer: { root: 62, bpm: 80, scale: [0, 2, 4, 7, 9] }, // D
  autumn: { root: 57, bpm: 76, scale: [0, 2, 3, 7, 9] }, // A, a little wistful
  winter: { root: 55, bpm: 66, scale: [0, 2, 4, 7, 11] }, // G, with a soft seventh
};
/** Chords as scale degrees (I, vi, IV, V and friends). */
const PROGRESSIONS = [[0, 5, 3, 4], [0, 3, 5, 4], [0, 4, 5, 3], [5, 3, 0, 4]];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

export class Music {
  private nextBar = 0;
  private bar = 0;
  private prog = PROGRESSIONS[0]!;
  private seed = 1;
  private lastNote = 0;
  on = true;

  private rnd() { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 4294967296; }

  /** Called every frame or so: schedules the next bar when it's due. `evening` is 0 (day) to 1 (night). */
  update(season: Season, evening: number) {
    const ctx = audio.ctx, out = audio.bus('music');
    if (!this.on || !ctx || !out || ctx.state !== 'running') { if (ctx) this.nextBar = ctx.currentTime + 0.2; return; }
    if (ctx.currentTime < this.nextBar - 0.6) return;
    const key = KEYS[season];
    const beat = 60 / (key.bpm * (1 - evening * 0.25));
    const t0 = Math.max(this.nextBar, ctx.currentTime + 0.05);
    if (this.bar % 4 === 0) this.prog = PROGRESSIONS[Math.floor(this.rnd() * PROGRESSIONS.length)]!;
    const degree = this.prog[this.bar % 4]!;
    const chord = [0, 2, 4].map(i => key.root - 12 + MAJOR[(degree + i) % 7]! + 12 * Math.floor((degree + i) / 7));
    // the pad: three soft notes held for the bar
    for (const n of chord) this.voice(hz(n), t0, beat * 4.1, { type: 'sine', gain: 0.035 * (1 - evening * 0.3), attack: 0.6, release: 1.2 });
    this.voice(hz(chord[0]! - 12), t0, beat * 4, { type: 'triangle', gain: 0.03, attack: 0.3, release: 0.8 });
    // the tune: plucked notes on some beats, fewer in the evening, none at night
    const busy = evening > 0.85 ? 0 : 0.55 - evening * 0.35;
    for (let b = 0; b < 8; b++) {
      if (this.rnd() > busy) continue;
      const tones = chord.map(n => n + 12).concat(key.scale.map(s => key.root + 12 + s));
      // small steps sound like a tune: prefer notes near the last one
      const near = tones.filter(n => Math.abs(n - (this.lastNote || key.root + 12)) <= 5);
      const pick = (near.length ? near : tones)[Math.floor(this.rnd() * (near.length || tones.length))]!;
      this.lastNote = pick;
      this.voice(hz(pick), t0 + b * beat * 0.5, beat * 0.9, { type: 'triangle', gain: 0.045, attack: 0.01, release: 0.5 });
    }
    // a bell now and then (more of them at night)
    if (this.rnd() < 0.25 + evening * 0.3) this.voice(hz(chord[2]! + 24), t0 + beat * Math.floor(this.rnd() * 4), beat * 3, { type: 'sine', gain: 0.025, attack: 0.005, release: 2.5 });
    this.nextBar = t0 + beat * 4;
    this.bar++;
  }

  private voice(freq: number, t0: number, dur: number, o: { type: OscillatorType; gain: number; attack: number; release: number }) {
    const ctx = audio.ctx, out = audio.bus('music');
    if (!ctx || !out) return;
    try {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = o.type;
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(o.gain, t0 + o.attack);
      g.gain.setValueAtTime(o.gain, t0 + Math.max(o.attack, dur - o.release));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + o.release);
      osc.connect(g); g.connect(out);
      osc.start(t0); osc.stop(t0 + dur + o.release + 0.05);
    } catch { /* ignore */ }
  }
}

export const music = new Music();
