/**
 * The town's music, made live with Web Audio (no audio files): a breezy seaside tune. A marimba-like
 * pluck plays short phrases (a two-bar idea, then an answer that lands on the chord), over a bouncy
 * bass on beats one and three and, by day, the softest shaker on the off-beats. Each season has its
 * own key and pace (a bright spring, a sunny summer, a mellow autumn, a quiet winter); evenings slow
 * down and thin out, and night is a warm pad with a few chimes. The festival plays it all livelier.
 * Notes are always taken from the chord or the key, so nothing clashes, and nothing is loud or sudden.
 *
 * It schedules a bar ahead on the audio clock, so it keeps time when frames stutter, and it rests
 * while the page is hidden (the engine suspends the whole context).
 * (The bar-ahead scheduling follows games/fieldlark/src/audio/music.ts; the music itself is new.)
 */
import { audio } from './engine';
import type { Season } from '../sim/clock';

/** A key: its root (MIDI), pace and the seven notes of its mode. */
interface Key { root: number; bpm: number; mode: readonly number[] }
const MAJOR = [0, 2, 4, 5, 7, 9, 11], DORIAN = [0, 2, 3, 5, 7, 9, 10];
const KEYS: Record<Season, Key> = {
  spring: { root: 65, bpm: 104, mode: MAJOR }, // F
  summer: { root: 67, bpm: 112, mode: MAJOR }, // G
  autumn: { root: 62, bpm: 96, mode: DORIAN }, // D, a little wistful
  winter: { root: 60, bpm: 86, mode: MAJOR }, // C, slow and soft
};
/** Chords as degrees of the mode: I V vi IV, I IV V V, vi IV I V, I vi ii V. */
const PROGRESSIONS = [[0, 4, 5, 3], [0, 3, 4, 4], [5, 3, 0, 4], [0, 5, 1, 4]];

export type MusicMode = 'title' | 'town' | 'festival';

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

export class Music {
  private nextBar = 0;
  private bar = 0;
  private prog = PROGRESSIONS[0]!;
  private seed = 7;
  /** This phrase's rhythm (eight eighth notes, on or off) and its steps up or down the chord. */
  private rhythm: boolean[] = [];
  private steps: number[] = [];
  on = true;
  mode: MusicMode = 'town';

  private rnd() { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 4294967296; }

  /** A new idea for the next four bars: a rhythm with a few notes, and how the tune moves. */
  private newPhrase(busy: number) {
    this.rhythm = Array.from({ length: 8 }, (_, i) => (i === 0 ? true : this.rnd() < busy * (i % 2 ? 0.7 : 1)));
    this.steps = Array.from({ length: 8 }, () => [-1, 0, 1, 1, 2, -2][Math.floor(this.rnd() * 6)]!);
  }

  /** Called every frame or so: schedules the next bar when it's due. `evening` is 0 (day) to 1 (night). */
  update(season: Season, evening: number) {
    const ctx = audio.ctx, out = audio.bus('music');
    if (!this.on || !ctx || !out || ctx.state !== 'running') { if (ctx) this.nextBar = ctx.currentTime + 0.2; return; }
    if (ctx.currentTime < this.nextBar - 0.6) return;
    const key = KEYS[season];
    const party = this.mode === 'festival';
    const calm = this.mode === 'title' ? 0.4 : party ? 0 : evening;
    const beat = 60 / ((key.bpm + (party ? 14 : 0)) * (1 - calm * 0.22));
    const t0 = Math.max(this.nextBar, ctx.currentTime + 0.05);
    if (this.bar % 4 === 0) {
      this.prog = PROGRESSIONS[Math.floor(this.rnd() * PROGRESSIONS.length)]!;
      this.newPhrase(party ? 0.75 : 0.55 - calm * 0.3);
    }
    const degree = this.prog[this.bar % 4]!;
    const note = (d: number) => key.root + key.mode[((d % 7) + 7) % 7]! + 12 * Math.floor(d / 7);
    const chord = [0, 2, 4].map(i => note(degree + i));
    const night = calm > 0.85;
    // the pad: soft at night, a whisper by day
    for (const n of chord) this.voice(hz(n - 12), t0, beat * 4.1, { type: 'sine', gain: night ? 0.032 : 0.014, attack: 0.5, release: 1.2 });
    if (!night) {
      // the bass: root on one, the fifth on three (a little bounce)
      this.pluck(hz(chord[0]! - 24), t0, 0.5, 0.075, 'triangle');
      this.pluck(hz(note(degree + 4) - 24), t0 + beat * 2, 0.45, 0.06, 'triangle');
      if (party || this.rnd() < 0.4) this.pluck(hz(chord[0]! - 24), t0 + beat * 3.5, 0.25, 0.045, 'triangle');
      // the shaker: off-beats by day only, almost not there
      if (calm < 0.4) for (let b = 0; b < 4; b++) audio.noise(0.05, { gain: party ? 0.012 : 0.007, freq: 6500, q: 1.2, delay: t0 - ctx.currentTime + (b + 0.5) * beat, bus: 'music' });
      // the tune: the phrase's rhythm; bars 1–2 wander, bars 3–4 answer and come home to the chord
      let d = degree + 7 + (this.bar % 4 >= 2 ? 2 : 0);
      const answer = this.bar % 4 === 3;
      for (let i = 0; i < 8; i++) {
        if (!this.rhythm[i]) continue;
        d += this.steps[i]!;
        if (answer && i >= 6) d = degree + 7; // land on the chord's root
        const m = Math.min(note(d), key.root + 24);
        this.marimba(hz(m), t0 + i * beat * 0.5, party ? 0.06 : 0.05 * (1 - calm * 0.5));
      }
    }
    // chimes now and then (more of them at night and at the festival)
    if (this.rnd() < (night ? 0.5 : party ? 0.45 : 0.15)) this.voice(hz(chord[2]! + 24), t0 + beat * Math.floor(this.rnd() * 4), beat * 2.5, { type: 'sine', gain: 0.022, attack: 0.005, release: 2.2 });
    this.nextBar = t0 + beat * 4;
    this.bar++;
  }

  /** A marimba-ish note: a sine with a soft fourth-octave shimmer, decaying fast. */
  private marimba(freq: number, t0: number, gain: number) {
    this.pluck(freq, t0, 0.42, gain, 'sine');
    this.pluck(freq * 4, t0, 0.08, gain * 0.18, 'sine');
  }

  private pluck(freq: number, t0: number, dur: number, gain: number, type: OscillatorType) {
    this.voice(freq, t0, dur * 0.2, { type, gain, attack: 0.006, release: dur * 0.8 });
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
      g.gain.setValueAtTime(o.gain, t0 + Math.max(o.attack, dur));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + o.release);
      osc.connect(g); g.connect(out);
      osc.start(t0); osc.stop(t0 + dur + o.release + 0.05);
    } catch { /* ignore */ }
  }
}

export const music = new Music();
