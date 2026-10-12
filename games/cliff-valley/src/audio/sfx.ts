/** Synthesized sound effects (cute, short, never harsh). */
import { note, type AudioEngine } from './audio';

type Sfx = (a: AudioEngine) => void;

const blip = (a: AudioEngine, n: number, dur = 0.08, type: OscillatorType = 'square', vol = 0.12, slide?: number, at = 0) =>
  a.tone({ freq: note(n), dur, type, vol, slide, at: a.now + at });

const arp = (a: AudioEngine, notes: number[], step = 0.07, type: OscillatorType = 'square', vol = 0.1, dur = 0.12) =>
  notes.forEach((n, i) => blip(a, n, dur, type, vol, undefined, i * step));

export const SFX: Record<string, Sfx> = {
  tick: (a) => blip(a, 84, 0.03, 'square', 0.05),
  click: (a) => blip(a, 79, 0.04, 'square', 0.07),
  open: (a) => arp(a, [72, 79], 0.05, 'triangle', 0.12, 0.09),
  dig: (a) => {
    a.hiss({ dur: 0.12, vol: 0.25, freq: 600, q: 0.8, type: 'lowpass' });
    blip(a, 45, 0.08, 'triangle', 0.12, 0.6);
  },
  water: (a) => a.hiss({ dur: 0.35, vol: 0.18, freq: 3000, q: 0.6, type: 'highpass', sweep: 0.5 }),
  refill: (a) => {
    a.hiss({ dur: 0.4, vol: 0.18, freq: 800, q: 2, sweep: 2.5 });
    blip(a, 67, 0.15, 'sine', 0.1, 1.5, 0.15);
  },
  miss: (a) => a.hiss({ dur: 0.08, vol: 0.12, freq: 1500, q: 1.5 }),
  pick: (a) => {
    blip(a, 88, 0.05, 'square', 0.1);
    a.hiss({ dur: 0.06, vol: 0.2, freq: 4000, q: 4 });
  },
  chop: (a) => {
    blip(a, 50, 0.06, 'square', 0.14, 0.7);
    a.hiss({ dur: 0.07, vol: 0.18, freq: 1200, q: 2 });
  },
  cut: (a) => a.hiss({ dur: 0.1, vol: 0.18, freq: 5000, q: 1, type: 'highpass' }),
  swish: (a) => a.hiss({ dur: 0.12, vol: 0.12, freq: 2500, q: 1, sweep: 2 }),
  plant: (a) => blip(a, 72, 0.06, 'triangle', 0.12, 1.3),
  place: (a) => blip(a, 55, 0.08, 'triangle', 0.15, 0.8),
  pop: (a) => blip(a, 76, 0.07, 'square', 0.11, 1.8),
  eat: (a) => arp(a, [67, 64, 67], 0.08, 'triangle', 0.12, 0.08),
  ship: (a) => arp(a, [76, 81], 0.06, 'square', 0.08, 0.08),
  coin: (a) => arp(a, [88, 93], 0.05, 'square', 0.08, 0.1),
  talk: (a) => arp(a, [74, 77, 72], 0.045, 'square', 0.06, 0.05),
  gift: (a) => arp(a, [72, 76, 79], 0.07, 'triangle', 0.12),
  love: (a) => arp(a, [72, 76, 79, 84], 0.07, 'triangle', 0.13),
  meh: (a) => arp(a, [64, 62], 0.1, 'triangle', 0.1),
  cast: (a) => a.hiss({ dur: 0.25, vol: 0.1, freq: 1500, q: 1, sweep: 3 }),
  plop: (a) => blip(a, 60, 0.1, 'sine', 0.18, 2),
  bite: (a) => arp(a, [84, 84], 0.1, 'square', 0.12, 0.06),
  hook: (a) => arp(a, [67, 74, 79], 0.04, 'square', 0.1, 0.06),
  catch: (a) => arp(a, [72, 76, 79, 84, 88], 0.06, 'square', 0.09, 0.1),
  escape: (a) => arp(a, [67, 63, 60], 0.08, 'triangle', 0.1),
  bonk: (a) => {
    blip(a, 64, 0.08, 'square', 0.12, 0.5);
    blip(a, 76, 0.05, 'sine', 0.1, 1.5, 0.03);
  },
  poof: (a) => {
    a.hiss({ dur: 0.25, vol: 0.12, freq: 3000, q: 0.7, sweep: 0.3 });
    arp(a, [84, 88, 91], 0.04, 'triangle', 0.07, 0.06);
  },
  hurt: (a) => blip(a, 55, 0.15, 'triangle', 0.14, 0.6),
  crab: (a) => arp(a, [70, 72, 70], 0.05, 'square', 0.06, 0.04),
  sling: (a) => a.hiss({ dur: 0.1, vol: 0.12, freq: 2000, q: 3, sweep: 0.5 }),
  chest: (a) => arp(a, [67, 72, 76, 84], 0.08, 'triangle', 0.13),
  fanfare: (a) => arp(a, [72, 76, 79, 84, 79, 84], 0.09, 'square', 0.09, 0.14),
  achievement: (a) => arp(a, [79, 84, 88, 91], 0.08, 'triangle', 0.12, 0.16),
  whistle: (a) => blip(a, 84, 0.3, 'sine', 0.15, 1.5),
  magic: (a) => arp(a, [72, 79, 84, 91, 96], 0.05, 'sine', 0.1),
  radio: (a) => a.hiss({ dur: 0.3, vol: 0.08, freq: 2500, q: 0.5 }),
  machine: (a) => arp(a, [55, 60], 0.08, 'square', 0.1, 0.06),
  cook: (a) => {
    a.hiss({ dur: 0.4, vol: 0.1, freq: 4000, q: 0.5, type: 'highpass' });
    arp(a, [72, 76, 79], 0.1, 'triangle', 0.1);
  },
  craft: (a) => arp(a, [60, 67, 72], 0.06, 'square', 0.1),
  chime: (a) => arp(a, [84, 88, 91, 96, 91], 0.12, 'sine', 0.1, 0.4),
  credits: (a) => arp(a, [72, 76, 79, 84], 0.18, 'sine', 0.1, 0.5),
  splash: (a) => a.hiss({ dur: 0.3, vol: 0.15, freq: 1200, q: 0.6, sweep: 0.4 }),
  thunder: (a) => a.hiss({ dur: 1.4, vol: 0.18, freq: 200, q: 0.4, type: 'lowpass', sweep: 0.5 }),
  woof: (a) => {
    blip(a, 50, 0.08, 'square', 0.12, 0.7);
    blip(a, 48, 0.08, 'square', 0.1, 0.7, 0.12);
  },
  meow: (a) => blip(a, 76, 0.25, 'triangle', 0.1, 1.3),
  cluck: (a) => arp(a, [79, 77], 0.05, 'square', 0.06, 0.04),
  quack: (a) => blip(a, 62, 0.12, 'sawtooth', 0.06, 0.8),
  squeak: (a) => blip(a, 91, 0.06, 'sine', 0.08, 1.2),
  moo: (a) => blip(a, 43, 0.5, 'sawtooth', 0.06, 0.85),
  bleat: (a) => blip(a, 62, 0.3, 'square', 0.05, 1.05),
  baa: (a) => blip(a, 60, 0.35, 'sawtooth', 0.05, 0.95),
};

export function playSfx(a: AudioEngine, id: string): void {
  if (!a.ctx) return;
  try {
    SFX[id]?.(a);
  } catch {
    /* never let audio break the game */
  }
}
