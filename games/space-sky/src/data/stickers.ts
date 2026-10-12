import type { GlyphId } from '../gfx/art/glyphs';

/** Where a sticker comes from. Hidden level stickers are placed with '*' in level maps. */
export type StickerSource =
  | { kind: 'level'; level: string }
  | { kind: 'space'; body: string }
  | { kind: 'mission'; mission: string }
  | { kind: 'race'; course: string }
  | { kind: 'daily'; count: number }
  | { kind: 'tow' };

export interface StickerDef {
  id: string;
  name: string;
  glyph: GlyphId;
  bg: string;
  color?: string;
  source: StickerSource;
  /** Short hint shown in the sticker book for empty spots. */
  hint: string;
}

export const STICKERS: StickerDef[] = [
  { id: 'st_rocket', name: 'First Rocket', glyph: 'rocket', bg: '#4c7dff', source: { kind: 'mission', mission: 'c1_first_flight' }, hint: 'Finish your first flight.' },
  { id: 'st_earth', name: 'Home Sweet Earth', glyph: 'planet', bg: '#2ed47a', color: '#4dd4ff', source: { kind: 'space', body: 'earth' }, hint: 'Floating in space near Earth.' },
  { id: 'st_satellite', name: 'Satellite Pal', glyph: 'satellite', bg: '#9b6bff', source: { kind: 'mission', mission: 'c1s_satellites' }, hint: 'Help fix the satellites.' },
  { id: 'st_moon', name: 'Moon Smile', glyph: 'moon', bg: '#2a3f9e', color: '#fff1a8', source: { kind: 'level', level: 'moon_base' }, hint: 'Hidden on the Moon.' },
  { id: 'st_mercury', name: 'Sunny Mercury', glyph: 'sun', bg: '#ff9f43', source: { kind: 'level', level: 'mercury_craters' }, hint: 'Hidden on Mercury.' },
  { id: 'st_venus', name: 'Cloud Puff', glyph: 'cloud', bg: '#ffc83d', source: { kind: 'level', level: 'venus_surface' }, hint: 'Hidden on Venus.' },
  { id: 'st_mars_rover', name: 'Little Rover', glyph: 'rover', bg: '#ff5d73', source: { kind: 'level', level: 'mars_landing' }, hint: 'Hidden at the Mars landing zone.' },
  { id: 'st_canyon', name: 'Canyon Peak', glyph: 'mountain', bg: '#ffb38a', source: { kind: 'level', level: 'mars_canyon' }, hint: 'Hidden in the big Mars canyon.' },
  { id: 'st_ice', name: 'Snowflake', glyph: 'snowflake', bg: '#4c7dff', source: { kind: 'level', level: 'mars_icecap' }, hint: 'Hidden at the Mars ice cap.' },
  { id: 'st_olympus', name: 'Olympus Flag', glyph: 'flag', bg: '#ffe066', color: '#ff5d73', source: { kind: 'level', level: 'mars_olympus' }, hint: 'Hidden on the giant volcano.' },
  { id: 'st_comet', name: 'Comet Zoom', glyph: 'comet', bg: '#2a3f9e', source: { kind: 'space', body: 'ceres' }, hint: 'Floating in the asteroid belt.' },
  { id: 'st_ceres', name: 'Space Rock', glyph: 'rock', bg: '#9aa4c7', color: '#c9c3b8', source: { kind: 'level', level: 'ceres_station' }, hint: 'Hidden on Ceres.' },
  { id: 'st_storm', name: 'Big Red Storm', glyph: 'swirl', bg: '#ff9f43', color: '#e46a4a', source: { kind: 'mission', mission: 'c3_jupiter' }, hint: 'Scan the giant storm.' },
  { id: 'st_volcano', name: 'Io Volcano', glyph: 'volcano', bg: '#ffe066', source: { kind: 'mission', mission: 'c3s_io' }, hint: 'Peek at the volcano moon.' },
  { id: 'st_europa', name: 'Ice Crystal', glyph: 'crystal', bg: '#2a3f9e', color: '#a8f0ff', source: { kind: 'level', level: 'europa_ice' }, hint: 'Hidden on Europa.' },
  { id: 'st_callisto', name: 'Crater Face', glyph: 'crater', bg: '#6b3fd4', source: { kind: 'level', level: 'callisto_crash' }, hint: 'Hidden on Callisto.' },
  { id: 'st_ganymede', name: 'Giant Moon', glyph: 'planet', bg: '#4a4e6e', color: '#c9b8a0', source: { kind: 'level', level: 'ganymede_caves' }, hint: 'Hidden on Ganymede.' },
  { id: 'st_titan', name: 'Orange Drop', glyph: 'drop', bg: '#ffe066', source: { kind: 'level', level: 'titan_lakes' }, hint: 'Hidden on Titan.' },
  { id: 'st_miranda', name: 'Big Cliff', glyph: 'cliff', bg: '#2de0c7', source: { kind: 'level', level: 'miranda_cliffs' }, hint: 'Hidden on Miranda.' },
  { id: 'st_triton', name: 'Geyser Pop', glyph: 'geyser', bg: '#4c7dff', source: { kind: 'level', level: 'triton_geysers' }, hint: 'Hidden on Triton.' },
  { id: 'st_pluto', name: 'Pluto Heart', glyph: 'heart', bg: '#ffe0c2', color: '#ff7ad9', source: { kind: 'level', level: 'pluto_heart' }, hint: 'Hidden on Pluto.' },
  { id: 'st_rings', name: 'Ring Racer', glyph: 'ringed', bg: '#6b3fd4', color: '#ffc83d', source: { kind: 'race', course: 'race_ripple' }, hint: 'Win gold in Ring Ripple.' },
  { id: 'st_trophy', name: 'Golden Cup', glyph: 'trophy', bg: '#4c7dff', color: '#ffc83d', source: { kind: 'race', course: 'race_cassini' }, hint: 'Win gold in Cassini Curve.' },
  { id: 'st_medal', name: 'Speed Medal', glyph: 'medal', bg: '#ff5d73', color: '#ffc83d', source: { kind: 'race', course: 'race_titan' }, hint: 'Win gold in Titan Twister.' },
  { id: 'st_star', name: 'Super Star', glyph: 'star', bg: '#9b6bff', source: { kind: 'daily', count: 1 }, hint: 'Finish a daily challenge.' },
  { id: 'st_calendar', name: 'Daily Hero', glyph: 'calendar', bg: '#2ed47a', source: { kind: 'daily', count: 3 }, hint: 'Finish 3 daily challenges.' },
  { id: 'st_robot', name: 'Tuggy Hug', glyph: 'robot', bg: '#ff9f43', source: { kind: 'tow' }, hint: 'Get a tow from Tuggy.' },
  { id: 'st_wormhole', name: 'Swirly Hole', glyph: 'wormhole', bg: '#140d3a', source: { kind: 'mission', mission: 'c5_wormhole' }, hint: 'Fly through the wormhole.' },
  { id: 'st_zibbo', name: 'Zibbo Wave', glyph: 'alien', bg: '#ff7ad9', color: '#2de0c7', source: { kind: 'level', level: 'zephyra_village' }, hint: 'Hidden in the Zephyra village.' },
  { id: 'st_crystal', name: 'Glow Crystal', glyph: 'crystal', bg: '#2b1d78', color: '#c89bff', source: { kind: 'level', level: 'zephyra_crystal' }, hint: 'Hidden in the Crystal Caves.' },
  { id: 'st_bubble', name: 'Bubble Buddy', glyph: 'bubble', bg: '#2de0c7', source: { kind: 'level', level: 'zephyra_bubble' }, hint: 'Hidden at the Bubble Sea.' },
  { id: 'st_wind', name: 'Sky Swirl', glyph: 'wind', bg: '#4c7dff', source: { kind: 'level', level: 'zephyra_sky' }, hint: 'Hidden on the Windy Peaks.' },
  { id: 'st_beacon', name: 'Star Beacon', glyph: 'beacon', bg: '#2a3f9e', color: '#ffe066', source: { kind: 'level', level: 'zephyra_beacon' }, hint: 'Hidden in the Star Beacon tower.' },
  { id: 'st_glimmer', name: 'Glimmer Glow', glyph: 'glimmer', bg: '#6b3fd4', color: '#fff7b3', source: { kind: 'mission', mission: 'c5s_glimmers' }, hint: 'Help the lost glimmers.' },
];

export const STICKER_BY_ID: Record<string, StickerDef> = Object.fromEntries(STICKERS.map((s) => [s.id, s]));

export function stickerForLevel(levelId: string): StickerDef | undefined {
  return STICKERS.find((s) => s.source.kind === 'level' && s.source.level === levelId);
}
