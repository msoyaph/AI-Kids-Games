import { hashString, Rng } from '../core/rng';
import { MIX } from './mix';
import { Synth } from './synth';

export { mtof } from './synth';

/**
 * Hybrid-epic music: taiko and toms, saw-string pads, brass stabs and pulse
 * arps in minor/dorian keys. Every track has three layers that fade in with
 * the action (calm → action → intense); bosses get their own themes.
 */
export interface TrackDef {
  id: string;
  bpm: number;
  /** MIDI tonic. */
  root: number;
  /** Seven-note mode (semitones). */
  mode: number[];
  /** Chord per bar as a scale degree (4 bars). */
  chords: number[];
  /** Arp pattern: chord-tone index per 16th (-1 = rest). */
  arp: number[];
  /** Taiko / tom hits (16th steps in a bar). */
  taiko: number[];
  toms: number[];
  /** Lead voice for the melody layer. */
  lead: 'brass' | 'pluck' | 'strings' | 'bell';
  /** FM bells sprinkled over the calm layer. */
  bells?: boolean;
  /** Filter brightness of the pads. */
  bright?: number;
  /** Bosses play every layer all the time. */
  boss?: boolean;
}

const AEOLIAN = [0, 2, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10];
const LYDIAN = [0, 2, 4, 6, 7, 9, 11];
const HARMONIC = [0, 2, 3, 5, 7, 8, 11];

const ARP_A = [0, 1, 2, 1, 0, 1, 2, 3, 0, 1, 2, 1, 0, 2, 1, 2];
const ARP_B = [0, -1, 2, 1, 0, -1, 2, 1, 3, -1, 2, 1, 0, 1, 2, 3];
const ARP_C = [0, 2, 1, 2, 0, 2, 1, 3, 0, 2, 1, 2, 3, 2, 1, 0];

export const TRACKS: Record<string, TrackDef> = {
  title: { id: 'title', bpm: 96, root: 62, mode: DORIAN, chords: [0, 5, 3, 4], arp: ARP_A, taiko: [0], toms: [12], lead: 'strings', bells: true, bright: 2200 },
  reach: { id: 'reach', bpm: 118, root: 62, mode: DORIAN, chords: [0, 6, 3, 4], arp: ARP_A, taiko: [0, 6, 10], toms: [12, 14], lead: 'brass', bright: 2000 },
  wastes: { id: 'wastes', bpm: 124, root: 57, mode: PHRYGIAN, chords: [0, 1, 6, 4], arp: ARP_B, taiko: [0, 3, 8, 11], toms: [6, 14], lead: 'pluck', bright: 1700 },
  frost: { id: 'frost', bpm: 112, root: 64, mode: AEOLIAN, chords: [0, 5, 2, 6], arp: ARP_C, taiko: [0, 8], toms: [12, 13, 14], lead: 'bell', bells: true, bright: 2600 },
  deep: { id: 'deep', bpm: 120, root: 61, mode: HARMONIC, chords: [0, 5, 3, 4], arp: ARP_B, taiko: [0, 7, 10], toms: [4, 12], lead: 'strings', bright: 1400 },
  skyforge: { id: 'skyforge', bpm: 126, root: 65, mode: LYDIAN, chords: [0, 1, 5, 4], arp: ARP_A, taiko: [0, 6, 8, 14], toms: [10, 11], lead: 'brass', bells: true, bright: 2800 },
  rift: { id: 'rift', bpm: 132, root: 59, mode: PHRYGIAN, chords: [0, 1, 0, 6], arp: ARP_C, taiko: [0, 3, 6, 10, 12], toms: [14, 15], lead: 'brass', bright: 1600 },
  // boss themes
  'boss.kinggloop': { id: 'boss.kinggloop', bpm: 138, root: 57, mode: AEOLIAN, chords: [0, 5, 6, 4], arp: ARP_C, taiko: [0, 4, 8, 12], toms: [14, 15], lead: 'bell', boss: true, bright: 2400 },
  'boss.bigclank': { id: 'boss.bigclank', bpm: 132, root: 52, mode: PHRYGIAN, chords: [0, 1, 0, 6], arp: ARP_B, taiko: [0, 3, 6, 8, 11], toms: [12, 14], lead: 'brass', boss: true, bright: 1300 },
  'boss.mamapuff': { id: 'boss.mamapuff', bpm: 144, root: 60, mode: DORIAN, chords: [0, 6, 5, 4], arp: ARP_A, taiko: [0, 8, 10], toms: [4, 12, 13, 14], lead: 'pluck', boss: true, bright: 2600 },
  'boss.grumbleking': { id: 'boss.grumbleking', bpm: 140, root: 55, mode: HARMONIC, chords: [0, 1, 4, 0], arp: ARP_C, taiko: [0, 3, 6, 8, 10, 12], toms: [14, 15], lead: 'brass', boss: true, bright: 1800 },
};

/** Which track each map theme uses. */
export const THEME_TRACK: Record<string, string> = {
  meadow: 'reach',
  desert: 'wastes',
  snow: 'frost',
  caves: 'deep',
  sky: 'skyforge',
  rift: 'rift',
};

interface NoteEvt {
  step: number;
  len: number;
  degree: number;
}

/** Scale degree → MIDI note. */
function noteOf(t: TrackDef, degree: number, octave = 0): number {
  const oct = Math.floor(degree / 7);
  return t.root + t.mode[((degree % 7) + 7) % 7]! + (oct + octave) * 12;
}

/** A 4-bar melody built on chord tones with stepwise passing notes. */
export function composeMelody(t: TrackDef): NoteEvt[] {
  const rng = new Rng(hashString(t.id));
  const rhythms = [
    [0, 4, 6, 8, 12],
    [0, 3, 6, 10, 12, 14],
    [0, 2, 4, 8, 11],
    [0, 6, 8, 12],
  ];
  const out: NoteEvt[] = [];
  for (let bar = 0; bar < 4; bar++) {
    const r = rhythms[(bar + rng.int(0, 3)) % rhythms.length]!;
    const chord = t.chords[bar]!;
    let deg = chord + rng.pick([0, 2, 4]);
    for (let k = 0; k < r.length; k++) {
      const next = r[k + 1] ?? 16;
      if (k > 0) deg += rng.pick([-1, 1, 1, 2, -2]);
      out.push({ step: bar * 16 + r[k]!, len: Math.max(1, next - r[k]!), degree: deg });
    }
  }
  return out;
}

/** The three layer buses a track plays into. */
export interface Layers {
  calm: GainNode;
  action: GainNode;
  intense: GainNode;
}

/**
 * Schedules one 16th step of a track on all three layers. Shared by the live
 * player and the offline renderer (audio-levels script).
 */
export function scheduleStep(syn: Synth, L: Layers, t: TrackDef, melody: NoteEvt[], step: number, time: number, loop: number, play: { action: boolean; intense: boolean }): void {
  const s16 = 60 / t.bpm / 4;
  const bar = Math.floor(step / 16) % 4;
  const beat = step % 16;
  const chord = t.chords[bar]!;
  const tone = (i: number, oct = 0): number => noteOf(t, chord + [0, 2, 4, 7][i % 4]!, oct);
  // ---- calm: string pad per bar, bass on 1, a single taiko, bells
  if (beat === 0) {
    for (const i of [0, 1, 2]) syn.strings(L.calm, tone(i), time, s16 * 15, 0.05, t.bright);
    syn.bass(L.calm, tone(0, -2), time, s16 * 6, 0.16);
    syn.taiko(L.calm, time, 0.32);
  }
  if (t.bells && beat === 14 && bar % 2 === 1) syn.bell(L.calm, tone(2, 1), time, 0.045);
  // ---- action: pulse arp, bass ostinato, taiko/tom groove, hats
  if (play.action) {
    const a = t.arp[beat]!;
    if (a >= 0) syn.pluck(L.action, tone(a, 1), time, s16 * 0.9, 0.05);
    if (beat % 4 === 2) syn.bass(L.action, tone(beat === 10 ? 2 : 0, -2), time, s16 * 1.8, 0.12);
    if (t.taiko.includes(beat)) syn.taiko(L.action, time, beat === 0 ? 0.42 : 0.3);
    if (t.toms.includes(beat)) syn.tom(L.action, time, 0.22, 120 + beat * 4);
    if (beat % 2 === 0) syn.hat(L.action, time, beat % 4 === 2 ? 0.06 : 0.035);
  }
  // ---- intense: brass stabs, snare backbeat, the melody
  if (play.intense) {
    if (beat === 0 || beat === 6 || (beat === 10 && bar % 2 === 1)) for (const i of [0, 1, 2]) syn.brass(L.intense, tone(i), time, s16 * (beat === 0 ? 3 : 1.6), 0.035);
    if (beat === 4 || beat === 12) syn.snare(L.intense, time, 0.2);
    if (beat % 2 === 1) syn.hat(L.intense, time, 0.03);
    for (const n of melody) {
      if (n.step !== step) continue;
      const midi = noteOf(t, n.degree, 1 + (loop % 4 === 3 ? 1 : 0));
      const dur = n.len * s16 * 0.92;
      if (t.lead === 'brass') syn.brass(L.intense, midi, time, dur, 0.05);
      else if (t.lead === 'strings') syn.strings(L.intense, midi, time, dur, 0.07, (t.bright ?? 2000) + 800);
      else if (t.lead === 'bell') syn.bell(L.intense, midi, time, 0.07);
      else syn.pluck(L.intense, midi, time, dur, 0.08, 'sawtooth');
    }
    // a swell into every fourth bar
    if (beat === 8 && bar === 3) syn.swell(L.intense, time, s16 * 8, 0.05);
  }
}

/**
 * Live lookahead sequencer. `intensity` (0..1) fades the action and intense
 * layers in and out smoothly; bosses always play everything. Switching tracks
 * crossfades: the old chain fades out while the new one starts.
 */
export class MusicPlayer {
  private track: TrackDef | null = null;
  private melody: NoteEvt[] = [];
  private nextTime = 0;
  private step = 0;
  private timer = 0;
  private loop = 0;
  private chain: { gain: GainNode; layers: Layers } | null = null;
  private intensity = 0.2;

  constructor(
    private readonly syn: Synth,
    private readonly out: AudioNode,
  ) {}

  get current(): string | null {
    return this.track?.id ?? null;
  }

  /** The playing track's tonic (stingers play in the same key). */
  get root(): number {
    return this.track?.root ?? 62;
  }

  play(id: string): void {
    const t = TRACKS[id] ?? TRACKS.reach!;
    if (this.track?.id === t.id && this.timer) return;
    this.stop(0.35);
    const c = this.syn.ctx;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(MIX.tracks[t.id] ?? 1, c.currentTime + 0.4);
    gain.connect(this.out);
    const layers: Layers = { calm: c.createGain(), action: c.createGain(), intense: c.createGain() };
    for (const g of Object.values(layers)) g.connect(gain);
    this.chain = { gain, layers };
    this.track = t;
    this.melody = composeMelody(t);
    this.step = 0;
    this.loop = 0;
    this.nextTime = c.currentTime + 0.08;
    this.applyIntensity(true);
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  /** Stops scheduling and fades out what is already queued. */
  stop(fade = 0.25): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = 0;
    this.track = null;
    const ch = this.chain;
    this.chain = null;
    if (!ch) return;
    const now = this.syn.ctx.currentTime;
    ch.gain.gain.cancelScheduledValues(now);
    ch.gain.gain.setTargetAtTime(0, now, fade / 3);
    window.setTimeout(() => ch.gain.disconnect(), (fade + 2) * 1000);
  }

  /** 0 = calm only, ~0.4 = + action layer, ~0.75+ = everything. */
  setIntensity(x: number): void {
    const v = Math.max(0, Math.min(1, x));
    if (Math.abs(v - this.intensity) < 0.02) return;
    this.intensity = v;
    this.applyIntensity(false);
  }

  private targets(): { action: number; intense: number } {
    return layerTargets(this.track, this.intensity);
  }

  private applyIntensity(instant: boolean): void {
    const ch = this.chain;
    if (!ch) return;
    const tg = this.targets();
    const now = this.syn.ctx.currentTime;
    const set = (g: GainNode, v: number): void => {
      if (instant) g.gain.value = v;
      else g.gain.setTargetAtTime(v, now, 1.2);
    };
    set(ch.layers.calm, 1);
    set(ch.layers.action, tg.action);
    set(ch.layers.intense, tg.intense);
  }

  private schedule(): void {
    const t = this.track;
    const ch = this.chain;
    const c = this.syn.ctx as AudioContext;
    if (!t || !ch || c.state !== 'running') return;
    const s16 = 60 / t.bpm / 4;
    if (this.nextTime < c.currentTime - 0.2) this.nextTime = c.currentTime + 0.05;
    const tg = this.targets();
    while (this.nextTime < c.currentTime + 0.12) {
      scheduleStep(this.syn, ch.layers, t, this.melody, this.step, this.nextTime, this.loop, { action: tg.action > 0.01, intense: tg.intense > 0.01 });
      this.nextTime += s16;
      this.step = (this.step + 1) % 64;
      if (this.step === 0) this.loop++;
    }
  }
}

/** Layer gains for a track at an intensity (bosses play everything). */
export function layerTargets(t: TrackDef | null, x: number): { action: number; intense: number } {
  if (t?.boss) return { action: 1, intense: 1 };
  return { action: Math.min(1, Math.max(0, (x - 0.2) / 0.25)), intense: Math.min(1, Math.max(0, (x - 0.55) / 0.25)) };
}

/** Offline render of `seconds` of a track at a fixed intensity (mixing script). */
export function renderTrackOffline(syn: Synth, out: AudioNode, id: string, intensity: number, seconds: number, gain = MIX.tracks[id] ?? 1): void {
  const t = TRACKS[id]!;
  const c = syn.ctx;
  const trackGain = c.createGain();
  trackGain.gain.value = gain;
  trackGain.connect(out);
  const L: Layers = { calm: c.createGain(), action: c.createGain(), intense: c.createGain() };
  for (const g of Object.values(L)) g.connect(trackGain);
  const tg = layerTargets(t, intensity);
  L.action.gain.value = tg.action;
  L.intense.gain.value = tg.intense;
  const melody = composeMelody(t);
  const s16 = 60 / t.bpm / 4;
  let time = 0.05;
  for (let i = 0; time < seconds; i++) {
    scheduleStep(syn, L, t, melody, i % 64, time, Math.floor(i / 64), { action: tg.action > 0.01, intense: tg.intense > 0.01 });
    time += s16;
  }
}
