/**
 * Calm, upbeat background music for each theme, composed by code: a four-chord loop with bass,
 * a pad, a melody drawn from the scale (chord tones on strong beats, seeded so it's always the
 * same tune) and soft percussion. A look-ahead scheduler (setInterval every 25 ms, notes queued
 * 0.15 s ahead) keeps time steady. Relax plays a slower, drumless version.
 */
import type { ThemeId } from '../data/themes';
import type { Buses } from './engine';
import { bell, hz, kick, mallet, noise, pad, tone } from './voices';

export interface MusicStyle { theme: ThemeId; calm: boolean }

interface Recipe { bpm: number; key: number; minor?: boolean; lead: 'pluck' | 'mallet' | 'square' | 'bell' | 'arp' | 'box'; drums: 'soft' | 'clap' | 'shaker' | 'tick' | 'none'; cutoff: number; seed: number }
const RECIPES: Record<ThemeId, Recipe> = {
  classic: { bpm: 108, key: 60, lead: 'pluck', drums: 'soft', cutoff: 1600, seed: 11 },
  wood: { bpm: 100, key: 55, lead: 'mallet', drums: 'tick', cutoff: 1400, seed: 23 },
  candy: { bpm: 120, key: 65, lead: 'square', drums: 'clap', cutoff: 2000, seed: 37 },
  ocean: { bpm: 90, key: 62, lead: 'bell', drums: 'shaker', cutoff: 1200, seed: 41 },
  space: { bpm: 96, key: 57, minor: true, lead: 'arp', drums: 'soft', cutoff: 1800, seed: 53 },
  night: { bpm: 76, key: 63, lead: 'box', drums: 'none', cutoff: 1000, seed: 67 },
};
const MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10];
/** I–V–vi–IV (major) or i–VI–III–VII (minor), as scale degrees. */
const PROGRESSION = { major: [0, 4, 5, 3], minor: [0, 5, 2, 6] };

let timer = 0;
let current = '';
let step = 0, nextTime = 0;
let melody: number[] = [];

function makeMelody(r: Recipe): number[] {
  let s = r.seed;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const out: number[] = [];
  let deg = 2;
  for (let i = 0; i < 64; i++) {
    if (i % 2 === 1 && rnd() < 0.55) { out.push(-1); continue; } // rests on offbeats
    const chord = PROGRESSION[r.minor ? 'minor' : 'major'][Math.floor(i / 16)]!;
    if (i % 4 === 0) { const tones = [chord, chord + 2, chord + 4]; deg = tones[Math.floor(rnd() * 3)]!; } // chord tone on the beat
    else deg += [-1, 1, -2, 2, 0][Math.floor(rnd() * 5)]!;
    deg = Math.max(-2, Math.min(9, deg));
    out.push(deg);
  }
  return out;
}

const note = (r: Recipe, degree: number, octave = 0) => {
  const scale = r.minor ? MINOR : MAJOR;
  const o = Math.floor(degree / 7), d = ((degree % 7) + 7) % 7;
  return r.key + 12 * (o + octave) + scale[d]!;
};

function schedule(b: Buses, r: Recipe, calm: boolean, t: number, i: number) {
  const out = b.music, bar = Math.floor(i / 16) % 4, beat = i % 16;
  const chord = PROGRESSION[r.minor ? 'minor' : 'major'][bar]!;
  const sixteenth = 60 / (calm ? r.bpm * 0.8 : r.bpm) / 4;
  if (beat === 0) {
    pad(b, out, t, [note(r, chord), note(r, chord + 2), note(r, chord + 4)], sixteenth * 16, calm ? 0.07 : 0.06, r.cutoff);
    tone(b, out, t, { freq: hz(note(r, chord, -2)), type: 'triangle', dur: sixteenth * 7, gain: 0.12, attack: 0.02, filter: 500 });
  }
  if (beat === 8 && !calm) tone(b, out, t, { freq: hz(note(r, chord + 4, -2)), type: 'triangle', dur: sixteenth * 6, gain: 0.09, attack: 0.02, filter: 500 });
  const m = melody[(Math.floor(i / 16) % 4) * 16 + beat]!;
  if (m >= 0 && (!calm || beat % 4 === 0)) {
    const f = hz(note(r, m, 1)), g = calm ? 0.06 : 0.075;
    switch (r.lead) {
      case 'pluck': tone(b, out, t, { freq: f, type: 'triangle', dur: sixteenth * 2.5, gain: g, filter: 2400 }); break;
      case 'mallet': mallet(b, out, t, f, g * 1.2, sixteenth * 4); break;
      case 'square': tone(b, out, t, { freq: f, type: 'square', dur: sixteenth * 1.8, gain: g * 0.5, filter: 1800 }); break;
      case 'bell': bell(b, out, t, f, g, sixteenth * 6); break;
      case 'arp': tone(b, out, t, { freq: f, type: 'sawtooth', dur: sixteenth * 1.5, gain: g * 0.45, filter: 1500 }); break;
      case 'box': bell(b, out, t, f * 2, g * 0.8, sixteenth * 5); break;
    }
  }
  if (calm || r.drums === 'none') return;
  if (beat % 8 === 0) kick(b, out, t, 0.12);
  switch (r.drums) {
    case 'soft': if (beat % 4 === 2) noise(b, out, t, { dur: 0.04, gain: 0.03, freq: 8000, type: 'highpass' }); break;
    case 'tick': if (beat % 2 === 0) noise(b, out, t, { dur: 0.025, gain: 0.025, freq: 3500, q: 3 }); break;
    case 'clap': if (beat % 8 === 4) noise(b, out, t, { dur: 0.12, gain: 0.06, freq: 1500, q: 0.8 }); if (beat % 4 === 2) noise(b, out, t, { dur: 0.03, gain: 0.025, freq: 9000, type: 'highpass' }); break;
    case 'shaker': if (beat % 2 === 1) noise(b, out, t, { dur: 0.06, gain: 0.025, freq: 6000, type: 'highpass' }); break;
  }
}

export function startMusic(b: Buses, style: MusicStyle) {
  const key = `${style.theme}|${style.calm}`;
  if (key === current && timer) return;
  stopMusic();
  current = key;
  const r = RECIPES[style.theme];
  melody = makeMelody(r);
  step = 0; nextTime = b.ctx.currentTime + 0.1;
  const sixteenth = 60 / (style.calm ? r.bpm * 0.8 : r.bpm) / 4;
  timer = window.setInterval(() => {
    const now = b.ctx.currentTime;
    if (nextTime < now - 0.5) nextTime = now + 0.05; // after a pause, start again rather than catch up
    while (nextTime < now + 0.15) { schedule(b, r, style.calm, nextTime, step); step = (step + 1) % 64; nextTime += sixteenth; }
  }, 25);
}

export function stopMusic() { if (timer) clearInterval(timer); timer = 0; current = ''; }
