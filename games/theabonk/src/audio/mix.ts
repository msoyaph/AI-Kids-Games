/**
 * The mix: per-sound gain trims (set from `npm run audio-report` measurements so everything
 * sits near its category target), loudness targets, and the master limiter ceiling.
 */

/** Master output never exceeds this (dBFS) — brick-wall limiter at the end of the chain. */
export const LIMIT_CEILING_DB = -1;

/**
 * 'tick' = sounds that fire many times a second (hits, gems, darts) and must stay in the
 * background; 'sfx' = regular events; 'big' = boss / explosion / fanfare moments.
 */
export type MixCategory = 'tick' | 'sfx' | 'big' | 'ui' | 'music';

/**
 * Target loudness window per category, as heard at default volumes through the full chain:
 * sounds = loudest 100 ms (momentary RMS, dBFS); songs = RMS over the render.
 */
export const LOUDNESS_TARGET: Record<MixCategory, [number, number]> = {
  tick: [-46, -32],
  sfx: [-37, -22],
  big: [-26, -12],
  ui: [-36, -20],
  music: [-38, -29],
};

/** Every sound the report renders, its category, and its gain trim (1 = as synthesized). */
export const MIX: Record<string, { cat: MixCategory; gain: number }> = {
  // weapons / world (SFX_NAMES)
  thump: { cat: 'sfx', gain: 1 },
  dart: { cat: 'tick', gain: 2.47 },
  lantern: { cat: 'sfx', gain: 1 },
  drum: { cat: 'sfx', gain: 1 },
  zap: { cat: 'tick', gain: 1 },
  disc: { cat: 'tick', gain: 4.32 },
  seed: { cat: 'tick', gain: 1 },
  bee: { cat: 'tick', gain: 2.55 },
  frost: { cat: 'sfx', gain: 2.04 },
  explode: { cat: 'big', gain: 1 },
  shrine: { cat: 'sfx', gain: 1 },
  enemyShoot: { cat: 'tick', gain: 2.69 },
  slam: { cat: 'big', gain: 1 },
  roar: { cat: 'big', gain: 1 },
  spores: { cat: 'tick', gain: 1 },
  icicle: { cat: 'sfx', gain: 1 },
  gust: { cat: 'sfx', gain: 1.21 },
  shatter: { cat: 'sfx', gain: 1 },
  bonk: { cat: 'sfx', gain: 1 },
  // player / pickups / moments
  hit: { cat: 'tick', gain: 10.82 },
  crit: { cat: 'tick', gain: 3.63 },
  kill: { cat: 'tick', gain: 1.37 },
  bossKill: { cat: 'big', gain: 1 },
  gem: { cat: 'tick', gain: 2.26 },
  coin: { cat: 'tick', gain: 1 },
  levelUp: { cat: 'big', gain: 1 },
  hurt: { cat: 'sfx', gain: 1 },
  heal: { cat: 'sfx', gain: 1 },
  jump: { cat: 'tick', gain: 1.59 },
  land: { cat: 'sfx', gain: 1.35 },
  slide: { cat: 'tick', gain: 3.24 },
  chest: { cat: 'big', gain: 1 },
  evolve: { cat: 'big', gain: 1 },
  banner: { cat: 'sfx', gain: 1 },
  bossBanner: { cat: 'big', gain: 1 },
  achievement: { cat: 'ui', gain: 1 },
  heartbeat: { cat: 'sfx', gain: 1 },
  stingerWin: { cat: 'big', gain: 1 },
  stingerLose: { cat: 'big', gain: 1 },
  // menus
  'ui-click': { cat: 'tick', gain: 4.93 },
  'ui-back': { cat: 'tick', gain: 4.13 },
  'ui-buy': { cat: 'sfx', gain: 1 },
  'ui-error': { cat: 'sfx', gain: 2.53 },
  'ui-open': { cat: 'ui', gain: 1 },
};

/** Song level trims (music bus), from the same report. */
export const SONG_GAIN: Record<string, number> = {
  menu: 1.65,
  collection: 1.62,
};

export function mixGain(name: string): number {
  return MIX[name]?.gain ?? 1;
}
