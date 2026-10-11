import type { SongData } from './types';

/**
 * Original procedural songs. Melodies are generated deterministically from `seed` over the chord
 * progression, so every course has its own tune with no audio files.
 * Chords are 0-based scale degrees, one per bar.
 */
export const SONGS: SongData[] = [
  { id: 'menu', name: 'Calex Theme', bpm: 126, root: 60, scale: 'major', chords: [0, 5, 3, 4, 0, 5, 1, 4], lead: 'square', bass: 'pluck', pad: 'triangle', drums: 'pop', seed: 11, arp: 'up', bright: 0.8 },
  { id: 'podium', name: 'Trophy Parade', bpm: 112, root: 62, scale: 'major', chords: [0, 3, 4, 0, 3, 4, 1, 4], lead: 'bell', bass: 'pluck', pad: 'organ', drums: 'march', seed: 7, arp: 'none', bright: 0.9 },
  // Sunrise Cup
  { id: 'sunrise1', name: 'Boardwalk Breeze', bpm: 132, root: 65, scale: 'major', chords: [0, 3, 4, 0, 5, 3, 1, 4], lead: 'bell', bass: 'pluck', drums: 'latin', seed: 101, arp: 'updown', bright: 0.85 },
  { id: 'sunrise2', name: 'Skyline Sprint', bpm: 148, root: 64, scale: 'mixolydian', chords: [0, 6, 3, 0, 0, 6, 3, 4], lead: 'saw', bass: 'saw', drums: 'rock', seed: 102, arp: 'none', bright: 0.7 },
  { id: 'sunrise3', name: 'Sugar Rush', bpm: 140, root: 67, scale: 'major', chords: [0, 4, 5, 3, 0, 4, 3, 4], lead: 'bell', bass: 'square', pad: 'sine', drums: 'pop', seed: 103, arp: 'up', bright: 1 },
  { id: 'sunrise4', name: 'Canyon Gallop', bpm: 136, root: 62, scale: 'dorian', chords: [0, 3, 0, 4, 0, 3, 6, 4], lead: 'organ', bass: 'pluck', drums: 'shuffle', seed: 104, swing: 0.55, arp: 'none', bright: 0.7 },
  // Thunder Cup
  { id: 'thunder1', name: 'Lava Lane', bpm: 156, root: 57, scale: 'harmonicMinor', chords: [0, 5, 3, 4, 0, 5, 6, 4], lead: 'saw', bass: 'saw', drums: 'rock', seed: 201, arp: 'down', bright: 0.6 },
  { id: 'thunder2', name: 'Spooky Silly Parade', bpm: 128, root: 60, scale: 'minor', chords: [0, 3, 0, 4, 5, 3, 1, 4], lead: 'organ', bass: 'pluck', pad: 'organ', drums: 'shuffle', seed: 202, swing: 0.6, arp: 'none', bright: 0.55 },
  { id: 'thunder3', name: 'Sandstone Secrets', bpm: 144, root: 62, scale: 'harmonicMinor', chords: [0, 0, 5, 4, 0, 3, 4, 4], lead: 'pluck', bass: 'pluck', drums: 'latin', seed: 203, arp: 'random', bright: 0.65 },
  { id: 'thunder4', name: 'Snowflake Slalom', bpm: 138, root: 69, scale: 'major', chords: [0, 5, 3, 4, 0, 1, 4, 0], lead: 'bell', bass: 'triangle', pad: 'sine', drums: 'pop', seed: 204, arp: 'updown', bright: 0.9 },
  // Galaxy Cup
  { id: 'galaxy1', name: 'Moonwalk Motors', bpm: 124, root: 60, scale: 'lydian', chords: [0, 1, 0, 4, 0, 1, 5, 4], lead: 'sine', bass: 'square', pad: 'saw', drums: 'halftime', seed: 301, arp: 'random', bright: 0.75 },
  { id: 'galaxy2', name: 'Bubble Dome Blues', bpm: 118, root: 58, scale: 'dorian', chords: [0, 3, 0, 3, 4, 3, 0, 4], lead: 'triangle', bass: 'sine', pad: 'triangle', drums: 'halftime', seed: 302, arp: 'up', bright: 0.6 },
  { id: 'galaxy3', name: 'Glider Gale', bpm: 140, root: 64, scale: 'pentatonic', chords: [0, 3, 4, 0, 1, 3, 4, 4], lead: 'square', bass: 'pluck', drums: 'pop', seed: 303, arp: 'updown', bright: 0.9 },
  { id: 'galaxy4', name: 'Gearbox Groove', bpm: 150, root: 57, scale: 'minor', chords: [0, 0, 5, 6, 0, 0, 3, 4], lead: 'square', bass: 'square', drums: 'electro', seed: 304, arp: 'up', bright: 0.7 },
  // Legend Cup
  { id: 'legend1', name: 'Neon Nights', bpm: 160, root: 61, scale: 'minor', chords: [0, 5, 6, 4, 0, 5, 3, 4], lead: 'saw', bass: 'saw', pad: 'saw', drums: 'electro', seed: 401, arp: 'up', bright: 0.8 },
  { id: 'legend2', name: 'Temple Drums', bpm: 146, root: 57, scale: 'blues', chords: [0, 0, 3, 0, 4, 3, 0, 4], lead: 'pluck', bass: 'pluck', drums: 'breakbeat', seed: 402, arp: 'none', bright: 0.65 },
  { id: 'legend3', name: 'Castle in the Clouds', bpm: 134, root: 65, scale: 'major', chords: [0, 4, 5, 3, 0, 4, 3, 4], lead: 'organ', bass: 'triangle', pad: 'organ', drums: 'march', seed: 403, arp: 'updown', bright: 0.8 },
  { id: 'legend4', name: 'Prism Finale', bpm: 164, root: 62, scale: 'lydian', chords: [0, 1, 5, 4, 0, 1, 3, 4], lead: 'saw', bass: 'square', pad: 'saw', drums: 'pop', seed: 404, arp: 'updown', bright: 1 },
  // Battle
  { id: 'battle1', name: 'Gumdrop Scramble', bpm: 152, root: 64, scale: 'major', chords: [0, 4, 0, 4, 3, 4, 0, 4], lead: 'square', bass: 'pluck', drums: 'breakbeat', seed: 501, arp: 'up', bright: 0.9 },
  { id: 'battle2', name: 'Crater Clash', bpm: 128, root: 59, scale: 'lydian', chords: [0, 1, 0, 1, 4, 1, 0, 4], lead: 'sine', bass: 'square', drums: 'electro', seed: 502, arp: 'random', bright: 0.7 },
  { id: 'battle3', name: 'Crossroads Rumble', bpm: 158, root: 61, scale: 'minor', chords: [0, 6, 5, 6, 0, 6, 5, 4], lead: 'saw', bass: 'saw', drums: 'electro', seed: 503, arp: 'down', bright: 0.75 },
  { id: 'battle4', name: 'Reef Rumpus', bpm: 140, root: 63, scale: 'dorian', chords: [0, 3, 0, 3, 6, 3, 4, 4], lead: 'pluck', bass: 'pluck', drums: 'latin', seed: 504, arp: 'updown', bright: 0.7 },
];

export function findSong(id: string): SongData {
  return SONGS.find((s) => s.id === id) ?? SONGS[0];
}
