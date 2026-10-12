import type { WaveEvent, WaveSegment } from './types';

/** Banner messages the director can raise (index = banner id). */
export const BANNERS = [
  'The Gloom stirs…',
  'Grumblecap stomps in!',
  'Clockjaw is winding up!',
  'The Gloam Regent descends!',
  'A swarm closes in!',
  'An elite approaches — it carries treasure!',
  'Dawn breaks — you survived the night!',
  'A horde surges!',
  'The Gloam Regent is vanquished!',
  'They surround you!',
  'A blizzard gust is coming!',
  'Old Rime calls a blizzard!',
] as const;

export const BANNER = {
  start: 0,
  boss1: 1,
  boss2: 2,
  boss3: 3,
  swarm: 4,
  elite: 5,
  dawn: 6,
  horde: 7,
  /** The map's final boss falls. */
  finalDown: 8,
  ring: 9,
  gust: 10,
  blizzard: 11,
} as const;

export type BannerKey = keyof typeof BANNER;

/**
 * Continuous spawning. Each segment runs from `start` until the next one.
 * `rate` = enemies per second; when below `minAlive` the director spawns 3× faster.
 */
export const WAVES: WaveSegment[] = [
  { start: 0, rate: 0.8, minAlive: 8, maxAlive: 35, mix: [['gloomling', 1]] },
  { start: 40, rate: 1.2, minAlive: 14, maxAlive: 60, mix: [['gloomling', 3], ['gnatlet', 1]] },
  { start: 90, rate: 1.8, minAlive: 22, maxAlive: 90, mix: [['gloomling', 3], ['gnatlet', 2], ['spitcap', 0.7]] },
  { start: 150, rate: 2.2, minAlive: 30, maxAlive: 110, mix: [['gloomling', 2], ['gnatlet', 2], ['spitcap', 1], ['blobbin', 1]] },
  { start: 210, rate: 2.6, minAlive: 40, maxAlive: 130, mix: [['gloomling', 2], ['gnatlet', 2], ['spitcap', 1], ['blobbin', 1], ['ramhorn', 1]] },
  { start: 270, rate: 2.8, minAlive: 45, maxAlive: 140, mix: [['gloomling', 2], ['gnatlet', 2], ['spitcap', 1], ['blobbin', 1], ['ramhorn', 1], ['boulderback', 0.6]] },
  { start: 300, rate: 2.0, minAlive: 30, maxAlive: 110, mix: [['gloomling', 2], ['gnatlet', 3], ['spitcap', 1]] },
  { start: 360, rate: 3.2, minAlive: 60, maxAlive: 170, mix: [['gloomling', 2], ['gnatlet', 2], ['blobbin', 1.5], ['ramhorn', 1.2], ['boulderback', 0.8], ['fusewick', 1]] },
  { start: 450, rate: 3.8, minAlive: 80, maxAlive: 200, mix: [['gloomling', 2], ['gnatlet', 2], ['blobbin', 1.5], ['ramhorn', 1.2], ['boulderback', 1], ['fusewick', 1], ['spitcap', 1.2]] },
  { start: 540, rate: 4.4, minAlive: 100, maxAlive: 230, mix: [['gloomling', 1.5], ['gnatlet', 2.5], ['blobbin', 1.5], ['ramhorn', 1.5], ['boulderback', 1.2], ['fusewick', 1.2], ['spitcap', 1.2]] },
  { start: 600, rate: 3.0, minAlive: 70, maxAlive: 180, mix: [['gloomling', 2], ['gnatlet', 3], ['spitcap', 1], ['fusewick', 1]] },
  { start: 660, rate: 5.0, minAlive: 130, maxAlive: 280, mix: [['gloomling', 1.5], ['gnatlet', 3], ['blobbin', 2], ['ramhorn', 1.5], ['boulderback', 1.5], ['fusewick', 1.5], ['spitcap', 1.5]] },
  { start: 750, rate: 5.8, minAlive: 160, maxAlive: 320, mix: [['gloomling', 1], ['gnatlet', 3], ['blobbin', 2], ['ramhorn', 2], ['boulderback', 2], ['fusewick', 1.5], ['spitcap', 1.5]] },
  { start: 840, rate: 6.5, minAlive: 190, maxAlive: 360, mix: [['gloomling', 1], ['gnatlet', 3], ['blobbin', 2], ['ramhorn', 2], ['boulderback', 2.5], ['fusewick', 2], ['spitcap', 2]] },
  { start: 900, rate: 4.0, minAlive: 120, maxAlive: 260, mix: [['gloomling', 2], ['gnatlet', 3], ['spitcap', 1.5], ['fusewick', 1]] },
  { start: 960, rate: 7.5, minAlive: 230, maxAlive: 420, mix: [['gloomling', 1], ['gnatlet', 3], ['blobbin', 2], ['ramhorn', 2], ['boulderback', 3], ['fusewick', 2], ['spitcap', 2]] },
  { start: 1050, rate: 8.5, minAlive: 270, maxAlive: 470, mix: [['gloomling', 1], ['gnatlet', 3], ['blobbin', 2.5], ['ramhorn', 2.5], ['boulderback', 3], ['fusewick', 2.5], ['spitcap', 2]] },
  { start: 1140, rate: 10, minAlive: 320, maxAlive: 520, mix: [['gnatlet', 3], ['blobbin', 3], ['ramhorn', 3], ['boulderback', 3.5], ['fusewick', 3], ['spitcap', 2.5]] },
];

/** Scripted moments layered on top of the continuous spawning. */
export const WAVE_EVENTS: WaveEvent[] = [
  { time: 60, kind: 'swarm', enemy: 'gnatlet', count: 18, banner: BANNER.swarm },
  { time: 120, kind: 'ring', enemy: 'gnatlet', count: 24, banner: BANNER.ring },
  { time: 180, kind: 'elite', enemy: 'gloomling', count: 1, banner: BANNER.elite },
  { time: 240, kind: 'horde', enemy: 'gloomling', count: 40, banner: BANNER.horde },
  { time: 300, kind: 'boss', enemy: 'grumblecap', count: 1, banner: BANNER.boss1 },
  { time: 330, kind: 'elite', enemy: 'spitcap', count: 1, banner: BANNER.elite },
  { time: 390, kind: 'ring', enemy: 'blobbin', count: 16, banner: BANNER.ring },
  { time: 420, kind: 'elite', enemy: 'ramhorn', count: 1, banner: BANNER.elite },
  { time: 480, kind: 'swarm', enemy: 'gnatlet', count: 40, banner: BANNER.swarm },
  { time: 510, kind: 'elite', enemy: 'boulderback', count: 1, banner: BANNER.elite },
  { time: 540, kind: 'horde', enemy: 'ramhorn', count: 20, banner: BANNER.horde },
  { time: 600, kind: 'boss', enemy: 'clockjaw', count: 1, banner: BANNER.boss2 },
  { time: 630, kind: 'elite', enemy: 'blobbin', count: 1, banner: BANNER.elite },
  { time: 690, kind: 'ring', enemy: 'fusewick', count: 20, banner: BANNER.ring },
  { time: 720, kind: 'elite', enemy: 'boulderback', count: 1, banner: BANNER.elite },
  { time: 780, kind: 'swarm', enemy: 'gnatlet', count: 60, banner: BANNER.swarm },
  { time: 810, kind: 'elite', enemy: 'spitcap', count: 2, banner: BANNER.elite },
  { time: 840, kind: 'horde', enemy: 'boulderback', count: 20, banner: BANNER.horde },
  { time: 870, kind: 'elite', enemy: 'ramhorn', count: 2, banner: BANNER.elite },
  { time: 900, kind: 'boss', enemy: 'gloamRegent', count: 1, banner: BANNER.boss3 },
  { time: 960, kind: 'ring', enemy: 'gloomling', count: 40, banner: BANNER.ring },
  { time: 990, kind: 'elite', enemy: 'blobbin', count: 2, banner: BANNER.elite },
  { time: 1020, kind: 'swarm', enemy: 'gnatlet', count: 80, banner: BANNER.swarm },
  { time: 1050, kind: 'elite', enemy: 'boulderback', count: 2, banner: BANNER.elite },
  { time: 1080, kind: 'horde', enemy: 'fusewick', count: 30, banner: BANNER.horde },
  { time: 1110, kind: 'elite', enemy: 'ramhorn', count: 2, banner: BANNER.elite },
  { time: 1140, kind: 'ring', enemy: 'boulderback', count: 24, banner: BANNER.ring },
  { time: 1170, kind: 'elite', enemy: 'gloomling', count: 3, banner: BANNER.elite },
];

export function segmentAt(time: number): WaveSegment {
  let seg = WAVES[0];
  for (let i = 0; i < WAVES.length; i++) {
    if (WAVES[i].start <= time) seg = WAVES[i];
    else break;
  }
  return seg;
}
