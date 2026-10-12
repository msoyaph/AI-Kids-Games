/**
 * Chiptune music: a tiny seeded composer builds looping songs (melody, bass, pad, drums)
 * from a few parameters, and a lookahead scheduler plays them. Songs change by season,
 * place, time of day and weather, with gentle crossfades.
 */
import { Rng, hashStr } from '../core/rng';
import { note, type AudioEngine } from './audio';

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const PENTA = [0, 2, 4, 7, 9];
const MPENTA = [0, 3, 5, 7, 10];

export interface SongSpec {
  tempo: number;
  root: number;
  scale: number[];
  chords: number[];
  lead: OscillatorType;
  bass: OscillatorType;
  pad: boolean;
  drums: 0 | 1 | 2;
  density: number;
  swing?: number;
  leadVol?: number;
}

export const SONGS: Record<string, SongSpec> = {
  title: { tempo: 92, root: 60, scale: MAJOR, chords: [0, 3, 4, 0, 5, 3, 4, 4], lead: 'triangle', bass: 'triangle', pad: true, drums: 1, density: 0.55 },
  farm0: { tempo: 100, root: 65, scale: MAJOR, chords: [0, 4, 5, 3, 0, 3, 4, 0], lead: 'square', bass: 'triangle', pad: true, drums: 1, density: 0.6, leadVol: 0.05 },
  farm1: { tempo: 112, root: 67, scale: MAJOR, chords: [0, 3, 0, 4, 5, 3, 4, 0], lead: 'square', bass: 'triangle', pad: false, drums: 2, density: 0.65, leadVol: 0.05 },
  farm2: { tempo: 92, root: 62, scale: DORIAN, chords: [0, 3, 0, 6, 0, 3, 4, 0], lead: 'triangle', bass: 'triangle', pad: true, drums: 1, density: 0.5 },
  farm3: { tempo: 80, root: 69, scale: PENTA, chords: [0, 3, 4, 0, 2, 3, 4, 0], lead: 'sine', bass: 'triangle', pad: true, drums: 0, density: 0.45 },
  town: { tempo: 104, root: 70, scale: MAJOR, chords: [0, 5, 3, 4, 0, 5, 1, 4], lead: 'square', bass: 'triangle', pad: false, drums: 2, density: 0.6, leadVol: 0.05 },
  home: { tempo: 76, root: 63, scale: MAJOR, chords: [0, 3, 5, 4, 0, 3, 4, 0], lead: 'triangle', bass: 'sine', pad: true, drums: 0, density: 0.4 },
  shop: { tempo: 108, root: 60, scale: MAJOR, chords: [0, 3, 4, 0, 0, 3, 4, 4], lead: 'square', bass: 'triangle', pad: false, drums: 1, density: 0.55, leadVol: 0.045 },
  cafe: { tempo: 96, root: 65, scale: MAJOR, chords: [0, 5, 1, 4, 0, 5, 1, 4], lead: 'triangle', bass: 'triangle', pad: true, drums: 1, density: 0.6, swing: 0.18 },
  museum: { tempo: 84, root: 64, scale: MINOR, chords: [0, 5, 3, 4, 0, 5, 6, 4], lead: 'triangle', bass: 'sine', pad: true, drums: 0, density: 0.45 },
  hall: { tempo: 90, root: 67, scale: MAJOR, chords: [0, 4, 5, 3, 0, 4, 3, 4], lead: 'triangle', bass: 'triangle', pad: true, drums: 1, density: 0.5 },
  beach: { tempo: 100, root: 69, scale: MAJOR, chords: [0, 3, 4, 3, 0, 3, 4, 0], lead: 'triangle', bass: 'triangle', pad: false, drums: 1, density: 0.55, swing: 0.12 },
  forest: { tempo: 88, root: 62, scale: MPENTA, chords: [0, 3, 2, 0, 0, 3, 4, 0], lead: 'sine', bass: 'triangle', pad: true, drums: 0, density: 0.45 },
  mountain: { tempo: 96, root: 64, scale: MAJOR, chords: [0, 4, 3, 0, 5, 4, 3, 4], lead: 'triangle', bass: 'triangle', pad: true, drums: 1, density: 0.5 },
  mine0: { tempo: 92, root: 57, scale: MINOR, chords: [0, 0, 5, 6, 0, 3, 4, 4], lead: 'square', bass: 'triangle', pad: false, drums: 1, density: 0.45, leadVol: 0.04 },
  mine1: { tempo: 84, root: 59, scale: MINOR, chords: [0, 5, 3, 4, 0, 5, 6, 4], lead: 'sine', bass: 'sine', pad: true, drums: 0, density: 0.4 },
  mine2: { tempo: 88, root: 61, scale: MPENTA, chords: [0, 2, 3, 0, 0, 2, 4, 3], lead: 'triangle', bass: 'sine', pad: true, drums: 1, density: 0.45 },
  mine3: { tempo: 80, root: 64, scale: PENTA, chords: [0, 3, 4, 2, 0, 3, 4, 0], lead: 'sine', bass: 'triangle', pad: true, drums: 0, density: 0.42 },
  heart: { tempo: 70, root: 60, scale: MAJOR, chords: [0, 5, 3, 4, 0, 5, 4, 0], lead: 'sine', bass: 'sine', pad: true, drums: 0, density: 0.35 },
  barn: { tempo: 100, root: 67, scale: MAJOR, chords: [0, 4, 0, 3, 0, 4, 3, 0], lead: 'triangle', bass: 'triangle', pad: false, drums: 1, density: 0.5 },
  festival: { tempo: 120, root: 72, scale: MAJOR, chords: [0, 3, 4, 0, 5, 3, 4, 0], lead: 'square', bass: 'triangle', pad: false, drums: 2, density: 0.7, leadVol: 0.05 },
  night: { tempo: 72, root: 65, scale: PENTA, chords: [0, 3, 4, 0, 2, 3, 4, 0], lead: 'sine', bass: 'sine', pad: true, drums: 0, density: 0.3 },
  rain: { tempo: 76, root: 62, scale: PENTA, chords: [0, 3, 0, 4, 0, 3, 4, 0], lead: 'sine', bass: 'sine', pad: true, drums: 0, density: 0.28 },
  finale: { tempo: 96, root: 67, scale: MAJOR, chords: [0, 4, 5, 3, 0, 4, 3, 4], lead: 'triangle', bass: 'triangle', pad: true, drums: 1, density: 0.6 },
};

interface NoteEv {
  step: number;
  n: number;
  len: number;
}

interface Composed {
  spec: SongSpec;
  steps: number;
  lead: NoteEv[];
  bass: NoteEv[];
  pad: NoteEv[];
}

/** Compose a 16-bar loop (A A' B A'') of eighth notes. */
export function compose(key: string): Composed {
  const spec = SONGS[key] ?? SONGS.farm0;
  const rng = new Rng(hashStr(key) ^ 0x51ed);
  const sc = spec.scale;
  const deg = (d: number, oct = 0) => spec.root + sc[((d % sc.length) + sc.length) % sc.length] + 12 * (oct + Math.floor(d / sc.length));
  const phrase = (seedShift: number): NoteEv[] => {
    const r = new Rng(hashStr(key) + seedShift);
    const out: NoteEv[] = [];
    let cur = 2;
    for (let bar = 0; bar < 4; bar++) {
      const ch = spec.chords[bar % spec.chords.length];
      for (let s = 0; s < 8; s++) {
        const strong = s === 0 || s === 4;
        if (!strong && r.next() > spec.density) continue;
        if (strong || r.chance(0.5)) {
          const tones = [ch, ch + 2, ch + 4];
          const target = r.pick(tones) + (r.chance(0.3) ? sc.length : 0);
          cur = Math.abs(target - cur) > 5 ? cur + Math.sign(target - cur) * 2 : target;
        } else cur += r.pick([-1, 1, 1, -1, 2, -2]);
        cur = Math.max(-1, Math.min(sc.length * 2, cur));
        const len = strong && r.chance(0.4) ? 2 : 1;
        out.push({ step: bar * 8 + s, n: deg(cur, 1), len });
        if (len === 2) s++;
      }
    }
    return out;
  };
  const A = phrase(1), B = phrase(2), A2 = phrase(3);
  const lead: NoteEv[] = [];
  [A, A2, B, A].forEach((p, i) => p.forEach((e) => lead.push({ ...e, step: e.step + i * 32 })));
  const bass: NoteEv[] = [];
  const pad: NoteEv[] = [];
  for (let bar = 0; bar < 16; bar++) {
    const ch = spec.chords[bar % spec.chords.length];
    bass.push({ step: bar * 8, n: deg(ch, -1), len: 3 });
    bass.push({ step: bar * 8 + 4, n: deg(ch + (rng.chance(0.5) ? 4 : 0), -1), len: 3 });
    if (spec.pad) for (const t of [0, 2, 4]) pad.push({ step: bar * 8, n: deg(ch + t, 0), len: 8 });
  }
  return { spec, steps: 128, lead, bass, pad };
}

export class Music {
  private a: AudioEngine;
  private cur: Composed | null = null;
  private curKey = '';
  private wantKey = '';
  private step = 0;
  private nextTime = 0;
  private timer = 0;
  private fade = 1;
  private cache = new Map<string, Composed>();
  enabled = true;

  constructor(a: AudioEngine) {
    this.a = a;
    a.whenStarted(() => {
      this.timer = window.setInterval(() => this.tick(), 25);
    });
  }

  play(key: string): void {
    this.wantKey = key;
  }

  private get(key: string): Composed {
    let c = this.cache.get(key);
    if (!c) {
      c = compose(key);
      this.cache.set(key, c);
    }
    return c;
  }

  private tick(): void {
    const ctx = this.a.ctx;
    if (!ctx || !this.enabled) return;
    // crossfade to a new song
    if (this.wantKey !== this.curKey) {
      this.fade -= 0.04;
      if (this.fade <= 0 || !this.cur) {
        this.curKey = this.wantKey;
        this.cur = this.wantKey ? this.get(this.wantKey) : null;
        this.step = 0;
        this.nextTime = ctx.currentTime + 0.1;
        this.fade = 0.01;
      }
    } else if (this.fade < 1) this.fade = Math.min(1, this.fade + 0.03);
    const c = this.cur;
    if (!c) return;
    const spb = 60 / c.spec.tempo / 2; // seconds per eighth
    while (this.nextTime < ctx.currentTime + 0.2) {
      this.schedule(c, this.step, this.nextTime, spb);
      const swing = c.spec.swing && this.step % 2 === 0 ? spb * c.spec.swing : c.spec.swing ? -spb * c.spec.swing : 0;
      this.nextTime += spb + swing;
      this.step = (this.step + 1) % c.steps;
    }
  }

  private schedule(c: Composed, step: number, t: number, spb: number): void {
    const a = this.a, f = this.fade;
    if (f <= 0.02) return;
    for (const e of c.lead) if (e.step === step) a.tone({ freq: note(e.n), dur: e.len * spb * 0.9, type: c.spec.lead, vol: (c.spec.leadVol ?? 0.07) * f, at: t, bus: 'music', attack: 0.01 });
    for (const e of c.bass) if (e.step === step) a.tone({ freq: note(e.n), dur: e.len * spb * 0.9, type: c.spec.bass, vol: 0.08 * f, at: t, bus: 'music', attack: 0.01 });
    for (const e of c.pad) if (e.step === step) a.tone({ freq: note(e.n), dur: e.len * spb, type: 'sine', vol: 0.025 * f, at: t, bus: 'music', attack: 0.3 });
    if (c.spec.drums) {
      const s8 = step % 8;
      if (s8 === 0 || s8 === 4) a.tone({ freq: 90, dur: 0.12, type: 'sine', vol: 0.12 * f, at: t, slide: 0.4, bus: 'music' });
      if (s8 % 2 === 1) a.hiss({ dur: 0.03, vol: 0.025 * f, freq: 8000, q: 1, type: 'highpass', at: t, bus: 'music' });
      if (c.spec.drums === 2 && (s8 === 2 || s8 === 6)) a.hiss({ dur: 0.08, vol: 0.05 * f, freq: 1800, q: 0.8, at: t, bus: 'music' });
    }
  }

  stop(): void {
    clearInterval(this.timer);
  }
}

/** Pick the right song for where/when the player is. */
export function songFor(o: { mode: string; music: string; season: number; min: number; outdoor: boolean; weather: string; festival: boolean; dark: boolean }): string {
  if (o.mode === 'title') return 'title';
  if (o.festival) return 'festival';
  if (o.music === 'farm') {
    if (o.weather === 'rain' || o.weather === 'storm') return 'rain';
    if (o.min >= 20 * 60) return 'night';
    return `farm${o.season}`;
  }
  if (o.outdoor && (o.weather === 'rain' || o.weather === 'storm')) return 'rain';
  if (o.outdoor && o.min >= 21 * 60) return 'night';
  return SONGS[o.music] ? o.music : 'home';
}
