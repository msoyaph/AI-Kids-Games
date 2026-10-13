/**
 * The story in chapters: where you go, who you meet, and what a typical, unhurried player does on
 * the way. The level-curve check and the pacing model read this; the quest log uses the titles.
 * `pathSpars` is how many wild spars a player has without looking for extra ones (the visible
 * Agentmon that stand in the way or look fun). `befriend` is what the model player adds to their
 * team in that chapter, the kind of picks the hints and the story nudge kids towards.
 */

export interface ChapterDef {
  n: number;
  title: string;
  /** Wild areas on the main path. */
  areas: string[];
  pathSpars: number;
  /** Trainers on the main path, in order (Keeper last). */
  trainers: string[];
  befriend: string[];
  /** Puzzle rooms on the main path (pacing). */
  puzzleRooms: number;
  /** Beacon relit at the end of the chapter, if any. */
  beacon?: string;
}

export const CHAPTERS: ChapterDef[] = [
  { n: 0, title: 'A Field Agent at last', areas: ['academy-garden'], pathSpars: 2, trainers: ['juno-1'], befriend: [], puzzleRooms: 0 },
  { n: 1, title: 'The Meadow Path', areas: ['meadow-path'], pathSpars: 6, trainers: ['agent-pia', 'agent-tomo'], befriend: ['snipsy'], puzzleRooms: 0 },
  { n: 2, title: 'The Lighthouse Beacon', areas: ['sandy-shore'], pathSpars: 6, trainers: ['agent-coral', 'lighthouse-helper', 'keeper-marisol'], befriend: ['lullakin'], puzzleRooms: 4, beacon: 'beacon-lighthouse' },
  { n: 3, title: 'Along the Cliff Road', areas: ['cliff-road'], pathSpars: 7, trainers: ['agent-rafi', 'agent-lou', 'juno-2'], befriend: ['zestle'], puzzleRooms: 0 },
  { n: 4, title: 'The Canopy Beacon', areas: ['mossgrove-woods'], pathSpars: 7, trainers: ['agent-ivo', 'canopy-helper', 'keeper-oren'], befriend: ['gleamgrub'], puzzleRooms: 5, beacon: 'beacon-canopy' },
  { n: 5, title: 'Whispers in the Woods', areas: ['whisper-woods', 'glimmer-cave'], pathSpars: 8, trainers: ['agent-bea', 'club-dot', 'club-rudy'], befriend: ['poplet'], puzzleRooms: 1 },
  { n: 6, title: 'The Old Mine Beacon', areas: ['cragtop-slopes'], pathSpars: 8, trainers: ['agent-sami', 'mine-helper', 'keeper-vee'], befriend: [], puzzleRooms: 5, beacon: 'beacon-mine' },
  { n: 7, title: 'The Canyon Trail', areas: ['canyon-trail'], pathSpars: 7, trainers: ['agent-noa', 'juno-3'], befriend: [], puzzleRooms: 0 },
  { n: 8, title: 'The Sunstone Beacon', areas: ['dune-flats'], pathSpars: 8, trainers: ['club-mabel', 'sunstone-helper', 'keeper-sol'], befriend: [], puzzleRooms: 6, beacon: 'beacon-sunstone' },
  { n: 9, title: 'Over Frost Pass', areas: ['frost-pass'], pathSpars: 8, trainers: ['agent-kit', 'club-velour'], befriend: ['bathlet'], puzzleRooms: 1 },
  { n: 10, title: 'The Summit Beacon', areas: ['frostfall-slopes'], pathSpars: 8, trainers: ['agent-yan', 'summit-helper', 'keeper-yuki'], befriend: [], puzzleRooms: 6, beacon: 'beacon-summit' },
  { n: 11, title: 'Up the Updrafts', areas: ['updraft-ridge'], pathSpars: 8, trainers: ['juno-4', 'club-velour-2'], befriend: [], puzzleRooms: 1 },
  { n: 12, title: 'The Spire Beacon', areas: ['sky-island'], pathSpars: 8, trainers: ['spire-helper', 'keeper-celeste'], befriend: [], puzzleRooms: 7, beacon: 'beacon-spire' },
  { n: 13, title: 'The Guardian of Sunreach', areas: [], pathSpars: 0, trainers: [], befriend: [], puzzleRooms: 0 },
];

export const BEACONS = CHAPTERS.flatMap(c => (c.beacon ? [c.beacon] : []));
