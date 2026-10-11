import type { PropKind, WaveEvent, WaveSegment } from './types';
import { BANNER, BANNERS, WAVES, WAVE_EVENTS, type BannerKey } from './waves';

/**
 * Maps: everything that makes a place feel different lives here as data — terrain shape,
 * props, palette, sky, hazards, wave changes, enemy variants, the final boss, music and the
 * unlock rule. The sim reads `w.map`; the renderer reads the same definition.
 */

export type MapId = 'meadow' | 'rimewood';

/** A lighting mood: sky gradient, fog, ambient and key light. */
export interface SkyMood {
  top: number;
  horizon: number;
  fog: number;
  hemiSky: number;
  hemiGround: number;
  hemiI: number;
  key: number;
  keyI: number;
  /** Key light elevation (0 = horizon, 1 = overhead). */
  elev: number;
  stars: number;
  /** Aurora ribbon strength (0 = none). */
  aurora: number;
}

export interface PropSpec {
  kind: PropKind;
  count: number;
  scale: [number, number];
  /** Collision radius at scale 1 (0 = walk-through). */
  radius: number;
  /** Keep this far from the map centre (the start). */
  avoidCenter: number;
  /** Keep this far from plateaus / ramps (-1 = anywhere). */
  pad: number;
}

export interface TerrainSpec {
  mesas: number;
  kickers: number;
  props: PropSpec[];
  /** Prop ringing the map edge (null = none). */
  fence: PropKind | null;
  /** Frozen ponds: flat, slick ice. */
  ponds: number;
  /** Snowdrifts: soft mounds that slow everything down. */
  drifts: number;
}

export interface MapPalette {
  groundA: number;
  groundB: number;
  /** Tint toward this on high ground. */
  high: number;
  /** Steep slopes. */
  slope: number;
  /** Very steep slopes. */
  cliff: number;
  ice: number;
  drift: number;
  mesaTop: number;
  mesaLip: number;
  mesaWall: [number, number];
  mesaBase: [number, number];
  plank: [number, number];
  rampSide: number;
  rampEnd: number;
  skirt: number;
  flowers: number[];
  /** Warning circles: additive glow (dark ground) or solid colour (bright ground, e.g. snow). */
  telegraphs: 'glow' | 'solid';
}

export interface IcicleSpec {
  /** First drop (seconds into the run). */
  start: number;
  /** Seconds between volleys at 0:00 and at 20:00 (interpolated). */
  interval: [number, number];
  /** Icicles per volley at 0:00 and at 20:00. */
  count: [number, number];
  radius: number;
  /** Minute-0 damage (scaled like enemy damage). */
  damage: number;
  /** Telegraph time before impact. */
  fuse: number;
}

export interface GustSpec {
  start: number;
  /** Random gap between gusts. */
  interval: [number, number];
  /** Warning time before the push starts. */
  warn: number;
  duration: number;
  /** Push on the player (units / s). */
  push: number;
  /** Push on walking enemies (units / s, reduced by knockback resistance). */
  enemyPush: number;
}

export interface MapDef {
  id: MapId;
  name: string;
  tagline: string;
  terrain: TerrainSpec;
  palette: MapPalette;
  sky: {
    /** Run progress (0 = dusk, 1 = dawn) → mood keyframes. */
    run: Array<[number, SkyMood]>;
    menu: SkyMood;
    fog: [number, number];
    /** Ambient snowfall density (0 = none). */
    snow: number;
  };
  waves: WaveSegment[];
  events: WaveEvent[];
  /** Base enemy id → this map's variant (summons and waves go through it). */
  variants: Record<string, string>;
  /** Defeating it wins the run. */
  finalBoss: string;
  hazards: { icicles?: IcicleSpec; gusts?: GustSpec };
  music: 'meadow' | 'rimewood';
  banners: Partial<Record<BannerKey, string>>;
  /** Victory screen subtitle. */
  winText: string;
  /** Unlocked by winning a run on another map (undefined = always open). */
  unlock?: { winOn: MapId; text: string };
}

const MEADOW: MapDef = {
  id: 'meadow',
  name: 'Gloam Meadow',
  tagline: 'Rolling hills and mossy mesas under a violet night.',
  terrain: {
    mesas: 11,
    kickers: 16,
    props: [
      { kind: 'pine', count: 120, scale: [0.8, 1.5], radius: 0.55, avoidCenter: 18, pad: 2 },
      { kind: 'oak', count: 70, scale: [0.8, 1.3], radius: 0.6, avoidCenter: 18, pad: 2 },
      { kind: 'rock', count: 90, scale: [0.6, 1.8], radius: 0.9, avoidCenter: 14, pad: 1 },
      { kind: 'stump', count: 30, scale: [0.8, 1.2], radius: 0.45, avoidCenter: 12, pad: 1 },
      { kind: 'crystal', count: 26, scale: [0.7, 1.4], radius: 0, avoidCenter: 20, pad: 1 },
      { kind: 'mushroom', count: 90, scale: [0.5, 1.3], radius: 0, avoidCenter: 6, pad: 0.5 },
      { kind: 'flower', count: 420, scale: [0.6, 1.2], radius: 0, avoidCenter: 2, pad: -1 },
      { kind: 'tuft', count: 900, scale: [0.6, 1.4], radius: 0, avoidCenter: 1, pad: -1 },
    ],
    fence: 'post',
    ponds: 0,
    drifts: 0,
  },
  palette: {
    groundA: 0x4a9440,
    groundB: 0x72b552,
    high: 0xa8b85a,
    slope: 0xa88a5c,
    cliff: 0x8f8e9a,
    ice: 0x9fd8f0,
    drift: 0xffffff,
    mesaTop: 0x86c95f,
    mesaLip: 0x6fb552,
    mesaWall: [0xa88f68, 0xb39a72],
    mesaBase: [0x86714f, 0x8f7a5c],
    plank: [0xb88a50, 0xc89a5e],
    rampSide: 0x8a5f3c,
    rampEnd: 0x7a5435,
    skirt: 0x4f8f45,
    flowers: [0xffffff, 0xffd34d, 0xff8ab8, 0xb48cff, 0x7fd6ff, 0xff7a5a],
    telegraphs: 'glow',
  },
  sky: {
    // The run starts at dusk, sinks into moonlit night and ends at dawn (20:00).
    run: [
      [0.0, { top: 0x3b4f9e, horizon: 0xffa982, fog: 0xa79bb8, hemiSky: 0xd6c8ff, hemiGround: 0x5a4a50, hemiI: 1.45, key: 0xffb27a, keyI: 2.3, elev: 0.25, stars: 0.1, aurora: 0 }],
      [0.22, { top: 0x141e50, horizon: 0x4f4890, fog: 0x3f4078, hemiSky: 0x93a4ff, hemiGround: 0x353150, hemiI: 1.15, key: 0xbccaff, keyI: 1.55, elev: 0.7, stars: 0.8, aurora: 0 }],
      [0.6, { top: 0x0c1440, horizon: 0x363a78, fog: 0x33366a, hemiSky: 0x8a9cff, hemiGround: 0x312e48, hemiI: 1.1, key: 0xb4c4ff, keyI: 1.5, elev: 0.8, stars: 1, aurora: 0 }],
      [0.86, { top: 0x2a2f76, horizon: 0xe08aa8, fog: 0x8a7aa8, hemiSky: 0xe0c0ff, hemiGround: 0x4a3e52, hemiI: 1.4, key: 0xffa8b0, keyI: 2.0, elev: 0.3, stars: 0.4, aurora: 0 }],
      [1.0, { top: 0x6cb2f0, horizon: 0xffd6a0, fog: 0xf2dcc4, hemiSky: 0xfff0dc, hemiGround: 0x6a5a48, hemiI: 1.45, key: 0xffe2b4, keyI: 2.7, elev: 0.35, stars: 0, aurora: 0 }],
    ],
    menu: { top: 0x5aa8e8, horizon: 0xffe0b6, fog: 0xe4dccf, hemiSky: 0xeaf4ff, hemiGround: 0x6a5a4a, hemiI: 1.3, key: 0xfff0d8, keyI: 2.6, elev: 0.6, stars: 0, aurora: 0 },
    fog: [55, 150],
    snow: 0,
  },
  waves: WAVES,
  events: WAVE_EVENTS,
  variants: {},
  finalBoss: 'gloamRegent',
  hazards: {},
  music: 'meadow',
  banners: {},
  winText: 'The Gloom retreats. The meadow is safe… for now.',
};

const RIME_VARIANTS: Record<string, string> = {
  gloomling: 'frostling',
  ramhorn: 'snowRoller',
  spitcap: 'icicap',
  grumblecap: 'grumblecapFrost',
  clockjaw: 'clockjawFrost',
  gloamRegent: 'oldRime',
};

const RIMEWOOD: MapDef = {
  id: 'rimewood',
  name: 'Rimewood',
  tagline: 'A frozen forest: slick ponds, deep drifts, falling icicles and blizzard gusts.',
  terrain: {
    mesas: 9,
    kickers: 14,
    props: [
      { kind: 'frostPine', count: 170, scale: [0.8, 1.6], radius: 0.55, avoidCenter: 18, pad: 2 },
      { kind: 'birch', count: 60, scale: [0.8, 1.3], radius: 0.4, avoidCenter: 18, pad: 2 },
      { kind: 'snowRock', count: 80, scale: [0.6, 1.8], radius: 0.9, avoidCenter: 14, pad: 1 },
      { kind: 'stump', count: 24, scale: [0.8, 1.2], radius: 0.45, avoidCenter: 12, pad: 1 },
      { kind: 'iceCrystal', count: 30, scale: [0.7, 1.5], radius: 0, avoidCenter: 20, pad: 1 },
      { kind: 'frostShrub', count: 110, scale: [0.5, 1.2], radius: 0, avoidCenter: 6, pad: 0.5 },
      { kind: 'snowTuft', count: 700, scale: [0.6, 1.3], radius: 0, avoidCenter: 1, pad: -1 },
    ],
    fence: 'post',
    ponds: 9,
    drifts: 16,
  },
  palette: {
    groundA: 0xd6e2f0,
    groundB: 0xeef4fc,
    high: 0xc4d2e8,
    slope: 0x9eabc0,
    cliff: 0x7d8698,
    ice: 0x8fd0ec,
    drift: 0xffffff,
    mesaTop: 0xeaf2fc,
    mesaLip: 0xffffff,
    mesaWall: [0x7e8aa0, 0x8a96ab],
    mesaBase: [0x646e82, 0x6c768a],
    plank: [0x8a6c52, 0x9a7a5e],
    rampSide: 0x6a5240,
    rampEnd: 0x5c4636,
    skirt: 0xc6d4e8,
    flowers: [0xffffff],
    telegraphs: 'solid',
  },
  sky: {
    // Cold pink dusk, a teal night lit by aurora, then an icy dawn.
    run: [
      [0.0, { top: 0x2f4f8e, horizon: 0xf0a8b8, fog: 0xb4c0d8, hemiSky: 0xd8e2ff, hemiGround: 0x5a6078, hemiI: 1.15, key: 0xffc0a8, keyI: 1.8, elev: 0.25, stars: 0.15, aurora: 0.1 }],
      [0.22, { top: 0x0b1f3c, horizon: 0x2f5a78, fog: 0x2c4862, hemiSky: 0x8fb4ff, hemiGround: 0x303a52, hemiI: 0.95, key: 0xa8d0ff, keyI: 1.2, elev: 0.7, stars: 0.9, aurora: 0.85 }],
      [0.6, { top: 0x071430, horizon: 0x24506a, fog: 0x24405c, hemiSky: 0x88b0ff, hemiGround: 0x2a364c, hemiI: 0.9, key: 0xa0c8ff, keyI: 1.15, elev: 0.8, stars: 1, aurora: 1 }],
      [0.86, { top: 0x26407a, horizon: 0xd8a0c8, fog: 0x96a0c4, hemiSky: 0xe4dcff, hemiGround: 0x4c5268, hemiI: 1.15, key: 0xffb8c8, keyI: 1.6, elev: 0.3, stars: 0.4, aurora: 0.35 }],
      [1.0, { top: 0x7ab8f0, horizon: 0xffe6c8, fog: 0xeceaf2, hemiSky: 0xf4f8ff, hemiGround: 0x646a7a, hemiI: 1.2, key: 0xfff0d8, keyI: 2.2, elev: 0.35, stars: 0, aurora: 0 }],
    ],
    menu: { top: 0x6aa8e0, horizon: 0xf4e8f0, fog: 0xe0e8f4, hemiSky: 0xf0f6ff, hemiGround: 0x646a7a, hemiI: 1.1, key: 0xfff4e8, keyI: 2.1, elev: 0.55, stars: 0, aurora: 0 },
    fog: [45, 135],
    snow: 1,
  },
  waves: withVariants(WAVES, RIME_VARIANTS),
  events: WAVE_EVENTS.map((ev) => ({ ...ev, enemy: RIME_VARIANTS[ev.enemy] ?? ev.enemy })),
  variants: RIME_VARIANTS,
  finalBoss: 'oldRime',
  hazards: {
    icicles: { start: 40, interval: [9, 3.5], count: [1, 3], radius: 1.6, damage: 9, fuse: 1.15 },
    gusts: { start: 95, interval: [50, 75], warn: 2.5, duration: 4, push: 4.5, enemyPush: 3.5 },
  },
  music: 'rimewood',
  banners: {
    start: 'The Rimewood creaks…',
    boss1: 'Frosted Grumblecap stomps in!',
    boss2: 'Frosted Clockjaw is winding up!',
    boss3: 'Old Rime, the Frost Stag, awakens!',
    finalDown: 'Old Rime is vanquished!',
    dawn: 'Dawn breaks — the thaw has come!',
  },
  winText: 'The frost lifts. The Rimewood sleeps until next winter.',
  unlock: { winOn: 'meadow', text: 'Win a run on Gloam Meadow' },
};

function withVariants(waves: WaveSegment[], variants: Record<string, string>): WaveSegment[] {
  return waves.map((seg) => ({ ...seg, mix: seg.mix.map(([id, wgt]) => [variants[id] ?? id, wgt] as [string, number]) }));
}

export const MAPS: MapDef[] = [MEADOW, RIMEWOOD];

export function mapDef(id: string): MapDef {
  return MAPS.find((m) => m.id === id) ?? MEADOW;
}

export function isMapId(id: unknown): id is MapId {
  return typeof id === 'string' && MAPS.some((m) => m.id === id);
}

/** This map's version of a base enemy id. */
export function variantOf(map: MapDef, id: string): string {
  return map.variants[id] ?? id;
}

/** Banner text for a banner id on this map. */
export function bannerText(map: MapDef, id: number): string {
  const key = (Object.keys(BANNER) as BannerKey[]).find((k) => BANNER[k] === id);
  return (key && map.banners[key]) || BANNERS[id] || '';
}
