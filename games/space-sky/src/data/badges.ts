import type { GlyphId } from '../gfx/art/glyphs';
import { CODEX } from './codex';
import { COURSES } from './races';
import { STICKERS } from './stickers';
import type { SaveData } from '../systems/save/schema';

/** Badges: little awards for trying things. Every check is a simple rule on the save data. */
export interface BadgeDef {
  id: string;
  name: string;
  /** How to earn it (short, for kids). */
  desc: string;
  glyph: GlyphId;
  color: string;
  check: (s: SaveData) => boolean;
}

const PLANETS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const GIANTS = ['jupiter', 'saturn', 'uranus', 'neptune'];
const MOONS = ['moon', 'europa', 'ganymede', 'callisto', 'titan', 'miranda', 'triton'];
const done = (s: SaveData, id: string) => s.missions[id]?.status === 'done';
const B = (b: BadgeDef) => b;

export const BADGES: BadgeDef[] = [
  B({ id: 'first_flight', name: 'First Flight', desc: 'Fly your rocket for the first time.', glyph: 'rocket', color: '#4c7dff', check: (s) => s.stats.flights >= 1 }),
  B({ id: 'moonwalker', name: 'Moonwalker', desc: 'Land on the Moon.', glyph: 'moon', color: '#9aa4c7', check: (s) => s.visitedBodies.includes('moon') }),
  B({ id: 'soft_touch', name: 'Soft Touch', desc: 'Make a perfect landing.', glyph: 'star', color: '#2ed47a', check: (s) => s.stats.perfectLandings >= 1 }),
  B({ id: 'perfect_pilot', name: 'Perfect Pilot', desc: 'Make 10 perfect landings.', glyph: 'trophy', color: '#ffc83d', check: (s) => s.stats.perfectLandings >= 10 }),
  B({ id: 'rock_hound', name: 'Rock Hound', desc: 'Collect 10 samples.', glyph: 'rock', color: '#b39a86', check: (s) => s.stats.samples >= 10 }),
  B({ id: 'coin_collector', name: 'Coin Collector', desc: 'Earn 500 star-coins.', glyph: 'coin', color: '#ffc83d', check: (s) => s.coinsEarned >= 500 }),
  B({ id: 'coin_captain', name: 'Coin Captain', desc: 'Earn 2,000 star-coins.', glyph: 'coin', color: '#ff9f43', check: (s) => s.coinsEarned >= 2000 }),
  B({ id: 'planet_hopper', name: 'Planet Hopper', desc: 'Visit 4 planets.', glyph: 'planet', color: '#ff9f43', check: (s) => PLANETS.filter((p) => s.codex.includes(p)).length >= 4 }),
  B({ id: 'grand_tour', name: 'Grand Tour', desc: 'Visit all 8 planets.', glyph: 'ringed', color: '#9b6bff', check: (s) => PLANETS.every((p) => s.codex.includes(p)) }),
  B({ id: 'giant_guru', name: 'Giant Guru', desc: 'Visit all 4 giant planets.', glyph: 'swirl', color: '#e46a4a', check: (s) => GIANTS.every((p) => s.codex.includes(p)) }),
  B({ id: 'moon_explorer', name: 'Moon Explorer', desc: 'Land on 5 different moons.', glyph: 'crater', color: '#c9c3b8', check: (s) => MOONS.filter((m) => s.visitedBodies.includes(m)).length >= 5 }),
  B({ id: 'codex_starter', name: 'Codex Starter', desc: 'Fill 10 Codex pages.', glyph: 'book', color: '#4dd4ff', check: (s) => s.codex.length >= 10 }),
  B({ id: 'space_scholar', name: 'Space Scholar', desc: 'Fill 30 Codex pages.', glyph: 'book', color: '#4c7dff', check: (s) => s.codex.length >= 30 }),
  B({ id: 'codex_master', name: 'Codex Master', desc: 'Fill the whole Codex.', glyph: 'book', color: '#9b6bff', check: (s) => CODEX.every((c) => s.codex.includes(c.id)) }),
  B({ id: 'sticker_fan', name: 'Sticker Fan', desc: 'Find 10 stickers.', glyph: 'heart', color: '#ff7ad9', check: (s) => s.stickers.length >= 10 }),
  B({ id: 'sticker_superstar', name: 'Sticker Superstar', desc: 'Find every sticker.', glyph: 'star', color: '#ff7ad9', check: (s) => STICKERS.every((x) => s.stickers.includes(x.id)) }),
  B({ id: 'slingshot_star', name: 'Slingshot Star', desc: 'Do 5 gravity slingshots.', glyph: 'comet', color: '#ffe066', check: (s) => s.stats.slingshots >= 5 }),
  B({ id: 'comet_rider', name: 'Comet Rider', desc: 'Ride 5 comet tails.', glyph: 'comet', color: '#4dd4ff', check: (s) => s.stats.cometRides >= 5 }),
  B({ id: 'tuggys_friend', name: "Tuggy's Friend", desc: 'Get a tow from Tuggy.', glyph: 'robot', color: '#ffe066', check: (s) => s.stats.tows >= 1 }),
  B({ id: 'fuel_finder', name: 'Fuel Finder', desc: 'Grab 25 fuel cells.', glyph: 'fuel', color: '#8cff66', check: (s) => s.stats.fuelCells >= 25 }),
  B({ id: 'rocket_builder', name: 'Rocket Builder', desc: 'Try 10 different rocket parts.', glyph: 'wrench', color: '#c9d2ee', check: (s) => s.stats.partsEquipped.length >= 10 }),
  B({ id: 'space_fashion', name: 'Space Fashion', desc: 'Get a new outfit.', glyph: 'helmet', color: '#ff7ad9', check: (s) => s.owned.some((o) => o.startsWith('outfit_') && o !== 'outfit_none') }),
  B({ id: 'home_decorator', name: 'Home Decorator', desc: 'Put 3 decorations in your room.', glyph: 'flower', color: '#2ed47a', check: (s) => s.decorPlaced.length >= 3 }),
  B({ id: 'race_rookie', name: 'Race Rookie', desc: 'Finish a race.', glyph: 'rings', color: '#4dd4ff', check: (s) => s.stats.races >= 1 }),
  B({ id: 'gold_racer', name: 'Gold Racer', desc: 'Win a gold medal in a race.', glyph: 'medal', color: '#ffc83d', check: (s) => Object.values(s.races).some((r) => r.medal === 'gold') }),
  B({ id: 'ring_master', name: 'Ring Master', desc: 'Win gold in every race.', glyph: 'trophy', color: '#ffc83d', check: (s) => COURSES.filter((c) => !c.practice).every((c) => s.races[c.id]?.medal === 'gold') }),
  B({ id: 'daily_doer', name: 'Daily Doer', desc: 'Finish 3 daily challenges.', glyph: 'calendar', color: '#2ed47a', check: (s) => s.stats.dailiesDone >= 3 }),
  B({ id: 'cadet_graduate', name: 'Cadet Graduate', desc: 'Finish Chapter 1.', glyph: 'flag', color: '#4c7dff', check: (s) => done(s, 'c1_moon_rocks') }),
  B({ id: 'inner_explorer', name: 'Inner Explorer', desc: 'Finish Chapter 2.', glyph: 'sun', color: '#ff9f43', check: (s) => done(s, 'c2_report') }),
  B({ id: 'rescue_hero', name: 'Rescue Hero', desc: 'Finish Chapter 3.', glyph: 'alien', color: '#2de0c7', check: (s) => done(s, 'c3_rescue') }),
  B({ id: 'outer_voyager', name: 'Outer Voyager', desc: 'Finish Chapter 4.', glyph: 'map', color: '#4c7dff', check: (s) => done(s, 'c4_starpath') }),
  B({ id: 'star_hero', name: 'Star Hero', desc: 'Light the Star Beacon.', glyph: 'beacon', color: '#ffe066', check: (s) => done(s, 'c5_beacon') }),
  B({ id: 'puzzle_pro', name: 'Puzzle Pro', desc: 'Solve 10 puzzles.', glyph: 'crystal', color: '#c89bff', check: (s) => s.stats.puzzles >= 10 }),
  B({ id: 'friend_maker', name: 'Friend Maker', desc: 'Talk to 10 different friends.', glyph: 'heart', color: '#ff5d73', check: (s) => s.stats.talkedTo.length >= 10 }),
  B({ id: 'zoom_zoom', name: 'Zoom Zoom', desc: 'Boost 50 times.', glyph: 'bolt', color: '#ff9f43', check: (s) => s.stats.boosts >= 50 }),
  B({ id: 'bumper_car', name: 'Bumper Car', desc: 'Bump 25 space rocks. Oops!', glyph: 'rock', color: '#9aa4c7', check: (s) => s.stats.bumps >= 25 }),
  B({ id: 'helping_hand', name: 'Helping Hand', desc: 'Finish 8 side missions.', glyph: 'gift', color: '#ff7ad9', check: (s) => s.stats.sideDone >= 8 }),
  B({ id: 'bouncy_boots', name: 'Bouncy Boots', desc: 'Jump 200 times.', glyph: 'boot', color: '#8cff66', check: (s) => s.stats.jumps >= 200 }),
  B({ id: 'scanner_fan', name: 'Scanner Fan', desc: 'Scan 10 things.', glyph: 'telescope', color: '#4dd4ff', check: (s) => s.stats.scans >= 10 }),
  B({ id: 'world_walker', name: 'World Walker', desc: 'Explore 10 different worlds.', glyph: 'boot', color: '#9b6bff', check: (s) => s.visitedBodies.filter((b) => b !== 'earth').length >= 10 }),
];

export const BADGE_BY_ID: Record<string, BadgeDef> = Object.fromEntries(BADGES.map((b) => [b.id, b]));
