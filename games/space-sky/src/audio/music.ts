import { Rng } from '../core/rng';
import type { AudioEngine } from './audio';

/**
 * Procedural music. Each track is a short recipe (tempo, key, mode, chords, instruments).
 * A seeded composer turns the recipe into an 8-bar loop (melody, bass, pads, arpeggios,
 * drums) that a lookahead scheduler plays on the Web Audio clock.
 */

type Mode = 'major' | 'lydian' | 'mixolydian' | 'dorian';

export interface TrackDef {
  bpm: number;
  /** MIDI note of the key's root (60 = middle C). */
  root: number;
  mode: Mode;
  /** One chord per bar, as scale degrees (0 = I). */
  chords: number[];
  seed: number;
  lead: OscillatorType;
  leadVol: number;
  pad: boolean;
  arp: 'none' | 'eighth' | 'sixteenth';
  bass: 'pulse' | 'root8' | 'walk' | 'soft';
  drums: 'none' | 'soft' | 'beat' | 'drive';
  bells?: boolean;
}

const MODES: Record<Mode, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
};

export const TRACKS: Record<string, TrackDef> = {
  title: { bpm: 100, root: 60, mode: 'major', chords: [0, 4, 5, 3, 0, 4, 3, 4], seed: 11, lead: 'triangle', leadVol: 0.11, pad: true, arp: 'eighth', bass: 'soft', drums: 'soft', bells: true },
  hub: { bpm: 92, root: 65, mode: 'major', chords: [0, 5, 3, 4, 0, 5, 1, 4], seed: 22, lead: 'triangle', leadVol: 0.1, pad: true, arp: 'none', bass: 'walk', drums: 'soft' },
  map: { bpm: 80, root: 62, mode: 'lydian', chords: [0, 1, 0, 1, 5, 4, 0, 4], seed: 33, lead: 'sine', leadVol: 0.1, pad: true, arp: 'sixteenth', bass: 'soft', drums: 'none', bells: true },
  flight: { bpm: 122, root: 55, mode: 'mixolydian', chords: [0, 6, 3, 0, 0, 6, 3, 4], seed: 44, lead: 'square', leadVol: 0.06, pad: true, arp: 'sixteenth', bass: 'root8', drums: 'drive' },
  explore_moon: { bpm: 96, root: 64, mode: 'lydian', chords: [0, 1, 4, 0, 5, 1, 3, 4], seed: 55, lead: 'sine', leadVol: 0.11, pad: true, arp: 'eighth', bass: 'soft', drums: 'soft', bells: true },
  explore_hot: { bpm: 104, root: 62, mode: 'mixolydian', chords: [0, 6, 0, 3, 0, 6, 4, 4], seed: 66, lead: 'triangle', leadVol: 0.11, pad: false, arp: 'eighth', bass: 'pulse', drums: 'beat' },
  explore_mars: { bpm: 100, root: 57, mode: 'mixolydian', chords: [0, 3, 6, 0, 0, 3, 4, 4], seed: 77, lead: 'square', leadVol: 0.05, pad: true, arp: 'eighth', bass: 'walk', drums: 'beat' },
  explore_station: { bpm: 108, root: 65, mode: 'major', chords: [0, 3, 4, 0, 5, 3, 1, 4], seed: 88, lead: 'square', leadVol: 0.05, pad: true, arp: 'sixteenth', bass: 'root8', drums: 'beat' },
  explore_ice: { bpm: 88, root: 58, mode: 'lydian', chords: [0, 1, 5, 4, 0, 1, 3, 4], seed: 99, lead: 'sine', leadVol: 0.11, pad: true, arp: 'sixteenth', bass: 'soft', drums: 'soft', bells: true },
  explore_titan: { bpm: 96, root: 55, mode: 'dorian', chords: [0, 3, 0, 4, 5, 3, 6, 4], seed: 111, lead: 'triangle', leadVol: 0.1, pad: true, arp: 'eighth', bass: 'pulse', drums: 'soft' },
  explore_zephyra: { bpm: 112, root: 60, mode: 'lydian', chords: [0, 1, 5, 4, 0, 1, 3, 4], seed: 122, lead: 'triangle', leadVol: 0.11, pad: true, arp: 'sixteenth', bass: 'walk', drums: 'beat', bells: true },
  wormhole: { bpm: 136, root: 62, mode: 'lydian', chords: [0, 1, 0, 1, 5, 4, 5, 4], seed: 133, lead: 'sine', leadVol: 0.1, pad: true, arp: 'sixteenth', bass: 'root8', drums: 'drive', bells: true },
  finale: { bpm: 110, root: 60, mode: 'major', chords: [0, 3, 4, 0, 5, 3, 4, 4], seed: 144, lead: 'square', leadVol: 0.07, pad: true, arp: 'eighth', bass: 'walk', drums: 'beat', bells: true },
  credits: { bpm: 96, root: 65, mode: 'major', chords: [0, 5, 3, 4, 0, 5, 3, 4], seed: 155, lead: 'triangle', leadVol: 0.11, pad: true, arp: 'eighth', bass: 'soft', drums: 'soft', bells: true },
};

/** Which exploration track fits a level theme. */
export function exploreTrack(theme: string): string {
  if (theme === 'moon') return 'explore_moon';
  if (theme === 'mercury' || theme === 'venus') return 'explore_hot';
  if (theme.startsWith('mars') || theme === 'olympus') return 'explore_mars';
  if (theme === 'ceres' || theme === 'ganymede' || theme === 'callisto') return 'explore_station';
  if (theme === 'titan') return 'explore_titan';
  if (theme.startsWith('z')) return 'explore_zephyra';
  return 'explore_ice';
}

export interface NoteEvent {
  step: number;
  kind: 'lead' | 'bass' | 'pad' | 'arp' | 'bell' | 'kick' | 'snare' | 'hat';
  midi: number;
  len: number;
  vol: number;
}

const RHYTHMS = [
  [0, 4, 8, 12],
  [0, 3, 6, 8, 12],
  [0, 2, 4, 8, 10, 12],
  [0, 6, 8, 14],
  [0, 4, 6, 8, 12, 14],
  [0, 2, 8, 12],
];

/** Compose an 8-bar loop. Pure and deterministic for a track (tested). */
export function compose(t: TrackDef): NoteEvent[] {
  const rng = new Rng(t.seed);
  const scale = MODES[t.mode];
  const deg = (d: number) => {
    const o = Math.floor(d / 7);
    const i = ((d % 7) + 7) % 7;
    return t.root + o * 12 + scale[i];
  };
  const ev: NoteEvent[] = [];
  const bars = t.chords.length;
  // Motifs: bar rhythm + note contour, reused for A/A'/B/A form.
  const motifA = { r: RHYTHMS[rng.int(0, RHYTHMS.length - 1)], c: [0, 2, 1, 2, 4, 3] };
  const motifB = { r: RHYTHMS[rng.int(0, RHYTHMS.length - 1)], c: [2, 1, 0, -1, 1, 0] };
  let prev = 7;
  for (let bar = 0; bar < bars; bar++) {
    const chord = t.chords[bar];
    const chordTones = [chord, chord + 2, chord + 4];
    const base = bar * 16;
    const motif = bar % 4 === 2 ? motifB : motifA;
    const last = bar === bars - 1;
    motif.r.forEach((s, i) => {
      const strong = s === 0 || s === 8;
      let target = 7 + chord + motif.c[i % motif.c.length] + (bar >= 4 && bar % 4 !== 2 ? rng.int(0, 1) : 0);
      if (strong) {
        // Snap strong beats to the nearest chord tone (an octave up).
        let best = target;
        let bd = 99;
        for (const ct of chordTones) for (const o of [7, 14]) {
          const cand = ct + o;
          if (Math.abs(cand - target) < bd) {
            bd = Math.abs(cand - target);
            best = cand;
          }
        }
        target = best;
      }
      if (Math.abs(target - prev) > 4) target = prev + Math.sign(target - prev) * rng.int(1, 3);
      if (last && i === motif.r.length - 1) target = 7;
      prev = target;
      const next = motif.r[i + 1] ?? 16;
      ev.push({ step: base + s, kind: 'lead', midi: deg(target), len: Math.max(1, Math.min(4, next - s - (rng.chance(0.3) ? 1 : 0))), vol: strong ? 1 : 0.8 });
      if (t.bells && strong && bar % 2 === 1) ev.push({ step: base + s, kind: 'bell', midi: deg(target + 7), len: 6, vol: 0.6 });
    });
    // Bass.
    const rootNote = deg(chord) - 24;
    if (t.bass === 'root8') for (let s = 0; s < 16; s += 2) ev.push({ step: base + s, kind: 'bass', midi: s % 8 === 6 ? rootNote + 12 : rootNote, len: 2, vol: s % 4 === 0 ? 1 : 0.7 });
    else if (t.bass === 'pulse') for (const s of [0, 3, 6, 8, 11, 14]) ev.push({ step: base + s, kind: 'bass', midi: rootNote, len: 2, vol: 0.9 });
    else if (t.bass === 'walk') [0, 4, 8, 12].forEach((s, i) => ev.push({ step: base + s, kind: 'bass', midi: deg(chord + [0, 2, 4, 2][i]) - 24, len: 4, vol: 0.9 }));
    else ev.push({ step: base, kind: 'bass', midi: rootNote, len: 14, vol: 0.8 }, { step: base + 8, kind: 'bass', midi: rootNote + 7, len: 7, vol: 0.5 });
    // Pad: the chord, held.
    if (t.pad) for (const ct of chordTones) ev.push({ step: base, kind: 'pad', midi: deg(ct), len: 16, vol: 0.7 });
    // Arpeggio.
    if (t.arp !== 'none') {
      const stepLen = t.arp === 'eighth' ? 2 : 1;
      const pattern = [0, 1, 2, 3, 2, 1];
      for (let s = 0, k = 0; s < 16; s += stepLen, k++) {
        const d = chordTones[pattern[k % pattern.length] % 3] + (pattern[k % pattern.length] === 3 ? 7 : 7);
        ev.push({ step: base + s, kind: 'arp', midi: deg(d), len: stepLen, vol: s % 4 === 0 ? 1 : 0.7 });
      }
    }
    // Drums.
    if (t.drums !== 'none') {
      const kicks = t.drums === 'drive' ? [0, 4, 8, 10, 12] : t.drums === 'beat' ? [0, 6, 8] : [0, 8];
      for (const s of kicks) ev.push({ step: base + s, kind: 'kick', midi: 0, len: 1, vol: 1 });
      if (t.drums !== 'soft') for (const s of [4, 12]) ev.push({ step: base + s, kind: 'snare', midi: 0, len: 1, vol: 1 });
      const hatStep = t.drums === 'drive' ? 1 : 2;
      for (let s = 0; s < 16; s += hatStep) ev.push({ step: base + s, kind: 'hat', midi: 0, len: 1, vol: s % 4 === 2 ? 1 : 0.6 });
    }
  }
  ev.sort((a, b) => a.step - b.step);
  return ev;
}

const freq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

interface Playing {
  name: string;
  def: TrackDef;
  events: NoteEvent[];
  bus: GainNode;
  step: number;
  idx: number;
  nextTime: number;
  totalSteps: number;
}

/** Lookahead scheduler with crossfades between tracks. */
export class MusicPlayer {
  private current: Playing | null = null;
  private fading: Playing[] = [];
  private timer: number | null = null;
  private cache = new Map<string, NoteEvent[]>();

  constructor(private readonly a: AudioEngine) {}

  play(name: string | null): void {
    if (this.current?.name === name) return;
    const ctx = this.a.ctx;
    if (!ctx || !this.a.musicBus) return;
    const now = ctx.currentTime;
    if (this.current) {
      const old = this.current;
      old.bus.gain.cancelScheduledValues(now);
      old.bus.gain.setValueAtTime(old.bus.gain.value, now);
      old.bus.gain.linearRampToValueAtTime(0.0001, now + 0.9);
      this.fading.push(old);
      setTimeout(() => {
        this.fading = this.fading.filter((f) => f !== old);
        try {
          old.bus.disconnect();
        } catch {
          /* ignore */
        }
      }, 1200);
      this.current = null;
    }
    if (!name || !TRACKS[name]) return;
    const def = TRACKS[name];
    let events = this.cache.get(name);
    if (!events) {
      events = compose(def);
      this.cache.set(name, events);
    }
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0.0001, now);
    bus.gain.linearRampToValueAtTime(1, now + 0.8);
    bus.connect(this.a.musicBus);
    this.current = { name, def, events, bus, step: 0, idx: 0, nextTime: now + 0.1, totalSteps: def.chords.length * 16 };
    if (this.timer === null) this.timer = window.setInterval(() => this.tick(), 25);
  }

  private tick(): void {
    const ctx = this.a.ctx;
    const p = this.current;
    if (!ctx || !p || ctx.state !== 'running') return;
    const stepDur = 60 / p.def.bpm / 4;
    const horizon = ctx.currentTime + 0.15;
    while (p.nextTime < horizon) {
      while (p.idx < p.events.length && p.events[p.idx].step === p.step) {
        this.note(p, p.events[p.idx], p.nextTime, stepDur);
        p.idx++;
      }
      p.step++;
      p.nextTime += stepDur;
      if (p.step >= p.totalSteps) {
        p.step = 0;
        p.idx = 0;
      }
    }
  }

  private note(p: Playing, e: NoteEvent, t: number, stepDur: number): void {
    const a = this.a;
    const dest = p.bus;
    const dur = e.len * stepDur;
    const d = p.def;
    switch (e.kind) {
      case 'lead':
        a.tone(d.lead, freq(e.midi), t, dur * 0.95, d.leadVol * e.vol, { dest, attack: 0.012 });
        a.tone(d.lead, freq(e.midi), t, dur * 0.9, d.leadVol * 0.35 * e.vol, { dest, attack: 0.02, detune: 9 });
        break;
      case 'bell':
        a.tone('sine', freq(e.midi), t, dur, 0.05 * e.vol, { dest, attack: 0.004 });
        a.tone('sine', freq(e.midi) * 2.01, t, dur * 0.5, 0.02 * e.vol, { dest });
        break;
      case 'bass':
        a.tone(d.bass === 'soft' ? 'sine' : 'triangle', freq(e.midi), t, dur * 0.9, 0.16 * e.vol, { dest, attack: 0.01 });
        break;
      case 'pad':
        a.tone('triangle', freq(e.midi), t, dur, 0.035 * e.vol, { dest, attack: dur * 0.3 });
        break;
      case 'arp':
        a.tone(d.drums === 'drive' ? 'square' : 'triangle', freq(e.midi), t, Math.min(dur, 0.12), (d.drums === 'drive' ? 0.025 : 0.04) * e.vol, { dest });
        break;
      case 'kick':
        a.tone('sine', 150, t, 0.16, 0.32 * e.vol, { to: 45, dest });
        break;
      case 'snare':
        a.noiseHit(t, 0.12, 0.08 * e.vol, 'bandpass', 1800, { dest });
        a.tone('triangle', 200, t, 0.06, 0.05 * e.vol, { dest });
        break;
      case 'hat':
        a.noiseHit(t, 0.035, 0.03 * e.vol, 'highpass', 7500, { dest });
        break;
    }
  }
}
