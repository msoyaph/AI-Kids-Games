import { hashString, Rng } from '../core/rng';

/** Note helper: MIDI number → Hz. */
export const mtof = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

export interface TrackDef {
  id: string;
  bpm: number;
  /** MIDI root of the key. */
  root: number;
  /** Scale intervals used for melody (pentatonic = always sounds nice). */
  scale: number[];
  /** Chord roots as scale-degree semitone offsets from root, one per bar. */
  chords: number[];
  /** Minor (true) or major triads. */
  minor: boolean[];
  lead: OscillatorType;
  bass: OscillatorType;
  pad: OscillatorType;
  /** 0..1 drum intensity. */
  drums: number;
  /** Bell-like sparkle layer. */
  bells: boolean;
  swing: number;
}

const MAJ_PENTA = [0, 2, 4, 7, 9];
const MIN_PENTA = [0, 3, 5, 7, 10];

export const TRACKS: Record<string, TrackDef> = {
  title: { id: 'title', bpm: 96, root: 60, scale: MAJ_PENTA, chords: [0, 9, 5, 7], minor: [false, true, false, false], lead: 'triangle', bass: 'sine', pad: 'triangle', drums: 0.35, bells: true, swing: 0.1 },
  meadow: { id: 'meadow', bpm: 116, root: 62, scale: MAJ_PENTA, chords: [0, 7, 9, 5], minor: [false, false, true, false], lead: 'square', bass: 'triangle', pad: 'triangle', drums: 0.8, bells: false, swing: 0.12 },
  desert: { id: 'desert', bpm: 110, root: 57, scale: [0, 2, 3, 7, 9], chords: [0, 5, 7, 3], minor: [true, false, false, false], lead: 'sawtooth', bass: 'triangle', pad: 'triangle', drums: 0.85, bells: false, swing: 0.18 },
  snow: { id: 'snow', bpm: 104, root: 65, scale: MAJ_PENTA, chords: [0, 5, 9, 7], minor: [false, false, true, false], lead: 'triangle', bass: 'sine', pad: 'sine', drums: 0.55, bells: true, swing: 0.08 },
  caves: { id: 'caves', bpm: 108, root: 64, scale: MIN_PENTA, chords: [0, 8, 3, 10], minor: [true, false, false, false], lead: 'square', bass: 'triangle', pad: 'triangle', drums: 0.7, bells: true, swing: 0.1 },
  boss: { id: 'boss', bpm: 136, root: 57, scale: MIN_PENTA, chords: [0, 8, 10, 7], minor: [true, false, false, true], lead: 'square', bass: 'sawtooth', pad: 'triangle', drums: 1, bells: false, swing: 0 },
};

interface NoteEvt {
  /** 16th-note step within the loop. */
  step: number;
  len: number;
  midi: number;
}

/** Build a 4-bar melody from the scale with a seeded, sing-song rhythm. */
export function composeMelody(t: TrackDef): NoteEvt[] {
  const rng = new Rng(hashString(t.id));
  const rhythms = [
    [0, 2, 4, 6, 8, 10, 12],
    [0, 3, 6, 8, 12, 14],
    [0, 2, 3, 6, 8, 11, 12],
    [0, 4, 6, 8, 10, 12],
  ];
  const out: NoteEvt[] = [];
  let degree = 2;
  for (let bar = 0; bar < 4; bar++) {
    const r = rhythms[(bar + rng.int(0, 3)) % rhythms.length]!;
    for (let k = 0; k < r.length; k++) {
      const step = bar * 16 + r[k]!;
      const next = r[k + 1] ?? 16;
      degree = Math.max(0, Math.min(9, degree + rng.pick([-2, -1, -1, 0, 1, 1, 2])));
      // land on a chord tone at the start of each bar
      if (k === 0) degree = rng.pick([0, 2, 3, 5]);
      const oct = Math.floor(degree / t.scale.length);
      const midi = t.root + 12 + t.scale[degree % t.scale.length]! + oct * 12;
      out.push({ step, len: Math.max(1, next - r[k]! - (rng.chance(0.3) ? 1 : 0)), midi });
    }
  }
  return out;
}

/**
 * Lookahead step sequencer (16th notes). Schedules a little ahead of the
 * audio clock from a timer so timing stays tight even if frames stutter.
 */
export class MusicPlayer {
  private track: TrackDef | null = null;
  private melody: NoteEvt[] = [];
  private nextTime = 0;
  private step = 0;
  private timer = 0;
  private loopCount = 0;

  constructor(
    private readonly ctx: AudioContext,
    private readonly out: GainNode,
    private readonly noise: AudioBuffer,
  ) {}

  get current(): string | null {
    return this.track?.id ?? null;
  }

  play(id: string): void {
    const t = TRACKS[id] ?? TRACKS.meadow!;
    if (this.track?.id === t.id && this.timer) return;
    this.stop();
    this.track = t;
    this.melody = composeMelody(t);
    this.step = 0;
    this.loopCount = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = 0;
    this.track = null;
  }

  private schedule(): void {
    const t = this.track;
    if (!t || this.ctx.state !== 'running') return;
    const sixteenth = 60 / t.bpm / 4;
    // never let a long stall cause a burst of catch-up notes
    if (this.nextTime < this.ctx.currentTime - 0.2) this.nextTime = this.ctx.currentTime + 0.05;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      const swing = this.step % 2 === 1 ? sixteenth * t.swing : 0;
      this.playStep(t, this.step, this.nextTime + swing, sixteenth);
      this.nextTime += sixteenth;
      this.step = (this.step + 1) % 64;
      if (this.step === 0) this.loopCount++;
    }
  }

  private playStep(t: TrackDef, step: number, time: number, s16: number): void {
    const bar = Math.floor(step / 16);
    const beat = step % 16;
    const chordRoot = t.root + t.chords[bar]!;
    const minor = t.minor[bar]!;
    const third = minor ? 3 : 4;
    // drums
    if (t.drums > 0) {
      if (beat === 0 || beat === 8 || (t.drums > 0.75 && beat === 10)) this.kick(time, 0.5 * t.drums);
      if (beat === 4 || beat === 12) this.snare(time, 0.22 * t.drums);
      if (beat % 2 === 0) this.hat(time, (beat % 4 === 2 ? 0.08 : 0.05) * t.drums);
    }
    // bass: root on the beat, fifth on the off-beat
    if (beat % 4 === 0) this.tone(t.bass, mtof(chordRoot - 24 + (beat === 8 ? 7 : 0)), time, s16 * 3.2, 0.22, 0.005, 0.12);
    // chord stabs / pad
    if (beat === 0 || beat === 6 || beat === 10) {
      for (const iv of [0, third, 7]) this.tone(t.pad, mtof(chordRoot + iv), time, s16 * (beat === 0 ? 5 : 3), 0.045, 0.01, 0.15);
    }
    // melody: play on loops 1+ (the first loop is a gentle intro), vary every other loop
    if (this.loopCount > 0 || t.id === 'title') {
      for (const n of this.melody) {
        if (n.step !== step) continue;
        const up = this.loopCount % 4 === 3 ? 12 : 0;
        this.tone(t.lead, mtof(n.midi + up), time, n.len * s16 * 0.95, t.lead === 'square' || t.lead === 'sawtooth' ? 0.045 : 0.08, 0.008, 0.08);
      }
    }
    if (t.bells && beat === 14 && bar % 2 === 1) this.bell(mtof(t.root + 24 + t.scale[(step / 2) % t.scale.length | 0]!), time);
  }

  private tone(type: OscillatorType, freq: number, time: number, dur: number, vol: number, attack: number, release: number): void {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(vol, time + attack);
    g.gain.setValueAtTime(vol, time + Math.max(attack, dur - release));
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur + release);
    o.connect(g).connect(this.out);
    o.start(time);
    o.stop(time + dur + release + 0.02);
  }

  private bell(freq: number, time: number): void {
    const c = this.ctx;
    const o = c.createOscillator();
    const m = c.createOscillator();
    const mg = c.createGain();
    const g = c.createGain();
    o.type = 'sine';
    m.type = 'sine';
    o.frequency.value = freq;
    m.frequency.value = freq * 3.5;
    mg.gain.value = freq * 0.6;
    m.connect(mg).connect(o.frequency);
    g.gain.setValueAtTime(0.06, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 1.2);
    o.connect(g).connect(this.out);
    o.start(time);
    m.start(time);
    o.stop(time + 1.25);
    m.stop(time + 1.25);
  }

  private kick(time: number, vol: number): void {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(140, time);
    o.frequency.exponentialRampToValueAtTime(42, time + 0.12);
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
    o.connect(g).connect(this.out);
    o.start(time);
    o.stop(time + 0.2);
  }

  private snare(time: number, vol: number): void {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1800;
    f.Q.value = 0.8;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.13);
    s.connect(f).connect(g).connect(this.out);
    s.start(time, Math.random() * 0.5);
    s.stop(time + 0.15);
  }

  private hat(time: number, vol: number): void {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7000;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
    s.connect(f).connect(g).connect(this.out);
    s.start(time, Math.random() * 0.5);
    s.stop(time + 0.05);
  }
}
