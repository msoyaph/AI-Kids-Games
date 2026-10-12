import { mtof, type Synth } from './synth';

/**
 * Sound effects and musical stingers as data: each entry schedules a few
 * synth voices at time `t`, scaled by `v` (the mix gain × volume). The live
 * engine and the offline mixing script call the very same functions.
 */
export type SfxFn = (s: Synth, o: AudioNode, t: number, v: number) => void;
export type StingerFn = (s: Synth, o: AudioNode, t: number, root: number, v: number) => void;

export const SFX = {
  // ---- tower shots (frequent: short and light)
  arrow: (s, o, t, v) => {
    s.osc(o, 'triangle', 1500, 620, t, 0.06, 0.1 * v);
    s.burst(o, t, 0.025, 4200, 0.07 * v, 'highpass');
  },
  cannon: (s, o, t, v) => {
    s.osc(o, 'sine', 170, 45, t, 0.22, 0.36 * v);
    s.burst(o, t, 0.12, 900, 0.2 * v, 'lowpass', 180);
    s.burst(o, t, 0.02, 3200, 0.07 * v, 'bandpass');
  },
  fire: (s, o, t, v) => {
    s.burst(o, t, 0.2, 1500, 0.17 * v, 'bandpass', 380);
    s.osc(o, 'sawtooth', 210, 95, t, 0.12, 0.045 * v);
  },
  water: (s, o, t, v) => {
    s.osc(o, 'sine', 340, 860, t, 0.1, 0.19 * v);
    s.burst(o, t + 0.04, 0.07, 3600, 0.05 * v, 'highpass');
  },
  nature: (s, o, t, v) => {
    s.osc(o, 'triangle', 700, 660, t, 0.08, 0.13 * v);
    s.osc(o, 'triangle', 1050, 1000, t + 0.025, 0.07, 0.07 * v);
  },
  light: (s, o, t, v) => {
    s.osc(o, 'square', 1800, 2600, t, 0.05, 0.05 * v);
    s.osc(o, 'sine', 2600, 1300, t, 0.09, 0.08 * v);
  },
  shadow: (s, o, t, v) => {
    s.osc(o, 'sine', 290, 120, t, 0.2, 0.19 * v, 7);
    s.burst(o, t, 0.16, 500, 0.06 * v, 'lowpass', 160);
  },
  earth: (s, o, t, v) => {
    s.osc(o, 'sine', 105, 38, t, 0.24, 0.38 * v);
    s.burst(o, t, 0.12, 420, 0.18 * v, 'lowpass');
  },
  // ---- hits and constructs
  /** Crystal shatter: glassy noise + two inharmonic pings. */
  poof: (s, o, t, v) => {
    s.burst(o, t, 0.07, 5200, 0.07 * v, 'bandpass', 2600);
    s.osc(o, 'sine', 1320, 1900, t, 0.07, 0.11 * v);
    s.osc(o, 'triangle', 2640, 2600, t + 0.03, 0.06, 0.04 * v);
  },
  bigpoof: (s, o, t, v) => {
    s.burst(o, t, 0.5, 2600, 0.28 * v, 'lowpass', 300);
    s.osc(o, 'sine', 130, 38, t, 0.5, 0.32 * v);
    s.notes(o, [84, 88, 91, 96], t + 0.05, 0.06, 'sine', 0.07 * v);
  },
  splash: (s, o, t, v) => {
    s.burst(o, t, 0.3, 1600, 0.22 * v, 'lowpass', 300);
    s.osc(o, 'sine', 200, 58, t, 0.25, 0.24 * v);
  },
  crit: (s, o, t, v) => {
    s.osc(o, 'square', 2500, 1800, t, 0.04, 0.04 * v);
    s.osc(o, 'sine', 3520, 3400, t + 0.01, 0.14, 0.07 * v);
  },
  shield: (s, o, t, v) => {
    s.osc(o, 'triangle', 1900, 1750, t, 0.05, 0.07 * v);
    s.burst(o, t, 0.02, 6000, 0.04 * v, 'highpass');
  },
  barrier: (s, o, t, v) => {
    s.burst(o, t, 0.35, 6500, 0.16 * v, 'bandpass', 1800);
    s.notes(o, [96, 91, 88], t, 0.04, 'sine', 0.06 * v);
  },
  stun: (s, o, t, v) => {
    s.osc(o, 'sine', 1500, 1200, t, 0.1, 0.08 * v, 18);
  },
  heal: (s, o, t, v) => {
    s.notes(o, [76, 81], t, 0.08, 'sine', 0.07 * v);
  },
  warn: (s, o, t, v) => {
    s.osc(o, 'square', 880, 880, t, 0.09, 0.05 * v);
    s.osc(o, 'square', 660, 660, t + 0.13, 0.12, 0.05 * v);
  },
  disable: (s, o, t, v) => {
    s.osc(o, 'sawtooth', 620, 70, t, 0.36, 0.07 * v);
    s.burst(o, t, 0.25, 1200, 0.08 * v, 'bandpass', 200);
  },
  burrow: (s, o, t, v) => {
    s.burst(o, t, 0.4, 260, 0.2 * v, 'lowpass');
    s.osc(o, 'sine', 72, 40, t, 0.35, 0.2 * v);
  },
  teleport: (s, o, t, v) => {
    s.osc(o, 'sine', 400, 1600, t, 0.16, 0.08 * v, 30);
    s.osc(o, 'triangle', 1600, 420, t + 0.12, 0.16, 0.05 * v);
  },
  leak: (s, o, t, v) => {
    s.osc(o, 'sawtooth', 520, 170, t, 0.38, 0.09 * v);
    s.burst(o, t, 0.2, 500, 0.12 * v, 'lowpass');
  },
  // ---- hero and commander
  herofire: (s, o, t, v) => {
    s.osc(o, 'triangle', 950, 480, t, 0.07, 0.1 * v);
    s.burst(o, t, 0.03, 3800, 0.05 * v, 'highpass');
  },
  herospecial: (s, o, t, v) => {
    s.swell(o, t, 0.16, 0.07 * v);
    s.osc(o, 'sine', 220, 55, t + 0.16, 0.3, 0.32 * v);
    s.burst(o, t + 0.16, 0.2, 1400, 0.14 * v, 'lowpass', 250);
  },
  herodown: (s, o, t, v) => {
    s.notes(o, [64, 60, 55], t, 0.1, 'triangle', 0.1 * v);
  },
  herorespawn: (s, o, t, v) => {
    s.swell(o, t, 0.2, 0.05 * v);
    s.notes(o, [67, 72, 79], t + 0.12, 0.07, 'sine', 0.09 * v);
  },
  ability: (s, o, t, v) => {
    s.swell(o, t, 0.3, 0.07 * v);
    s.osc(o, 'sine', 300, 900, t, 0.3, 0.07 * v);
  },
  meteor: (s, o, t, v) => {
    s.burst(o, t, 0.65, 2000, 0.3 * v, 'lowpass', 160);
    s.osc(o, 'sine', 95, 30, t, 0.6, 0.42 * v);
    s.burst(o, t, 0.05, 3000, 0.1 * v, 'bandpass');
  },
  // ---- economy and building
  coin: (s, o, t, v) => {
    s.osc(o, 'square', mtof(83), mtof(83), t, 0.05, 0.05 * v);
    s.osc(o, 'square', mtof(88), mtof(88), t + 0.05, 0.13, 0.05 * v);
  },
  build: (s, o, t, v) => {
    s.osc(o, 'sine', 240, 110, t, 0.1, 0.26 * v);
    s.burst(o, t, 0.06, 700, 0.12 * v, 'lowpass');
    s.osc(o, 'triangle', mtof(79), mtof(79), t + 0.07, 0.12, 0.08 * v);
  },
  upgrade: (s, o, t, v) => {
    s.notes(o, [67, 71, 74, 79], t, 0.055, 'triangle', 0.13 * v);
    s.swell(o, t, 0.22, 0.03 * v);
  },
  sell: (s, o, t, v) => {
    s.notes(o, [84, 79, 76], t, 0.05, 'square', 0.05 * v);
  },
  clear: (s, o, t, v) => {
    s.notes(o, [72, 76, 79, 84], t, 0.07, 'triangle', 0.12 * v);
  },
  // ---- interface
  click: (s, o, t, v) => {
    s.osc(o, 'triangle', 900, 700, t, 0.04, 0.1 * v);
  },
  back: (s, o, t, v) => {
    s.osc(o, 'triangle', 600, 450, t, 0.05, 0.1 * v);
  },
  deny: (s, o, t, v) => {
    s.osc(o, 'square', 200, 160, t, 0.12, 0.06 * v);
  },
  pick: (s, o, t, v) => {
    s.notes(o, [72, 79, 84], t, 0.07, 'triangle', 0.14 * v);
  },
  star: (s, o, t, v) => {
    s.notes(o, [84, 88, 91, 96], t, 0.08, 'sine', 0.14 * v);
  },
} satisfies Record<string, SfxFn>;

export type SfxName = keyof typeof SFX;

/** Minimum seconds between two plays of the same sound (keeps big fights pleasant). */
export const MIN_GAP: Partial<Record<SfxName, number>> = {
  arrow: 0.06,
  cannon: 0.09,
  fire: 0.08,
  water: 0.07,
  nature: 0.07,
  light: 0.07,
  shadow: 0.09,
  earth: 0.12,
  poof: 0.045,
  coin: 0.07,
  splash: 0.08,
  crit: 0.12,
  shield: 0.1,
  stun: 0.15,
  heal: 0.3,
  herofire: 0.08,
  warn: 0.25,
  teleport: 0.15,
  burrow: 0.2,
};

/** Normalise a track root into the brass range. */
const brassRoot = (r: number): number => 55 + ((((r - 55) % 12) + 12) % 12);

/** Short musical phrases in the current track's key, played on the music bus. */
export const STINGERS = {
  wave: (s, o, t, r, v) => {
    const b = brassRoot(r);
    s.taiko(o, t, 0.45 * v);
    for (const n of [b, b + 7]) s.brass(o, n, t, 0.32, 0.06 * v);
    s.tom(o, t + 0.18, 0.22 * v, 150);
  },
  final: (s, o, t, r, v) => {
    const b = brassRoot(r);
    for (const k of [0, 1, 2]) s.taiko(o, t + k * 0.17, (0.35 + k * 0.08) * v);
    for (const n of [b, b + 3, b + 7, b + 12]) s.brass(o, n, t + 0.34, 0.9, 0.05 * v);
    s.swell(o, t, 0.34, 0.05 * v);
  },
  boss: (s, o, t, r, v) => {
    const b = brassRoot(r) - 12;
    for (let k = 0; k < 6; k++) s.taiko(o, t + 0.5 - 0.5 * Math.pow(0.72, k), (0.25 + k * 0.05) * v, 64);
    s.swell(o, t, 0.6, 0.07 * v);
    for (const n of [b, b + 1, b + 7]) s.brass(o, n, t + 0.6, 1.3, 0.06 * v);
    s.taiko(o, t + 0.6, 0.55 * v, 58);
  },
  phase: (s, o, t, r, v) => {
    const b = brassRoot(r) - 12;
    s.taiko(o, t, 0.5 * v, 60);
    s.snare(o, t, 0.2 * v);
    for (const n of [b, b + 6, b + 12]) s.brass(o, n, t, 0.7, 0.06 * v);
  },
  victory: (s, o, t, r, v) => {
    const b = brassRoot(r);
    const fan = [b, b + 4, b + 7, b + 12];
    fan.forEach((n, i) => s.brass(o, n, t + i * 0.14, 0.18, 0.07 * v));
    for (const n of [b, b + 4, b + 7, b + 12]) s.brass(o, n, t + 0.6, 1.4, 0.05 * v);
    for (const n of [b - 12, b - 5]) s.strings(o, n, t + 0.6, 1.4, 0.06 * v);
    s.taiko(o, t + 0.6, 0.55 * v);
    s.bell(o, b + 24, t + 0.6, 0.05 * v);
    s.bell(o, b + 31, t + 0.9, 0.04 * v);
  },
  defeat: (s, o, t, r, v) => {
    const b = brassRoot(r);
    [b + 7, b + 3, b + 2, b].forEach((n, i) => s.strings(o, n, t + i * 0.42, 0.5, 0.07 * v, 1400));
    s.strings(o, b - 12, t, 1.9, 0.06 * v, 900);
    s.taiko(o, t + 1.26, 0.35 * v, 60);
  },
  core: (s, o, t, r, v) => {
    const b = brassRoot(r) + 12;
    [0, 7, 12, 16, 19].forEach((d, i) => s.bell(o, b + d, t + i * 0.07, 0.12 * v));
    s.strings(o, b - 12, t, 0.8, 0.07 * v, 2400);
    s.swell(o, t, 0.3, 0.06 * v);
  },
  level: (s, o, t, r, v) => {
    const b = brassRoot(r);
    s.taiko(o, t, 0.3 * v);
    s.brass(o, b + 7, t, 0.12, 0.1 * v);
    s.brass(o, b + 12, t + 0.12, 0.35, 0.1 * v);
    s.bell(o, b + 24, t + 0.12, 0.08 * v);
  },
  alert: (s, o, t, r, v) => {
    const b = brassRoot(r);
    s.tom(o, t, 0.4 * v, 130);
    s.tom(o, t + 0.12, 0.4 * v, 110);
    for (const n of [b, b + 1]) s.brass(o, n, t + 0.24, 0.5, 0.08 * v);
    s.hat(o, t + 0.24, 0.08 * v);
  },
} satisfies Record<string, StingerFn>;

export type StingerName = keyof typeof STINGERS;

/** Seconds each stinger rings (the music ducks under the long ones). */
export const STINGER_DUCK: Partial<Record<StingerName, number>> = {
  final: 1.2,
  boss: 1.8,
  victory: 2.2,
  defeat: 2.0,
  phase: 0.8,
};
