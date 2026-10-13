/**
 * Music: about twenty original chiptune tracks, each grown from a short hand-written motif. A
 * motif is a bar or two of [scale degree, length in eighth notes]; the composer turns it into a
 * 16-bar loop (A, A with a new ending, B a little higher, A coming home), over the track's chords,
 * with a bass line, an optional soft pad and gentle drums. A lookahead scheduler plays it and songs
 * crossfade. Places pick their song through `SONG_FOR` (maps name their music in data/maps).
 */
import { note, type AudioEngine } from './audio';

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const MIXO = [0, 2, 4, 5, 7, 9, 10];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const LYDIAN = [0, 2, 4, 6, 7, 9, 11];

export interface Track {
  tempo: number;
  root: number;
  scale: number[];
  /** Chord roots as scale degrees, one per bar (4 bars, repeated). */
  chords: number[];
  /** [degree, eighths] — a hand-written motif filling 2 bars (16 eighths). */
  motif: [number, number][];
  lead: OscillatorType;
  bass: OscillatorType;
  pad: boolean;
  /** 0 none, 1 soft, 2 lively, 3 battle */
  drums: 0 | 1 | 2 | 3;
  swing?: number;
  leadVol?: number;
}

export const TRACKS: Record<string, Track> = {
  title: { tempo: 104, root: 62, scale: MAJOR, chords: [0, 4, 5, 3], motif: [[0, 2], [2, 2], [4, 2], [7, 2], [6, 3], [4, 1], [5, 4]], lead: 'square', bass: 'triangle', pad: true, drums: 2, leadVol: 0.05 },
  home: { tempo: 78, root: 65, scale: MAJOR, chords: [0, 3, 5, 4], motif: [[4, 2], [2, 2], [0, 4], [1, 2], [2, 2], [4, 4]], lead: 'triangle', bass: 'sine', pad: true, drums: 0 },
  shop: { tempo: 112, root: 67, scale: MAJOR, chords: [0, 3, 4, 0], motif: [[0, 1], [2, 1], [4, 2], [4, 1], [5, 1], [4, 2], [2, 2], [0, 2], [1, 4]], lead: 'square', bass: 'triangle', pad: false, drums: 1, leadVol: 0.045 },
  brightmoor: { tempo: 100, root: 64, scale: MAJOR, chords: [0, 5, 3, 4], motif: [[4, 2], [5, 1], [4, 1], [2, 2], [0, 2], [2, 3], [4, 1], [1, 4]], lead: 'square', bass: 'triangle', pad: false, drums: 1, leadVol: 0.05 },
  meadow: { tempo: 112, root: 67, scale: MAJOR, chords: [0, 3, 0, 4], motif: [[0, 1], [1, 1], [2, 2], [4, 2], [2, 2], [5, 2], [4, 2], [2, 4]], lead: 'triangle', bass: 'triangle', pad: false, drums: 2 },
  seaside: { tempo: 96, root: 69, scale: MAJOR, chords: [0, 4, 3, 4], motif: [[4, 3], [2, 1], [4, 2], [5, 2], [4, 3], [2, 1], [0, 4]], lead: 'triangle', bass: 'triangle', pad: true, drums: 1, swing: 0.2 },
  forest: { tempo: 90, root: 62, scale: DORIAN, chords: [0, 3, 0, 6], motif: [[0, 2], [2, 2], [3, 3], [2, 1], [4, 4], [3, 2], [2, 2]], lead: 'sine', bass: 'triangle', pad: true, drums: 1 },
  woods: { tempo: 84, root: 64, scale: DORIAN, chords: [0, 6, 3, 4], motif: [[4, 4], [3, 2], [2, 2], [0, 3], [1, 1], [2, 4]], lead: 'triangle', bass: 'sine', pad: true, drums: 0 },
  cave: { tempo: 76, root: 57, scale: MINOR, chords: [0, 5, 3, 4], motif: [[0, 3], [2, 1], [3, 4], [4, 2], [3, 2], [2, 4]], lead: 'sine', bass: 'sine', pad: true, drums: 0 },
  mountain: { tempo: 98, root: 62, scale: MIXO, chords: [0, 6, 3, 0], motif: [[0, 2], [4, 2], [6, 2], [7, 2], [6, 2], [4, 2], [5, 4]], lead: 'square', bass: 'triangle', pad: true, drums: 1, leadVol: 0.045 },
  desert: { tempo: 94, root: 64, scale: MIXO, chords: [0, 6, 0, 4], motif: [[4, 1], [5, 1], [4, 2], [2, 2], [6, 2], [4, 3], [2, 1], [0, 4]], lead: 'triangle', bass: 'triangle', pad: false, drums: 1, swing: 0.12 },
  snow: { tempo: 88, root: 69, scale: LYDIAN, chords: [0, 1, 0, 4], motif: [[7, 2], [6, 2], [4, 2], [3, 2], [4, 4], [2, 2], [0, 2]], lead: 'triangle', bass: 'sine', pad: true, drums: 0 },
  sky: { tempo: 100, root: 67, scale: LYDIAN, chords: [0, 1, 5, 4], motif: [[0, 2], [4, 2], [7, 4], [6, 2], [4, 2], [3, 4]], lead: 'sine', bass: 'triangle', pad: true, drums: 1 },
  trial: { tempo: 108, root: 60, scale: DORIAN, chords: [0, 3, 0, 4], motif: [[0, 1], [2, 1], [4, 1], [2, 1], [5, 2], [4, 2], [3, 1], [2, 1], [1, 2], [0, 4]], lead: 'square', bass: 'triangle', pad: false, drums: 1, leadVol: 0.04 },
  beacon: { tempo: 72, root: 64, scale: MAJOR, chords: [0, 4, 5, 3], motif: [[0, 4], [4, 4], [5, 2], [4, 2], [2, 4]], lead: 'triangle', bass: 'sine', pad: true, drums: 0 },
  'battle-wild': { tempo: 138, root: 62, scale: MAJOR, chords: [0, 0, 3, 4], motif: [[0, 1], [0, 1], [4, 2], [2, 1], [4, 1], [5, 2], [4, 1], [2, 1], [1, 2], [2, 4]], lead: 'square', bass: 'triangle', pad: false, drums: 3, leadVol: 0.045 },
  'battle-trainer': { tempo: 146, root: 64, scale: DORIAN, chords: [0, 6, 3, 4], motif: [[0, 1], [2, 1], [4, 1], [6, 1], [7, 2], [6, 2], [4, 1], [3, 1], [4, 2], [2, 4]], lead: 'square', bass: 'square', pad: false, drums: 3, leadVol: 0.04 },
  'battle-keeper': { tempo: 152, root: 60, scale: MIXO, chords: [0, 6, 5, 4], motif: [[0, 2], [4, 1], [4, 1], [5, 2], [6, 2], [7, 2], [6, 1], [4, 1], [5, 4]], lead: 'square', bass: 'triangle', pad: true, drums: 3, leadVol: 0.045 },
  guardian: { tempo: 84, root: 62, scale: LYDIAN, chords: [0, 1, 4, 5], motif: [[0, 3], [3, 1], [4, 4], [7, 2], [6, 2], [4, 4]], lead: 'triangle', bass: 'sine', pad: true, drums: 1 },
  credits: { tempo: 96, root: 65, scale: MAJOR, chords: [0, 4, 5, 3], motif: [[0, 2], [2, 2], [4, 2], [7, 2], [6, 3], [4, 1], [5, 4]], lead: 'triangle', bass: 'triangle', pad: true, drums: 1 },
  base: { tempo: 86, root: 67, scale: MAJOR, chords: [0, 5, 3, 4], motif: [[2, 2], [4, 2], [5, 2], [4, 2], [2, 4], [1, 2], [0, 2]], lead: 'sine', bass: 'triangle', pad: true, drums: 0 },
};

/** Map and scene music names → tracks (Trials use one track in six keys). */
export const SONG_FOR: Record<string, { track: string; shift?: number }> = {
  title: { track: 'title' }, home: { track: 'home' }, rest: { track: 'home' }, academy: { track: 'brightmoor', shift: -2 }, shop: { track: 'shop' },
  garden: { track: 'meadow', shift: -2 }, 'town-brightmoor': { track: 'brightmoor' }, 'route-meadow': { track: 'meadow' },
  'town-saltwhistle': { track: 'seaside' }, 'route-shore': { track: 'seaside', shift: 2 }, 'route-cliff': { track: 'mountain', shift: -3 },
  'town-mossgrove': { track: 'forest' }, 'route-woods': { track: 'woods' }, 'route-whisper': { track: 'woods', shift: -2 }, cave: { track: 'cave' },
  'route-mountain': { track: 'mountain' }, 'town-cragtop': { track: 'mountain', shift: 2 }, 'route-canyon': { track: 'desert', shift: -2 },
  'town-dunehollow': { track: 'desert' }, 'route-desert': { track: 'desert', shift: 1 }, 'route-frost': { track: 'snow', shift: -2 }, 'town-frostfall': { track: 'snow' },
  'route-sky': { track: 'sky', shift: -2 }, 'sky-island': { track: 'sky' }, beacon: { track: 'beacon' },
  'trial-1': { track: 'trial' }, 'trial-2': { track: 'trial', shift: 2 }, 'trial-3': { track: 'trial', shift: -3 }, 'trial-4': { track: 'trial', shift: 4 }, 'trial-5': { track: 'trial', shift: -1 }, 'trial-6': { track: 'trial', shift: 5 },
  'battle-wild': { track: 'battle-wild' }, 'battle-trainer': { track: 'battle-trainer' }, 'battle-keeper': { track: 'battle-keeper' }, 'battle-rival': { track: 'battle-keeper', shift: 2 },
  guardian: { track: 'guardian' }, credits: { track: 'credits' }, base: { track: 'base' },
};

export interface NoteEv { step: number; n: number; len: number }
export interface Composed { track: Track; steps: number; lead: NoteEv[]; bass: NoteEv[]; pad: NoteEv[] }

/** Build the 16-bar loop from the motif (eighth-note steps; 8 per bar). */
export function compose(id: string): Composed {
  const song = SONG_FOR[id] ?? { track: id };
  const track = TRACKS[song.track] ?? TRACKS.meadow!;
  const shift = song.shift ?? 0;
  const sc = track.scale;
  const deg = (d: number, oct = 0) => track.root + shift + sc[((d % sc.length) + sc.length) % sc.length]! + 12 * (oct + Math.floor(d / sc.length));
  const phrase = (from: number, vary: (d: number, i: number, last: boolean) => number): NoteEv[] => {
    const out: NoteEv[] = [];
    let step = from;
    track.motif.forEach(([d, len], i) => {
      out.push({ step, n: deg(vary(d, i, i === track.motif.length - 1)), len });
      step += len;
    });
    return out;
  };
  // A: the motif twice (bars 1–4), A': with a new ending, B: a third higher, A'': home to the tonic
  const lead = [
    ...phrase(0, d => d), ...phrase(16, (d, _i, last) => (last ? d + 1 : d)),
    ...phrase(32, d => d + 2), ...phrase(48, (d, _i, last) => (last ? 0 : d)),
  ];
  const bass: NoteEv[] = [];
  const pad: NoteEv[] = [];
  for (let bar = 0; bar < 8; bar++) {
    const root = track.chords[bar % track.chords.length]!;
    for (const beat of [0, 4]) bass.push({ step: bar * 8 + beat, n: deg(root, -2), len: 3 });
    if (bar % 2 === 1) bass.push({ step: bar * 8 + 6, n: deg(root + 4, -2), len: 2 });
    if (track.pad) for (const k of [0, 2, 4]) pad.push({ step: bar * 8, n: deg(root + k, -1), len: 8 });
  }
  // the loop is 8 bars of chords under 64 steps of melody (the melody spans 4 phrases of 16)
  return { track, steps: 64, lead, bass, pad };
}

export class Music {
  private current = '';
  private song: Composed | null = null;
  private out: GainNode | null = null;
  private step = 0;
  private nextAt = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private audio: AudioEngine) {}

  /** The song asked for last (what to go back to after a battle). */
  get playing(): string { return this.current; }

  /** Play a song by name (no change if it is already playing). '' stops. */
  play(id: string): void {
    if (id === this.current) return;
    this.current = id;
    this.audio.whenStarted(() => { if (this.current === id) this.begin(id); });
  }

  private begin(id: string): void {
    const ctx = this.audio.ctx;
    if (!ctx) return;
    // fade the old song out, the new one in
    if (this.out) {
      const old = this.out;
      old.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
      setTimeout(() => old.disconnect(), 1500);
    }
    this.out = null;
    this.song = null;
    if (!id) { this.stopTimer(); return; }
    const out = this.audio.sub('music');
    if (!out) return;
    out.gain.setValueAtTime(0, ctx.currentTime);
    out.gain.setTargetAtTime(1, ctx.currentTime + 0.2, 0.3);
    this.out = out;
    this.song = compose(id);
    this.step = 0;
    this.nextAt = ctx.currentTime + 0.25;
    if (!this.timer) this.timer = setInterval(() => this.schedule(), 90);
  }

  private stopTimer(): void { if (this.timer) { clearInterval(this.timer); this.timer = null; } }

  private schedule(): void {
    const ctx = this.audio.ctx;
    const song = this.song;
    if (!ctx || !song || !this.out) return;
    const t = song.track;
    const eighth = 60 / t.tempo / 2;
    while (this.nextAt < ctx.currentTime + 0.35) {
      const s = this.step % song.steps;
      const swing = s % 2 === 1 ? (t.swing ?? 0) * eighth : 0;
      const at = this.nextAt + swing;
      for (const n of song.lead) if (n.step === s) this.audio.tone({ freq: note(n.n), dur: n.len * eighth * 0.9, type: t.lead, vol: t.leadVol ?? 0.06, at, out: this.out, attack: 0.01 });
      for (const n of song.bass) if (n.step === s) this.audio.tone({ freq: note(n.n), dur: n.len * eighth * 0.85, type: t.bass, vol: 0.07, at, out: this.out });
      for (const n of song.pad) if (n.step === s) this.audio.tone({ freq: note(n.n), dur: n.len * eighth, type: 'sine', vol: 0.025, at, out: this.out, attack: 0.15 });
      this.drums(t.drums, s, at, eighth);
      this.step++;
      this.nextAt += eighth;
    }
  }

  private drums(kind: Track['drums'], s: number, at: number, eighth: number): void {
    if (!kind || !this.out) return;
    const beat = s % 8;
    if (beat === 0 || (kind === 3 && beat === 4)) this.audio.tone({ freq: 110, dur: 0.12, type: 'sine', vol: 0.12, at, out: this.out, slide: 0.4 });
    if (kind >= 2 && (beat === 4 || (kind === 3 && beat === 6 && s % 16 >= 8))) this.audio.hiss({ dur: 0.08, vol: 0.06, at, freq: 1800, q: 0.8, out: this.out });
    if (s % 2 === 0) this.audio.hiss({ dur: 0.03, vol: kind === 1 ? 0.02 : 0.03, at, freq: 7000, q: 1.5, type: 'highpass', out: this.out });
    void eighth;
  }
}
